"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Route } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDateFormat } from "@/lib/i18n/dates";
import { useLocale } from "@/lib/i18n/locale";
import { geocodeAddresses, type LatLng } from "@/lib/maps/geocode";
import { fetchLeg, transitDirectionsUrl, WALK_LIMIT_SECONDS, type Leg, type TravelMode } from "@/lib/maps/routing";
import { cn } from "@/lib/utils/cn";
import { timeToMinutes } from "@/lib/utils/time";
import type { ProjectDay } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";

// Free, keyless vector tiles (OpenStreetMap data) — no billing account needed.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DAY_COLORS = ["#5b5bf0", "#ef5a3c", "#14a38b", "#e8920c", "#3b82f6", "#a855f7", "#d9467a"];
const UNRESOLVED_COLOR = "#a3a9b5";

type Stop = {
  item: ScheduleItem;
  location: string;
  /** undefined while geocoding, null when the address couldn't be placed. */
  position: LatLng | null | undefined;
  order: number;
};
type DayGroup = { day: ProjectDay; color: string; stops: Stop[] };
type Pair = { key: string; from: LatLng; to: LatLng; toId: string; color: string };
type LegState = { status: "loading" | "ready" | "error"; foot: Leg | null; car: Leg | null };

function pairKey(from: LatLng, to: LatLng) {
  return `${from.lat.toFixed(5)},${from.lng.toFixed(5)}>${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
}

/** The traveller's pick if that route exists; otherwise walk short hops and drive the rest. */
function pickMode(state: LegState | undefined, chosen: TravelMode | undefined): TravelMode {
  if (chosen && state?.[chosen]) return chosen;
  if (state?.foot && (state.foot.duration <= WALK_LIMIT_SECONDS || !state.car)) return "foot";
  return "car";
}

export function DayRouteMapDialog({
  day,
  days,
  schedules,
  onSelectDay,
  onClose
}: {
  day: ProjectDay | null;
  days: ProjectDay[];
  schedules: ScheduleItem[];
  onSelectDay: (day: ProjectDay) => void;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const fmt = useDateFormat();
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [positions, setPositions] = useState<Map<string, LatLng | null>>(() => new Map());
  const [legs, setLegs] = useState<Record<string, LegState>>({});
  const [modes, setModes] = useState<Record<string, TravelMode>>({});
  const requestedLegs = useRef(new Set<string>());
  const listRef = useRef<HTMLDivElement | null>(null);

  const open = Boolean(day);
  const dayIndex = day ? days.findIndex((entry) => entry.id === day.id) : -1;
  const previousDay = dayIndex > 0 ? days[dayIndex - 1] : null;
  const nextDay = dayIndex >= 0 && dayIndex < days.length - 1 ? days[dayIndex + 1] : null;

  // A fresh open starts on the chosen day's list.
  useEffect(() => {
    if (open) return;
    setShowAll(false);
    setView("list");
    setSelectedId(null);
  }, [open]);

  // Every stop with an address, per day, in the order it happens.
  const located = useMemo(() => {
    if (!day) return [];
    const scope = showAll ? days : [day];
    return scope.map((entry) => ({
      day: entry,
      color: DAY_COLORS[Math.max(0, days.indexOf(entry)) % DAY_COLORS.length],
      items: schedules
        .filter((item) => item.day_id === entry.id && !item.all_day && item.location?.trim())
        .sort((a, b) => {
          const byStart = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
          return byStart !== 0 ? byStart : a.title.localeCompare(b.title);
        })
    }));
  }, [day, days, schedules, showAll]);

  const addresses = useMemo(
    () => [...new Set(located.flatMap((group) => group.items.map((item) => item.location!.trim())))],
    [located]
  );
  const addressKey = addresses.join("\n");

  useEffect(() => {
    if (!open || !addresses.length) {
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    geocodeAddresses(addresses, locale)
      .then((resolved) => {
        if (cancelled) return;
        setPositions((current) => new Map([...current, ...resolved]));
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // addressKey stands in for the addresses array's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, addressKey, locale]);

  const groups: DayGroup[] = useMemo(
    () =>
      located.map((group) => ({
        day: group.day,
        color: group.color,
        stops: group.items.map((item, index) => {
          const location = item.location!.trim();
          return {
            item,
            location,
            position: positions.has(location) ? positions.get(location) : undefined,
            order: index + 1
          };
        })
      })),
    [located, positions]
  );

  // Consecutive placed stops within a day; an unplaced stop is stepped over.
  const pairs = useMemo(() => {
    const result: Pair[] = [];
    for (const group of groups) {
      let previous: Stop | null = null;
      for (const stop of group.stops) {
        if (!stop.position) continue;
        if (previous?.position) {
          result.push({
            key: pairKey(previous.position, stop.position),
            from: previous.position,
            to: stop.position,
            toId: stop.item.id,
            color: group.color
          });
        }
        previous = stop;
      }
    }
    return result;
  }, [groups]);

  useEffect(() => {
    for (const pair of pairs) {
      if (requestedLegs.current.has(pair.key)) continue;
      requestedLegs.current.add(pair.key);
      setLegs((current) => ({ ...current, [pair.key]: { status: "loading", foot: null, car: null } }));
      Promise.allSettled([fetchLeg(pair.from, pair.to, "foot"), fetchLeg(pair.from, pair.to, "car")]).then(
        ([foot, car]) => {
          const footLeg = foot.status === "fulfilled" ? foot.value : null;
          const carLeg = car.status === "fulfilled" ? car.value : null;
          if (!footLeg && !carLeg) requestedLegs.current.delete(pair.key);
          setLegs((current) => ({
            ...current,
            [pair.key]: { status: footLeg || carLeg ? "ready" : "error", foot: footLeg, car: carLeg }
          }));
        }
      );
    }
  }, [pairs]);

  function modeFor(key: string): TravelMode {
    return pickMode(legs[key], modes[key]);
  }

  const pairByDestination = useMemo(() => new Map(pairs.map((pair) => [pair.toId, pair])), [pairs]);

  const lines: Line[] = useMemo(
    () =>
      pairs.map((pair) => {
        const state = legs[pair.key];
        const mode = pickMode(state, modes[pair.key]);
        const leg = state?.status === "ready" ? state[mode] : null;
        return leg
          ? { color: pair.color, routed: true, coordinates: leg.geometry }
          : {
              color: pair.color,
              routed: false,
              coordinates: [
                [pair.from.lng, pair.from.lat],
                [pair.to.lng, pair.to.lat]
              ]
            };
      }),
    [pairs, legs, modes]
  );

  function selectFromMap(id: string) {
    setSelectedId(id);
    listRef.current
      ?.querySelector(`[data-stop-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function formatDuration(seconds: number) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return t("map.minutes", { m: minutes });
    return t("map.hours", { h: Math.floor(minutes / 60), m: minutes % 60 });
  }

  const hasStops = groups.some((group) => group.stops.length);
  const placed = groups.flatMap((group) => group.stops.filter((stop) => stop.position));
  const unresolved = status === "ready" ? groups.flatMap((g) => g.stops).filter((s) => s.position === null).length : 0;
  const date = day ? new Date(day.date) : null;

  const navButton =
    "rounded-md p-1.5 text-muted transition hover:bg-black/8 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="flex h-[min(760px,90vh)] max-w-5xl flex-col overflow-hidden p-0">
        <div className="border-b border-border px-5 pb-3 pt-5">
          <div className="pr-8">
            <DialogTitle className="text-xl font-semibold text-foreground">{t("map.title")}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">{t("map.subtitle")}</DialogDescription>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!previousDay}
                onClick={() => {
                  if (!previousDay) return;
                  setShowAll(false);
                  onSelectDay(previousDay);
                }}
                className={navButton}
                aria-label={t("map.previousDay")}
              >
                <ChevronLeft size={18} />
              </button>
              <p className={cn("min-w-[92px] text-center text-sm font-medium", showAll ? "text-muted" : "text-foreground")}>
                {date ? `${fmt.monthDay(date)} (${fmt.weekday(date.getDay())})` : ""}
              </p>
              <button
                type="button"
                disabled={!nextDay}
                onClick={() => {
                  if (!nextDay) return;
                  setShowAll(false);
                  onSelectDay(nextDay);
                }}
                className={navButton}
                aria-label={t("map.nextDay")}
              >
                <ChevronRight size={18} />
              </button>
              {days.length > 1 ? (
                <button
                  type="button"
                  aria-pressed={showAll}
                  onClick={() => setShowAll((current) => !current)}
                  className={cn(
                    "ml-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                    showAll
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted hover:text-foreground"
                  )}
                >
                  {t("map.allDays")}
                </button>
              ) : null}
            </div>

            <div className="flex rounded-full bg-black/[0.05] p-0.5 md:hidden" role="tablist">
              {(["list", "map"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    view === option ? "bg-foreground text-background" : "text-muted"
                  )}
                >
                  {t(option === "list" ? "map.listView" : "map.mapView")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            ref={listRef}
            className={cn(
              "min-h-0 w-full overflow-y-auto p-4 md:block md:w-[360px] md:shrink-0 md:border-r md:border-border",
              view === "map" && "hidden"
            )}
          >
            {!hasStops ? (
              <Notice>{t("map.noLocations")}</Notice>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((group) =>
                  group.stops.length ? (
                    <section key={group.day.id}>
                      {showAll ? (
                        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
                          <span className="h-2 w-2 rounded-full" style={{ background: group.color }} />
                          {`${fmt.monthDay(new Date(group.day.date))} (${fmt.weekday(new Date(group.day.date).getDay())})`}
                        </h3>
                      ) : null}
                      <ol className="flex flex-col">
                        {group.stops.map((stop) => {
                          const pair = pairByDestination.get(stop.item.id);
                          const selected = selectedId === stop.item.id;
                          return (
                            <li key={stop.item.id} className="flex flex-col">
                              {pair ? (
                                <LegRow
                                  state={legs[pair.key]}
                                  mode={modeFor(pair.key)}
                                  onMode={(mode) => setModes((current) => ({ ...current, [pair.key]: mode }))}
                                  transitUrl={transitDirectionsUrl(pair.from, pair.to)}
                                  formatDuration={formatDuration}
                                />
                              ) : null}
                              <button
                                type="button"
                                data-stop-id={stop.item.id}
                                onClick={() => {
                                  setSelectedId(stop.item.id);
                                  if (stop.position) setView("map");
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition",
                                  selected
                                    ? "border-primary ring-2 ring-primary/25"
                                    : "border-border hover:bg-black/[0.02]"
                                )}
                              >
                                <span
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                                  style={{ background: stop.position ? group.color : UNRESOLVED_COLOR }}
                                >
                                  {stop.order}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-foreground">
                                    {stop.item.title}
                                  </span>
                                  <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted">
                                    <Clock size={12} className="shrink-0" aria-hidden="true" />
                                    <span className="shrink-0 tabular-nums">
                                      <span className="font-semibold text-foreground">{stop.item.start_time.slice(0, 5)}</span>
                                      {` – ${stop.item.end_time.slice(0, 5)}`}
                                    </span>
                                    <span className="truncate">· {stop.location}</span>
                                  </span>
                                  {stop.position === null ? (
                                    <span className="mt-0.5 block text-[11px] text-muted">({t("map.notFound")})</span>
                                  ) : null}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  ) : null
                )}
                {unresolved ? (
                  <p className="text-xs leading-5 text-muted">{t("map.notFoundHint", { count: unresolved })}</p>
                ) : null}
              </div>
            )}
          </div>

          <div className={cn("relative min-h-0 flex-1 p-4 md:block md:p-0", view === "list" && "hidden")}>
            {!hasStops ? (
              <Notice>{t("map.noLocations")}</Notice>
            ) : status === "error" ? (
              <Notice>{t("map.failed")}</Notice>
            ) : status === "ready" && !placed.length ? (
              <Notice>{t("map.noneFound")}</Notice>
            ) : (
              <div className="relative h-full overflow-hidden rounded-xl bg-black/[0.03] md:rounded-none">
                <RouteMap
                  groups={groups}
                  lines={lines}
                  selectedId={selectedId}
                  onSelect={selectFromMap}
                  visible={view === "map"}
                  language={locale}
                />
                {status === "loading" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/60 text-sm text-muted">
                    {t("common.loading")}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LegRow({
  state,
  mode,
  onMode,
  transitUrl,
  formatDuration
}: {
  state: LegState | undefined;
  mode: TravelMode;
  onMode: (mode: TravelMode) => void;
  transitUrl: string;
  formatDuration: (seconds: number) => string;
}) {
  const { t } = useLocale();
  const options = (["foot", "car"] as const).filter((option) => state?.[option]);

  function label(option: TravelMode) {
    const leg = state?.[option];
    if (!leg) return "";
    const distance = leg.distance < 1000 ? `${Math.round(leg.distance / 10) * 10}m` : `${(leg.distance / 1000).toFixed(1)}km`;
    return `${t(option === "foot" ? "map.walk" : "map.drive")} ${formatDuration(leg.duration)} · ${distance}`;
  }

  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted">
      {!state || state.status === "loading" ? (
        <span>{t("map.routing")}</span>
      ) : state.status === "error" ? (
        <span>{t("map.routeFailed")}</span>
      ) : (
        <label className="relative flex items-center">
          <span className="sr-only">{t("map.travelMode")}</span>
          <select
            value={mode}
            onChange={(event) => onMode(event.target.value as TravelMode)}
            className="cursor-pointer appearance-none rounded-md bg-transparent py-1 pl-2 pr-6 text-xs font-semibold text-foreground/75 outline-none transition hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-1.5" aria-hidden="true" />
        </label>
      )}
      <a
        href={transitUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={t("map.transit")}
        aria-label={t("map.transit")}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition hover:bg-black/[0.04] hover:text-foreground"
      >
        <Route size={14} aria-hidden="true" />
      </a>
    </div>
  );
}

type Line = { color: string; routed: boolean; coordinates: [number, number][] };

function RouteMap({
  groups,
  lines,
  selectedId,
  onSelect,
  visible,
  language
}: {
  groups: DayGroup[];
  lines: Line[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  visible: boolean;
  language: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<Map<string, { marker: MapLibreMarker; element: HTMLElement }>>(new Map());
  const fittedRef = useRef("");
  const boundsRef = useRef<import("maplibre-gl").LngLatBounds | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [loaded, setLoaded] = useState(false);

  // The map library is large, so it only loads once someone opens a route.
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const markers = markersRef.current;
    import("maplibre-gl").then((module) => {
      const lib = (module as unknown as { default?: typeof import("maplibre-gl") }).default ?? module;
      if (cancelled || !containerRef.current) return;
      libRef.current = lib;
      map = new lib.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [127, 37.5],
        zoom: 3,
        attributionControl: { compact: true }
      });
      map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (!map) return;
        localizeLabels(map, language);
        map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "route-routed",
          type: "line",
          source: "route",
          filter: ["==", ["get", "routed"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.85 }
        });
        map.addLayer({
          id: "route-straight",
          type: "line",
          source: "route",
          filter: ["==", ["get", "routed"], false],
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2.5,
            "line-opacity": 0.7,
            "line-dasharray": [2, 2]
          }
        });
        setLoaded(true);
      });
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      map?.remove();
      mapRef.current = null;
    };
    // The language only matters for the first paint of labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A map laid out while its pane was hidden (mobile list view) has zero size,
  // so it is resized and re-framed the moment it is shown.
  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => {
      const map = mapRef.current;
      if (!map) return;
      map.resize();
      const selected = selectedRef.current ? markersRef.current.get(selectedRef.current) : null;
      if (selected) {
        map.jumpTo({ center: selected.marker.getLngLat(), zoom: Math.max(map.getZoom(), 14) });
      } else if (boundsRef.current) {
        map.fitBounds(boundsRef.current, { padding: 56, maxZoom: 15, duration: 0 });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const source = map.getSource("route") as import("maplibre-gl").GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: lines.map((line) => ({
        type: "Feature",
        properties: { color: line.color, routed: line.routed },
        geometry: { type: "LineString", coordinates: line.coordinates }
      }))
    });
  }, [loaded, lines]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!loaded || !map || !lib) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();
    const bounds = new lib.LngLatBounds();
    let count = 0;
    for (const group of groups) {
      for (const stop of group.stops) {
        if (!stop.position) continue;
        // MapLibre positions the marker through the outer element's transform,
        // so the visible pin (and its selected scale) lives on an inner node.
        const element = document.createElement("button");
        element.type = "button";
        element.setAttribute("aria-label", stop.item.title);
        Object.assign(element.style, { padding: "0", border: "0", background: "transparent", cursor: "pointer" });
        const pin = document.createElement("span");
        pin.textContent = String(stop.order);
        Object.assign(pin.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          height: "26px",
          borderRadius: "9999px",
          background: group.color,
          color: "#fff",
          border: "2px solid #fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          fontSize: "12px",
          fontWeight: "700",
          transition: "transform 150ms ease"
        });
        element.append(pin);
        const popup = new lib.Popup({ offset: 16, closeButton: false }).setDOMContent(
          popupContent(stop.item.title, `${stop.item.start_time.slice(0, 5)} – ${stop.item.end_time.slice(0, 5)}`)
        );
        const marker = new lib.Marker({ element })
          .setLngLat([stop.position.lng, stop.position.lat])
          .setPopup(popup)
          .addTo(map);
        element.addEventListener("click", () => onSelectRef.current(stop.item.id));
        markersRef.current.set(stop.item.id, { marker, element: pin });
        bounds.extend([stop.position.lng, stop.position.lat]);
        count += 1;
      }
    }

    // Re-frame only when the set of pins changes, not on every leg update.
    const signature = [...markersRef.current.keys()].join(",");
    if (count && signature !== fittedRef.current) {
      fittedRef.current = signature;
      boundsRef.current = bounds;
      map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 0 });
    }
  }, [loaded, groups]);

  useEffect(() => {
    const map = mapRef.current;
    markersRef.current.forEach(({ element }, id) => {
      const selected = id === selectedId;
      element.style.transform = selected ? "scale(1.25)" : "";
      if (element.parentElement) element.parentElement.style.zIndex = selected ? "2" : "";
    });
    const target = selectedId ? markersRef.current.get(selectedId) : null;
    if (map && target) {
      map.easeTo({ center: target.marker.getLngLat(), zoom: Math.max(map.getZoom(), 14), duration: 500 });
    }
  }, [selectedId, loaded, groups]);

  return <div ref={containerRef} className="h-full min-h-[320px] w-full" />;
}

/** Show place names in the reader's language where OpenStreetMap has one. */
function localizeLabels(map: MapLibreMap, language: string) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol") continue;
    const field = map.getLayoutProperty(layer.id, "text-field");
    if (!field || !JSON.stringify(field).includes("name")) continue;
    map.setLayoutProperty(layer.id, "text-field", [
      "coalesce",
      ["get", `name:${language}`],
      ["get", "name"]
    ]);
  }
}

function popupContent(title: string, time: string) {
  const root = document.createElement("div");
  root.style.fontSize = "13px";
  root.style.lineHeight = "1.5";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const small = document.createElement("div");
  small.textContent = time;
  small.style.color = "#6b7280";
  root.append(strong, small);
  return root;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-black/[0.03] px-6 text-center text-sm leading-6 text-muted">
      <MapPin size={20} className="text-muted" />
      {children}
    </div>
  );
}

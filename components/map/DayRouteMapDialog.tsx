"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDateFormat } from "@/lib/i18n/dates";
import { useLocale } from "@/lib/i18n/locale";
import { geocodeAddresses, type LatLng } from "@/lib/maps/geocode";
import { googleMapsApiKey, loadGoogleMaps } from "@/lib/maps/loader";
import { cn } from "@/lib/utils/cn";
import { timeToMinutes } from "@/lib/utils/time";
import type { ProjectDay } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";

type Stop = { item: ScheduleItem; location: string; position: LatLng | null };

const ROUTE_COLOR = "#2f6df6";
const LOAD_TIMEOUT_MS = 20_000;

/** Never leave the dialog spinning: a blocked script or a stalled request fails. */
function withTimeout<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error("Google Maps timed out.")), LOAD_TIMEOUT_MS)
    )
  ]);
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<{ markers: google.maps.Marker[]; line: google.maps.Polyline | null }>({
    markers: [],
    line: null
  });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [stops, setStops] = useState<Stop[]>([]);

  const hasKey = Boolean(googleMapsApiKey());
  const dayIndex = day ? days.findIndex((entry) => entry.id === day.id) : -1;
  const previousDay = dayIndex > 0 ? days[dayIndex - 1] : null;
  const nextDay = dayIndex >= 0 && dayIndex < days.length - 1 ? days[dayIndex + 1] : null;

  // Every stop on this day that carries an address, in the order it happens.
  const located = useMemo(() => {
    if (!day) return [];
    return schedules
      .filter((item) => item.day_id === day.id && item.location?.trim())
      .sort((a, b) => {
        const byStart = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
        return byStart !== 0 ? byStart : a.title.localeCompare(b.title);
      })
      .map((item) => ({ item, location: item.location!.trim() }));
  }, [day, schedules]);

  useEffect(() => {
    if (!day || !hasKey || !located.length) {
      setStops([]);
      setStatus(located.length ? "loading" : "ready");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        await withTimeout(loadGoogleMaps(locale));
        const resolved = await withTimeout(geocodeAddresses(located.map((stop) => stop.location)));
        if (cancelled) return;
        setStops(
          located.map((stop) => ({ ...stop, position: resolved.get(stop.location) ?? null }))
        );
        setStatus("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [day, hasKey, located, locale]);

  // Draw whatever geocoded successfully: numbered pins in schedule order, joined
  // by a straight line so the day's movement reads at a glance.
  useEffect(() => {
    const container = containerRef.current;
    if (status !== "ready" || !container || !stops.length) return;

    const plotted = stops.filter((stop) => stop.position);
    if (!plotted.length) return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(container, {
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });
    }
    const map = mapRef.current;

    overlaysRef.current.markers.forEach((marker) => marker.setMap(null));
    overlaysRef.current.line?.setMap(null);

    const info = new google.maps.InfoWindow();
    const bounds = new google.maps.LatLngBounds();
    const markers = plotted.map((stop) => {
      const order = stops.indexOf(stop) + 1;
      bounds.extend(stop.position!);
      const marker = new google.maps.Marker({
        map,
        position: stop.position!,
        label: { text: String(order), color: "#ffffff", fontSize: "12px", fontWeight: "600" },
        title: stop.item.title
      });
      marker.addListener("click", () => {
        info.setContent(
          `<div style="font-size:13px;line-height:1.5"><strong>${escapeHtml(stop.item.title)}</strong><br/>${escapeHtml(
            stop.item.start_time.slice(0, 5)
          )} · ${escapeHtml(stop.location)}</div>`
        );
        info.open({ map, anchor: marker });
      });
      return marker;
    });

    const line = new google.maps.Polyline({
      map,
      path: plotted.map((stop) => stop.position!),
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 0.9,
      strokeWeight: 3
    });

    overlaysRef.current = { markers, line };

    if (plotted.length === 1) {
      map.setCenter(plotted[0].position!);
      map.setZoom(15);
    } else {
      map.fitBounds(bounds, 48);
    }

    return () => {
      info.close();
    };
  }, [status, stops]);

  // The map instance belongs to a container that unmounts with the dialog.
  useEffect(() => {
    if (day) return;
    overlaysRef.current.markers.forEach((marker) => marker.setMap(null));
    overlaysRef.current.line?.setMap(null);
    overlaysRef.current = { markers: [], line: null };
    mapRef.current = null;
  }, [day]);

  const plotted = stops.filter((stop) => stop.position).length;
  const unresolved = stops.length - plotted;
  const date = day ? new Date(day.date) : null;

  return (
    <Dialog open={Boolean(day)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{t("map.title")}</DialogTitle>
          <DialogDescription className="text-sm text-muted">{t("map.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={!previousDay}
            onClick={() => previousDay && onSelectDay(previousDay)}
            className="rounded-md p-1.5 text-muted transition hover:bg-black/8 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label={t("map.previousDay")}
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-medium text-foreground">
            {date ? `${fmt.monthDay(date)} (${fmt.weekday(date.getDay())})` : ""}
          </p>
          <button
            type="button"
            disabled={!nextDay}
            onClick={() => nextDay && onSelectDay(nextDay)}
            className="rounded-md p-1.5 text-muted transition hover:bg-black/8 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label={t("map.nextDay")}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {!hasKey ? (
          <Notice>{t("map.noKey")}</Notice>
        ) : !located.length ? (
          <Notice>{t("map.noLocations")}</Notice>
        ) : status === "error" ? (
          <Notice>{t("map.failed")}</Notice>
        ) : (
          <>
            {/* An empty map frame says nothing, so it only appears once there is
                something to draw on it. */}
            {status === "loading" || plotted ? (
              <div className="relative h-[380px] overflow-hidden rounded-xl border border-border bg-black/[0.03]">
                <div ref={containerRef} className="h-full w-full" />
                {status === "loading" ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                    {t("common.loading")}
                  </div>
                ) : null}
              </div>
            ) : (
              <Notice>{t("map.noneFound")}</Notice>
            )}

            {status === "ready" ? (
              <ol className="mt-3 flex flex-col gap-1.5">
                {stops.map((stop, index) => (
                  <li key={stop.item.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                        stop.position ? "bg-[#2f6df6]" : "bg-muted/60"
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{stop.item.title}</span>
                      <span className="text-muted"> · {stop.location}</span>
                      {stop.position ? null : (
                        <span className="ml-1 text-xs text-muted">({t("map.notFound")})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {unresolved ? (
              <p className="mt-2 text-xs leading-5 text-muted">
                {t("map.notFoundHint", { count: unresolved })}
              </p>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-black/[0.03] px-6 text-center text-sm leading-6 text-muted">
      <MapPin size={20} className="text-muted" />
      {children}
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character
  );
}

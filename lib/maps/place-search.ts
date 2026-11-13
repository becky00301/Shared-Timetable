"use client";

import type { LatLng } from "@/lib/maps/geocode";

// Suggestions for the event panel's place field, from free services that allow
// search-as-you-type (Nominatim's policy does not):
//  - Photon (photon.komoot.io), OpenStreetMap data. Strong on Korean places in
//    Korea and on local or English names abroad (大阪城, Ichiran).
//  - Korean Wikipedia's prefix search, with coordinates from the page or from
//    Wikidata. Covers the Korean names of landmarks abroad (오사카성,
//    유니버설 스튜디오 재팬) that OpenStreetMap rarely carries.

export type PlaceSuggestion = {
  /** "osm:W123" or "wikidata:Q123". */
  id: string;
  name: string;
  /** A short line saying where it is, to tell same-named places apart. */
  address: string;
  lat: number;
  lng: number;
};

const LIMIT = 6;
const REQUEST_TIMEOUT_MS = 8_000;
// Photon sometimes takes tens of seconds. Past this it counts as "nothing from
// OpenStreetMap" so Wikipedia's answer isn't held up behind it.
const PHOTON_TIMEOUT_MS = 2_800;
const WIKIDATA_TIMEOUT_MS = 4_000;
const cache = new Map<string, PlaceSuggestion[]>();

const HANGUL = /[\uac00-\ud7a3]/;

/**
 * Searches both sources at once and reports as each one answers, so a slow
 * source never holds back a fast one. `onUpdate` gets the merged list so far
 * and whether a source is still pending. Finished searches are remembered for
 * the session, so retyping or backspacing to an earlier query is instant.
 */
export async function searchPlaces(
  query: string,
  bias: LatLng | null,
  onUpdate: (places: PlaceSuggestion[], pending: boolean) => void,
  signal?: AbortSignal
): Promise<void> {
  const trimmed = query.trim();
  const key = cacheKey(trimmed, bias);
  const cached = cache.get(key);
  if (cached) {
    onUpdate(cached, false);
    return;
  }

  const korean = HANGUL.test(trimmed);
  let osm: PlaceSuggestion[] = [];
  let wiki: PlaceSuggestion[] = [];
  let pending = korean ? 2 : 1;

  // A Korean query is usually the Korean name of a landmark, which Wikipedia
  // knows and OpenStreetMap often doesn't, so its hits lead.
  const emit = () => {
    if (signal?.aborted) return;
    onUpdate(merge(korean ? [...wiki, ...osm] : [...osm, ...wiki]), pending > 0);
  };

  const fromOsm = photon(trimmed, bias, signal)
    .catch(rethrowAbort)
    .then((found) => {
      osm = found;
      pending -= 1;
      emit();
    });
  const fromWiki = korean
    ? koreanWikipedia(trimmed, bias, signal, (found) => {
        wiki = found;
        emit();
      })
        .catch(rethrowAbort)
        .then((found) => {
          wiki = found;
          pending -= 1;
          emit();
        })
    : Promise.resolve();

  await Promise.all([fromOsm, fromWiki]);
  if (!signal?.aborted) cache.set(key, merge(korean ? [...wiki, ...osm] : [...osm, ...wiki]));
}

function cacheKey(query: string, bias: LatLng | null) {
  return `${query.trim().toLowerCase()}|${bias ? `${bias.lat.toFixed(1)},${bias.lng.toFixed(1)}` : ""}`;
}

/** A finished search for this query from earlier in the session, if any. */
export function cachedPlaces(query: string, bias: LatLng | null): PlaceSuggestion[] | undefined {
  return cache.get(cacheKey(query, bias));
}

function merge(candidates: PlaceSuggestion[]) {
  const merged: PlaceSuggestion[] = [];
  for (const place of candidates) {
    if (merged.some((kept) => distanceKm(kept, place) < 0.2)) continue;
    merged.push(place);
    if (merged.length >= LIMIT) break;
  }
  return merged;
}

function rethrowAbort(error: unknown): PlaceSuggestion[] {
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  // A timeout or a failed request is simply no results from that source.
  if (!(error instanceof DOMException && error.name === "TimeoutError")) console.warn(error);
  return [];
}

async function getJson(url: string, signal?: AbortSignal, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
};

async function photon(query: string, bias: LatLng | null, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: String(LIMIT) });
  if (bias) {
    // Lean toward the trip's region without hiding places elsewhere.
    params.set("lat", bias.lat.toFixed(4));
    params.set("lon", bias.lng.toFixed(4));
    params.set("zoom", "10");
    params.set("location_bias_scale", "0.5");
  }
  const data = (await getJson(`https://photon.komoot.io/api/?${params}`, signal, PHOTON_TIMEOUT_MS)) as {
    features?: PhotonFeature[];
  };
  const results: PlaceSuggestion[] = [];
  for (const feature of data.features ?? []) {
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    const props = feature.properties ?? {};
    const name = props.name ?? [props.street, props.housenumber].filter(Boolean).join(" ");
    if (!name || typeof lat !== "number" || typeof lng !== "number") continue;
    const street = [props.street, props.housenumber].filter(Boolean).join(" ");
    const address = unique([street, props.district, props.city ?? props.county, props.state, props.country])
      .filter((part) => part !== name)
      .join(", ");
    results.push({ id: `osm:${props.osm_type ?? ""}${props.osm_id ?? `${lat},${lng}`}`, name, address, lat, lng });
  }
  return results;
}

type WikiPage = {
  title: string;
  index?: number;
  description?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  pageprops?: { wikibase_item?: string };
};

async function koreanWikipedia(
  query: string,
  bias: LatLng | null,
  signal: AbortSignal | undefined,
  onEarly: (places: PlaceSuggestion[]) => void
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "prefixsearch",
    gpssearch: query,
    gpslimit: "8",
    prop: "coordinates|pageprops|description",
    ppprop: "wikibase_item"
  });
  const data = (await getJson(`https://ko.wikipedia.org/w/api.php?${params}`, signal)) as {
    query?: { pages?: WikiPage[] };
  };
  const pages = [...(data.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const toPlaces = (fromWikidata: Map<string, LatLng>) => {
    const results: PlaceSuggestion[] = [];
    for (const page of pages) {
      const own = page.coordinates?.[0];
      const point = own
        ? { lat: own.lat, lng: own.lon }
        : page.pageprops?.wikibase_item
          ? fromWikidata.get(page.pageprops.wikibase_item)
          : undefined;
      if (!point) continue;
      results.push({
        id: page.pageprops?.wikibase_item ? `wikidata:${page.pageprops.wikibase_item}` : `kowiki:${page.title}`,
        name: page.title,
        address: page.description ?? "",
        ...point
      });
    }
    // Same-named landmarks on other continents sink below nearby ones.
    if (bias) results.sort((a, b) => Number(distanceKm(a, bias) > 3000) - Number(distanceKm(b, bias) > 3000));
    return results;
  };

  // Many place articles carry their coordinates only on Wikidata, whose query
  // service can be slow, so the pages that have their own are shown first.
  // Pages with neither (people, events) simply drop out.
  const missing = pages
    .filter((page) => !page.coordinates?.length && page.pageprops?.wikibase_item)
    .map((page) => page.pageprops!.wikibase_item!);
  if (!missing.length) return toPlaces(new Map());
  onEarly(toPlaces(new Map()));
  const fromWikidata = await wikidataCoordinates(missing, signal).catch(rethrowAbortMap);
  return toPlaces(fromWikidata);
}

function rethrowAbortMap(error: unknown): Map<string, LatLng> {
  rethrowAbort(error);
  return new Map();
}

async function wikidataCoordinates(ids: string[], signal?: AbortSignal): Promise<Map<string, LatLng>> {
  const values = ids.filter((id) => /^Q\d+$/.test(id)).map((id) => `wd:${id}`).join(" ");
  const sparql = `SELECT ?item ?coord WHERE { VALUES ?item { ${values} } ?item wdt:P625 ?coord }`;
  const params = new URLSearchParams({ format: "json", query: sparql });
  const data = (await getJson(`https://query.wikidata.org/sparql?${params}`, signal, WIKIDATA_TIMEOUT_MS)) as {
    results?: { bindings?: Array<{ item?: { value: string }; coord?: { value: string } }> };
  };
  const found = new Map<string, LatLng>();
  for (const row of data.results?.bindings ?? []) {
    const id = row.item?.value.split("/").pop();
    const match = row.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (id && match && !found.has(id)) found.set(id, { lng: Number(match[1]), lat: Number(match[2]) });
  }
  return found;
}

function unique(parts: Array<string | undefined>) {
  return [...new Set(parts.filter((part): part is string => Boolean(part && part.trim())))];
}

export function distanceKm(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}

/** A Google Maps link that drops a pin on the place — no API key involved. */
export function googleMapsPlaceUrl(point: LatLng) {
  const params = new URLSearchParams({ api: "1", query: `${point.lat},${point.lng}` });
  return `https://www.google.com/maps/search/?${params}`;
}

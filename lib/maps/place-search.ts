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
const cache = new Map<string, PlaceSuggestion[]>();

const HANGUL = /[가-힣]/;

export async function searchPlaces(
  query: string,
  bias: LatLng | null,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  const key = `${trimmed.toLowerCase()}|${bias ? `${bias.lat.toFixed(1)},${bias.lng.toFixed(1)}` : ""}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const korean = HANGUL.test(trimmed);
  const [osm, wiki] = await Promise.all([
    photon(trimmed, bias, signal).catch(rethrowAbort),
    korean ? koreanWikipedia(trimmed, bias, signal).catch(rethrowAbort) : Promise.resolve([])
  ]);

  // A Korean query is usually the Korean name of a landmark, which Wikipedia
  // knows and OpenStreetMap often doesn't, so its hits lead.
  const merged: PlaceSuggestion[] = [];
  for (const place of korean ? [...wiki, ...osm] : [...osm, ...wiki]) {
    if (merged.some((kept) => distanceKm(kept, place) < 0.2)) continue;
    merged.push(place);
    if (merged.length >= LIMIT) break;
  }
  cache.set(key, merged);
  return merged;
}

function rethrowAbort(error: unknown): PlaceSuggestion[] {
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  console.warn(error);
  return [];
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
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
  const data = (await getJson(`https://photon.komoot.io/api/?${params}`, signal)) as {
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

async function koreanWikipedia(query: string, bias: LatLng | null, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
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

  // Many place articles carry their coordinates only on Wikidata. Pages with
  // neither (people, events) simply drop out, which is what we want.
  const missing = pages
    .filter((page) => !page.coordinates?.length && page.pageprops?.wikibase_item)
    .map((page) => page.pageprops!.wikibase_item!);
  const fromWikidata = missing.length ? await wikidataCoordinates(missing, signal).catch(rethrowAbortMap) : new Map();

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
}

function rethrowAbortMap(error: unknown): Map<string, LatLng> {
  rethrowAbort(error);
  return new Map();
}

async function wikidataCoordinates(ids: string[], signal?: AbortSignal): Promise<Map<string, LatLng>> {
  const values = ids.filter((id) => /^Q\d+$/.test(id)).map((id) => `wd:${id}`).join(" ");
  const sparql = `SELECT ?item ?coord WHERE { VALUES ?item { ${values} } ?item wdt:P625 ?coord }`;
  const params = new URLSearchParams({ format: "json", query: sparql });
  const data = (await getJson(`https://query.wikidata.org/sparql?${params}`, signal)) as {
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

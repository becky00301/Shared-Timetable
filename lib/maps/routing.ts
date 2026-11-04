"use client";

import type { LatLng } from "@/lib/maps/geocode";

// Walking and driving times come from the public OSRM servers run by FOSSGIS
// (routing.openstreetmap.de). They are free but best-effort, so answers are
// cached per browser and a failure falls back to a straight line on the map.
// Public transit is not something any free router offers; the route button
// hands that off to Google Maps instead.

export type TravelMode = "foot" | "car";

export type Leg = {
  mode: TravelMode;
  /** Seconds. */
  duration: number;
  /** Metres. */
  distance: number;
  /** [lng, lat] pairs, ready for GeoJSON. */
  geometry: [number, number][];
};

const STORAGE_KEY = "planner-together.routes.v1";
const MAX_STORED = 150;
const REQUEST_TIMEOUT_MS = 12_000;

const ENDPOINTS: Record<TravelMode, string> = {
  foot: "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
  car: "https://routing.openstreetmap.de/routed-car/route/v1/driving"
};

const memoryCache = new Map<string, Leg | null>();
let storageLoaded = false;

function legKey(from: LatLng, to: LatLng, mode: TravelMode) {
  const point = (p: LatLng) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`;
  return `${mode}:${point(from)};${point(to)}`;
}

function loadStorage() {
  if (storageLoaded) return;
  storageLoaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Leg | null>;
    for (const [key, value] of Object.entries(parsed)) memoryCache.set(key, value);
  } catch {
    // Start fresh if the store is unreadable.
  }
}

function saveStorage() {
  try {
    const entries = [...memoryCache].slice(-MAX_STORED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Quota or private mode — the memory cache still works for this visit.
  }
}

/** A route between two points, or null when the router has none. Throws on network failure. */
export async function fetchLeg(from: LatLng, to: LatLng, mode: TravelMode): Promise<Leg | null> {
  loadStorage();
  const key = legKey(from, to, mode);
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const response = await fetch(
    `${ENDPOINTS[mode]}/${coordinates}?overview=simplified&geometries=geojson`,
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
  );
  if (!response.ok) throw new Error(`Routing failed: ${response.status}`);
  const data = (await response.json()) as {
    code?: string;
    routes?: Array<{ duration: number; distance: number; geometry?: { coordinates?: [number, number][] } }>;
  };

  const route = data.code === "Ok" ? data.routes?.[0] : undefined;
  const leg: Leg | null = route
    ? {
        mode,
        duration: route.duration,
        distance: route.distance,
        geometry: route.geometry?.coordinates ?? [
          [from.lng, from.lat],
          [to.lng, to.lat]
        ]
      }
    : null;

  memoryCache.set(key, leg);
  saveStorage();
  return leg;
}

/** Walking is the natural choice for short hops; anything longer reads better by car. */
export const WALK_LIMIT_SECONDS = 20 * 60;

export function transitDirectionsUrl(from: LatLng, to: LatLng) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: "transit"
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

"use client";

// Geocoding is billed per request, so every address resolved in this browser is
// remembered — in memory for the session and in localStorage across sessions.
// Addresses that resolve to nothing are cached too, otherwise a typo would be
// re-billed on every open.

export type LatLng = { lat: number; lng: number };

const STORAGE_KEY = "planner-together.geocode.v1";
const REQUEST_TIMEOUT_MS = 10_000;

const memoryCache = new Map<string, LatLng | null>();
let storageLoaded = false;

function normalize(address: string) {
  return address.trim().toLowerCase();
}

function loadStorage() {
  if (storageLoaded) return;
  storageLoaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value === null) {
        memoryCache.set(key, null);
      } else if (isLatLng(value)) {
        memoryCache.set(key, value);
      }
    }
  } catch {
    // A corrupt or unavailable store just means we geocode again.
  }
}

function saveStorage() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memoryCache)));
  } catch {
    // Private mode or a full quota — the in-memory cache still helps.
  }
}

function isLatLng(value: unknown): value is LatLng {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LatLng).lat === "number" &&
    typeof (value as LatLng).lng === "number"
  );
}

/**
 * Resolve addresses in order, reusing cached answers. Requests run one at a
 * time: a day holds a handful of stops, and bursts risk OVER_QUERY_LIMIT.
 */
export async function geocodeAddresses(addresses: string[]): Promise<Map<string, LatLng | null>> {
  loadStorage();
  const resolved = new Map<string, LatLng | null>();
  const unique = [...new Set(addresses.map(normalize))].filter(Boolean);
  const pending = unique.filter((key) => !memoryCache.has(key));

  if (pending.length) {
    const geocoder = new google.maps.Geocoder();
    let cached = false;
    for (const key of pending) {
      const outcome = await geocodeOne(geocoder, key);
      // A denied or timed-out request says nothing about the address, so it is
      // left uncached and retried the next time the map opens.
      if (!outcome.cacheable) continue;
      memoryCache.set(key, outcome.position);
      cached = true;
    }
    if (cached) saveStorage();
  }

  for (const address of addresses) {
    const key = normalize(address);
    resolved.set(address, memoryCache.get(key) ?? null);
  }
  return resolved;
}

// The callback form is used rather than the promise-returning overload: the
// latter is missing whenever the API loads in a degraded state (bad key, quota),
// which would leave the caller awaiting `undefined` forever.
type Outcome = { position: LatLng | null; cacheable: boolean };

function geocodeOne(geocoder: google.maps.Geocoder, address: string): Promise<Outcome> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: Outcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    window.setTimeout(() => finish({ position: null, cacheable: false }), REQUEST_TIMEOUT_MS);
    try {
      geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
          const location = results?.[0]?.geometry?.location;
          finish({
            position: location ? { lat: location.lat(), lng: location.lng() } : null,
            cacheable: true
          });
          return;
        }
        // ZERO_RESULTS is a real answer — the common one for a free-form note
        // like "호텔 로비" — while denials and quota errors are not.
        finish({
          position: null,
          cacheable: status === google.maps.GeocoderStatus.ZERO_RESULTS
        });
      });
    } catch {
      finish({ position: null, cacheable: false });
    }
  });
}

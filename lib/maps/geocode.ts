"use client";

// Free geocoding: OpenStreetMap's Nominatim first, then Wikipedia/Wikidata for
// landmarks whose Korean name OSM doesn't carry (e.g. "유니버설 스튜디오 재팬").
// Nominatim's usage policy asks for at most one request per second and for
// results to be cached, so every answer — including "not found" — is kept in
// memory and in localStorage, and requests are spaced out.

export type LatLng = { lat: number; lng: number };

const STORAGE_KEY = "planner-together.geocode.v2";
const REQUEST_TIMEOUT_MS = 10_000;
const NOMINATIM_GAP_MS = 1_100;

const memoryCache = new Map<string, LatLng | null>();
let storageLoaded = false;
let lastNominatimAt = 0;

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

/** Resolve addresses in order, reusing cached answers. Requests run one at a time. */
export async function geocodeAddresses(
  addresses: string[],
  language: string
): Promise<Map<string, LatLng | null>> {
  loadStorage();
  const resolved = new Map<string, LatLng | null>();
  const unique = [...new Set(addresses.map(normalize))].filter(Boolean);
  const pending = unique.filter((key) => !memoryCache.has(key));

  if (pending.length) {
    let cached = false;
    for (const key of pending) {
      const outcome = await geocodeOne(key, language);
      // A failed request says nothing about the address, so it is left
      // uncached and retried the next time the map opens.
      if (!outcome.cacheable) continue;
      memoryCache.set(key, outcome.position);
      cached = true;
    }
    if (cached) saveStorage();
  }

  for (const address of addresses) {
    resolved.set(address, memoryCache.get(normalize(address)) ?? null);
  }
  return resolved;
}

type Outcome = { position: LatLng | null; cacheable: boolean };

async function geocodeOne(address: string, language: string): Promise<Outcome> {
  try {
    const fromOsm = await nominatim(address, language);
    if (fromOsm) return { position: fromOsm, cacheable: true };
    const fromWiki = await wikipedia(address);
    return { position: fromWiki, cacheable: true };
  } catch {
    return { position: null, cacheable: false };
  }
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function nominatim(address: string, language: string): Promise<LatLng | null> {
  const wait = lastNominatimAt + NOMINATIM_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
  lastNominatimAt = Date.now();

  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    "accept-language": language
  });
  const results = (await getJson(`https://nominatim.openstreetmap.org/search?${params}`)) as Array<{
    lat?: string;
    lon?: string;
  }>;
  const first = results?.[0];
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) && first ? { lat, lng } : null;
}

type WikiPage = {
  title: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  pageprops?: { wikibase_item?: string };
};

/**
 * Only a page whose title is the address itself (ignoring spacing) counts — a
 * loose search hit like "ANA 호텔스" for "난바 오리엔탈 호텔" would pin the
 * wrong place, which is worse than no pin.
 */
async function wikipedia(address: string): Promise<LatLng | null> {
  const wiki = /[가-힣]/.test(address) ? "ko" : "en";
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: address,
    gsrlimit: "1",
    prop: "coordinates|pageprops",
    ppprop: "wikibase_item"
  });
  const data = (await getJson(`https://${wiki}.wikipedia.org/w/api.php?${params}`)) as {
    query?: { pages?: Record<string, WikiPage> };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || squash(page.title) !== squash(address)) return null;

  const coordinate = page.coordinates?.[0];
  if (coordinate) return { lat: coordinate.lat, lng: coordinate.lon };

  const entity = page.pageprops?.wikibase_item;
  if (!entity) return null;
  const claimParams = new URLSearchParams({
    action: "wbgetclaims",
    format: "json",
    origin: "*",
    entity,
    property: "P625"
  });
  const claims = (await getJson(`https://www.wikidata.org/w/api.php?${claimParams}`)) as {
    claims?: { P625?: Array<{ mainsnak?: { datavalue?: { value?: { latitude: number; longitude: number } } } }> };
  };
  const value = claims.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  return value ? { lat: value.latitude, lng: value.longitude } : null;
}

function squash(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

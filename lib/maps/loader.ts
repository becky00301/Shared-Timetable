"use client";

// The Maps JS API can only be booted once per page, so every caller shares one
// promise. The key is public by design (it belongs in the browser); restrict it
// by HTTP referrer in the Google Cloud console rather than trying to hide it.

const CALLBACK_NAME = "__plannerTogetherMapsReady";

let loadPromise: Promise<void> | null = null;

export function googleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
}

export function loadGoogleMaps(language: string): Promise<void> {
  if (loadPromise) return loadPromise;

  const key = googleMapsApiKey();
  if (!key) return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set."));

  loadPromise = new Promise<void>((resolve, reject) => {
    const globals = window as unknown as Record<string, unknown>;
    globals[CALLBACK_NAME] = () => {
      delete globals[CALLBACK_NAME];
      resolve();
    };

    const params = new URLSearchParams({
      key,
      language,
      v: "weekly",
      // Geocoding lives outside the core bundle; without it the Geocoder
      // constructor exists but its methods do nothing.
      libraries: "geocoding",
      loading: "async",
      callback: CALLBACK_NAME
    });

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      // Let a later attempt retry from scratch: a network blip shouldn't wedge
      // the map for the rest of the session.
      loadPromise = null;
      script.remove();
      reject(new Error("Failed to load the Google Maps script."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

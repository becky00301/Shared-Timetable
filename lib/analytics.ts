// Product events for Google Analytics, sent through the GTM container's
// dataLayer. GTM forwards them to GA4 (one GA4 Event tag on a Custom Event
// trigger). Only counts and kinds go out: never titles, notes, emails,
// slugs or tokens.

export type AnalyticsEvent =
  | { event: "sign_up"; method: AuthMethod }
  | { event: "login"; method: AuthMethod }
  | { event: "create_project"; project_kind: "weekly" | "daterange"; day_count: number }
  | { event: "add_schedule" }
  | { event: "share_project"; share_type: "invite_link" | "guest_link" }
  | { event: "join_project"; role: string };

export type AuthMethod = "email" | "google" | "naver";

type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

export function track(payload: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer || [];
  // GTM keeps every key it has seen, so the other events' parameters are
  // cleared here; otherwise a later event would inherit an earlier `method`.
  w.dataLayer.push({ method: undefined, project_kind: undefined, day_count: undefined, share_type: undefined, role: undefined, ...payload });
}

/** Set by the OAuth callback for one page load, then read and cleared by
    AuthEventTracker: the sign-in itself happens on the server. */
export const AUTH_EVENT_COOKIE = "pt_auth_event";

export function authMethodFromProvider(provider: string | undefined): AuthMethod {
  if (provider === "google") return "google";
  if (provider?.includes("naver")) return "naver";
  return "email";
}

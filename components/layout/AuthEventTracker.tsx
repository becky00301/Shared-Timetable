"use client";

import { useEffect } from "react";
import { AUTH_EVENT_COOKIE, track, type AuthMethod } from "@/lib/analytics";

/** Sends the sign-up or login that the OAuth callback finished on the
    server, then drops the cookie that carried it. */
export function AuthEventTracker() {
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_EVENT_COOKIE}=([^;]*)`));
    if (!match) return;
    document.cookie = `${AUTH_EVENT_COOKIE}=; Max-Age=0; Path=/`;
    const [kind, method] = decodeURIComponent(match[1]).split(":");
    if ((kind === "sign_up" || kind === "login") && (method === "email" || method === "google" || method === "naver")) {
      track({ event: kind, method: method as AuthMethod });
    }
  }, []);
  return null;
}

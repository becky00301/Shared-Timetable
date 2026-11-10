"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SCHEDULE_PHOTO_BUCKET } from "@/lib/schedule-photos";

/** How long a signed photo URL lasts, and how close to that it is renewed. */
const SIGNED_URL_SECONDS = 6 * 60 * 60;
const RENEW_MARGIN_MS = 10 * 60 * 1000;

type PhotoUrl = { url: string; expiresAt: number };

type PhotoState = {
  /** Storage path → a URL the browser can show. */
  urls: Record<string, PhotoUrl>;
  /** Shows a photo straight away, before or without signing — used right
      after an upload with the local file. */
  rememberUrl: (path: string, url: string, expiresAt?: number) => void;
  /** Signs any of these paths that are not already signed. Batched, so a
      timetable of many photos asks once. */
  request: (path: string) => void;
};

const queued = new Set<string>();
const inFlight = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export const usePhotoStore = create<PhotoState>((set, get) => ({
  urls: {},

  rememberUrl: (path, url, expiresAt = Number.POSITIVE_INFINITY) => {
    set((state) => ({ urls: { ...state.urls, [path]: { url, expiresAt } } }));
  },

  request: (path) => {
    const known = get().urls[path];
    if (known && known.expiresAt - RENEW_MARGIN_MS > Date.now()) return;
    if (inFlight.has(path)) return;
    queued.add(path);
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush(set);
    }, 0);
  }
}));

async function flush(set: (fn: (state: PhotoState) => Partial<PhotoState>) => void) {
  const paths = [...queued];
  queued.clear();
  if (!paths.length) return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  paths.forEach((path) => inFlight.add(path));
  try {
    const { data, error } = await supabase.storage
      .from(SCHEDULE_PHOTO_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error) throw error;
    const expiresAt = Date.now() + SIGNED_URL_SECONDS * 1000;
    const signed: Record<string, PhotoUrl> = {};
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl && !entry.error) {
        signed[entry.path] = { url: entry.signedUrl, expiresAt };
      }
    }
    set((state) => ({ urls: { ...state.urls, ...signed } }));
  } catch (error) {
    // A missing photo just leaves the box in its colour.
    console.error(error);
  } finally {
    paths.forEach((path) => inFlight.delete(path));
  }
}

/** A displayable URL for a schedule's photo, or null while it is being signed
    (or when the item has none). */
export function useSchedulePhotoUrl(path: string | null | undefined) {
  const url = usePhotoStore((state) => (path ? state.urls[path]?.url ?? null : null));
  const request = usePhotoStore((state) => state.request);
  useEffect(() => {
    if (path) request(path);
  }, [path, request]);
  return url;
}

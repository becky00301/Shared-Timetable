import "server-only";

import { SCHEDULE_PHOTO_BUCKET } from "@/lib/schedule-photos";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EmbeddedTimetableData } from "@/lib/embed/timetable";

/** Long enough to read the page, short enough that a copied image URL stops
    working soon after the link it came from is rotated. */
const EMBED_PHOTO_SECONDS = 60 * 60;

/**
 * Turns the photo paths get_embedded_timetable returned into signed URLs. The
 * read-only link has no signed-in member to read the private bucket as, so
 * this signs with the service key — only paths the RPC returned for this
 * token's project, which the schedule_items check keeps inside that project.
 */
export async function signEmbeddedPhotos(timetable: EmbeddedTimetableData): Promise<EmbeddedTimetableData> {
  const paths = [
    ...new Set(timetable.schedules.map((item) => item.image_path).filter((path): path is string => Boolean(path)))
  ];
  if (!paths.length) return timetable;
  const admin = createSupabaseAdminClient();
  if (!admin) return timetable;

  const { data, error } = await admin.storage
    .from(SCHEDULE_PHOTO_BUCKET)
    .createSignedUrls(paths, EMBED_PHOTO_SECONDS);
  if (error) {
    console.error(error);
    return timetable;
  }
  const urls = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl && !entry.error) urls.set(entry.path, entry.signedUrl);
  }
  return {
    ...timetable,
    schedules: timetable.schedules.map((item) => ({
      ...item,
      image_url: item.image_path ? urls.get(item.image_path) ?? null : null
    }))
  };
}

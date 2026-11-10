import { NextResponse } from "next/server";
import { signEmbeddedPhotos } from "@/lib/embed/photos";
import { EMBED_TOKEN_PATTERN, parseTimetable } from "@/lib/embed/timetable";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Photo URLs for the signed-out invite preview, which loads the read-only
    timetable in the browser and cannot sign them itself. Keyed by schedule id. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!EMBED_TOKEN_PATTERN.test(token)) return NextResponse.json({}, { status: 404 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({}, { status: 500 });
  const { data, error } = await supabase.rpc("get_embedded_timetable", { embed_token_value: token });
  const timetable = error ? null : parseTimetable(data);
  if (!timetable) return NextResponse.json({}, { status: 404 });

  const signed = await signEmbeddedPhotos(timetable);
  const urls: Record<string, string> = {};
  for (const item of signed.schedules) {
    if (item.image_url) urls[item.id] = item.image_url;
  }
  return NextResponse.json(urls, { headers: { "Cache-Control": "no-store" } });
}

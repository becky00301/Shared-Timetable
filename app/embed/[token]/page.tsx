import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbeddedTimetable } from "@/components/embed/EmbeddedTimetable";
import { EMBED_TOKEN_PATTERN, parseTimetable } from "@/lib/embed/timetable";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The metadata and the page body need the same payload, so the lookup is
// memoised for the request rather than fetched twice. A bad token returns null
// instead of throwing: the page turns that into a 404, while the metadata just
// keeps the generic title.
const loadTimetable = cache(async (token: string) => {
  if (!EMBED_TOKEN_PATTERN.test(token)) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("get_embedded_timetable", {
    embed_token_value: token
  });
  if (error) {
    console.error(error);
    return null;
  }
  return parseTimetable(data);
});

export async function generateMetadata({
  params
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const timetable = await loadTimetable(token);
  // Falls back to the generic name so a dead link says nothing about whether
  // the token ever existed.
  return { title: timetable?.project.title || "공유 시간표" };
}

export default async function EmbedPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { token } = await params;
  const { view } = await searchParams;
  const timetable = await loadTimetable(token);
  if (!timetable) notFound();

  return (
    <EmbeddedTimetable
      title={timetable.project.title}
      slug={timetable.project.slug}
      kind={timetable.project.kind}
      days={timetable.days}
      schedules={timetable.schedules}
      standalone={view === "page"}
    />
  );
}

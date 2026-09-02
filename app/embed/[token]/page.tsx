import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  EmbeddedTimetable,
  type EmbeddedDay,
  type EmbeddedSchedule
} from "@/components/embed/EmbeddedTimetable";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { ProjectKind } from "@/types/project";

export const dynamic = "force-dynamic";

// The metadata and the page body need the same payload, so the lookup is
// memoised for the request rather than fetched twice. A bad token returns null
// instead of throwing: the page turns that into a 404, while the metadata just
// keeps the generic title.
const loadTimetable = cache(async (token: string) => {
  if (!/^[a-f0-9]{32}$/i.test(token)) return null;

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

export default async function EmbedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const timetable = await loadTimetable(token);
  if (!timetable) notFound();

  return (
    <EmbeddedTimetable
      title={timetable.project.title}
      slug={timetable.project.slug}
      kind={timetable.project.kind}
      days={timetable.days}
      schedules={timetable.schedules}
    />
  );
}

function parseTimetable(value: Json | null): {
  project: { title: string; slug: string; kind: ProjectKind };
  days: EmbeddedDay[];
  schedules: EmbeddedSchedule[];
} | null {
  if (!isRecord(value) || !isRecord(value.project)) return null;
  const project = value.project;
  if (
    typeof project.title !== "string" ||
    typeof project.slug !== "string" ||
    (project.kind !== "weekly" && project.kind !== "daterange") ||
    !Array.isArray(value.days) ||
    !Array.isArray(value.schedules)
  ) {
    return null;
  }

  const days = value.days.filter(isEmbeddedDay);
  const schedules = value.schedules.filter(isEmbeddedSchedule);
  if (days.length !== value.days.length || schedules.length !== value.schedules.length) return null;

  return {
    project: { title: project.title, slug: project.slug, kind: project.kind },
    days,
    schedules
  };
}

function isRecord(value: Json | null | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmbeddedDay(value: Json): value is EmbeddedDay {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.sort_order === "number"
  );
}

function isEmbeddedSchedule(value: Json): value is EmbeddedSchedule {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.day_id === "string" &&
    (value.end_day_id === null || typeof value.end_day_id === "string") &&
    typeof value.title === "string" &&
    (value.location === null || typeof value.location === "string") &&
    typeof value.start_time === "string" &&
    typeof value.end_time === "string" &&
    (value.color === null || typeof value.color === "string") &&
    typeof value.all_day === "boolean"
  );
}

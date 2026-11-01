import type { EmbeddedDay, EmbeddedSchedule } from "@/components/embed/EmbeddedTimetable";
import type { Json } from "@/types/database";
import type { ProjectKind } from "@/types/project";

/** The read-only embed key a project carries: 32 hex characters. */
export const EMBED_TOKEN_PATTERN = /^[a-f0-9]{32}$/i;

export type EmbeddedTimetableData = {
  project: { title: string; slug: string; kind: ProjectKind };
  days: EmbeddedDay[];
  schedules: EmbeddedSchedule[];
};

/** Checks the shape get_embedded_timetable returns. Shared by the embed page
    and the invite page's signed-out preview. */
export function parseTimetable(value: Json | null): EmbeddedTimetableData | null {
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

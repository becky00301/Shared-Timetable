import { getDay } from "date-fns";
import type { ProjectDay } from "@/types/project";

/** Works out how to move a timetable onto `dates`. Dates already present are
    reported as kept — with their existing row id — so their schedules survive
    the change; only the ones falling outside are dropped. */
export function diffDays(current: ProjectDay[], dates: string[]) {
  const wanted = new Set(dates);
  const existing = new Set(current.map((day) => day.date));
  return {
    dropped: current.filter((day) => !wanted.has(day.date)),
    kept: current.filter((day) => wanted.has(day.date)),
    added: [...new Set(dates)].filter((date) => !existing.has(date))
  };
}

/** Chronological sort_order for a final date list. */
export function sortOrderFor(dates: string[]) {
  return new Map([...dates].sort().map((date, index) => [date, index]));
}

// Weekly timetables are reordered to start on the chosen weekday (월/일 toggle).
// Date-range timetables always keep their chronological sort_order, where
// weekday ordering would scramble a multi-week trip.
export function orderDays(
  days: ProjectDay[],
  weekStartsOnSunday: boolean,
  isWeekly: boolean
): ProjectDay[] {
  const sorted = [...days].sort((a, b) => a.sort_order - b.sort_order || a.date.localeCompare(b.date));
  if (!isWeekly || sorted.length === 0 || sorted.length > 7) return sorted;

  const weekdays = sorted.map((day) => getDay(new Date(day.date)));
  if (new Set(weekdays).size !== sorted.length) return sorted;

  const start = weekStartsOnSunday ? 0 : 1;
  return [...sorted].sort(
    (a, b) =>
      ((getDay(new Date(a.date)) - start + 7) % 7) - ((getDay(new Date(b.date)) - start + 7) % 7)
  );
}

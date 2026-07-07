import { getDay } from "date-fns";
import type { ProjectDay } from "@/types/project";

// A weekly frame (≤7 days, all weekdays distinct) is reordered to start on the
// chosen weekday, matching the standalone tool's 월/일 toggle. Arbitrary date
// ranges keep their chronological sort_order, where weekday ordering would
// scramble the timeline.
export function orderDays(days: ProjectDay[], weekStartsOnSunday: boolean): ProjectDay[] {
  const sorted = [...days].sort((a, b) => a.sort_order - b.sort_order || a.date.localeCompare(b.date));
  if (sorted.length === 0 || sorted.length > 7) return sorted;

  const weekdays = sorted.map((day) => getDay(new Date(day.date)));
  if (new Set(weekdays).size !== sorted.length) return sorted;

  const start = weekStartsOnSunday ? 0 : 1;
  return [...sorted].sort(
    (a, b) =>
      ((getDay(new Date(a.date)) - start + 7) % 7) - ((getDay(new Date(b.date)) - start + 7) % 7)
  );
}

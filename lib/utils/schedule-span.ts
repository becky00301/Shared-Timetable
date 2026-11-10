import { DAY_END_MINUTES, minutesToTime, timeToMinutes } from "@/lib/utils/time";

/**
 * Timed items can run past midnight: 23:00 on one date to 01:00 on the next.
 * Such an item keeps its start date in day_id and its end date in end_day_id,
 * and its end_time is on that end date. "Next date" means the next column of
 * the timetable, in the order the days are shown.
 */
type TimedFields = {
  day_id: string;
  end_day_id?: string | null;
  start_time: string;
  end_time: string;
  all_day?: boolean | null;
};

/** The part of a timed item that falls on one date. */
export type DaySegment = {
  dayId: string;
  startMinutes: number;
  endMinutes: number;
  /** Holds the item's start (and its top edge). */
  first: boolean;
  /** Holds the item's end (and its bottom edge). */
  last: boolean;
};

/** Index of the day the item ends on, or -1 when it ends on its start day. A
    stale or backwards end_day_id counts as the start day. */
function endIndex(item: TimedFields, dayOrder: string[]) {
  if (item.all_day || !item.end_day_id || item.end_day_id === item.day_id) return -1;
  const start = dayOrder.indexOf(item.day_id);
  const end = dayOrder.indexOf(item.end_day_id);
  return start !== -1 && end > start ? end : -1;
}

export function isOvernight(item: TimedFields, dayOrder: string[]) {
  return endIndex(item, dayOrder) !== -1;
}

/** One segment per date the item touches, in order. A same-day item is a
    single segment; one whose end looks earlier than its start without a later
    end date is shown ending at midnight. */
export function timedSegments(item: TimedFields, dayOrder: string[]): DaySegment[] {
  const start = timeToMinutes(item.start_time);
  const end = timeToMinutes(item.end_time);
  const last = endIndex(item, dayOrder);
  if (last === -1) {
    return [
      {
        dayId: item.day_id,
        startMinutes: start,
        endMinutes: end > start ? end : DAY_END_MINUTES,
        first: true,
        last: true
      }
    ];
  }
  const first = dayOrder.indexOf(item.day_id);
  const segments: DaySegment[] = [];
  for (let index = first; index <= last; index += 1) {
    segments.push({
      dayId: dayOrder[index],
      startMinutes: index === first ? start : 0,
      endMinutes: index === last ? end : DAY_END_MINUTES,
      first: index === first,
      last: index === last
    });
  }
  // An end of exactly 00:00 on the next date adds nothing to draw there.
  return segments.filter((segment) => segment.endMinutes > segment.startMinutes);
}

/** The item's start and end as minutes from the first column's midnight. */
export function absoluteSpan(item: TimedFields, dayOrder: string[]) {
  const startIndex = Math.max(0, dayOrder.indexOf(item.day_id));
  const last = endIndex(item, dayOrder);
  const start = startIndex * DAY_END_MINUTES + timeToMinutes(item.start_time);
  const endDay = last === -1 ? startIndex : last;
  let end = endDay * DAY_END_MINUTES + timeToMinutes(item.end_time);
  if (end <= start) end = startIndex * DAY_END_MINUTES + DAY_END_MINUTES;
  return { start, end };
}

/** Turns absolute minutes back into the item's fields. An end at exactly
    midnight stays on the earlier date as 24:00. */
export function fromAbsoluteSpan(start: number, end: number, dayOrder: string[]) {
  const startIndex = Math.min(dayOrder.length - 1, Math.floor(start / DAY_END_MINUTES));
  const endIndexValue = Math.min(dayOrder.length - 1, Math.ceil(end / DAY_END_MINUTES) - 1);
  const endMinutes = end - endIndexValue * DAY_END_MINUTES;
  return {
    day_id: dayOrder[startIndex],
    end_day_id: endIndexValue > startIndex ? dayOrder[endIndexValue] : null,
    start_time: minutesToTime(start - startIndex * DAY_END_MINUTES),
    end_time: minutesToTime(endMinutes)
  };
}

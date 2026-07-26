"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { useDateFormat } from "@/lib/i18n/dates";

export const MAX_RANGE_DAYS = 31;

export function RangeCalendar({
  rangeStart,
  rangeEnd,
  onChange
}: {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}) {
  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()));
  const t = useT();
  const fmt = useDateFormat();

  const calendarCells = useMemo(() => {
    const first = startOfMonth(calMonth);
    const last = endOfMonth(calMonth);
    const cells: (Date | null)[] = Array.from({ length: getDay(first) }, () => null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      cells.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), day));
    }
    return cells;
  }, [calMonth]);

  function pickDate(date: Date) {
    if (!rangeStart || rangeEnd) {
      onChange(date, null);
      return;
    }
    if (date < rangeStart) {
      onChange(date, null);
      return;
    }
    const dayCount = Math.round((date.getTime() - rangeStart.getTime()) / 86400000) + 1;
    if (dayCount > MAX_RANGE_DAYS) {
      toast.error(t("cal.maxRange", { count: MAX_RANGE_DAYS }));
      return;
    }
    onChange(rangeStart, date);
  }

  const inRange = (date: Date) => rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd;
  const isEdge = (date: Date, edge: Date | null) =>
    edge && format(date, "yyyy-MM-dd") === format(edge, "yyyy-MM-dd");

  return (
    <>
      <div className="rounded-xl border border-border bg-black/[0.03] p-4">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCalMonth((month) => addMonths(month, -1))}>
            ‹
          </Button>
          <span className="text-sm font-medium text-foreground">{fmt.yearMonth(calMonth)}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCalMonth((month) => addMonths(month, 1))}>
            ›
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {fmt.weekdays().map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((date, index) =>
            date ? (
              <button
                key={index}
                type="button"
                onClick={() => pickDate(date)}
                className={cn(
                  "rounded-lg py-2 text-sm text-foreground transition hover:bg-black/10",
                  inRange(date) && "bg-primary/30",
                  (isEdge(date, rangeStart) || isEdge(date, rangeEnd)) && "bg-primary text-white"
                )}
              >
                {date.getDate()}
              </button>
            ) : (
              <span key={index} />
            )
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        {rangeStart && rangeEnd
          ? t("cal.rangeSummary", {
              start: fmt.monthDay(rangeStart),
              end: fmt.monthDay(rangeEnd),
              count: Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1
            })
          : rangeStart
            ? t("cal.clickEnd", { start: fmt.monthDay(rangeStart) })
            : t("cal.clickStart")}
      </p>
    </>
  );
}

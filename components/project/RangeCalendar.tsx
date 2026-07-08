"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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
      toast.error(`최대 ${MAX_RANGE_DAYS}일까지 선택할 수 있어요.`);
      return;
    }
    onChange(rangeStart, date);
  }

  const inRange = (date: Date) => rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd;
  const isEdge = (date: Date, edge: Date | null) =>
    edge && format(date, "yyyy-MM-dd") === format(edge, "yyyy-MM-dd");

  return (
    <>
      <div className="rounded-xl border border-border bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCalMonth((month) => addMonths(month, -1))}>
            ‹
          </Button>
          <span className="text-sm font-medium text-white">{format(calMonth, "yyyy년 M월")}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCalMonth((month) => addMonths(month, 1))}>
            ›
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {WEEKDAY_LABELS.map((label) => (
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
                  "rounded-lg py-2 text-sm text-white transition hover:bg-white/10",
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
          ? `${format(rangeStart, "M월 d일")} ~ ${format(rangeEnd, "M월 d일")} (${Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1}일)`
          : rangeStart
            ? `${format(rangeStart, "M월 d일")} ~ 종료일을 클릭하세요`
            : "시작일을 클릭하세요"}
      </p>
    </>
  );
}

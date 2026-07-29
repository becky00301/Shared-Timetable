"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useDateFormat } from "@/lib/i18n/dates";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

export function MonthCalendarView({ projectId, days }: { projectId: string; days: ProjectDay[] }) {
  const schedules = useProjectStore((state) => state.schedules).filter(
    (item) => item.project_id === projectId
  );
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const weekStartsOnSunday = useUiStore((state) => state.weekStartsOnSunday);
  const fmt = useDateFormat();

  const dayByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const [month, setMonth] = useState(() =>
    startOfMonth(days.length ? new Date(days[0].date) : new Date())
  );

  const weekStart = weekStartsOnSunday ? 0 : 1;
  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, index) => fmt.weekday((weekStart + index) % 7)),
    [weekStart, fmt]
  );

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const leading = (getDay(first) - weekStart + 7) % 7;
    const list: (Date | null)[] = Array.from({ length: leading }, () => null);
    for (let dayNum = 1; dayNum <= last.getDate(); dayNum += 1) {
      list.push(new Date(month.getFullYear(), month.getMonth(), dayNum));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [month, weekStart]);

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-background p-4">
      <div className="mb-3 flex items-center justify-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setMonth((current) => addMonths(current, -1))}>
          ‹
        </Button>
        <span className="min-w-28 text-center text-sm font-medium text-foreground">
          {fmt.yearMonth(month)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setMonth((current) => addMonths(current, 1))}>
          ›
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted sm:text-xs">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      {/* Rows size to their content so every schedule is listed, no "+N more". */}
      <div className="grid auto-rows-auto grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={index} className="rounded-lg" />;
          const iso = format(date, "yyyy-MM-dd");
          const projectDay = dayByDate.get(iso);
          const dayItems = projectDay
            ? schedules
                .filter((item) => item.day_id === projectDay.id)
                .sort(
                  (a, b) =>
                    Number(b.all_day) - Number(a.all_day) || a.start_time.localeCompare(b.start_time)
                )
            : [];

          return (
            <div
              key={index}
              className={cn(
                "min-h-20 rounded-lg border p-1.5 text-left align-top",
                projectDay ? "border-primary/40 bg-primary/[0.07]" : "border-border/50 bg-card/40 opacity-50"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-[10px] sm:text-xs",
                  iso === today ? "bg-primary font-semibold text-white" : "text-foreground"
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSchedule(item.id)}
                    title={item.title}
                    className="block w-full rounded-[4px] px-1 py-0.5 text-left transition hover:opacity-80 sm:px-1.5"
                    style={{ backgroundColor: `${item.color ?? "#1972F7"}55` }}
                  >
                    {/* `button { font: inherit }` in globals.css beats any
                        text-size utility on the button itself, so the size
                        has to live on these spans instead. Time and title get
                        their own line so neither has to share width with the
                        other before truncating. */}
                    {item.all_day ? (
                      <span className="block truncate text-[10px] text-foreground sm:text-xs">
                        {item.title}
                      </span>
                    ) : (
                      <>
                        <span className="block truncate text-[10px] text-foreground sm:text-xs">
                          {item.start_time.slice(0, 5)}
                        </span>
                        <span className="block truncate text-[10px] text-foreground sm:text-xs">
                          {item.title}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

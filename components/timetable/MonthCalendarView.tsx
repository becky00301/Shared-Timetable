"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

const WEEKDAY_LABELS_SUN = ["일", "월", "화", "수", "목", "금", "토"];

export function MonthCalendarView({
  projectId,
  days,
  canEdit
}: {
  projectId: string;
  days: ProjectDay[];
  canEdit: boolean;
}) {
  const schedules = useProjectStore((state) => state.schedules).filter(
    (item) => item.project_id === projectId
  );
  const openScheduleModal = useUiStore((state) => state.openScheduleModal);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const weekStartsOnSunday = useUiStore((state) => state.weekStartsOnSunday);

  const dayByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const [month, setMonth] = useState(() =>
    startOfMonth(days.length ? new Date(days[0].date) : new Date())
  );

  const weekStart = weekStartsOnSunday ? 0 : 1;
  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, index) => WEEKDAY_LABELS_SUN[(weekStart + index) % 7]),
    [weekStart]
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
          {format(month, "yyyy년 M월")}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setMonth((current) => addMonths(current, 1))}>
          ›
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={index} className="rounded-lg" />;
          const iso = format(date, "yyyy-MM-dd");
          const projectDay = dayByDate.get(iso);
          const dayItems = projectDay
            ? schedules
                .filter((item) => item.day_id === projectDay.id)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
            : [];

          return (
            <div
              key={index}
              onClick={() => {
                if (projectDay && canEdit) {
                  openScheduleModal({ day_id: projectDay.id, start_time: "09:00", end_time: "10:00" });
                }
              }}
              className={cn(
                "min-h-20 rounded-lg border p-1.5 text-left align-top",
                projectDay
                  ? "border-primary/40 bg-primary/[0.07]"
                  : "border-border/50 bg-card/40 opacity-50",
                projectDay && canEdit && "cursor-pointer transition hover:border-primary"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  iso === today ? "bg-primary font-semibold text-white" : "text-foreground"
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedSchedule(item.id);
                      openScheduleModal(null, item);
                    }}
                    className="truncate rounded px-1.5 py-0.5 text-left text-xs text-foreground transition hover:opacity-80"
                    style={{ backgroundColor: `${item.color ?? "#1972F7"}55` }}
                  >
                    {item.start_time.slice(0, 5)} {item.title}
                  </button>
                ))}
                {dayItems.length > 3 ? (
                  <span className="px-1.5 text-xs text-muted">+{dayItems.length - 3}개 더</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

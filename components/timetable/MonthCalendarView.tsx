"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useDateFormat } from "@/lib/i18n/dates";
import { useT } from "@/lib/i18n/locale";
import { timedSegments } from "@/lib/utils/schedule-span";
import { nextFreeHour } from "@/lib/utils/time";
import { getScheduleTextColor } from "@/lib/utils/schedule-colors";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";

export function MonthCalendarView({
  projectId,
  days,
  canEdit = false
}: {
  projectId: string;
  days: ProjectDay[];
  canEdit?: boolean;
}) {
  const schedules = useProjectStore((state) => state.schedules).filter(
    (item) => item.project_id === projectId
  );
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const upsertSchedule = useProjectStore((state) => state.upsertSchedule);
  const t = useT();
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
  const dayOrder = days.map((day) => day.id);
  // Where an event sits in a date's list: a carried-over one starts at 00:00.
  const startOn = (item: ScheduleItem, dayId: string) => (item.day_id === dayId ? item.start_time : "00:00");
  // A timed event that runs past midnight is listed on the next date too.
  const continuesInto = (item: ScheduleItem, dayId: string) =>
    !item.all_day &&
    item.day_id !== dayId &&
    timedSegments(item, dayOrder).some((segment) => segment.dayId === dayId);

  // Same as drawing one on the grid, minus the drag: a named-later event at
  // the next free hour, opened in the detail panel to set its name and time.
  function addSchedule(dayId: string, dayItems: ScheduleItem[]) {
    upsertSchedule({
      project_id: projectId,
      day_id: dayId,
      title: t("grid.newSchedule"),
      ...nextFreeHour(dayItems)
    })
      .then((item) => setSelectedSchedule(item.id))
      .catch((error) => {
        console.error(error);
        toast.error(t("grid.scheduleSaveFailed"));
      });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto overscroll-none bg-background p-4 pb-24 lg:pb-4">
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
                .filter((item) => item.day_id === projectDay.id || continuesInto(item, projectDay.id))
                .sort(
                  (a, b) =>
                    Number(b.all_day) - Number(a.all_day) ||
                    startOn(a, projectDay.id).localeCompare(startOn(b, projectDay.id))
                )
            : [];

          return (
            <div
              key={index}
              className={cn(
                "group min-h-20 rounded-lg border p-1.5 text-left align-top",
                projectDay ? "border-primary/40 bg-primary/[0.07]" : "border-border/50 bg-card/40 opacity-50"
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-[10px] sm:text-xs",
                    iso === today ? "bg-primary font-semibold text-white" : "text-foreground"
                  )}
                >
                  {date.getDate()}
                </span>
                {canEdit && projectDay ? (
                  <button
                    type="button"
                    onClick={() => addSchedule(projectDay.id, dayItems)}
                    aria-label={t("month.addSchedule")}
                    title={t("month.addSchedule")}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/6 hover:text-foreground focus-visible:opacity-100 pointer-coarse:hidden pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
                  >
                    <Plus size={14} />
                  </button>
                ) : null}
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-schedule-id={item.id}
                    onClick={() => setSelectedSchedule(item.id)}
                    title={item.title}
                    className="block w-full rounded-[4px] px-1 py-0.5 text-left transition hover:opacity-80 sm:px-1.5"
                    style={{
                      backgroundColor: item.color ?? "#1972F7",
                      color: getScheduleTextColor(item.color ?? "#1972F7")
                    }}
                  >
                    {/* `button { font: inherit }` in globals.css beats any
                        text-size utility on the button itself, so the size
                        has to live on these spans instead. Time and title get
                        their own line so neither has to share width with the
                        other before truncating. */}
                    {item.all_day ? (
                      <span className="block truncate text-[10px] text-current sm:text-xs">
                        {item.title}
                      </span>
                    ) : (
                      <>
                        <span className="block truncate text-[10px] text-current sm:text-xs">
                          {item.day_id === projectDay?.id
                            ? item.start_time.slice(0, 5)
                            : `~${item.end_time.slice(0, 5)}`}
                        </span>
                        <span className="block truncate text-[10px] text-current sm:text-xs">
                          {item.title}
                        </span>
                      </>
                    )}
                  </button>
                ))}
                {/* A phone's cell is too narrow for a button beside the date,
                    so a finger gets a full-width row under the events. */}
                {canEdit && projectDay ? (
                  <button
                    type="button"
                    onClick={() => addSchedule(projectDay.id, dayItems)}
                    aria-label={t("month.addSchedule")}
                    className="hidden h-6 w-full items-center justify-center rounded-[4px] bg-black/[0.04] text-muted pointer-coarse:flex"
                  >
                    <Plus size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

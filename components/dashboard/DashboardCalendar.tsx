"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useDateFormat } from "@/lib/i18n/dates";
import { useT } from "@/lib/i18n/locale";
import { useUiStore } from "@/stores/ui-store";
import type { Project, ProjectDay } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";

type CalendarEntry = {
  item: ScheduleItem;
  project: Project;
  date: string;
};

export function DashboardCalendar({
  projects,
  days,
  schedules
}: {
  projects: Project[];
  days: ProjectDay[];
  schedules: ScheduleItem[];
}) {
  const router = useRouter();
  const t = useT();
  const fmt = useDateFormat();
  const weekStartsOnSunday = useUiStore((state) => state.weekStartsOnSunday);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );
  const daysByProject = useMemo(() => {
    const grouped = new Map<string, ProjectDay[]>();
    for (const day of days) {
      const projectDays = grouped.get(day.project_id) ?? [];
      projectDays.push(day);
      grouped.set(day.project_id, projectDays);
    }
    for (const projectDays of grouped.values()) {
      projectDays.sort((left, right) => left.date.localeCompare(right.date));
    }
    return grouped;
  }, [days]);

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>();

    function addEntry(entry: CalendarEntry) {
      const entries = grouped.get(entry.date) ?? [];
      entries.push(entry);
      grouped.set(entry.date, entries);
    }

    for (const item of schedules) {
      const project = projectById.get(item.project_id);
      const projectDays = daysByProject.get(item.project_id);
      if (!project || !projectDays) continue;
      const startIndex = projectDays.findIndex((day) => day.id === item.day_id);
      if (startIndex < 0) continue;

      let endIndex = startIndex;
      if (item.all_day && item.end_day_id) {
        const candidate = projectDays.findIndex((day) => day.id === item.end_day_id);
        if (candidate >= startIndex) endIndex = candidate;
      }

      for (let index = startIndex; index <= endIndex; index += 1) {
        addEntry({ item, project, date: projectDays[index].date });
      }
    }

    for (const entries of grouped.values()) {
      entries.sort(
        (left, right) =>
          Number(right.item.all_day) - Number(left.item.all_day) ||
          left.item.start_time.localeCompare(right.item.start_time) ||
          left.project.title.localeCompare(right.project.title)
      );
    }
    return grouped;
  }, [daysByProject, projectById, schedules]);

  const weekStart = weekStartsOnSunday ? 0 : 1;
  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, index) => fmt.weekday((weekStart + index) % 7)),
    [fmt, weekStart]
  );
  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const leading = (getDay(first) - weekStart + 7) % 7;
    const dates: (Date | null)[] = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      dates.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    while (dates.length % 7 !== 0) dates.push(null);
    return dates;
  }, [month, weekStart]);
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedEntries = entriesByDate.get(selectedDate) ?? [];

  function moveMonth(offset: number) {
    const nextMonth = addMonths(month, offset);
    setMonth(nextMonth);
    setSelectedDate(format(startOfMonth(nextMonth), "yyyy-MM-dd"));
  }

  function goToToday() {
    const now = new Date();
    setMonth(startOfMonth(now));
    setSelectedDate(format(now, "yyyy-MM-dd"));
  }

  function openSchedule(entry: CalendarEntry) {
    setSelectedSchedule(entry.item.id);
    router.push(`/plans/${entry.project.slug}`);
  }

  return (
    <section className="mt-6" aria-label={t("dashboard.calendar")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h2 className="text-lg font-semibold text-foreground">{t("dashboard.calendar")}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="rounded-md p-2 text-muted transition hover:bg-black/6 hover:text-foreground"
            aria-label={t("dashboard.previousMonth")}
            title={t("dashboard.previousMonth")}
          >
            <ChevronLeft size={17} />
          </button>
          <span className="min-w-28 text-center text-sm font-medium text-foreground">
            {fmt.yearMonth(month)}
          </span>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="rounded-md p-2 text-muted transition hover:bg-black/6 hover:text-foreground"
            aria-label={t("dashboard.nextMonth")}
            title={t("dashboard.nextMonth")}
          >
            <ChevronRight size={17} />
          </button>
          <Button variant="outline" size="sm" className="ml-1" onClick={goToToday}>
            {t("dashboard.today")}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 border-b border-border text-center text-[10px] font-medium text-muted sm:text-xs">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-2">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-border">
        {cells.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="min-h-24 border-b border-r border-border bg-surface/40 sm:min-h-32" />;
          }

          const iso = format(date, "yyyy-MM-dd");
          const entries = entriesByDate.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={cn(
                "min-h-24 min-w-0 border-b border-r border-border bg-background p-1 sm:min-h-32 sm:p-1.5",
                iso === today && "bg-primary/[0.04]",
                iso === selectedDate && "bg-surface sm:bg-background"
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedDate(iso)}
                aria-label={`${fmt.monthDay(date)} ${fmt.weekday(date.getDay())}`}
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-[10px] tabular-nums sm:text-xs",
                  iso === today ? "bg-primary font-semibold text-white" : "text-foreground"
                )}
              >
                {date.getDate()}
              </button>
              <div className="mt-1 hidden min-w-0 flex-col gap-1 sm:flex">
                {entries.map((entry) => (
                  <button
                    key={`${entry.item.id}-${iso}`}
                    type="button"
                    onClick={() => openSchedule(entry)}
                    title={`${entry.project.title} · ${entry.item.title}`}
                    className="min-w-0 overflow-hidden rounded-[4px] border-l-2 bg-surface px-1 py-1 text-left transition hover:bg-black/6 sm:px-1.5"
                    style={{ borderLeftColor: entry.item.color ?? "#1972F7" }}
                  >
                    <span className="block truncate text-[8px] font-medium text-muted sm:text-[10px]">
                      {entry.project.title}
                    </span>
                    <span className="block truncate text-[9px] leading-tight text-foreground sm:text-xs">
                      {entry.item.all_day ? "" : `${entry.item.start_time.slice(0, 5)} `}
                      {entry.item.title}
                    </span>
                  </button>
                ))}
              </div>
              {entries.length ? (
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                  {entries.slice(0, 4).map((entry) => (
                    <span
                      key={`${entry.item.id}-${iso}`}
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: entry.item.color ?? "#1972F7" }}
                    />
                  ))}
                  {entries.length > 4 ? (
                    <span className="text-[8px] leading-none text-muted">+{entries.length - 4}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-x border-b border-border p-3 sm:hidden">
        <h3 className="text-sm font-semibold text-foreground">
          {fmt.monthDay(new Date(`${selectedDate}T00:00:00`))}{" "}
          {fmt.weekday(new Date(`${selectedDate}T00:00:00`).getDay())}
        </h3>
        {selectedEntries.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {selectedEntries.map((entry) => (
              <button
                key={`${entry.item.id}-${selectedDate}-agenda`}
                type="button"
                onClick={() => openSchedule(entry)}
                className="flex min-w-0 items-start gap-3 rounded-[4px] border border-border bg-surface p-3 text-left transition hover:bg-black/6"
              >
                <span
                  className="mt-1 h-9 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.item.color ?? "#1972F7" }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-muted">{entry.project.title}</span>
                  <span className="mt-0.5 block text-sm font-medium text-foreground">
                    {entry.item.title}
                  </span>
                  <span className="mt-1 block text-xs tabular-nums text-muted">
                    {entry.item.all_day
                      ? t("grid.allDay")
                      : `${entry.item.start_time.slice(0, 5)} - ${entry.item.end_time.slice(0, 5)}`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">{t("dashboard.noSchedulesForDay")}</p>
        )}
      </div>
    </section>
  );
}

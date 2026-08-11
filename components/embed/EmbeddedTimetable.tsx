"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { TimeColumn } from "@/components/timetable/TimeColumn";
import { useDateFormat } from "@/lib/i18n/dates";
import { useT } from "@/lib/i18n/locale";
import { durationToHeight, formatTimeRange, minutesToTop, timeToMinutes } from "@/lib/utils/time";
import type { ProjectKind } from "@/types/project";

export type EmbeddedDay = {
  id: string;
  date: string;
  sort_order: number;
};

export type EmbeddedSchedule = {
  id: string;
  day_id: string;
  end_day_id: string | null;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string;
  color: string | null;
  all_day: boolean;
};

type PositionedSchedule = {
  item: EmbeddedSchedule;
  lane: number;
  laneCount: number;
};

type AllDaySpan = {
  item: EmbeddedSchedule;
  start: number;
  end: number;
  lane: number;
};

const HOUR_HEIGHT = 54;
const MIN_DAY_WIDTH = 112;

function positionSchedules(schedules: EmbeddedSchedule[]): PositionedSchedule[] {
  const sorted = [...schedules].sort((a, b) => {
    const startDifference = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    if (startDifference !== 0) return startDifference;
    return timeToMinutes(b.end_time) - timeToMinutes(a.end_time) || a.id.localeCompare(b.id);
  });
  const groups: EmbeddedSchedule[][] = [];
  let groupEnd = -1;

  for (const item of sorted) {
    const start = timeToMinutes(item.start_time);
    const end = timeToMinutes(item.end_time);
    if (!groups.length || start >= groupEnd) {
      groups.push([item]);
      groupEnd = end;
    } else {
      groups[groups.length - 1].push(item);
      groupEnd = Math.max(groupEnd, end);
    }
  }

  return groups.flatMap((group) => {
    const laneEnds: number[] = [];
    const positioned = group.map((item) => {
      const start = timeToMinutes(item.start_time);
      const end = timeToMinutes(item.end_time);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      return { item, lane };
    });

    return positioned.map(({ item, lane }) => ({ item, lane, laneCount: laneEnds.length }));
  });
}

function packAllDay(items: EmbeddedSchedule[], days: EmbeddedDay[]): AllDaySpan[] {
  const indexByDay = new Map(days.map((day, index) => [day.id, index]));
  const spans = items
    .map((item) => {
      const start = indexByDay.get(item.day_id);
      if (start === undefined) return null;
      const rawEnd = item.end_day_id ? indexByDay.get(item.end_day_id) : undefined;
      return { item, start, end: rawEnd === undefined ? start : Math.max(start, rawEnd) };
    })
    .filter((span): span is Omit<AllDaySpan, "lane"> => span !== null)
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const laneEnds: number[] = [];

  return spans.map((span) => {
    let lane = laneEnds.findIndex((end) => end < span.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.end);
    } else {
      laneEnds[lane] = span.end;
    }
    return { ...span, lane };
  });
}

export function EmbeddedTimetable({
  title,
  slug,
  kind,
  days,
  schedules
}: {
  title: string;
  slug: string;
  kind: ProjectKind;
  days: EmbeddedDay[];
  schedules: EmbeddedSchedule[];
}) {
  const router = useRouter();
  const fmt = useDateFormat();
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.sort_order - b.sort_order || a.date.localeCompare(b.date)),
    [days]
  );
  const allDaySpans = useMemo(
    () => packAllDay(schedules.filter((item) => item.all_day), sortedDays),
    [schedules, sortedDays]
  );
  const laneCount = allDaySpans.reduce((max, span) => Math.max(max, span.lane + 1), 0);

  useEffect(() => {
    const timedSchedules = schedules.filter((item) => !item.all_day);
    const earliest = timedSchedules.reduce(
      (minimum, item) => Math.min(minimum, timeToMinutes(item.start_time)),
      24 * 60
    );
    if (scrollRef.current && earliest < 24 * 60) {
      scrollRef.current.scrollTop = Math.max(0, (earliest / 60) * HOUR_HEIGHT - 72);
    }
  }, [schedules]);

  useEffect(() => {
    const refresh = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(refresh);
  }, [router]);

  const projectHref = `/plans/${slug}`;
  const minWidth = 64 + sortedDays.length * MIN_DAY_WIDTH;

  return (
    <a
      href={projectHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("embed.openProject")}
      className="flex h-dvh cursor-pointer flex-col overflow-hidden bg-background text-foreground no-underline"
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4">
        <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
          <span className="rounded-full border border-border bg-background px-2.5 py-1">{t("embed.readOnly")}</span>
          <ExternalLink size={17} aria-hidden="true" />
        </div>
      </header>

      {sortedDays.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 text-sm text-muted">{t("embed.empty")}</div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-background">
          <div className="min-w-full" style={{ width: Math.max(minWidth, 1) }}>
            <div className="sticky top-0 z-30 flex bg-surface">
              <div className="h-12 w-16 shrink-0 border-b border-r border-border" />
              <div className="flex flex-1">
                {sortedDays.map((day) => {
                  const date = new Date(day.date);
                  return (
                    <div
                      key={day.id}
                      className="flex h-12 min-w-28 flex-1 items-center justify-center border-b border-r border-border last:border-r-0"
                    >
                      <div className="text-center">
                        <p className="text-xs font-semibold">
                          {kind === "weekly" ? fmt.weekday(date.getDay()) : fmt.monthDay(date)}
                        </p>
                        {kind === "weekly" ? null : (
                          <p className="mt-0.5 text-[10px] text-muted">{fmt.weekday(date.getDay())}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex bg-surface">
              <div className="w-16 shrink-0 border-b border-r border-border pr-2 pt-1 text-right text-[10px] text-muted">
                {t("grid.allDay")}
              </div>
              <div
                className="relative flex-1 border-b border-border"
                style={{ height: Math.max(26, laneCount * 26 + 4) }}
              >
                {allDaySpans.map((span) => (
                  <div
                    key={span.item.id}
                    className="absolute flex items-center overflow-hidden rounded-[4px] px-1.5 text-[10px] font-medium text-white"
                    style={{
                      left: `${(span.start / sortedDays.length) * 100}%`,
                      width: `${((span.end - span.start + 1) / sortedDays.length) * 100}%`,
                      top: span.lane * 26 + 2,
                      height: 22,
                      backgroundColor: span.item.color ?? "#1972F7"
                    }}
                  >
                    <span className="truncate">{span.item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex">
              <TimeColumn hourHeight={HOUR_HEIGHT} />
              <div className="flex flex-1">
                {sortedDays.map((day) => (
                  <StaticDayColumn
                    key={day.id}
                    schedules={schedules.filter((item) => item.day_id === day.id && !item.all_day)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </a>
  );
}

function StaticDayColumn({ schedules }: { schedules: EmbeddedSchedule[] }) {
  const positioned = positionSchedules(schedules);

  return (
    <div className="min-w-28 flex-1 border-r border-border last:border-r-0">
      <div
        className="timetable-grid relative"
        style={{ height: HOUR_HEIGHT * 24, "--hour-h": `${HOUR_HEIGHT}px` } as React.CSSProperties}
      >
        {positioned.map(({ item, lane, laneCount }) => {
          const split = laneCount > 1;
          return (
            <div
              key={item.id}
              title={`${item.title} (${formatTimeRange(item.start_time, item.end_time)})`}
              className="absolute z-10 overflow-hidden rounded-[4px] border border-black/20 px-1.5 py-1.5 text-left shadow-sm"
              style={{
                top: minutesToTop(timeToMinutes(item.start_time), HOUR_HEIGHT),
                height: Math.max(28, durationToHeight(item.start_time, item.end_time, HOUR_HEIGHT)),
                left: `calc(${(lane / laneCount) * 100}% + ${lane === 0 ? 3 : 1}px)`,
                right: `calc(${((laneCount - lane - 1) / laneCount) * 100}% + ${lane === laneCount - 1 ? 3 : 1}px)`,
                backgroundColor: item.color ?? "#1972F7"
              }}
            >
              <p className={split ? "truncate text-[9px] font-semibold leading-tight text-white" : "text-[10px] font-semibold leading-tight text-white [overflow-wrap:anywhere]"}>
                {item.title}
              </p>
              <p className="mt-0.5 truncate text-[8px] leading-tight text-white/85">
                {formatTimeRange(item.start_time.slice(0, 5), item.end_time.slice(0, 5))}
              </p>
              {item.location ? (
                <p className="mt-0.5 truncate text-[8px] leading-tight text-white/75">{item.location}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

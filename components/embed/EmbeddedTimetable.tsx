"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeColumn } from "@/components/timetable/TimeColumn";
import { useDateFormat } from "@/lib/i18n/dates";
import { useT } from "@/lib/i18n/locale";
import { photoFocusPosition } from "@/lib/schedule-photos";
import { getScheduleTextColor } from "@/lib/utils/schedule-colors";
import {
  PHOTO_TEXT_COLOR,
  PHOTO_TEXT_SHADOW,
  SchedulePhotoBackdrop
} from "@/components/timetable/SchedulePhotoBackdrop";
import { timedSegments, type DaySegment } from "@/lib/utils/schedule-span";
import { formatTimeRange, minutesToTop, timeToMinutes } from "@/lib/utils/time";
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
  /** Storage path of the item's photo, as the RPC returns it. */
  image_path?: string | null;
  /** A signed URL for that photo, filled in on the server. */
  image_url?: string | null;
  /** The photo's focal point, in percent. */
  image_focus_x?: number | null;
  image_focus_y?: number | null;
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

function positionSchedules(
  schedules: EmbeddedSchedule[],
  segments: Record<string, DaySegment>
): PositionedSchedule[] {
  const startOf = (item: EmbeddedSchedule) => segments[item.id]?.startMinutes ?? timeToMinutes(item.start_time);
  const endOf = (item: EmbeddedSchedule) => segments[item.id]?.endMinutes ?? timeToMinutes(item.end_time);
  const sorted = [...schedules].sort((a, b) => {
    const startDifference = startOf(a) - startOf(b);
    if (startDifference !== 0) return startDifference;
    return endOf(b) - endOf(a) || a.id.localeCompare(b.id);
  });
  const groups: EmbeddedSchedule[][] = [];
  let groupEnd = -1;

  for (const item of sorted) {
    const start = startOf(item);
    const end = endOf(item);
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
      const start = startOf(item);
      const end = endOf(item);
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
  schedules,
  standalone = false,
  joinHref
}: {
  title: string;
  slug: string;
  kind: ProjectKind;
  days: EmbeddedDay[];
  schedules: EmbeddedSchedule[];
  /** Opened as a page in someone's browser rather than inside an iframe.
      Embedded, the whole surface is a link into the project — in a tab that
      only throws a signed-out reader at the login screen, so the page gets a
      header they can act on instead. */
  standalone?: boolean;
  /** Set when the reader came through a project link: they can join, so the
      one action is to log in and edit, in place of the stranger's choices. */
  joinHref?: string;
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
  // Timed events per column; one past midnight appears in each column it
  // touches, placed by its part on that date.
  const timedByDay = useMemo(() => {
    const order = sortedDays.map((day) => day.id);
    const byDay = new Map<string, { items: EmbeddedSchedule[]; segments: Record<string, DaySegment> }>();
    for (const day of sortedDays) byDay.set(day.id, { items: [], segments: {} });
    for (const item of schedules) {
      if (item.all_day) continue;
      const segments = timedSegments(item, order);
      for (const segment of segments) {
        const column = byDay.get(segment.dayId);
        if (!column) continue;
        column.items.push(item);
        if (segments.length > 1) column.segments[item.id] = segment;
      }
    }
    return byDay;
  }, [schedules, sortedDays]);
  const minWidth = 48 + sortedDays.length * MIN_DAY_WIDTH; // 48: TimeColumn w-12

  const frameClass = "flex h-dvh flex-col overflow-hidden bg-background text-foreground";
  const header = standalone ? (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
        <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted">
          {t("embed.readOnly")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {joinHref ? (
          <Button asChild size="sm">
            <Link href={joinHref}>{t("invite.preview.join")}</Link>
          </Button>
        ) : (
          <>
            {/* Editing this timetable takes an invite from its owner, so the
                prominent action is the one a stranger can actually take. */}
            <Button asChild size="sm">
              <Link href="/dashboard">{t("embed.makeOwn")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/login?next=${encodeURIComponent(projectHref)}`}>{t("embed.memberLogin")}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  ) : (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4">
      <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
        <span className="rounded-full border border-border bg-background px-2.5 py-1">{t("embed.readOnly")}</span>
        <ExternalLink size={17} aria-hidden="true" />
      </div>
    </header>
  );

  const body = (
    <>
      {header}

      {sortedDays.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 text-sm text-muted">{t("embed.empty")}</div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-background">
          <div className="min-w-full" style={{ width: Math.max(minWidth, 1) }}>
            <div className="sticky top-0 z-30 flex bg-surface">
              <div className="h-12 w-12 shrink-0 border-b border-r border-border" />
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
              <div className="w-12 shrink-0 border-b border-r border-border pr-2 pt-1 text-right text-[10px] text-muted">
                {t("grid.allDay")}
              </div>
              <div
                className="relative flex-1 border-b border-border"
                style={{ height: Math.max(26, laneCount * 26 + 4) }}
              >
                {allDaySpans.map((span) => (
                  <div
                    key={span.item.id}
                    className="absolute flex items-center overflow-hidden rounded-[4px] px-1.5 text-[10px] font-medium"
                    style={{
                      left: `${(span.start / sortedDays.length) * 100}%`,
                      width: `${((span.end - span.start + 1) / sortedDays.length) * 100}%`,
                      top: span.lane * 26 + 2,
                      height: 22,
                      backgroundColor: span.item.color ?? "#1972F7",
                      color: getScheduleTextColor(span.item.color ?? "#1972F7")
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
                    schedules={timedByDay.get(day.id)?.items ?? []}
                    segments={timedByDay.get(day.id)?.segments ?? {}}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // In an iframe the whole surface stays a link into the project, which is how
  // a Notion reader gets from the preview to the real thing.
  return standalone ? (
    <div className={frameClass}>{body}</div>
  ) : (
    <a
      href={projectHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("embed.openProject")}
      className={`${frameClass} cursor-pointer no-underline`}
    >
      {body}
    </a>
  );
}

function StaticDayColumn({
  schedules,
  segments
}: {
  schedules: EmbeddedSchedule[];
  segments: Record<string, DaySegment>;
}) {
  const positioned = positionSchedules(schedules, segments);

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
                top: minutesToTop(segments[item.id]?.startMinutes ?? timeToMinutes(item.start_time), HOUR_HEIGHT),
                height: Math.max(
                  28,
                  minutesToTop(
                    (segments[item.id]?.endMinutes ?? timeToMinutes(item.end_time)) -
                      (segments[item.id]?.startMinutes ?? timeToMinutes(item.start_time)),
                    HOUR_HEIGHT
                  )
                ),
                left: `calc(${(lane / laneCount) * 100}% + ${lane === 0 ? 3 : 1}px)`,
                right: `calc(${((laneCount - lane - 1) / laneCount) * 100}% + ${lane === laneCount - 1 ? 3 : 1}px)`,
                backgroundColor: item.color ?? "#1972F7",
                color: item.image_url ? PHOTO_TEXT_COLOR : getScheduleTextColor(item.color ?? "#1972F7")
              }}
            >
              {item.image_url ? (
                <SchedulePhotoBackdrop
                  url={item.image_url}
                  position={photoFocusPosition(item.image_focus_x, item.image_focus_y)}
                />
              ) : null}
              <div className={item.image_url ? `relative ${PHOTO_TEXT_SHADOW}` : "relative"}>
              <p className={split ? "truncate text-[9px] font-semibold leading-tight text-current" : "text-[10px] font-semibold leading-tight text-current [overflow-wrap:anywhere]"}>
                {item.title}
              </p>
              <p className="mt-0.5 truncate text-[8px] leading-tight text-current opacity-[0.82]">
                {formatTimeRange(item.start_time.slice(0, 5), item.end_time.slice(0, 5))}
              </p>
              {item.location ? (
                <p className="mt-0.5 truncate text-[8px] leading-tight text-current opacity-70">{item.location}</p>
              ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

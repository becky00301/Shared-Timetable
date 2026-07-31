"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { toast } from "sonner";
import { AllDayBand } from "@/components/timetable/AllDayBand";
import { DateColumn } from "@/components/timetable/DateColumn";
import { LiveCursors } from "@/components/timetable/LiveCursors";
import { TimeColumn } from "@/components/timetable/TimeColumn";
import { useLiveCursors } from "@/lib/supabase/cursors";
import { useT } from "@/lib/i18n/locale";
import { useDateFormat } from "@/lib/i18n/dates";
import { cn } from "@/lib/utils/cn";
import {
  DAY_END_MINUTES,
  MIN_DURATION_MINUTES,
  minutesToTime,
  pointerYToTime,
  snapMinutes,
  timeToMinutes,
  zoomToHourHeight
} from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay, ProjectMember } from "@/types/project";

export function TimetableGrid({
  projectId,
  days,
  members,
  canEdit,
  weekdayOnly
}: {
  projectId: string;
  days: ProjectDay[];
  members: ProjectMember[];
  canEdit: boolean;
  weekdayOnly?: boolean;
}) {
  const schedules = useProjectStore((state) => state.schedules).filter((item) => item.project_id === projectId);
  const availability = useProjectStore((state) => state.availability).filter((slot) => slot.project_id === projectId);
  const upsertSchedule = useProjectStore((state) => state.upsertSchedule);
  const deleteSchedule = useProjectStore((state) => state.deleteSchedule);
  const addAvailability = useProjectStore((state) => state.addAvailability);
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const activeMode = useUiStore((state) => state.activeMode);
  const gridZoom = useUiStore((state) => state.gridZoom);
  const initializeGridZoom = useUiStore((state) => state.initializeGridZoom);
  const t = useT();
  const [draft, setDraft] = useState<{
    dayId: string;
    startMinutes: number;
    endMinutes: number;
    naming: boolean;
  } | null>(null);
  const dragRef = useRef<{ dayId: string; start: number; end: number } | null>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timedRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [timedViewportHeight, setTimedViewportHeight] = useState(0);
  const allDayItems = schedules.filter((item) => item.all_day);

  useEffect(() => {
    initializeGridZoom(window.matchMedia("(max-width: 639px)").matches);
  }, [initializeGridZoom]);

  // Zooming out past the point where a whole day fits would leave the grid
  // stranded above empty space, so the rows never shrink below one screenful —
  // the same rule the columns follow horizontally.
  const fillHourHeight = timedViewportHeight / 24;
  const hourHeight = Math.max(zoomToHourHeight(gridZoom), fillHourHeight);

  // Live pointers and in-progress draft blocks of everyone else editing this
  // timetable.
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const me = members.find((member) => member.user_id === currentUserId);
  const { cursors, peerDrafts } = useLiveCursors({
    projectId,
    userId: currentUserId,
    name: me?.user?.name || me?.user?.email?.split("@")[0] || t("role.viewer"),
    contentRef,
    draft: draft
      ? { dayId: draft.dayId, startMinutes: draft.startMinutes, endMinutes: draft.endMinutes }
      : null
  });
  // A small activation distance keeps clicks from registering as drags, so a
  // real drag starts crisply instead of being swallowed by the click handler.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Show up to 7 columns at a time; extra days scroll horizontally. The timed
  // area's own height is measured too, since that's what the rows have to fill.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setViewportWidth(el.clientWidth);
      // offsetTop covers the date headers and the all-day band, neither of
      // which scales — and neither depends on the hour height, so measuring
      // here can't feed back into the size it's about to produce.
      const timed = timedRef.current;
      setTimedViewportHeight(timed ? Math.max(0, el.clientHeight - timed.offsetTop) : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // The all-day band grows with its lanes, moving the timed grid down.
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Rescaling around the top of the viewport would throw the visible hours
  // away, so the time sitting mid-screen is what stays put across a zoom.
  const lastHourHeight = useRef(hourHeight);
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const timed = timedRef.current;
    const previous = lastHourHeight.current;
    lastHourHeight.current = hourHeight;
    if (!scroller || !timed || previous === hourHeight) return;
    // The headers and all-day band above the grid don't scale, so they're
    // excluded from the ratio and added back afterwards.
    const offset = timed.offsetTop;
    const centre = scroller.scrollTop + scroller.clientHeight / 2 - offset;
    if (centre <= 0) return;
    scroller.scrollTop = offset + (centre * hourHeight) / previous - scroller.clientHeight / 2;
  }, [hourHeight]);

  const TIME_COL_WIDTH = 64; // matches TimeColumn w-16
  const MAX_VISIBLE_DAYS = 7;
  const MIN_DAY_COL_WIDTH = 96;
  // Floor for zoomed-out columns: below this the date header stops being
  // readable, so zooming out further only shrinks the hour rows.
  const MIN_ZOOMED_COL_WIDTH = 56;
  const visibleDayCount = Math.min(days.length, MAX_VISIBLE_DAYS);
  const availableWidth = Math.max(0, viewportWidth - TIME_COL_WIDTH);
  // What a column gets when a week of them shares the viewport at 100%.
  const fittedColWidth = viewportWidth && visibleDayCount ? Math.floor(availableWidth / visibleDayCount) : 0;
  const scaledColWidth = Math.max(
    MIN_ZOOMED_COL_WIDTH,
    Math.round(Math.max(MIN_DAY_COL_WIDTH, fittedColWidth) * gridZoom)
  );
  // Fixed widths are only for days that genuinely overflow. The moment they
  // all fit — which zooming out is what makes happen — the columns go back to
  // flexing so they divide the width exactly, instead of being pinned to a
  // rounded pixel width that leaves a gap down the right-hand side.
  const colWidth =
    viewportWidth && scaledColWidth * days.length > availableWidth ? scaledColWidth : undefined;
  const hScroll = colWidth !== undefined;

  function onPointerStart(dayId: string, event: React.PointerEvent<HTMLDivElement>) {
    if (!canEdit || event.button !== 0 || event.target !== event.currentTarget) return;
    // While the rename input is open, this pointerdown fires before the
    // input's blur. Starting a new drag here would replace the draft state
    // the blur handler is about to commit, so let the click only close the
    // naming input.
    if (draft) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = timeToMinutes(pointerYToTime(event.clientY - rect.top, hourHeight));

    if (activeMode === "availability") {
      const onUp = (upEvent: PointerEvent) => {
        const end = timeToMinutes(pointerYToTime(upEvent.clientY - rect.top, hourHeight));
        addAvailability({
          project_id: projectId,
          day_id: dayId,
          start_time: minutesToTime(Math.min(anchor, end)),
          end_time: minutesToTime(Math.max(anchor + MIN_DURATION_MINUTES, end))
        })
          .then(() => toast.success("Availability added."))
          .catch((error) => {
            console.error(error);
            toast.error("Could not save availability.");
          });
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointerup", onUp);
      return;
    }

    dragRef.current = { dayId, start: anchor, end: anchor + MIN_DURATION_MINUTES };
    setDraft({ dayId, startMinutes: anchor, endMinutes: anchor + MIN_DURATION_MINUTES, naming: false });
    const onMove = (moveEvent: PointerEvent) => {
      const current = timeToMinutes(pointerYToTime(moveEvent.clientY - rect.top, hourHeight));
      const start = Math.min(anchor, current);
      const end = Math.min(DAY_END_MINUTES, Math.max(anchor + MIN_DURATION_MINUTES, current));
      if (dragRef.current) {
        dragRef.current.start = start;
        dragRef.current.end = end;
      }
      setDraft((prev) => (prev ? { ...prev, startMinutes: start, endMinutes: end } : prev));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      // Keep the draft local and open the name input; nothing is saved until a
      // name is entered.
      setDraft((prev) => (prev ? { ...prev, naming: true } : prev));
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function createAllDay(startDayId: string, endDayId: string, title: string) {
    upsertSchedule({
      project_id: projectId,
      day_id: startDayId,
      end_day_id: startDayId === endDayId ? null : endDayId,
      title,
      all_day: true,
      start_time: "00:00",
      end_time: "23:59"
    })
      .then((item) => setSelectedSchedule(item.id))
      .catch((error) => {
        console.error(error);
        toast.error(t("grid.allDaySaveFailed"));
      });
  }

  function removeSchedule(id: string) {
    deleteSchedule(id)
      .then(() => {
        if (selectedScheduleId === id) setSelectedSchedule(null);
        toast.success(t("detail.deleted"));
      })
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : t("detail.deleteFailed"));
      });
  }

  function commitDraft(title: string) {
    if (!draft) return;
    const name = title.trim();
    // No name → discard the draft without creating anything.
    if (!name) {
      setDraft(null);
      return;
    }
    upsertSchedule({
      project_id: projectId,
      day_id: draft.dayId,
      title: name,
      start_time: minutesToTime(draft.startMinutes),
      end_time: minutesToTime(draft.endMinutes)
    })
      .then((item) => setSelectedSchedule(item.id))
      .catch((error) => {
        console.error(error);
        toast.error(t("grid.scheduleSaveFailed"));
      });
    setDraft(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const item = schedules.find((schedule) => schedule.id === event.active.id);
    if (!item || !canEdit) return;
    const deltaMinutes = snapMinutes((event.delta.y / hourHeight) * 60);
    const start = Math.max(0, Math.min(DAY_END_MINUTES - MIN_DURATION_MINUTES, timeToMinutes(item.start_time) + deltaMinutes));
    const duration = timeToMinutes(item.end_time) - timeToMinutes(item.start_time);
    const currentDayIndex = days.findIndex((day) => day.id === item.day_id);
    const measuredWidth = colsRef.current ? colsRef.current.offsetWidth / days.length : 208;
    const columnWidth = colWidth ?? measuredWidth;
    const columnShift = Math.round(event.delta.x / Math.max(1, columnWidth));
    const nextDay = days[Math.max(0, Math.min(days.length - 1, currentDayIndex + columnShift))] ?? days[currentDayIndex];
    upsertSchedule({
      ...item,
      day_id: nextDay.id,
      start_time: minutesToTime(start),
      end_time: minutesToTime(Math.min(DAY_END_MINUTES, start + duration))
    }).catch((error) => {
      console.error(error);
      toast.error(`${t("grid.moveFailed")}: ${error instanceof Error ? error.message : ""}`);
    });
  }

  function resizeItem(itemId: string, edge: "top" | "bottom", deltaY: number) {
    const item = schedules.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const deltaMinutes = snapMinutes((deltaY / hourHeight) * 60);
    const start = timeToMinutes(item.start_time);
    const end = timeToMinutes(item.end_time);
    const nextStart = edge === "top" ? Math.min(end - MIN_DURATION_MINUTES, Math.max(0, start + deltaMinutes)) : start;
    const nextEnd = edge === "bottom" ? Math.max(start + MIN_DURATION_MINUTES, Math.min(DAY_END_MINUTES, end + deltaMinutes)) : end;
    upsertSchedule({
      ...item,
      start_time: minutesToTime(nextStart),
      end_time: minutesToTime(nextEnd)
    }).catch((error) => {
      console.error(error);
      toast.error(`${t("grid.resizeFailed")}: ${error instanceof Error ? error.message : ""}`);
    });
  }

  if (!days.length) {
    return (
      <div className="flex min-h-[540px] flex-1 items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">{t("grid.emptyTitle")}</h2>
        </div>
      </div>
    );
  }

  return (
    // autoScroll is off: scrolling mid-drag skews delta against the drop position.
    <DndContext
      id={`timetable-${projectId}`}
      sensors={sensors}
      autoScroll={false}
      onDragEnd={onDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div
        ref={scrollRef}
        id="timetable-export"
        className="min-h-0 flex-1 overflow-auto bg-background"
      >
        <div ref={contentRef} className={cn("relative", hScroll ? "w-max min-w-full" : "min-w-full")}>
          <LiveCursors cursors={cursors} />
          {/* Date headers */}
          <div className="sticky top-0 z-30 flex bg-surface">
            <div className="sticky left-0 z-40 h-12 w-16 shrink-0 border-b border-r border-border bg-surface" />
            <div ref={colsRef} className={hScroll ? "flex" : "flex flex-1"}>
              {days.map((day) => (
                <DayHeaderCell key={day.id} day={day} weekdayOnly={weekdayOnly} width={colWidth} />
              ))}
            </div>
          </div>

          {/* All-day band: one row across every column. It grows to fit every
              lane, pushing the timed grid below it down. Not sticky — a tall
              band would otherwise pin itself over most of the viewport. */}
          <div className="z-30 flex bg-surface">
            <div className="sticky left-0 z-40 w-16 shrink-0 border-b border-r border-border bg-surface pr-2 pt-1 text-right text-[11px] text-muted">
              {t("grid.allDay")}
            </div>
            {/* Bars are positioned as a percentage of this element, so with
                fixed-width columns it must span their combined width. */}
            <div
              className={cn("flex border-b border-border", !colWidth && "flex-1")}
              style={colWidth ? { width: colWidth * days.length } : undefined}
            >
              <AllDayBand
                days={days}
                items={allDayItems}
                canEdit={canEdit}
                selectedScheduleId={selectedScheduleId}
                onCreate={createAllDay}
                onSelect={setSelectedSchedule}
                onDelete={removeSchedule}
              />
            </div>
          </div>

          {/* Timed grid */}
          <div ref={timedRef} className="flex">
            <div className="sticky left-0 z-40">
              <TimeColumn hourHeight={hourHeight} />
            </div>
            <div className={hScroll ? "flex" : "flex flex-1"}>
              {days.map((day) => (
                <DateColumn
                  key={day.id}
                  day={day}
                  canEdit={canEdit}
                  activeMode={activeMode}
                  memberCount={members.length}
                  width={colWidth}
                  hourHeight={hourHeight}
                  selectedScheduleId={selectedScheduleId}
                  schedules={schedules.filter((item) => item.day_id === day.id && !item.all_day)}
                  availability={availability.filter((slot) => slot.day_id === day.id)}
                  draft={
                    draft && draft.dayId === day.id
                      ? {
                          start_time: minutesToTime(draft.startMinutes),
                          end_time: minutesToTime(draft.endMinutes),
                          naming: draft.naming
                        }
                      : null
                  }
                  peerDrafts={peerDrafts.filter((peer) => peer.dayId === day.id)}
                  onDraftCommit={commitDraft}
                  onDraftCancel={() => setDraft(null)}
                  onSelectSchedule={setSelectedSchedule}
                  onResize={(item, edge, deltaY) => resizeItem(item.id, edge, deltaY)}
                  onDeleteSchedule={removeSchedule}
                  onPointerStart={onPointerStart}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

function DayHeaderCell({
  day,
  weekdayOnly,
  width
}: {
  day: ProjectDay;
  weekdayOnly?: boolean;
  width?: number;
}) {
  const fmt = useDateFormat();
  const date = new Date(day.date);
  const weekday = fmt.weekday(date.getDay());
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-center border-b border-r border-border last:border-r-0",
        width ? "shrink-0" : "min-w-0 flex-1"
      )}
      style={width ? { width } : undefined}
    >
      <div className="text-center">
        {weekdayOnly ? (
          <p className="text-sm font-semibold text-foreground">{weekday}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">{fmt.monthDay(date)}</p>
            <p className="text-[11px] text-muted">{weekday}</p>
          </>
        )}
      </div>
    </div>
  );
}

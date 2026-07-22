"use client";

import { useEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { toast } from "sonner";
import { AllDayBand } from "@/components/timetable/AllDayBand";
import { DateColumn } from "@/components/timetable/DateColumn";
import { LiveCursors } from "@/components/timetable/LiveCursors";
import { TimeColumn } from "@/components/timetable/TimeColumn";
import { useLiveCursors } from "@/lib/supabase/cursors";
import { cn } from "@/lib/utils/cn";
import {
  DAY_END_MINUTES,
  HOUR_HEIGHT,
  MIN_DURATION_MINUTES,
  minutesToTime,
  pointerYToTime,
  snapMinutes,
  timeToMinutes
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
  const [viewportWidth, setViewportWidth] = useState(0);
  const allDayItems = schedules.filter((item) => item.all_day);
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const me = members.find((member) => member.user_id === currentUserId);
  const cursors = useLiveCursors({
    projectId,
    userId: currentUserId,
    name: me?.user?.name || me?.user?.email?.split("@")[0] || "익명",
    contentRef
  });
  // A small activation distance keeps clicks from registering as drags, so a
  // real drag starts crisply instead of being swallowed by the click handler.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Show up to 7 columns at a time; extra days scroll horizontally.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const TIME_COL_WIDTH = 64; // matches TimeColumn w-16
  const MAX_VISIBLE_DAYS = 7;
  const MIN_DAY_COL_WIDTH = 96;
  const manyDays = days.length > 7;
  const visibleDayCount = Math.min(days.length, MAX_VISIBLE_DAYS);
  const fittedColWidth =
    viewportWidth && visibleDayCount
      ? Math.floor(Math.max(0, viewportWidth - TIME_COL_WIDTH) / visibleDayCount)
      : 0;
  const colWidth =
    viewportWidth && (manyDays || fittedColWidth < MIN_DAY_COL_WIDTH)
      ? Math.max(MIN_DAY_COL_WIDTH, fittedColWidth)
      : undefined;

  function onPointerStart(dayId: string, event: React.PointerEvent<HTMLDivElement>) {
    if (!canEdit || event.button !== 0 || event.target !== event.currentTarget) return;
    // While the rename input is open, this pointerdown fires before the
    // input's blur. Starting a new drag here would replace the draft state
    // the blur handler is about to commit, so let the click only close the
    // naming input.
    if (draft) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = timeToMinutes(pointerYToTime(event.clientY - rect.top));

    if (activeMode === "availability") {
      const onUp = (upEvent: PointerEvent) => {
        const end = timeToMinutes(pointerYToTime(upEvent.clientY - rect.top));
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
      const current = timeToMinutes(pointerYToTime(moveEvent.clientY - rect.top));
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
        toast.error("종일 일정을 저장하지 못했어요.");
      });
  }

  function removeSchedule(id: string) {
    deleteSchedule(id)
      .then(() => {
        if (selectedScheduleId === id) setSelectedSchedule(null);
        toast.success("일정을 삭제했어요.");
      })
      .catch((error) => {
        console.error(error);
        toast.error("일정을 삭제하지 못했어요.");
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
        toast.error("일정을 저장하지 못했어요.");
      });
    setDraft(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const item = schedules.find((schedule) => schedule.id === event.active.id);
    if (!item || !canEdit) return;
    const deltaMinutes = snapMinutes((event.delta.y / HOUR_HEIGHT) * 60);
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
      toast.error(`일정을 옮기지 못했어요: ${error instanceof Error ? error.message : ""}`);
    });
  }

  function resizeItem(itemId: string, edge: "top" | "bottom", deltaY: number) {
    const item = schedules.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const deltaMinutes = snapMinutes((deltaY / 72) * 60);
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
      toast.error(`길이를 바꾸지 못했어요: ${error instanceof Error ? error.message : ""}`);
    });
  }

  if (!days.length) {
    return (
      <div className="flex min-h-[540px] flex-1 items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">원하는 날짜를 추가해서 시간표를 시작하세요.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This document is built from selected dates, not a full monthly calendar.
          </p>
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
        <div ref={contentRef} className={cn("relative", manyDays ? "w-max min-w-full" : "min-w-full")}>
          <LiveCursors cursors={cursors} />
          {/* Date headers */}
          <div className="sticky top-0 z-30 flex bg-surface">
            <div className="sticky left-0 z-40 h-12 w-16 shrink-0 border-b border-r border-border bg-surface" />
            <div ref={colsRef} className={manyDays ? "flex" : "flex flex-1"}>
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
              종일
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
          <div className="flex">
            <div className="sticky left-0 z-40">
              <TimeColumn />
            </div>
            <div className={manyDays ? "flex" : "flex flex-1"}>
              {days.map((day) => (
                <DateColumn
                  key={day.id}
                  day={day}
                  canEdit={canEdit}
                  activeMode={activeMode}
                  memberCount={members.length}
                  width={colWidth}
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

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function DayHeaderCell({
  day,
  weekdayOnly,
  width
}: {
  day: ProjectDay;
  weekdayOnly?: boolean;
  width?: number;
}) {
  const date = new Date(day.date);
  const weekdayKo = WEEKDAY_KO[date.getDay()];
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
          <p className="text-sm font-semibold text-foreground">{weekdayKo}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">
              {date.getMonth() + 1}월 {date.getDate()}일
            </p>
            <p className="text-[11px] text-muted">{weekdayKo}</p>
          </>
        )}
      </div>
    </div>
  );
}

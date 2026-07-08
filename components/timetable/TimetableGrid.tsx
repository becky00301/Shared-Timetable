"use client";

import { useRef, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { toast } from "sonner";
import { DateColumn } from "@/components/timetable/DateColumn";
import { TimeColumn } from "@/components/timetable/TimeColumn";
import { DAY_END_MINUTES, minutesToTime, pointerYToTime, snapMinutes, timeToMinutes } from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay, ProjectMember } from "@/types/project";

export function TimetableGrid({
  projectId,
  days,
  members,
  canEdit
}: {
  projectId: string;
  days: ProjectDay[];
  members: ProjectMember[];
  canEdit: boolean;
}) {
  const schedules = useProjectStore((state) => state.schedules).filter((item) => item.project_id === projectId);
  const availability = useProjectStore((state) => state.availability).filter((slot) => slot.project_id === projectId);
  const upsertSchedule = useProjectStore((state) => state.upsertSchedule);
  const addAvailability = useProjectStore((state) => state.addAvailability);
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const activeMode = useUiStore((state) => state.activeMode);
  const [draft, setDraft] = useState<{
    dayId: string;
    startMinutes: number;
    endMinutes: number;
    naming: boolean;
    itemId?: string;
  } | null>(null);
  const dragRef = useRef<{ dayId: string; start: number; end: number } | null>(null);
  // null = rename input still open; "" = closed without a rename;
  // non-empty = title typed before the insert round-trip finished.
  const pendingTitleRef = useRef<string | null>(null);

  function onPointerStart(dayId: string, event: React.PointerEvent<HTMLDivElement>) {
    if (!canEdit || event.button !== 0 || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = timeToMinutes(pointerYToTime(event.clientY - rect.top));

    if (activeMode === "availability") {
      const onUp = (upEvent: PointerEvent) => {
        const end = timeToMinutes(pointerYToTime(upEvent.clientY - rect.top));
        addAvailability({
          project_id: projectId,
          day_id: dayId,
          start_time: minutesToTime(Math.min(anchor, end)),
          end_time: minutesToTime(Math.max(anchor + 30, end))
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

    dragRef.current = { dayId, start: anchor, end: anchor + 30 };
    setDraft({ dayId, startMinutes: anchor, endMinutes: anchor + 30, naming: false });
    const onMove = (moveEvent: PointerEvent) => {
      const current = timeToMinutes(pointerYToTime(moveEvent.clientY - rect.top));
      const start = Math.min(anchor, current);
      const end = Math.min(DAY_END_MINUTES, Math.max(anchor + 30, current));
      if (dragRef.current) {
        dragRef.current.start = start;
        dragRef.current.end = end;
      }
      setDraft((prev) => (prev ? { ...prev, startMinutes: start, endMinutes: end } : prev));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;

      // The schedule is persisted the moment the drag ends; the inline input
      // only renames the row that already exists.
      setDraft((prev) => (prev ? { ...prev, naming: true } : prev));
      pendingTitleRef.current = null;
      upsertSchedule({
        project_id: projectId,
        day_id: drag.dayId,
        title: "새 일정",
        start_time: minutesToTime(drag.start),
        end_time: minutesToTime(drag.end)
      })
        .then((item) => {
          setSelectedSchedule(item.id);
          const pending = pendingTitleRef.current;
          if (pending === null) {
            setDraft((prev) => (prev && prev.dayId === drag.dayId ? { ...prev, itemId: item.id } : prev));
            return;
          }
          if (pending && pending !== item.title) {
            upsertSchedule({ ...item, title: pending }).catch((error) => {
              console.error(error);
              toast.error("이름을 저장하지 못했어요.");
            });
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error("일정을 저장하지 못했어요.");
          setDraft(null);
        });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function commitDraft(title: string) {
    if (!draft) return;
    if (draft.itemId) {
      const item = schedules.find((schedule) => schedule.id === draft.itemId);
      if (item && title && title !== item.title) {
        upsertSchedule({ ...item, title }).catch((error) => {
          console.error(error);
          toast.error("이름을 저장하지 못했어요.");
        });
      }
    } else {
      pendingTitleRef.current = title;
    }
    setDraft(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const item = schedules.find((schedule) => schedule.id === event.active.id);
    if (!item || !canEdit) return;
    const deltaMinutes = snapMinutes((event.delta.y / 72) * 60);
    const start = Math.max(0, Math.min(DAY_END_MINUTES - 30, timeToMinutes(item.start_time) + deltaMinutes));
    const duration = timeToMinutes(item.end_time) - timeToMinutes(item.start_time);
    const currentDayIndex = days.findIndex((day) => day.id === item.day_id);
    const columnShift = Math.round(event.delta.x / 208);
    const nextDay = days[Math.max(0, Math.min(days.length - 1, currentDayIndex + columnShift))] ?? days[currentDayIndex];
    upsertSchedule({
      ...item,
      day_id: nextDay.id,
      start_time: minutesToTime(start),
      end_time: minutesToTime(Math.min(DAY_END_MINUTES, start + duration))
    }).catch((error) => {
      console.error(error);
      toast.error("Could not move the schedule.");
    });
  }

  function resizeItem(itemId: string, edge: "top" | "bottom", deltaY: number) {
    const item = schedules.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const deltaMinutes = snapMinutes((deltaY / 72) * 60);
    const start = timeToMinutes(item.start_time);
    const end = timeToMinutes(item.end_time);
    const nextStart = edge === "top" ? Math.min(end - 30, Math.max(0, start + deltaMinutes)) : start;
    const nextEnd = edge === "bottom" ? Math.max(start + 30, Math.min(DAY_END_MINUTES, end + deltaMinutes)) : end;
    upsertSchedule({
      ...item,
      start_time: minutesToTime(nextStart),
      end_time: minutesToTime(nextEnd)
    }).catch((error) => {
      console.error(error);
      toast.error("Could not resize the schedule.");
    });
  }

  if (!days.length) {
    return (
      <div className="flex min-h-[540px] flex-1 items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-white">원하는 날짜를 추가해서 시간표를 시작하세요.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This document is built from selected dates, not a full monthly calendar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext id={`timetable-${projectId}`} onDragEnd={onDragEnd} modifiers={[restrictToWindowEdges]}>
      <div id="timetable-export" className="flex min-h-0 flex-1 overflow-auto bg-[#101010]">
        <TimeColumn />
        <div className="flex min-w-[720px] flex-1">
          {days.map((day) => (
            <DateColumn
              key={day.id}
              day={day}
              canEdit={canEdit}
              activeMode={activeMode}
              memberCount={members.length}
              selectedScheduleId={selectedScheduleId}
              schedules={schedules.filter(
                (item) => item.day_id === day.id && item.id !== (draft?.naming ? draft.itemId : undefined)
              )}
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
              onDraftCancel={() => {
                pendingTitleRef.current = "";
                setDraft(null);
              }}
              onSelectSchedule={setSelectedSchedule}
              onResize={(item, edge, deltaY) => resizeItem(item.id, edge, deltaY)}
              onPointerStart={onPointerStart}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

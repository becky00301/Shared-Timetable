"use client";

import { Moon } from "lucide-react";
import { AvailabilityHeatmap } from "@/components/availability/AvailabilityHeatmap";
import { DraftScheduleBlock } from "@/components/timetable/DraftScheduleBlock";
import { PeerDraftBlock } from "@/components/timetable/PeerDraftBlock";
import { ScheduleBlock } from "@/components/timetable/ScheduleBlock";
import { cn } from "@/lib/utils/cn";
import { minutesToTop, timeToMinutes } from "@/lib/utils/time";
import { useT } from "@/lib/i18n/locale";
import type { PeerDraft } from "@/lib/supabase/cursors";
import type { ProjectDay } from "@/types/project";
import type { AvailabilitySlot, ScheduleItem } from "@/types/schedule";

type PositionedSchedule = {
  item: ScheduleItem;
  lane: number;
  laneCount: number;
};

function positionOverlappingSchedules(schedules: ScheduleItem[]): PositionedSchedule[] {
  const sorted = [...schedules].sort((a, b) => {
    const startDifference = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    if (startDifference !== 0) return startDifference;

    const endDifference = timeToMinutes(b.end_time) - timeToMinutes(a.end_time);
    return endDifference !== 0 ? endDifference : a.id.localeCompare(b.id);
  });
  const groups: ScheduleItem[][] = [];
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

// Just the timed body of a day. The date header and the all-day band live in
// TimetableGrid so they can span every column and stay aligned.
export function DateColumn({
  day,
  schedules,
  availability,
  memberCount,
  activeMode,
  selectedScheduleId,
  canEdit,
  width,
  hourHeight,
  draft,
  peerDrafts,
  onDraftCommit,
  onDraftCancel,
  onSelectSchedule,
  onResize,
  onDeleteSchedule,
  onPointerStart
}: {
  day: ProjectDay;
  schedules: ScheduleItem[];
  availability: AvailabilitySlot[];
  memberCount: number;
  activeMode: "schedule" | "availability";
  selectedScheduleId: string | null;
  canEdit: boolean;
  width?: number;
  hourHeight: number;
  draft: { start_time: string; end_time: string; naming: boolean } | null;
  peerDrafts: PeerDraft[];
  onDraftCommit: (title: string) => void;
  onDraftCancel: () => void;
  onSelectSchedule: (id: string) => void;
  onResize: (item: ScheduleItem, startTime: string, endTime: string) => void;
  onDeleteSchedule: (id: string) => void;
  onPointerStart: (dayId: string, event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const t = useT();
  const positionedSchedules = positionOverlappingSchedules(schedules);
  const wakeMinutes = day.wake_time ? timeToMinutes(day.wake_time) : null;
  const sleepStartMinutes = wakeMinutes === null ? null : Math.max(0, wakeMinutes - 7 * 60);

  return (
    <div
      className={cn("border-r border-border last:border-r-0", width ? "shrink-0" : "min-w-0 flex-1")}
      style={width ? { width } : undefined}
    >
      <div
        className={cn("timetable-grid relative", canEdit && "cursor-crosshair")}
        // --hour-h drives the background guide lines in globals.css.
        style={{ height: hourHeight * 24, "--hour-h": `${hourHeight}px` } as React.CSSProperties}
        onPointerDown={(event) => onPointerStart(day.id, event)}
        onContextMenu={(event) => {
          if (
            event.target === event.currentTarget &&
            window.matchMedia("(pointer: coarse)").matches
          ) {
            event.preventDefault();
          }
        }}
      >
        {wakeMinutes !== null && sleepStartMinutes !== null ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-[1] overflow-hidden bg-[#E9EDF4]/80"
            style={{
              top: minutesToTop(sleepStartMinutes, hourHeight),
              height: minutesToTop(wakeMinutes - sleepStartMinutes, hourHeight)
            }}
            aria-hidden="true"
          >
            <div className="absolute left-1 top-1 flex items-center gap-1 text-[10px] font-medium text-[#596579]">
              <Moon size={11} />
              <span className="hidden sm:inline">{t("grid.sleepTime")}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 border-t border-[#7B879A]/75">
              <span className="absolute bottom-0 right-1 translate-y-full bg-background/85 px-0.5 text-[9px] font-medium tabular-nums text-[#596579]">
                {day.wake_time?.slice(0, 5)}
              </span>
            </div>
          </div>
        ) : null}
        <AvailabilityHeatmap
          active={activeMode === "availability"}
          slots={availability}
          memberCount={memberCount}
          hourHeight={hourHeight}
        />
        {positionedSchedules.map(({ item, lane, laneCount }) => (
          <ScheduleBlock
            key={item.id}
            item={item}
            lane={lane}
            laneCount={laneCount}
            canEdit={canEdit}
            isSelected={selectedScheduleId === item.id}
            hourHeight={hourHeight}
            onSelect={() => onSelectSchedule(item.id)}
            onResize={(startTime, endTime) => onResize(item, startTime, endTime)}
            onDelete={() => onDeleteSchedule(item.id)}
          />
        ))}
        {peerDrafts.map((peer) => (
          <PeerDraftBlock
            key={peer.userId}
            startMinutes={peer.startMinutes}
            endMinutes={peer.endMinutes}
            name={peer.name}
            color={peer.color}
            hourHeight={hourHeight}
          />
        ))}
        {draft ? (
          <DraftScheduleBlock
            startTime={draft.start_time}
            endTime={draft.end_time}
            naming={draft.naming}
            hourHeight={hourHeight}
            onCommit={onDraftCommit}
            onCancel={onDraftCancel}
          />
        ) : null}
      </div>
    </div>
  );
}

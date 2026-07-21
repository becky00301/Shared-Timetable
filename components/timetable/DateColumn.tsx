"use client";

import { AvailabilityHeatmap } from "@/components/availability/AvailabilityHeatmap";
import { DraftScheduleBlock } from "@/components/timetable/DraftScheduleBlock";
import { ScheduleBlock } from "@/components/timetable/ScheduleBlock";
import { cn } from "@/lib/utils/cn";
import type { ProjectDay } from "@/types/project";
import type { AvailabilitySlot, ScheduleItem } from "@/types/schedule";

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
  draft,
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
  draft: { start_time: string; end_time: string; naming: boolean } | null;
  onDraftCommit: (title: string) => void;
  onDraftCancel: () => void;
  onSelectSchedule: (id: string) => void;
  onResize: (item: ScheduleItem, edge: "top" | "bottom", deltaY: number) => void;
  onDeleteSchedule: (id: string) => void;
  onPointerStart: (dayId: string, event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn("border-r border-border last:border-r-0", width ? "shrink-0" : "min-w-0 flex-1")}
      style={width ? { width } : undefined}
    >
      <div
        className={cn("timetable-grid relative h-[1728px]", canEdit && "cursor-crosshair")}
        onPointerDown={(event) => onPointerStart(day.id, event)}
      >
        <AvailabilityHeatmap
          active={activeMode === "availability"}
          slots={availability}
          memberCount={memberCount}
        />
        {schedules.map((item) => (
          <ScheduleBlock
            key={item.id}
            item={item}
            canEdit={canEdit}
            isSelected={selectedScheduleId === item.id}
            onSelect={() => onSelectSchedule(item.id)}
            onResize={(edge, deltaY) => onResize(item, edge, deltaY)}
            onDelete={() => onDeleteSchedule(item.id)}
          />
        ))}
        {draft ? (
          <DraftScheduleBlock
            startTime={draft.start_time}
            endTime={draft.end_time}
            naming={draft.naming}
            onCommit={onDraftCommit}
            onCancel={onDraftCancel}
          />
        ) : null}
      </div>
    </div>
  );
}

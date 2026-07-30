"use client";

import { AvailabilityHeatmap } from "@/components/availability/AvailabilityHeatmap";
import { DraftScheduleBlock } from "@/components/timetable/DraftScheduleBlock";
import { PeerDraftBlock } from "@/components/timetable/PeerDraftBlock";
import { ScheduleBlock } from "@/components/timetable/ScheduleBlock";
import { cn } from "@/lib/utils/cn";
import type { PeerDraft } from "@/lib/supabase/cursors";
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
        className={cn("timetable-grid relative", canEdit && "cursor-crosshair")}
        // --hour-h drives the background guide lines in globals.css.
        style={{ height: hourHeight * 24, "--hour-h": `${hourHeight}px` } as React.CSSProperties}
        onPointerDown={(event) => onPointerStart(day.id, event)}
      >
        <AvailabilityHeatmap
          active={activeMode === "availability"}
          slots={availability}
          memberCount={memberCount}
          hourHeight={hourHeight}
        />
        {schedules.map((item) => (
          <ScheduleBlock
            key={item.id}
            item={item}
            canEdit={canEdit}
            isSelected={selectedScheduleId === item.id}
            hourHeight={hourHeight}
            onSelect={() => onSelectSchedule(item.id)}
            onResize={(edge, deltaY) => onResize(item, edge, deltaY)}
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

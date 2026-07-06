"use client";

import { format } from "date-fns";
import { AvailabilityHeatmap } from "@/components/availability/AvailabilityHeatmap";
import { ScheduleBlock } from "@/components/timetable/ScheduleBlock";
import { cn } from "@/lib/utils/cn";
import type { ProjectDay } from "@/types/project";
import type { AvailabilitySlot, ScheduleItem } from "@/types/schedule";

export function DateColumn({
  day,
  schedules,
  availability,
  memberCount,
  activeMode,
  selectedScheduleId,
  canEdit,
  onSelectSchedule,
  onResize,
  onPointerStart
}: {
  day: ProjectDay;
  schedules: ScheduleItem[];
  availability: AvailabilitySlot[];
  memberCount: number;
  activeMode: "schedule" | "availability";
  selectedScheduleId: string | null;
  canEdit: boolean;
  onSelectSchedule: (id: string) => void;
  onResize: (item: ScheduleItem, edge: "top" | "bottom", deltaY: number) => void;
  onPointerStart: (dayId: string, event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="min-w-52 flex-1 border-r border-border last:border-r-0">
      <div className="sticky top-0 z-10 flex h-12 items-center justify-center border-b border-border bg-[#141414]">
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{format(new Date(day.date), "MMM d")}</p>
          <p className="text-[11px] uppercase text-muted">{format(new Date(day.date), "EEE")}</p>
        </div>
      </div>
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
          />
        ))}
      </div>
    </div>
  );
}

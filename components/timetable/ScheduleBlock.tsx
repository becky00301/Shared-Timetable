"use client";

import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useContextMenu } from "@/components/ui/context-menu";
import { durationToHeight, formatTimeRange, minutesToTop, timeToMinutes } from "@/lib/utils/time";
import type { ScheduleItem } from "@/types/schedule";

export function ScheduleBlock({
  item,
  isSelected,
  canEdit,
  onSelect,
  onResize,
  onDelete
}: {
  item: ScheduleItem;
  isSelected: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onResize: (edge: "top" | "bottom", deltaY: number) => void;
  onDelete: () => void;
}) {
  const { onContextMenu, menu } = useContextMenu(
    canEdit ? [{ label: "삭제", onSelect: onDelete, danger: true }] : []
  );
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: !canEdit,
    data: { dayId: item.day_id, item }
  });
  const top = minutesToTop(timeToMinutes(item.start_time));
  const height = Math.max(34, durationToHeight(item.start_time, item.end_time));

  function startResize(edge: "top" | "bottom", event: React.PointerEvent) {
    if (!canEdit) return;
    event.stopPropagation();
    const startY = event.clientY;
    const onMove = (moveEvent: PointerEvent) => onResize(edge, moveEvent.clientY - startY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // transition-colors only: animating transform makes the block lag the cursor.
        "absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-md border border-black/20 px-1.5 py-2 text-left shadow-lg transition-colors sm:left-2 sm:right-2 sm:rounded-lg sm:p-2",
        isSelected && "ring-2 ring-white/70",
        isDragging && "opacity-70"
      )}
      style={{
        top,
        height,
        backgroundColor: item.color,
        transform: CSS.Translate.toString(transform)
      }}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      {...attributes}
      {...listeners}
    >
      {menu}
      <button
        type="button"
        className="absolute inset-x-0 top-0 flex h-2 items-center justify-center text-white/70"
        onPointerDown={(event) => startResize("top", event)}
        aria-label="Resize schedule start"
      >
        <GripHorizontal size={12} />
      </button>
      <div className="mt-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight text-white [overflow-wrap:anywhere] sm:text-sm">
          {item.title}
        </p>
        <p className="mt-1 text-[11px] leading-tight text-white/85 [overflow-wrap:anywhere] sm:text-xs">
          {formatTimeRange(item.start_time, item.end_time)}
        </p>
        {item.location ? (
          <p className="mt-1 text-[11px] leading-tight text-white/75 [overflow-wrap:anywhere] sm:text-xs">
            {item.location}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="absolute inset-x-0 bottom-0 flex h-2 items-center justify-center text-white/70"
        onPointerDown={(event) => startResize("bottom", event)}
        aria-label="Resize schedule end"
      >
        <GripHorizontal size={12} />
      </button>
    </div>
  );
}

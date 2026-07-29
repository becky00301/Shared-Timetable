"use client";

import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { useContextMenu } from "@/components/ui/context-menu";
import {
  HOUR_HEIGHT,
  durationToHeight,
  formatTimeRange,
  minutesToTop,
  snapMinutes,
  timeToMinutes
} from "@/lib/utils/time";
import type { ScheduleItem } from "@/types/schedule";

/** Pixel delta snapped to the same 5-minute grid the commit will land on. */
function snapPx(deltaY: number) {
  return (snapMinutes((deltaY / HOUR_HEIGHT) * 60) / 60) * HOUR_HEIGHT;
}

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
  /** Called once, on release — not on every pointer move. */
  onResize: (edge: "top" | "bottom", deltaY: number) => void;
  onDelete: () => void;
}) {
  const t = useT();
  // Resizing previews locally and writes once when the pointer is released.
  // Saving on every move meant a two-second drag fired ~120 identical updates,
  // and each one made every other client refetch the whole project.
  const [resize, setResize] = useState<{ edge: "top" | "bottom"; deltaY: number } | null>(null);
  const { onContextMenu, menu } = useContextMenu(
    canEdit ? [{ label: t("common.delete"), onSelect: onDelete, danger: true }] : []
  );
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: !canEdit,
    data: { dayId: item.day_id, item }
  });
  const baseTop = minutesToTop(timeToMinutes(item.start_time));
  const baseHeight = Math.max(34, durationToHeight(item.start_time, item.end_time));
  const preview = resize ? snapPx(resize.deltaY) : 0;
  const top = resize?.edge === "top" ? baseTop + preview : baseTop;
  const height = Math.max(
    34,
    resize?.edge === "top" ? baseHeight - preview : resize ? baseHeight + preview : baseHeight
  );

  function startResize(edge: "top" | "bottom", event: React.PointerEvent) {
    if (!canEdit) return;
    event.stopPropagation();
    const startY = event.clientY;
    let last = 0;
    setResize({ edge, deltaY: 0 });

    const onMove = (moveEvent: PointerEvent) => {
      last = moveEvent.clientY - startY;
      setResize({ edge, deltaY: last });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResize(null);
      // Only a real drag should write; a stray click on the handle shouldn't.
      if (snapPx(last) !== 0) onResize(edge, last);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={setNodeRef}
      data-schedule-id={item.id}
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

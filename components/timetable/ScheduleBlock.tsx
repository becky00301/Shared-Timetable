"use client";

import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getScheduleTextColor } from "@/lib/utils/schedule-colors";
import { useT } from "@/lib/i18n/locale";
import { useContextMenu } from "@/components/ui/context-menu";
import {
  DAY_END_MINUTES,
  MIN_DURATION_MINUTES,
  durationToHeight,
  formatTimeRange,
  minutesToTime,
  minutesToTop,
  snapMinutes,
  timeToMinutes
} from "@/lib/utils/time";
import type { ScheduleItem } from "@/types/schedule";

export function ScheduleBlock({
  item,
  lane,
  laneCount,
  isSelected,
  canEdit,
  isInteractive = true,
  hourHeight,
  onSelect,
  onResize,
  onDelete
}: {
  item: ScheduleItem;
  lane: number;
  laneCount: number;
  isSelected: boolean;
  canEdit: boolean;
  isInteractive?: boolean;
  hourHeight: number;
  onSelect: () => void;
  /** Called once, on release — not on every pointer move. */
  onResize: (startTime: string, endTime: string) => void;
  onDelete: () => void;
}) {
  const t = useT();
  // Resizing previews locally and writes once when the pointer is released.
  // Saving on every move meant a two-second drag fired ~120 identical updates,
  // and each one made every other client refetch the whole project.
  const [resize, setResize] = useState<{ startMinutes: number; endMinutes: number } | null>(null);
  const { onContextMenu, menu } = useContextMenu(
    canEdit ? [{ label: t("common.delete"), onSelect: onDelete, danger: true }] : []
  );
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: !canEdit || !isInteractive,
    data: { dayId: item.day_id, item }
  });
  const baseStart = timeToMinutes(item.start_time);
  const baseEnd = timeToMinutes(item.end_time);
  const baseTop = minutesToTop(baseStart, hourHeight);
  const baseHeight = Math.max(34, durationToHeight(item.start_time, item.end_time, hourHeight));
  const top = resize ? minutesToTop(resize.startMinutes, hourHeight) : baseTop;
  const height = resize
    ? Math.max(34, minutesToTop(resize.endMinutes - resize.startMinutes, hourHeight))
    : baseHeight;
  const splitPosition =
    laneCount > 1
      ? {
          left: `calc(${(lane / laneCount) * 100}% + ${lane === 0 ? 4 : 2}px)`,
          right: `calc(${((laneCount - lane - 1) / laneCount) * 100}% + ${lane === laneCount - 1 ? 4 : 2}px)`
        }
      : undefined;
  const isSplit = laneCount > 1;
  const textColor = getScheduleTextColor(item.color);

  function startResize(edge: "top" | "bottom", event: React.PointerEvent) {
    if (!canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    let nextStart = baseStart;
    let nextEnd = baseEnd;
    setResize({ startMinutes: baseStart, endMinutes: baseEnd });

    const onMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaMinutes = snapMinutes(((moveEvent.clientY - startY) / hourHeight) * 60);
      nextStart = edge === "top"
        ? Math.min(baseEnd - MIN_DURATION_MINUTES, Math.max(0, baseStart + deltaMinutes))
        : baseStart;
      nextEnd = edge === "bottom"
        ? Math.max(baseStart + MIN_DURATION_MINUTES, Math.min(DAY_END_MINUTES, baseEnd + deltaMinutes))
        : baseEnd;
      setResize({ startMinutes: nextStart, endMinutes: nextEnd });
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    const onUp = () => {
      cleanup();
      if (nextStart !== baseStart || nextEnd !== baseEnd) {
        onResize(minutesToTime(nextStart), minutesToTime(nextEnd));
      }
      setResize(null);
    };
    const onCancel = () => {
      cleanup();
      setResize(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  return (
    <div
      ref={setNodeRef}
      data-schedule-id={item.id}
      title={`${item.title} (${formatTimeRange(item.start_time, item.end_time)})`}
      className={cn(
        // transition-colors only: animating transform makes the block lag the cursor.
        "absolute left-1 right-1 z-10 touch-manipulation cursor-pointer overflow-hidden rounded-[4px] border border-black/20 px-1.5 py-2 text-left shadow-lg transition-colors sm:left-2 sm:right-2 sm:p-2",
        isSplit && "px-1 py-2 sm:px-1.5",
        !isInteractive && "pointer-events-none",
        isSelected && (textColor === "#111827" ? "ring-2 ring-black/40" : "ring-2 ring-white/70"),
        isDragging && "opacity-70"
      )}
      style={{
        top,
        height,
        backgroundColor: item.color,
        color: textColor,
        transform: CSS.Translate.toString(transform),
        ...splitPosition
      }}
      onClick={isInteractive ? onSelect : undefined}
      onContextMenu={isInteractive ? onContextMenu : undefined}
      {...attributes}
      {...listeners}
    >
      {menu}
      <button
        type="button"
        data-resize-handle
        className="absolute inset-x-0 top-0 flex h-2 items-center justify-center text-current opacity-70"
        onPointerDown={(event) => startResize("top", event)}
        aria-label="Resize schedule start"
      >
        <GripHorizontal size={12} />
      </button>
      <div className="mt-1 min-w-0">
        <p
          className={cn(
            "font-semibold leading-tight text-current",
            isSplit
              ? "truncate text-[9px] sm:text-xs"
              : "text-[11px] [overflow-wrap:anywhere] sm:text-sm"
          )}
        >
          {item.title}
        </p>
        <p
          className={cn(
            "mt-1 leading-tight text-current opacity-[0.82]",
            isSplit
              ? cn("overflow-hidden whitespace-nowrap", laneCount > 2 ? "text-[8px]" : "text-[9px]")
              : "text-[9px] [overflow-wrap:anywhere] sm:text-xs"
          )}
        >
          {isSplit ? (
            <>
              <span className="block">{item.start_time.slice(0, 5)}</span>
              <span className="block">- {item.end_time.slice(0, 5)}</span>
            </>
          ) : (
            formatTimeRange(item.start_time, item.end_time)
          )}
        </p>
        {item.location ? (
          <p
            className={cn(
              "mt-1 leading-tight text-current opacity-70",
              isSplit
                ? "truncate text-[9px] sm:text-[10px]"
                : "text-[9px] [overflow-wrap:anywhere] sm:text-xs"
            )}
          >
            {item.location}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        data-resize-handle
        className="absolute inset-x-0 bottom-0 flex h-2 items-center justify-center text-current opacity-70"
        onPointerDown={(event) => startResize("bottom", event)}
        aria-label="Resize schedule end"
      >
        <GripHorizontal size={12} />
      </button>
    </div>
  );
}

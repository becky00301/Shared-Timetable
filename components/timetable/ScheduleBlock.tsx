"use client";

import { useRef, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils/cn";
import { getScheduleTextColor } from "@/lib/utils/schedule-colors";
import { holdScroll, TIMETABLE_SCROLLER_ID } from "@/lib/utils/scroll-lock";
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

/** Space between a block and its column's sides, and between a block and the
    hour lines it starts and ends on. */
const EDGE_GAP = 2;
const VERTICAL_INSET = 1;

/** How close to the edge of the visible hours a resize starts scrolling (wide
    enough for a fingertip), and the fastest it goes per frame. */
const AUTO_SCROLL_EDGE = 72;
const AUTO_SCROLL_MAX_STEP = 14;

export function ScheduleBlock({
  item,
  lane,
  laneCount,
  isSelected,
  canEdit,
  isInteractive = true,
  resizeArmed = false,
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
  /** On a touch screen, the event a long-press picked: only it shows resize
      handles and takes a resize from its edges. A mouse can always resize. */
  resizeArmed?: boolean;
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
  const blockRef = useRef<HTMLDivElement | null>(null);
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
  // Hairline gaps, as in a native calendar: the block fills its column but
  // for EDGE_GAP at each side, and sits a pixel inside its hour lines so two
  // back-to-back events show a seam instead of merging.
  const splitPosition =
    laneCount > 1
      ? {
          left: `calc(${(lane / laneCount) * 100}% + ${EDGE_GAP}px)`,
          right: `calc(${((laneCount - lane - 1) / laneCount) * 100}% + ${EDGE_GAP}px)`
        }
      : undefined;
  const isSplit = laneCount > 1;
  const textColor = getScheduleTextColor(item.color);

  function startResize(edge: "top" | "bottom", event: React.PointerEvent) {
    if (!canEdit) return;
    // Starts on a plain drag, finger or mouse: the handles opt out of touch
    // panning (touch-none), so a drag that begins on one is always a resize
    // and never a scroll or a move.
    event.preventDefault();
    event.stopPropagation();
    const scroller = event.currentTarget.closest<HTMLElement>(`#${TIMETABLE_SCROLLER_ID}`);
    const startY = event.clientY;
    const startScrollTop = scroller?.scrollTop ?? 0;
    let pointerY = startY;
    let nextStart = baseStart;
    let nextEnd = baseEnd;
    let frame: number | null = null;
    const releaseScroll = holdScroll();
    setResize({ startMinutes: baseStart, endMinutes: baseEnd });

    // Measured against the grid, not the screen: the scroller may have moved
    // under the finger, and the block has to follow the time it now points at.
    function apply() {
      const travel = pointerY - startY + ((scroller?.scrollTop ?? 0) - startScrollTop);
      const deltaMinutes = snapMinutes((travel / hourHeight) * 60);
      nextStart = edge === "top"
        ? Math.min(baseEnd - MIN_DURATION_MINUTES, Math.max(0, baseStart + deltaMinutes))
        : baseStart;
      nextEnd = edge === "bottom"
        ? Math.max(baseStart + MIN_DURATION_MINUTES, Math.min(DAY_END_MINUTES, baseEnd + deltaMinutes))
        : baseEnd;
      setResize({ startMinutes: nextStart, endMinutes: nextEnd });
    }

    // Held near the top or bottom of the visible hours, the grid scrolls on
    // its own so a block can be stretched to a time that is off screen. The
    // visible hours run from under the sticky date row to the top of the
    // phone's bottom bar, when there is one.
    function autoScroll() {
      frame = null;
      if (!scroller) return;
      const box = scroller.getBoundingClientRect();
      const head = scroller.querySelector("[data-grid-sticky-head]");
      const bar = document.querySelector("[data-mobile-project-bar]");
      const top = head ? head.getBoundingClientRect().bottom : box.top;
      const barTop = bar?.getBoundingClientRect().top;
      const bottom = barTop && barTop > 0 ? Math.min(box.bottom, barTop) : box.bottom;
      // Whichever is further out, the finger or the edge being dragged: on a
      // phone the finger sits a little off the edge it is holding.
      const edgeBox = blockRef.current?.getBoundingClientRect();
      const reachUp = Math.min(pointerY, edge === "top" && edgeBox ? edgeBox.top : Infinity);
      const reachDown = Math.max(pointerY, edge === "bottom" && edgeBox ? edgeBox.bottom : -Infinity);
      let speed = 0;
      if (reachUp < top + AUTO_SCROLL_EDGE) speed = -(top + AUTO_SCROLL_EDGE - reachUp);
      else if (reachDown > bottom - AUTO_SCROLL_EDGE) speed = reachDown - (bottom - AUTO_SCROLL_EDGE);
      if (!speed) return;
      const before = scroller.scrollTop;
      scroller.scrollTop += Math.sign(speed) * Math.min(AUTO_SCROLL_MAX_STEP, Math.ceil(Math.abs(speed) / 3));
      if (scroller.scrollTop === before) return;
      apply();
      frame = window.requestAnimationFrame(autoScroll);
    }

    const onMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      pointerY = moveEvent.clientY;
      apply();
      if (frame === null) frame = window.requestAnimationFrame(autoScroll);
    };
    function cleanup() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      releaseScroll();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    }
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
      ref={(node) => {
        blockRef.current = node;
        setNodeRef(node);
      }}
      data-schedule-id={item.id}
      title={`${item.title} (${formatTimeRange(item.start_time, item.end_time)})`}
      className={cn(
        // transition-colors only: animating transform makes the block lag the cursor.
        // Not overflow-hidden: the handles' touch areas reach past the block's
        // edges. The text clips itself instead.
        "absolute left-0.5 right-0.5 z-10 flex touch-manipulation cursor-pointer flex-col rounded-[4px] border border-black/[0.06] px-1.5 py-2 text-left shadow-lg transition-colors sm:p-2",
        isSplit && "px-1 py-2 sm:px-1.5",
        // Faded while another mode (wake time) owns the grid's clicks.
        !isInteractive && "pointer-events-none opacity-40",
        isSelected && (textColor === "#111827" ? "ring-2 ring-black/40" : "ring-2 ring-white/70"),
        resizeArmed && "z-20 shadow-xl",
        isDragging && "opacity-70"
      )}
      style={{
        top: top + VERTICAL_INSET,
        height: height - VERTICAL_INSET * 2,
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
        className={cn(
          "absolute inset-x-0 top-0 h-2 cursor-row-resize touch-none select-none [-webkit-touch-callout:none]",
          // A finger only gets the edges of the armed event; elsewhere a
          // touch on the edge is just a touch on the event.
          !resizeArmed && "pointer-coarse:pointer-events-none"
        )}
        onPointerDown={(event) => startResize("top", event)}
        aria-label="Resize event start"
      >
        <HandleReach edge="top" />
        {resizeArmed ? <HandleDot edge="top" color={item.color} /> : null}
      </button>
      <div className="mt-1 min-h-0 min-w-0 flex-1 overflow-hidden">
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
        className={cn(
          "absolute inset-x-0 bottom-0 h-2 cursor-row-resize touch-none select-none [-webkit-touch-callout:none]",
          // A finger only gets the edges of the armed event; elsewhere a
          // touch on the edge is just a touch on the event.
          !resizeArmed && "pointer-coarse:pointer-events-none"
        )}
        onPointerDown={(event) => startResize("bottom", event)}
        aria-label="Resize event end"
      >
        <HandleReach edge="bottom" />
        {resizeArmed ? <HandleDot edge="bottom" color={item.color} /> : null}
      </button>
    </div>
  );
}

/** The handle's touch area on a finger-driven screen, live only on the armed
    event: 32px tall, 20px of it past the block's edge, and 12px past each
    side so the corner dots are easy to catch. Mostly outside the block, so
    the middle still moves it. A mouse keeps the 8px strip it can hit
    precisely. */
function HandleReach({ edge }: { edge: "top" | "bottom" }) {
  return (
    <span
      aria-hidden
      className={cn("absolute -inset-x-3 h-8 pointer-fine:hidden", edge === "top" ? "-top-5" : "-bottom-5")}
    />
  );
}

/** The visible handle on an armed event, as in iOS Calendar: a white dot
    ringed in the event's colour, top right and bottom left. Touch only; a
    mouse finds the edge by its cursor. */
function HandleDot({ edge, color }: { edge: "top" | "bottom"; color: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute size-3 rounded-full bg-white pointer-fine:hidden",
        edge === "top" ? "-top-1.5 right-3" : "-bottom-1.5 left-3"
      )}
      style={{ boxShadow: `0 0 0 2px color-mix(in oklab, ${color} 65%, black)` }}
    />
  );
}

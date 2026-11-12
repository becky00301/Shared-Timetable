"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { toast } from "sonner";
import { DayRouteMapDialog } from "@/components/map/DayRouteMapDialog";
import { AllDayBand } from "@/components/timetable/AllDayBand";
import { DateColumn } from "@/components/timetable/DateColumn";
import { CursorChatInput } from "@/components/timetable/CursorChatInput";
import { LiveCursors } from "@/components/timetable/LiveCursors";
import { TimeColumn } from "@/components/timetable/TimeColumn";
import { WakeTimeDialog } from "@/components/timetable/WakeTimeDialog";
import { WakeTimePopover } from "@/components/timetable/WakeTimePopover";
import { AlarmClock, Map as MapIcon } from "lucide-react";
import { cursorColor, useLiveCursors } from "@/lib/supabase/cursors";
import { useT } from "@/lib/i18n/locale";
import { useDateFormat } from "@/lib/i18n/dates";
import {
  holdScroll,
  TIMETABLE_SCROLLER_ID,
  TOUCH_LONG_PRESS_MS,
  TOUCH_MOVE_TOLERANCE
} from "@/lib/utils/scroll-lock";
import { cn } from "@/lib/utils/cn";
import {
  absoluteSpan,
  fromAbsoluteSpan,
  isOvernight,
  timedSegments,
  type DaySegment
} from "@/lib/utils/schedule-span";
import {
  DAY_END_MINUTES,
  MIN_DURATION_MINUTES,
  minutesToTime,
  pointerYToTime,
  snapMinutes,
  timeToMinutes,
  zoomToHourHeight
} from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay, ProjectMember } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";


function isResizeHandle(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-resize-handle]"));
}

// Keep the original pointer-based desktop behavior while leaving touch to the
// delayed TouchSensor below. MouseSensor uses a separate mouse event stream,
// which made desktop dragging noticeably less direct on some browsers.
class DesktopPointerSensor extends PointerSensor {
  static activators = PointerSensor.activators.map((activator) => ({
    ...activator,
    handler: (
      event: Parameters<typeof activator.handler>[0],
      options: Parameters<typeof activator.handler>[1]
    ) =>
      event.nativeEvent.pointerType !== "touch" &&
      !isResizeHandle(event.nativeEvent.target) &&
      activator.handler(event, options)
  }));
}

class ScheduleTouchSensor extends TouchSensor {
  static activators = TouchSensor.activators.map((activator) => ({
    ...activator,
    handler: (
      event: Parameters<typeof activator.handler>[0],
      options: Parameters<typeof activator.handler>[1]
    ) => !isResizeHandle(event.nativeEvent.target) && activator.handler(event, options)
  }));
}

/** How far into another date's column the pointer must be before a drawn
    event runs into that date, so a little sideways wobble does not turn a
    one-hour draft into a day-long one. */
const COLUMN_SWITCH_MARGIN = 16;
/** Drawing near the top or bottom of the visible hours scrolls the grid, so
    an event can be drawn to a time that is off screen. */
const DRAW_AUTO_SCROLL_EDGE = 56;
const DRAW_AUTO_SCROLL_MAX_STEP = 14;

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
  const updateDayWakeTime = useProjectStore((state) => state.updateDayWakeTime);
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const activeMode = useUiStore((state) => state.activeMode);
  const gridZoom = useUiStore((state) => state.gridZoom);
  const initializeGridZoom = useUiStore((state) => state.initializeGridZoom);
  const t = useT();
  const [draft, setDraft] = useState<{
    dayId: string;
    startMinutes: number;
    endMinutes: number;
    naming: boolean;
  } | null>(null);
  const [wakeDay, setWakeDay] = useState<ProjectDay | null>(null);
  const [mapDay, setMapDay] = useState<ProjectDay | null>(null);
  const [wakeSelection, setWakeSelection] = useState<{
    dayId: string;
    anchorPoint: { x: number; y: number };
  } | null>(null);
  // null means no cursor chat is open; "" means it is open and still empty.
  const [cursorChat, setCursorChat] = useState<string | null>(null);
  const dragRef = useRef<{ dayId: string; start: number; end: number } | null>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollReleaseRef = useRef<(() => void) | null>(null);
  // The event a touch long-press picked up. It stays armed after the drop,
  // showing its resize handles, until the reader touches anything else.
  const [armedId, setArmedId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timedRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [timedViewportHeight, setTimedViewportHeight] = useState(0);
  const allDayItems = schedules.filter((item) => item.all_day);
  // Timed events per column. One that runs past midnight shows up in every
  // column it touches, placed by its part on that date.
  const dayOrder = days.map((day) => day.id);
  const timedByDay = new Map<string, { items: ScheduleItem[]; segments: Record<string, DaySegment> }>();
  for (const day of days) timedByDay.set(day.id, { items: [], segments: {} });
  for (const item of schedules) {
    if (item.all_day) continue;
    const segments = timedSegments(item, dayOrder);
    for (const segment of segments) {
      const column = timedByDay.get(segment.dayId);
      if (!column) continue;
      column.items.push(item);
      if (segments.length > 1) column.segments[item.id] = segment;
    }
  }

  useEffect(() => {
    initializeGridZoom(window.matchMedia("(max-width: 639px)").matches);
  }, [initializeGridZoom]);

  // Zooming out past the point where a whole day fits would leave the grid
  // stranded above empty space, so the rows never shrink below one screenful —
  // the same rule the columns follow horizontally.
  const fillHourHeight = timedViewportHeight / 24;
  const hourHeight = Math.max(zoomToHourHeight(gridZoom), fillHourHeight);

  // Live pointers and in-progress draft blocks of everyone else editing this
  // timetable.
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const me = members.find((member) => member.user_id === currentUserId);
  const { cursors, peerDrafts, selfPosition } = useLiveCursors({
    projectId,
    userId: currentUserId,
    name: me?.user?.name || me?.user?.email?.split("@")[0] || t("role.viewer"),
    contentRef,
    draft: draft
      ? {
          dayId: draft.dayId,
          startMinutes: draft.startMinutes,
          endMinutes: Math.min(DAY_END_MINUTES, draft.endMinutes)
        }
      : null,
    chatText: cursorChat
  });

  // "/" opens a chat line on your own pointer, Figma-style. It needs a pointer
  // to hang off, so it stays shut until the mouse has been over the grid.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (!selfPosition.current) return;
      event.preventDefault();
      setCursorChat("");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selfPosition]);
  // Mouse dragging stays immediate. Touch waits long enough to distinguish an
  // intentional move from tapping an item for details or scrolling the grid.
  const sensors = useSensors(
    useSensor(DesktopPointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(ScheduleTouchSensor, {
      activationConstraint: {
        delay: TOUCH_LONG_PRESS_MS,
        tolerance: TOUCH_MOVE_TOLERANCE
      }
    })
  );

  // Show up to 7 columns at a time; extra days scroll horizontally. The timed
  // area's own height is measured too, since that's what the rows have to fill.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setViewportWidth(el.clientWidth);
      // offsetTop covers the date headers and the all-day band, neither of
      // which scales — and neither depends on the hour height, so measuring
      // here can't feed back into the size it's about to produce.
      const timed = timedRef.current;
      setTimedViewportHeight(timed ? Math.max(0, el.clientHeight - timed.offsetTop) : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // The all-day band grows with its lanes, moving the timed grid down.
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Rescaling around the top of the viewport would throw the visible hours
  // away, so the time sitting mid-screen is what stays put across a zoom.
  const lastHourHeight = useRef(hourHeight);
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const timed = timedRef.current;
    const previous = lastHourHeight.current;
    lastHourHeight.current = hourHeight;
    if (!scroller || !timed || previous === hourHeight) return;
    // The headers and all-day band above the grid don't scale, so they're
    // excluded from the ratio and added back afterwards.
    const offset = timed.offsetTop;
    const centre = scroller.scrollTop + scroller.clientHeight / 2 - offset;
    if (centre <= 0) return;
    scroller.scrollTop = offset + (centre * hourHeight) / previous - scroller.clientHeight / 2;
  }, [hourHeight]);

  const TIME_COL_WIDTH = 48; // matches TimeColumn w-12
  const MAX_VISIBLE_DAYS = 7;
  const MIN_DAY_COL_WIDTH = 96;
  // Floor for zoomed-out columns: below this the date header stops being
  // readable, so zooming out further only shrinks the hour rows.
  const MIN_ZOOMED_COL_WIDTH = 56;
  const visibleDayCount = Math.min(days.length, MAX_VISIBLE_DAYS);
  const availableWidth = Math.max(0, viewportWidth - TIME_COL_WIDTH);
  // What a column gets when a week of them shares the viewport at 100%.
  const fittedColWidth = viewportWidth && visibleDayCount ? Math.floor(availableWidth / visibleDayCount) : 0;
  // Zooming in only stretches the hour rows: the columns keep their 100%
  // width, so the same days stay on screen. Zooming out still narrows them,
  // which is how more days fit side by side.
  const scaledColWidth = Math.max(
    MIN_ZOOMED_COL_WIDTH,
    Math.round(Math.max(MIN_DAY_COL_WIDTH, fittedColWidth) * Math.min(1, gridZoom))
  );
  // Fixed widths are only for days that genuinely overflow. The moment they
  // all fit — which zooming out is what makes happen — the columns go back to
  // flexing so they divide the width exactly, instead of being pinned to a
  // rounded pixel width that leaves a gap down the right-hand side.
  const colWidth =
    viewportWidth && scaledColWidth * days.length > availableWidth ? scaledColWidth : undefined;
  const hScroll = colWidth !== undefined;

  useEffect(() => {
    setArmedId(null);
    if (activeMode === "wake") {
      setDraft(null);
      setSelectedSchedule(null);
      return;
    }
    setWakeSelection(null);
  }, [activeMode, setSelectedSchedule]);

  function onPointerStart(dayId: string, event: React.PointerEvent<HTMLDivElement>) {
    if (!canEdit || event.button !== 0 || event.target !== event.currentTarget) return;
    // While the rename input is open, this pointerdown fires before the
    // input's blur. Starting a new drag here would replace the draft state
    // the blur handler is about to commit, so let the click only close the
    // naming input.
    if (draft) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const anchor = timeToMinutes(pointerYToTime(event.clientY - rect.top, hourHeight));

    if (activeMode === "wake") {
      const origin = { x: event.clientX, y: event.clientY };
      let moved = false;

      function cleanup() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", cleanup);
      }

      const onMove = (moveEvent: PointerEvent) => {
        if (Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) <= TOUCH_MOVE_TOLERANCE) {
          return;
        }
        moved = true;
        cleanup();
      };
      const onUp = () => {
        cleanup();
        if (moved) return;
        const wakeTime = minutesToTime(anchor);
        setWakeDay(null);
        setWakeSelection({ dayId, anchorPoint: origin });
        saveWakeTime(dayId, wakeTime).catch(() => {
          setWakeSelection((current) => (current?.dayId === dayId ? null : current));
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", cleanup);
      return;
    }

    if (activeMode === "availability") {
      const onUp = (upEvent: PointerEvent) => {
        const end = timeToMinutes(pointerYToTime(upEvent.clientY - rect.top, hourHeight));
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

    const requiresLongPress = event.pointerType === "touch";
    const origin = { x: event.clientX, y: event.clientY };
    let activated = !requiresLongPress;
    let longPressTimer: number | null = null;
    let releaseScroll: (() => void) | null = null;
    // Drawn on a running clock across the columns: minutes from the first
    // date's midnight. Dragging into a later (or earlier) date's column runs
    // the event into that date.
    const gridEl = event.currentTarget;
    const dayCount = days.length;
    const anchorColumn = Math.max(0, days.findIndex((day) => day.id === dayId));
    const anchorAbs = anchorColumn * DAY_END_MINUTES + anchor;
    let currentColumn = anchorColumn;
    let pointer = { x: event.clientX, y: event.clientY };
    let frame: number | null = null;

    function columnUnder(x: number) {
      const columns = timedRef.current?.querySelectorAll<HTMLElement>("[data-day-column]") ?? [];
      for (let index = 0; index < columns.length; index += 1) {
        if (index === currentColumn) continue;
        const box = columns[index].getBoundingClientRect();
        if (x >= box.left + COLUMN_SWITCH_MARGIN && x <= box.right - COLUMN_SWITCH_MARGIN) return index;
      }
      return currentColumn;
    }

    function applyPointer() {
      currentColumn = columnUnder(pointer.x);
      const top = gridEl.getBoundingClientRect().top;
      const minutes = timeToMinutes(pointerYToTime(pointer.y - top, hourHeight));
      const currentAbs = currentColumn * DAY_END_MINUTES + Math.max(0, Math.min(DAY_END_MINUTES, minutes));
      const start = Math.min(anchorAbs, currentAbs);
      const end = Math.min(dayCount * DAY_END_MINUTES, Math.max(anchorAbs + MIN_DURATION_MINUTES, currentAbs));
      const column = Math.min(dayCount - 1, Math.floor(start / DAY_END_MINUTES));
      const offset = column * DAY_END_MINUTES;
      const startDayId = days[column]?.id ?? dayId;
      if (dragRef.current) {
        dragRef.current.dayId = startDayId;
        dragRef.current.start = start - offset;
        dragRef.current.end = end - offset;
      }
      setDraft((prev) =>
        prev ? { ...prev, dayId: startDayId, startMinutes: start - offset, endMinutes: end - offset } : prev
      );
    }

    function autoScroll() {
      frame = null;
      const scroller = scrollRef.current;
      if (!scroller) return;
      const box = scroller.getBoundingClientRect();
      const head = scroller.querySelector("[data-grid-sticky-head]");
      const bar = document.querySelector("[data-mobile-project-bar]");
      const top = head ? head.getBoundingClientRect().bottom : box.top;
      const barTop = bar?.getBoundingClientRect().top;
      const bottom = barTop && barTop > 0 ? Math.min(box.bottom, barTop) : box.bottom;
      let speed = 0;
      if (pointer.y < top + DRAW_AUTO_SCROLL_EDGE) speed = -(top + DRAW_AUTO_SCROLL_EDGE - pointer.y);
      else if (pointer.y > bottom - DRAW_AUTO_SCROLL_EDGE) speed = pointer.y - (bottom - DRAW_AUTO_SCROLL_EDGE);
      if (!speed) return;
      const before = scroller.scrollTop;
      scroller.scrollTop += Math.sign(speed) * Math.min(DRAW_AUTO_SCROLL_MAX_STEP, Math.ceil(Math.abs(speed) / 3));
      if (scroller.scrollTop === before) return;
      applyPointer();
      frame = window.requestAnimationFrame(autoScroll);
    }

    function beginDraft() {
      // Once a finger has armed a draft, its travel draws the block. Left to
      // itself the browser would start panning the grid instead and cancel
      // the pointer, dropping the draft mid-drag.
      if (requiresLongPress) releaseScroll = holdScroll();
      dragRef.current = { dayId, start: anchor, end: anchor + MIN_DURATION_MINUTES };
      setDraft({ dayId, startMinutes: anchor, endMinutes: anchor + MIN_DURATION_MINUTES, naming: false });
    }

    function cleanup() {
      if (longPressTimer !== null) window.clearTimeout(longPressTimer);
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      releaseScroll?.();
      releaseScroll = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    }

    const onMove = (moveEvent: PointerEvent) => {
      if (!activated) {
        const moved = Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y);
        if (moved > TOUCH_MOVE_TOLERANCE) cleanup();
        return;
      }

      moveEvent.preventDefault();
      pointer = { x: moveEvent.clientX, y: moveEvent.clientY };
      applyPointer();
      if (frame === null) frame = window.requestAnimationFrame(autoScroll);
    };
    const onUp = () => {
      const shouldOpenNaming = activated;
      cleanup();
      // Keep the draft local and open the name input; nothing is saved until a
      // name is entered.
      if (shouldOpenNaming) setDraft((prev) => (prev ? { ...prev, naming: true } : prev));
      dragRef.current = null;
    };
    const onCancel = () => {
      const shouldDiscardDraft = activated;
      cleanup();
      if (shouldDiscardDraft) setDraft(null);
      dragRef.current = null;
    };

    if (requiresLongPress) {
      longPressTimer = window.setTimeout(() => {
        activated = true;
        beginDraft();
      }, TOUCH_LONG_PRESS_MS);
    } else {
      beginDraft();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
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
        toast.error(t("grid.allDaySaveFailed"));
      });
  }

  function removeSchedule(id: string) {
    deleteSchedule(id)
      .then(() => {
        if (selectedScheduleId === id) setSelectedSchedule(null);
        toast.success(t("detail.deleted"));
      })
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : t("detail.deleteFailed"));
      });
  }

  // The draft's part in one column. One drawn past midnight shows in each
  // column it reaches; the name is typed into the first part.
  function draftPieceFor(columnIndex: number) {
    if (!draft) return null;
    const startColumn = dayOrder.indexOf(draft.dayId);
    if (startColumn === -1) return null;
    const start = startColumn * DAY_END_MINUTES + draft.startMinutes;
    const end = startColumn * DAY_END_MINUTES + draft.endMinutes;
    const columnStart = columnIndex * DAY_END_MINUTES;
    const pieceStart = Math.max(start, columnStart);
    const pieceEnd = Math.min(end, columnStart + DAY_END_MINUTES);
    if (pieceEnd <= pieceStart) return null;
    const crosses = end > startColumn * DAY_END_MINUTES + DAY_END_MINUTES;
    return {
      start_time: minutesToTime(pieceStart - columnStart),
      end_time: minutesToTime(pieceEnd - columnStart),
      naming: draft.naming && columnIndex === startColumn,
      timeLabel: crosses
        ? `${minutesToTime(draft.startMinutes % DAY_END_MINUTES)} - ${minutesToTime(end % DAY_END_MINUTES)}`
        : undefined
    };
  }

  function commitDraft(title: string) {
    if (!draft) return;
    const name = title.trim();
    // No name → discard the draft without creating anything.
    if (!name) {
      setDraft(null);
      return;
    }
    // A draft drawn past midnight ends on a later date.
    const offset = Math.max(0, dayOrder.indexOf(draft.dayId)) * DAY_END_MINUTES;
    upsertSchedule({
      project_id: projectId,
      title: name,
      ...fromAbsoluteSpan(offset + draft.startMinutes, offset + draft.endMinutes, dayOrder)
    })
      .then((item) => setSelectedSchedule(item.id))
      .catch((error) => {
        console.error(error);
        toast.error(t("grid.scheduleSaveFailed"));
      });
    setDraft(null);
  }

  function releaseScroll() {
    scrollReleaseRef.current?.();
    scrollReleaseRef.current = null;
  }

  function onDragEnd(event: DragEndEvent) {
    releaseScroll();
    const dragged = (event.active.data.current as { item?: ScheduleItem } | undefined)?.item;
    const item = schedules.find((schedule) => schedule.id === (dragged?.id ?? event.active.id));
    if (!item || !canEdit) return;
    const deltaMinutes = snapMinutes((event.delta.y / hourHeight) * 60);
    if (isOvernight(item, dayOrder)) {
      moveOvernight(item, deltaMinutes, event.delta.x);
      return;
    }
    const start = Math.max(0, Math.min(DAY_END_MINUTES - MIN_DURATION_MINUTES, timeToMinutes(item.start_time) + deltaMinutes));
    const duration = timeToMinutes(item.end_time) - timeToMinutes(item.start_time);
    const currentDayIndex = days.findIndex((day) => day.id === item.day_id);
    const measuredWidth = colsRef.current ? colsRef.current.offsetWidth / days.length : 208;
    const columnWidth = colWidth ?? measuredWidth;
    const columnShift = Math.round(event.delta.x / Math.max(1, columnWidth));
    const nextDay = days[Math.max(0, Math.min(days.length - 1, currentDayIndex + columnShift))] ?? days[currentDayIndex];
    // A long-press that only armed the event lands where it started.
    if (nextDay.id === item.day_id && start === timeToMinutes(item.start_time)) return;
    upsertSchedule({
      ...item,
      day_id: nextDay.id,
      start_time: minutesToTime(start),
      end_time: minutesToTime(Math.min(DAY_END_MINUTES, start + duration))
    }).catch((error) => {
      console.error(error);
      toast.error(`${t("grid.moveFailed")}: ${error instanceof Error ? error.message : ""}`);
    });
  }

  function columnShiftFor(deltaX: number) {
    const measuredWidth = colsRef.current ? colsRef.current.offsetWidth / days.length : 208;
    return Math.round(deltaX / Math.max(1, colWidth ?? measuredWidth));
  }

  // An overnight event moves as one piece: its start and end shift by the
  // same amount, across dates as needed, and stay within the timetable.
  function moveOvernight(item: ScheduleItem, deltaMinutes: number, deltaX: number) {
    const span = absoluteSpan(item, dayOrder);
    const shift = columnShiftFor(deltaX) * DAY_END_MINUTES + deltaMinutes;
    const total = dayOrder.length * DAY_END_MINUTES;
    const clamped = Math.max(-span.start, Math.min(total - span.end, shift));
    if (!clamped) return;
    upsertSchedule({
      ...item,
      ...fromAbsoluteSpan(span.start + clamped, span.end + clamped, dayOrder)
    }).catch((error) => {
      console.error(error);
      toast.error(`${t("grid.moveFailed")}: ${error instanceof Error ? error.message : ""}`);
    });
  }

  function resizeItem(itemId: string, startTime: string, endTime: string, segment?: DaySegment) {
    const item = schedules.find((candidate) => candidate.id === itemId);
    if (!item) return;
    // On a part of an overnight event only its own edge moves: the first
    // part's top is the start, the last part's bottom the end.
    const patch = !segment
      ? { start_time: startTime, end_time: endTime }
      : {
          ...(segment.first ? { start_time: startTime } : {}),
          ...(segment.last ? { end_time: endTime } : {})
        };
    upsertSchedule({
      ...item,
      ...patch
    }).catch((error) => {
      console.error(error);
      toast.error(`${t("grid.resizeFailed")}: ${error instanceof Error ? error.message : ""}`);
    });
  }

  async function saveWakeTime(
    dayId: string,
    wakeTime: string | null,
    sleepDurationMinutes?: number
  ) {
    try {
      const currentDay = days.find((day) => day.id === dayId);
      await updateDayWakeTime(
        dayId,
        wakeTime,
        sleepDurationMinutes ?? currentDay?.sleep_duration_minutes ?? 420
      );
    } catch (error) {
      console.error(error);
      toast.error(t("grid.wakeTimeSaveFailed"));
      throw error;
    }
  }

  const wakeSelectionDay = wakeSelection
    ? days.find((day) => day.id === wakeSelection.dayId) ?? null
    : null;

  if (!days.length) {
    return (
      <div className="flex min-h-[540px] flex-1 items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">{t("grid.emptyTitle")}</h2>
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
      // The drop position comes from the pointer's delta, so the grid must not
      // scroll under a moving block.
      onDragStart={(event) => {
        scrollReleaseRef.current = holdScroll();
        if (typeof TouchEvent !== "undefined" && event.activatorEvent instanceof TouchEvent) {
          setArmedId(String(event.active.id));
        }
      }}
      onDragCancel={releaseScroll}
      onDragEnd={onDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <WakeTimeDialog
        day={wakeDay}
        onClose={() => setWakeDay(null)}
        onSave={saveWakeTime}
      />
      <DayRouteMapDialog
        day={mapDay}
        days={days}
        schedules={schedules}
        onSelectDay={setMapDay}
        onClose={() => setMapDay(null)}
      />
      {wakeSelection && wakeSelectionDay ? (
        <WakeTimePopover
          day={wakeSelectionDay}
          anchorPoint={wakeSelection.anchorPoint}
          onClose={() => setWakeSelection(null)}
          onSave={saveWakeTime}
        />
      ) : null}
      <div
        ref={scrollRef}
        id={TIMETABLE_SCROLLER_ID}
        onPointerDownCapture={(event) => {
          if (!armedId) return;
          const target = event.target as Element;
          if (!target.closest(`[data-schedule-id="${armedId}"]`)) setArmedId(null);
        }}
        className={cn(
          "min-h-0 flex-1 overflow-auto overscroll-none bg-background",
          // Frames the grid while wake-time mode is on. An outline on an
          // isolated box paints above everything inside it, so the sticky
          // date row can't cover the edge, and it stays put as it scrolls.
          activeMode === "wake" && "isolate outline-2 -outline-offset-2 outline-[var(--accent)]"
        )}
      >
        <div ref={contentRef} className={cn("relative", hScroll ? "w-max min-w-full" : "min-w-full")}>
          <LiveCursors cursors={cursors} />
          {cursorChat !== null && currentUserId ? (
            <div className="editor-only pointer-events-none absolute inset-0 z-50 overflow-hidden">
              <CursorChatInput
                positionRef={selfPosition}
                boxRef={contentRef}
                color={cursorColor(currentUserId)}
                value={cursorChat}
                onChange={setCursorChat}
                onClose={() => setCursorChat(null)}
              />
            </div>
          ) : null}
          {/* Date headers */}
          <div data-grid-sticky-head className="sticky top-0 z-30 flex bg-surface">
            <div className="sticky left-0 z-40 h-14 w-12 shrink-0 border-b border-r border-border bg-surface" />
            <div ref={colsRef} className={hScroll ? "flex" : "flex flex-1"}>
              {days.map((day) => (
                <DayHeaderCell
                  key={day.id}
                  day={day}
                  weekdayOnly={weekdayOnly}
                  width={colWidth}
                  canEdit={canEdit}
                  onEditWakeTime={() => {
                    setWakeSelection(null);
                    setWakeDay(day);
                  }}
                  onOpenMap={() => setMapDay(day)}
                />
              ))}
            </div>
          </div>

          {/* All-day band: one row across every column. It grows to fit every
              lane, pushing the timed grid below it down. Not sticky — a tall
              band would otherwise pin itself over most of the viewport. */}
          <div className="z-30 flex bg-surface">
            <div className="sticky left-0 z-40 w-12 shrink-0 border-b border-r border-border bg-surface pr-2 pt-1 text-right text-[11px] text-muted">
              {t("grid.allDay")}
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
          <div ref={timedRef} className="flex">
            <div className="sticky left-0 z-40">
              <TimeColumn hourHeight={hourHeight} />
            </div>
            <div className={hScroll ? "flex" : "flex flex-1"}>
              {days.map((day, dayIndex) => (
                <DateColumn
                  key={day.id}
                  day={day}
                  nextDay={days[dayIndex + 1] ?? null}
                  canEdit={canEdit}
                  activeMode={activeMode}
                  memberCount={members.length}
                  width={colWidth}
                  hourHeight={hourHeight}
                  selectedScheduleId={selectedScheduleId}
                  armedScheduleId={armedId}
                  schedules={timedByDay.get(day.id)?.items ?? []}
                  segments={timedByDay.get(day.id)?.segments}
                  availability={availability.filter((slot) => slot.day_id === day.id)}
                  draft={draftPieceFor(dayIndex)}
                  peerDrafts={peerDrafts.filter((peer) => peer.dayId === day.id)}
                  onDraftCommit={commitDraft}
                  onDraftCancel={() => setDraft(null)}
                  onSelectSchedule={setSelectedSchedule}
                  onResize={(item, startTime, endTime, segment) => resizeItem(item.id, startTime, endTime, segment)}
                  onDeleteSchedule={removeSchedule}
                  onPointerStart={onPointerStart}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Room to scroll the last hours out from under the phone's bottom
            bar. Left out of exports. */}
        <div aria-hidden data-export-skip className="h-20 lg:hidden" />
      </div>
    </DndContext>
  );
}

function DayHeaderCell({
  day,
  weekdayOnly,
  width,
  canEdit,
  onEditWakeTime,
  onOpenMap
}: {
  day: ProjectDay;
  weekdayOnly?: boolean;
  width?: number;
  canEdit: boolean;
  onEditWakeTime: () => void;
  onOpenMap: () => void;
}) {
  const fmt = useDateFormat();
  const t = useT();
  const date = new Date(day.date);
  const weekday = fmt.weekday(date.getDay());
  const wakeTime = day.wake_time?.slice(0, 5);
  return (
    <div
      className={cn(
        "flex h-14 items-center justify-center border-b border-r border-border last:border-r-0",
        width ? "shrink-0" : "min-w-0 flex-1"
      )}
      style={width ? { width } : undefined}
    >
      <div className="min-w-0 text-center">
        {weekdayOnly ? (
          <p className="text-sm font-semibold text-foreground">{weekday}</p>
        ) : (
          <>
            <p className="truncate text-sm font-semibold text-foreground">
              {fmt.monthDay(date)} <span className="font-normal text-muted">{weekday}</span>
            </p>
          </>
        )}
        <div className="mt-0.5 flex items-center justify-center gap-1">
          {canEdit ? (
            <button
              type="button"
              className={cn(
                "flex h-4 max-w-full items-center justify-center gap-1 rounded px-1 text-[9px] font-medium tabular-nums transition hover:bg-black/6 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                wakeTime ? "text-[#596579]" : "text-muted/70"
              )}
              onClick={onEditWakeTime}
              title={t("grid.setWakeTime")}
              aria-label={`${day.date} ${t("grid.setWakeTime")}`}
            >
              <AlarmClock size={10} aria-hidden="true" />
              <span>{wakeTime || "--:--"}</span>
            </button>
          ) : wakeTime ? (
            <div className="flex h-4 items-center justify-center gap-1 text-[9px] font-medium tabular-nums text-[#596579]">
              <AlarmClock size={10} aria-hidden="true" />
              <span>{wakeTime}</span>
            </div>
          ) : null}
          <button
            type="button"
            className="flex h-4 items-center justify-center rounded px-1 text-muted/70 transition hover:bg-black/6 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            onClick={onOpenMap}
            title={t("grid.openMap")}
            aria-label={`${day.date} ${t("grid.openMap")}`}
          >
            <MapIcon size={10} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

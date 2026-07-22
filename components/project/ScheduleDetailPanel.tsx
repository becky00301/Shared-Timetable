"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { timeToMinutes } from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

const COLORS = ["#1972F7", "#8B5CF6", "#F59E0B", "#22C55E", "#EF4444"];

// Below this the sidebar has no room, so the panel becomes a popover pinned to
// the schedule block instead — same breakpoint as the `xl:` classes below.
const SIDEBAR_QUERY = "(min-width: 1280px)";
const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function ScheduleDetailPanel({
  days,
  canEdit
}: {
  days: ProjectDay[];
  canEdit: boolean;
}) {
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const deleteSchedule = useProjectStore((state) => state.deleteSchedule);
  const upsertSchedule = useProjectStore((state) => state.upsertSchedule);
  const schedules = useProjectStore((state) => state.schedules);
  const item = schedules.find((schedule) => schedule.id === selectedScheduleId);

  const [title, setTitle] = useState("");
  const [dayId, setDayId] = useState("");
  const [endDayId, setEndDayId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDayId(item.day_id);
    setEndDayId(item.end_day_id ?? item.day_id);
    setStartTime(item.start_time.slice(0, 5));
    setEndTime(item.end_time.slice(0, 5));
    setLocation(item.location ?? "");
    setDescription(item.description ?? "");
  }, [item]);

  const selectedId = item?.id;
  const asSidebar = useMediaQuery(SIDEBAR_QUERY);
  const popoverRef = useRef<HTMLElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Pin the popover beside the block it belongs to, flipping and clamping so it
  // always lands fully on screen.
  useLayoutEffect(() => {
    if (asSidebar || !selectedId) {
      setPopoverPos(null);
      return;
    }

    function place() {
      const el = popoverRef.current;
      if (!el) return;
      const { offsetWidth: width, offsetHeight: height } = el;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const anchor = document.querySelector(`[data-schedule-id="${selectedId}"]`);

      if (!anchor) {
        setPopoverPos({ left: (vw - width) / 2, top: (vh - height) / 2 });
        return;
      }

      const rect = anchor.getBoundingClientRect();
      let left = rect.right + POPOVER_GAP;
      // No room on the right → flip to the left of the block.
      if (left + width > vw - VIEWPORT_MARGIN) left = rect.left - POPOVER_GAP - width;
      // No room on either side → overlay the block, kept inside the viewport.
      if (left < VIEWPORT_MARGIN) {
        left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), vw - width - VIEWPORT_MARGIN);
      }

      let top = rect.top;
      if (top + height > vh - VIEWPORT_MARGIN) top = vh - height - VIEWPORT_MARGIN;
      if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;

      setPopoverPos({ left, top });
    }

    place();
    window.addEventListener("resize", place);
    // Capture phase so scrolling the timetable container repositions too.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [asSidebar, selectedId, item?.day_id, item?.start_time, item?.all_day]);

  // Clicking away closes the popover, the way Google Calendar's does. Clicks on
  // another schedule are left alone so they can just switch the selection.
  useEffect(() => {
    if (asSidebar || !selectedId) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest("[data-schedule-id]")) return;
      setSelectedSchedule(null);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [asSidebar, selectedId, setSelectedSchedule]);

  // Delete/Backspace removes the selected schedule, unless the user is typing.
  useEffect(() => {
    if (!selectedId || !canEdit) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
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
      event.preventDefault();
      deleteSchedule(selectedId!)
        .then(() => {
          setSelectedSchedule(null);
          toast.success("일정을 삭제했어요.");
        })
        .catch((error) => {
          console.error(error);
          toast.error("일정을 삭제하지 못했어요.");
        });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, canEdit, deleteSchedule, setSelectedSchedule]);

  if (!item) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-border bg-surface p-5 xl:block">
        <h2 className="text-sm font-semibold text-foreground">일정 상세</h2>
        <div className="mt-6 rounded-xl border border-dashed border-border bg-black/[0.02] p-5 text-sm leading-6 text-muted">
          일정을 클릭하면 여기에서 바로 수정할 수 있어요.
        </div>
      </aside>
    );
  }

  function save(patch: Partial<typeof item> & Record<string, unknown>) {
    if (!item || !canEdit) return;
    upsertSchedule({ ...item, ...patch }).catch((error) => {
      console.error(error);
      toast.error("변경사항을 저장하지 못했어요.");
    });
  }

  function saveTitle() {
    const next = title.trim() || "새 일정";
    if (next !== item!.title) save({ title: next });
  }

  function saveTimes(nextStart: string, nextEnd: string) {
    if (timeToMinutes(nextEnd) <= timeToMinutes(nextStart)) {
      toast.error("종료 시간은 시작 시간보다 뒤여야 해요.");
      return;
    }
    save({ start_time: nextStart, end_time: nextEnd });
  }

  return (
    <aside
      ref={popoverRef}
      className={cn(
        "overflow-auto border-border bg-surface",
        asSidebar
          ? "w-80 shrink-0 border-l p-5"
          : "fixed z-50 max-h-[78vh] w-[min(340px,calc(100vw-24px))] rounded-xl border p-4 shadow-xl"
      )}
      style={
        asSidebar
          ? undefined
          : {
              top: popoverPos?.top ?? 0,
              left: popoverPos?.left ?? 0,
              // Hidden for the one frame before it has been measured and placed.
              visibility: popoverPos ? "visible" : "hidden"
            }
      }
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">일정 상세</h2>
        <button
          type="button"
          onClick={() => setSelectedSchedule(null)}
          className="rounded-md p-1 text-muted transition hover:bg-black/8 hover:text-foreground"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1.5 text-muted">
          이름
          <Input
            value={title}
            disabled={!canEdit}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-muted">
          {item.all_day ? "시작 날짜" : "날짜"}
          <select
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none disabled:opacity-60"
            value={dayId}
            disabled={!canEdit}
            onChange={(event) => {
              setDayId(event.target.value);
              save({ day_id: event.target.value });
            }}
          >
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                {day.date}
              </option>
            ))}
          </select>
        </label>

        {item.all_day ? (
          <label className="flex flex-col gap-1.5 text-muted">
            종료 날짜
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none disabled:opacity-60"
              value={endDayId}
              disabled={!canEdit}
              onChange={(event) => {
                const next = event.target.value;
                setEndDayId(next);
                // Same day as the start means a single-day item.
                save({ end_day_id: next === dayId ? null : next });
              }}
            >
              {days
                .filter((day) => day.date >= (days.find((d) => d.id === dayId)?.date ?? ""))
                .map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.date}
                  </option>
                ))}
            </select>
          </label>
        ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-muted">
            시작
            <Input
              type="time"
              step={300}
              value={startTime}
              disabled={!canEdit}
              onChange={(event) => {
                setStartTime(event.target.value);
                saveTimes(event.target.value, endTime);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-muted">
            종료
            <Input
              type="time"
              step={300}
              value={endTime}
              disabled={!canEdit}
              onChange={(event) => {
                setEndTime(event.target.value);
                saveTimes(startTime, event.target.value);
              }}
            />
          </label>
        </div>
        )}

        <label className="flex flex-col gap-1.5 text-muted">
          장소
          <Input
            value={location}
            disabled={!canEdit}
            placeholder="선택 입력"
            onChange={(event) => setLocation(event.target.value)}
            onBlur={() => save({ location: location.trim() })}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-muted">
          메모
          <Textarea
            value={description}
            disabled={!canEdit}
            placeholder="선택 입력"
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => save({ description: description.trim() })}
          />
        </label>

        <div className="flex flex-col gap-1.5 text-muted">
          색상
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                disabled={!canEdit}
                onClick={() => save({ color })}
                className="size-8 rounded-full border border-black/20 transition"
                style={{ backgroundColor: color, outline: item.color === color ? "2px solid white" : "none" }}
                aria-label={`색상 ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button
          variant="danger"
          className="w-full"
          disabled={!canEdit}
          onClick={() => {
            deleteSchedule(item.id)
              .then(() => {
                setSelectedSchedule(null);
                toast.success("일정을 삭제했어요.");
              })
              .catch((error) => {
                console.error(error);
                toast.error("일정을 삭제하지 못했어요.");
              });
          }}
        >
          <Trash2 size={16} />
          삭제
        </Button>
        {canEdit ? (
          <p className="mt-2 text-center text-xs text-muted">Delete 키로도 삭제할 수 있어요.</p>
        ) : null}
      </div>
    </aside>
  );
}

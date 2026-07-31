"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";
import { timeToMinutes } from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

const COLORS = ["#1972F7", "#8B5CF6", "#F59E0B", "#22C55E", "#EF4444"];

const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;

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
  const t = useT();

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
  const popoverRef = useRef<HTMLElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Pin the popover beside the block it belongs to, flipping and clamping so it
  // always lands fully on screen.
  useLayoutEffect(() => {
    if (!selectedId) {
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
  }, [selectedId, item?.day_id, item?.start_time, item?.all_day]);

  // Clicking away closes the popover, the way Google Calendar's does. Clicks on
  // another schedule are left alone so they can just switch the selection.
  useEffect(() => {
    if (!selectedId) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest("[data-schedule-id]")) return;
      setSelectedSchedule(null);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [selectedId, setSelectedSchedule]);

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
          toast.success(t("detail.deleted"));
        })
        .catch((error) => {
          console.error(error);
          toast.error(error instanceof Error ? error.message : t("detail.deleteFailed"));
        });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, canEdit, deleteSchedule, setSelectedSchedule, t]);

  if (!item) return null;

  function save(patch: Partial<typeof item> & Record<string, unknown>) {
    if (!item || !canEdit) return;
    upsertSchedule({ ...item, ...patch }).catch((error) => {
      console.error(error);
      toast.error(t("detail.saveFailed"));
    });
  }

  function saveTitle() {
    const next = title.trim() || t("grid.newSchedule");
    if (next !== item!.title) save({ title: next });
  }

  function saveTimes(nextStart: string, nextEnd: string) {
    if (timeToMinutes(nextEnd) <= timeToMinutes(nextStart)) {
      toast.error(t("detail.endBeforeStart"));
      return;
    }
    save({ start_time: nextStart, end_time: nextEnd });
  }

  return (
    <aside
      ref={popoverRef}
      className="fixed z-50 max-h-[78vh] w-[min(340px,calc(100vw-24px))] max-w-[calc(100vw-24px)] overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
      style={{
        top: popoverPos?.top ?? 0,
        left: popoverPos?.left ?? 0,
        // Hidden for the one frame before it has been measured and placed.
        visibility: popoverPos ? "visible" : "hidden"
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{t("detail.title")}</h2>
        <button
          type="button"
          onClick={() => setSelectedSchedule(null)}
          className="rounded-md p-1 text-muted transition hover:bg-black/8 hover:text-foreground"
          aria-label={t("common.close")}
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-4 text-sm">
        <label className="flex min-w-0 flex-col gap-1.5 text-muted">
          {t("common.name")}
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

        <label className="flex min-w-0 flex-col gap-1.5 text-muted">
          {item.all_day ? t("detail.startDate") : t("detail.date")}
          <select
            className="h-10 min-w-0 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none disabled:opacity-60 sm:text-sm"
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
          <label className="flex min-w-0 flex-col gap-1.5 text-muted">
            {t("detail.endDate")}
            <select
              className="h-10 min-w-0 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none disabled:opacity-60 sm:text-sm"
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
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <label className="flex min-w-0 flex-col gap-1.5 text-muted">
              {t("detail.start")}
              <Input
                type="time"
                className="max-w-full [inline-size:100%] [min-inline-size:0]"
                step={300}
                value={startTime}
                disabled={!canEdit}
                onChange={(event) => {
                  setStartTime(event.target.value);
                  saveTimes(event.target.value, endTime);
                }}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-muted">
              {t("detail.end")}
              <Input
                type="time"
                className="max-w-full [inline-size:100%] [min-inline-size:0]"
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

        <label className="flex min-w-0 flex-col gap-1.5 text-muted">
          {t("detail.location")}
          <Input
            value={location}
            disabled={!canEdit}
            placeholder={t("common.optional")}
            onChange={(event) => setLocation(event.target.value)}
            onBlur={() => save({ location: location.trim() })}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-muted">
          {t("detail.memo")}
          <Textarea
            value={description}
            disabled={!canEdit}
            placeholder={t("common.optional")}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => save({ description: description.trim() })}
          />
        </label>

        <div className="flex flex-col gap-1.5 text-muted">
          {t("detail.color")}
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                disabled={!canEdit}
                onClick={() => save({ color })}
                className="size-8 rounded-full border border-black/20 transition"
                style={{ backgroundColor: color, outline: item.color === color ? "2px solid white" : "none" }}
                aria-label={t("detail.colorLabel", { color })}
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
                toast.success(t("detail.deleted"));
              })
              .catch((error) => {
                console.error(error);
                toast.error(error instanceof Error ? error.message : t("detail.deleteFailed"));
              });
          }}
        >
          <Trash2 size={16} />
          {t("common.delete")}
        </Button>
        {canEdit ? (
          <p className="mt-2 text-center text-xs text-muted">{t("detail.deleteHint")}</p>
        ) : null}
      </div>
    </aside>
  );
}

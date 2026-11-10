"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImagePlus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@appica/ui-react/switch";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import {
  amountToInput,
  currencyFractionDigits,
  DEFAULT_CURRENCY,
  parseAmountInput
} from "@/lib/utils/money";
import { SCHEDULE_COLOR_GROUPS } from "@/lib/utils/schedule-colors";
import { absoluteSpan, fromAbsoluteSpan } from "@/lib/utils/schedule-span";
import { nextFreeHour, timeToMinutes } from "@/lib/utils/time";
import { useSchedulePhotoUrl } from "@/stores/photo-store";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

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
  const setSchedulePhoto = useProjectStore((state) => state.setSchedulePhoto);
  const removeSchedulePhoto = useProjectStore((state) => state.removeSchedulePhoto);
  const schedules = useProjectStore((state) => state.schedules);
  const projects = useProjectStore((state) => state.projects);
  const budgetSchemaMissing = useProjectStore((state) => state.budgetSchemaMissing);
  const item = schedules.find((schedule) => schedule.id === selectedScheduleId);
  const currency =
    projects.find((project) => project.id === item?.project_id)?.budget_currency || DEFAULT_CURRENCY;
  const t = useT();

  const [title, setTitle] = useState("");
  const [dayId, setDayId] = useState("");
  const [endDayId, setEndDayId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoUrl = useSchedulePhotoUrl(item?.image_path);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDayId(item.day_id);
    setEndDayId(item.end_day_id ?? item.day_id);
    setStartTime(item.start_time.slice(0, 5));
    setEndTime(item.end_time.slice(0, 5));
    setLocation(item.location ?? "");
    setDescription(item.description ?? "");
    setAmount(amountToInput(item.amount));
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
      // 23514: the database still has the old "end after start" check.
      toast.error(
        (error as { code?: string } | null)?.code === "23514"
          ? t("detail.overnightNotMigrated")
          : t("detail.saveFailed")
      );
    });
  }

  function pickPhoto(file: File | undefined) {
    if (!file || !item || !canEdit) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("photo.notImage"));
      return;
    }
    setPhotoBusy(true);
    setSchedulePhoto(item.id, file)
      .catch((error) => {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        toast.error(
          message === "too-large"
            ? t("photo.tooLarge")
            : message === t("photo.notMigrated")
              ? message
              : t("photo.uploadFailed")
        );
      })
      .finally(() => setPhotoBusy(false));
  }

  function clearPhoto() {
    if (!item || !canEdit) return;
    setPhotoBusy(true);
    removeSchedulePhoto(item.id)
      .catch((error) => {
        console.error(error);
        toast.error(t("photo.removeFailed"));
      })
      .finally(() => setPhotoBusy(false));
  }

  // All-day keeps no times of its own, so turning it back into a timed event
  // gives it the next free hour of its start day, and a multi-day span
  // shrinks to that one day.
  function setAllDay(next: boolean) {
    if (!item || next === Boolean(item.all_day)) return;
    if (next) {
      save({ all_day: true, start_time: "00:00", end_time: "23:59", end_day_id: null });
      return;
    }
    const sameDay = schedules.filter((other) => other.day_id === item.day_id && other.id !== item.id);
    save({ all_day: false, end_day_id: null, ...nextFreeHour(sameDay) });
  }

  function saveTitle() {
    const next = title.trim() || t("grid.newSchedule");
    if (next !== item!.title) save({ title: next });
  }

  // An empty field means "no amount", which the summary treats differently
  // from an item that genuinely costs nothing.
  function saveAmount() {
    const raw = amount.trim();
    if (!raw) {
      setAmount("");
      if (item!.amount !== null && item!.amount !== undefined) save({ amount: null });
      return;
    }
    const parsed = parseAmountInput(raw);
    if (parsed === null) {
      toast.error(t("budget.invalidAmount"));
      setAmount(amountToInput(item!.amount));
      return;
    }
    setAmount(String(parsed));
    if (parsed !== item!.amount) save({ amount: parsed });
  }

  // A timed event's start and end are each a date and a time, so one can run
  // past midnight into a later date of the timetable.
  const dayOrder = days.map((day) => day.id);
  const columnOf = (id: string) => Math.max(0, dayOrder.indexOf(id));

  function saveSpan(startDay: string, start: string, endDay: string, end: string) {
    const startAbs = columnOf(startDay) * 24 * 60 + timeToMinutes(start);
    const endAbs = columnOf(endDay) * 24 * 60 + timeToMinutes(end);
    if (endAbs <= startAbs) {
      toast.error(t("detail.endBeforeStart"));
      // Put the dates back to what is saved. A time stays as typed, since
      // the reader may be about to change the date that makes it valid.
      setDayId(item!.day_id);
      setEndDayId(item!.end_day_id ?? item!.day_id);
      return;
    }
    save(fromAbsoluteSpan(startAbs, endAbs, dayOrder));
  }

  // A new start date keeps the event's length: the end moves with it,
  // stopping at midnight after the last date.
  function moveStartDay(nextDay: string) {
    const span = absoluteSpan(item!, dayOrder);
    const shift = (columnOf(nextDay) - columnOf(item!.day_id)) * 24 * 60;
    const start = span.start + shift;
    const end = Math.max(start + 5, Math.min(dayOrder.length * 24 * 60, span.end + shift));
    save(fromAbsoluteSpan(start, end, dayOrder));
  }

  const selectClass =
    "h-10 min-w-0 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none disabled:opacity-60 sm:text-sm";

  function timeField(value: string, onChange: (next: string) => void) {
    return (
      <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-background transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Input
          type="time"
          className="max-w-full rounded-none border-0 bg-transparent focus:border-transparent focus:ring-0 [inline-size:100%] [min-inline-size:0]"
          step={300}
          value={value}
          disabled={!canEdit}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
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
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>

        <div className="flex items-center justify-between text-muted">
          {t("grid.allDay")}
          <Switch
            checked={Boolean(item.all_day)}
            disabled={!canEdit}
            aria-label={t("grid.allDay")}
            onCheckedChange={(checked) => setAllDay(checked)}
          />
        </div>

        {item.all_day ? (
          <>
            <label className="flex min-w-0 flex-col gap-1.5 text-muted">
              {t("detail.startDate")}
              <select
                className={selectClass}
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
            <label className="flex min-w-0 flex-col gap-1.5 text-muted">
              {t("detail.endDate")}
              <select
                className={selectClass}
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
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-1.5 text-muted">
              {t("detail.start")}
              <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                <select
                  className={selectClass}
                  value={dayId}
                  disabled={!canEdit}
                  aria-label={t("detail.startDate")}
                  onChange={(event) => {
                    setDayId(event.target.value);
                    moveStartDay(event.target.value);
                  }}
                >
                  {days.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.date}
                    </option>
                  ))}
                </select>
                {timeField(startTime, (next) => {
                  setStartTime(next);
                  saveSpan(dayId, next, endDayId, endTime);
                })}
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-muted">
              {t("detail.end")}
              <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                <select
                  className={selectClass}
                  value={endDayId}
                  disabled={!canEdit}
                  aria-label={t("detail.endDate")}
                  onChange={(event) => {
                    setEndDayId(event.target.value);
                    saveSpan(dayId, startTime, event.target.value, endTime);
                  }}
                >
                  {days
                    .filter((day) => columnOf(day.id) >= columnOf(dayId))
                    .map((day) => (
                      <option key={day.id} value={day.id}>
                        {day.date}
                      </option>
                    ))}
                </select>
                {timeField(endTime, (next) => {
                  setEndTime(next);
                  saveSpan(dayId, startTime, endDayId, next);
                })}
              </div>
            </div>
          </>
        )}

        <label className="flex min-w-0 flex-col gap-1.5 text-muted">
          {t("detail.location")}
          <Input
            value={location}
            disabled={!canEdit}
            placeholder={t("common.optional")}
            onChange={(event) => setLocation(event.target.value)}
            onBlur={() => save({ location: location.trim() })}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-muted">
          {t("detail.amount")}
          <div className="flex w-full min-w-0 items-center overflow-hidden rounded-lg border border-border bg-background transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="shrink-0 pl-3 text-xs tabular-nums text-muted">{currency}</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={currencyFractionDigits(currency) === 0 ? 1 : 0.01}
              className="rounded-none border-0 bg-transparent focus:border-transparent focus:ring-0"
              value={amount}
              disabled={!canEdit}
              placeholder={t("detail.amountPlaceholder")}
              onChange={(event) => setAmount(event.target.value)}
              onBlur={saveAmount}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </div>
          {/* The amount is dropped on its way to a database that predates
              migration 015. It would otherwise look saved until the next
              refresh quietly took it away. */}
          {budgetSchemaMissing ? (
            <span className="text-xs leading-4 text-amber-700">{t("budget.amountNotSaved")}</span>
          ) : null}
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-muted">
          {t("detail.memo")}
          <Textarea
            value={description}
            disabled={!canEdit}
            placeholder={t("detail.memoPlaceholder")}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => save({ description: description.trim() })}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              // Shift+Enter still breaks the line for a longer memo.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        </label>

        <div className="flex flex-col gap-1.5 text-muted">
          {t("detail.color")}
          <div className="flex flex-col gap-2">
            {SCHEDULE_COLOR_GROUPS.map((colors) => (
              <div key={colors[0]} className="grid grid-cols-7 gap-2">
                {colors.map((color) => {
                  const selected = item.color?.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => save({ color })}
                      className={cn(
                        "size-8 rounded-full border border-black/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60",
                        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-surface"
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={t("detail.colorLabel", { color })}
                      aria-pressed={selected}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {canEdit || item.image_path ? (
          <div className="flex flex-col gap-1.5 text-muted">
            {t("photo.label")}
            {item.image_path ? (
              <div className="relative h-24 overflow-hidden rounded-md border border-border bg-black/5">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
                  <img src={photoUrl} alt="" className="size-full object-cover" />
                ) : null}
              </div>
            ) : null}
            {canEdit ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={photoBusy}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <ImagePlus size={16} />
                  {photoBusy ? t("photo.uploading") : item.image_path ? t("photo.replace") : t("photo.add")}
                </Button>
                {item.image_path ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={photoBusy}
                    onClick={clearPhoto}
                  >
                    {t("photo.remove")}
                  </Button>
                ) : null}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    pickPhoto(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
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

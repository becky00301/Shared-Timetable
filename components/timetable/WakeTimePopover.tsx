"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { AlarmClock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDateFormat } from "@/lib/i18n/dates";
import { useT } from "@/lib/i18n/locale";
import type { ProjectDay } from "@/types/project";

const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;

export function WakeTimePopover({
  day,
  anchorPoint,
  onClose,
  onSave
}: {
  day: ProjectDay;
  anchorPoint: { x: number; y: number };
  onClose: () => void;
  onSave: (dayId: string, wakeTime: string | null) => Promise<void>;
}) {
  const t = useT();
  const fmt = useDateFormat();
  const panelRef = useRef<HTMLElement>(null);
  const [wakeTime, setWakeTime] = useState(day.wake_time?.slice(0, 5) || "07:00");
  const [saving, setSaving] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setWakeTime(day.wake_time?.slice(0, 5) || "07:00");
  }, [day.id, day.wake_time]);

  useLayoutEffect(() => {
    function place() {
      const panel = panelRef.current;
      if (!panel) return;
      const anchor = document.querySelector(`[data-wake-anchor="${day.id}"]`);
      const rect = anchor?.getBoundingClientRect();
      const anchorLeft = rect?.left ?? anchorPoint.x;
      const anchorRight = rect?.right ?? anchorPoint.x;
      const anchorTop = rect?.top ?? anchorPoint.y;
      const { offsetWidth: width, offsetHeight: height } = panel;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = anchorRight + POPOVER_GAP;
      if (left + width > vw - VIEWPORT_MARGIN) left = anchorLeft - POPOVER_GAP - width;
      left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - width - VIEWPORT_MARGIN));

      let top = anchorTop - 24;
      top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - height - VIEWPORT_MARGIN));
      setPosition({ top, left });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorPoint.x, anchorPoint.y, day.id, day.wake_time]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wakeTime || saving) return;
    setSaving(true);
    try {
      await onSave(day.id, wakeTime);
    } catch {
      setWakeTime(day.wake_time?.slice(0, 5) || "07:00");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(day.id, null);
      onClose();
    } catch {
      // The grid owns the error toast; leave the editor open for another try.
    } finally {
      setSaving(false);
    }
  }

  const date = new Date(`${day.date}T00:00:00`);

  return (
    <aside
      ref={panelRef}
      data-wake-popover
      className="fixed z-50 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-xl"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden"
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlarmClock size={17} aria-hidden="true" />
            {t("grid.wakeTime")}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {fmt.monthDay(date)} {fmt.weekday(date.getDay())}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted transition hover:bg-black/8 hover:text-foreground"
          aria-label={t("common.close")}
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={save}>
        <label className="mt-4 block space-y-1.5 text-sm text-muted">
          {t("grid.wakeTime")}
          <Input
            type="time"
            value={wakeTime}
            step={60}
            disabled={saving}
            onInput={(event) => setWakeTime(event.currentTarget.value)}
            autoFocus
          />
        </label>

        <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={saving}>
            <Trash2 size={15} aria-hidden="true" />
            {t("grid.clearWakeTime")}
          </Button>
          <Button type="submit" size="sm" disabled={!wakeTime || saving}>
            {saving ? t("grid.savingWakeTime") : t("grid.saveWakeTime")}
          </Button>
        </div>
      </form>
    </aside>
  );
}

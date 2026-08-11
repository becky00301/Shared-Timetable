"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlarmClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDateFormat } from "@/lib/i18n/dates";
import { useT } from "@/lib/i18n/locale";
import type { ProjectDay } from "@/types/project";

export function WakeTimeDialog({
  day,
  onClose,
  onSave
}: {
  day: ProjectDay | null;
  onClose: () => void;
  onSave: (dayId: string, wakeTime: string | null) => Promise<void>;
}) {
  const t = useT();
  const fmt = useDateFormat();
  const [wakeTime, setWakeTime] = useState("07:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (day) setWakeTime(day.wake_time?.slice(0, 5) || "07:00");
  }, [day]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!day || !wakeTime || saving) return;
    setSaving(true);
    try {
      await onSave(day.id, wakeTime);
      onClose();
    } catch {
      // The grid owns the error toast; keep the dialog open for another try.
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!day || saving) return;
    setSaving(true);
    try {
      await onSave(day.id, null);
      onClose();
    } catch {
      // The grid owns the error toast; keep the dialog open for another try.
    } finally {
      setSaving(false);
    }
  }

  const date = day ? new Date(`${day.date}T00:00:00`) : null;

  return (
    <Dialog open={Boolean(day)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <AlarmClock size={20} aria-hidden="true" />
            {t("grid.wakeTime")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted">
            {date ? `${fmt.monthDay(date)} ${fmt.weekday(date.getDay())}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={save}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">{t("grid.wakeTime")}</span>
            <Input
              type="time"
              value={wakeTime}
              step={60}
              onInput={(event) => setWakeTime(event.currentTarget.value)}
              disabled={saving}
              autoFocus
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            {day?.wake_time ? (
              <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={saving}>
                <Trash2 size={15} aria-hidden="true" />
                {t("grid.clearWakeTime")}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!wakeTime || saving}>
              {saving ? t("grid.savingWakeTime") : t("grid.saveWakeTime")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

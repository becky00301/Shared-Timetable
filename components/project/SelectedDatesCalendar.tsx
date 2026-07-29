"use client";

import { useMemo, useState } from "react";
// parseISO reads a date-only string as local midnight. `new Date("2026-07-07")`
// would be UTC midnight, landing on the previous day west of UTC.
import { addDays as addDaysToDate, addMonths, endOfMonth, format, getDay, parseISO, startOfMonth } from "date-fns";
import { Pencil, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RangeCalendar } from "@/components/project/RangeCalendar";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { useDateFormat } from "@/lib/i18n/dates";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectDay } from "@/types/project";

export function SelectedDatesCalendar({
  days,
  projectId,
  canEdit = false
}: {
  days: ProjectDay[];
  projectId?: string;
  canEdit?: boolean;
}) {
  const dayByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const schedules = useProjectStore((state) => state.schedules);
  const replaceDays = useProjectStore((state) => state.replaceDays);
  const t = useT();
  const fmt = useDateFormat();

  const sorted = useMemo(() => days.map((day) => day.date).sort(), [days]);
  const [month, setMonth] = useState(() =>
    startOfMonth(sorted.length ? parseISO(sorted[0]) : new Date())
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const list: (Date | null)[] = Array.from({ length: getDay(first) }, () => null);
    for (let d = 1; d <= last.getDate(); d += 1) {
      list.push(new Date(month.getFullYear(), month.getMonth(), d));
    }
    return list;
  }, [month]);

  function openEditor() {
    setRangeStart(sorted.length ? parseISO(sorted[0]) : null);
    setRangeEnd(sorted.length ? parseISO(sorted[sorted.length - 1]) : null);
    setEditing(true);
  }

  const nextDates = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const count = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
    return Array.from({ length: count }, (_, i) => format(addDaysToDate(rangeStart, i), "yyyy-MM-dd"));
  }, [rangeStart, rangeEnd]);

  // What the change would cost: dates leaving the range take their schedules
  // with them, so say so before the button is pressed.
  const dropped = useMemo(() => {
    if (!nextDates.length) return { days: 0, items: 0 };
    const wanted = new Set(nextDates);
    const leaving = days.filter((day) => !wanted.has(day.date));
    const ids = new Set(leaving.map((day) => day.id));
    return {
      days: leaving.length,
      items: schedules.filter((item) => ids.has(item.day_id)).length
    };
  }, [nextDates, days, schedules]);

  async function save() {
    if (!projectId || !nextDates.length) return;
    setSaving(true);
    try {
      await replaceDays(projectId, nextDates);
      toast.success(t("dates.updated"));
      setEditing(false);
      setMonth(startOfMonth(parseISO(nextDates[0])));
    } catch (error) {
      console.error(error);
      toast.error(t("dates.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t("sidebar.selectedDates")}</h2>
        {canEdit && projectId ? (
          <button
            type="button"
            onClick={openEditor}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-muted transition hover:bg-black/6 hover:text-foreground"
          >
            <Pencil size={12} />
            <span className="text-xs font-medium">{t("dates.edit")}</span>
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-black/[0.02] p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="rounded-md px-2 py-1 text-muted transition hover:bg-black/6 hover:text-foreground"
            aria-label={t("cal.prevMonth")}
          >
            ‹
          </button>
          <span className="text-sm font-medium text-foreground">{fmt.yearMonth(month)}</span>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-md px-2 py-1 text-muted transition hover:bg-black/6 hover:text-foreground"
            aria-label={t("cal.nextMonth")}
          >
            ›
          </button>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[11px] text-muted">
          {fmt.weekdays().map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date, index) => {
            if (!date) return <span key={index} />;
            const iso = format(date, "yyyy-MM-dd");
            const selected = dayByDate.has(iso);
            return (
              <span
                key={index}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md text-xs",
                  selected ? "bg-primary font-medium text-white" : "text-foreground/70"
                )}
              >
                {date.getDate()}
              </span>
            );
          })}
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">{t("dates.editTitle")}</DialogTitle>
            <DialogDescription className="text-sm text-muted">{t("dates.editSubtitle")}</DialogDescription>
          </DialogHeader>

          <RangeCalendar
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            initialMonth={sorted.length ? parseISO(sorted[0]) : undefined}
            onChange={(start, end) => {
              setRangeStart(start);
              setRangeEnd(end);
            }}
          />

          {dropped.days > 0 ? (
            <div className="mt-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-xs leading-5 text-amber-800">
                {dropped.items > 0
                  ? t("dates.dropWarning", { days: dropped.days, items: dropped.items })
                  : t("dates.dropWarningEmpty", { days: dropped.days })}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)} disabled={saving}>
              {t("common.back")}
            </Button>
            <Button className="flex-1" onClick={save} disabled={!rangeStart || !rangeEnd || saving}>
              {saving ? t("dates.saving") : t("dates.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

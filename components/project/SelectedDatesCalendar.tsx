"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { useDateFormat } from "@/lib/i18n/dates";
import type { ProjectDay } from "@/types/project";

export function SelectedDatesCalendar({ days }: { days: ProjectDay[] }) {
  const dayByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const t = useT();
  const fmt = useDateFormat();

  const sorted = days.map((day) => day.date).sort();
  const [month, setMonth] = useState(() =>
    startOfMonth(sorted.length ? new Date(sorted[0]) : new Date())
  );

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const list: (Date | null)[] = Array.from({ length: getDay(first) }, () => null);
    for (let d = 1; d <= last.getDate(); d += 1) {
      list.push(new Date(month.getFullYear(), month.getMonth(), d));
    }
    return list;
  }, [month]);

  return (
    <div className="rounded-xl border border-border bg-black/[0.02] p-3">
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
  );
}

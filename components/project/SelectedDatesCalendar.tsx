"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectDay } from "@/types/project";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function SelectedDatesCalendar({
  days,
  canEdit
}: {
  days: ProjectDay[];
  canEdit: boolean;
}) {
  const removeDay = useProjectStore((state) => state.removeDay);
  const dayByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);

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

  function onDayClick(iso: string) {
    const day = dayByDate.get(iso);
    if (!day || !canEdit) return;
    removeDay(day.id)
      .then(() => toast.success("날짜를 제거했어요."))
      .catch((error) => {
        console.error(error);
        toast.error("날짜를 제거하지 못했어요.");
      });
  }

  return (
    <div className="rounded-xl border border-border bg-black/[0.02] p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="rounded-md px-2 py-1 text-muted transition hover:bg-black/6 hover:text-foreground"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-foreground">{format(month, "yyyy년 M월")}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="rounded-md px-2 py-1 text-muted transition hover:bg-black/6 hover:text-foreground"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[11px] text-muted">
        {WEEKDAY_LABELS.map((label) => (
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
            <button
              key={index}
              type="button"
              disabled={!selected || !canEdit}
              onClick={() => onDayClick(iso)}
              title={selected && canEdit ? "클릭하면 이 날짜를 제거해요" : undefined}
              className={cn(
                "aspect-square rounded-md text-xs transition",
                selected
                  ? "bg-primary font-medium text-white hover:bg-primary/85"
                  : "text-foreground/70"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      {canEdit ? (
        <p className="mt-2 text-[11px] leading-4 text-muted">파란 날짜를 클릭하면 제거돼요.</p>
      ) : null}
    </div>
  );
}

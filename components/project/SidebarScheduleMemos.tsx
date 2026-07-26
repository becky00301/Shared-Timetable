"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

// Read-only roll-up of the memos written on schedules, so everything is
// reachable from the sidebar without leaving the timetable.
export function SidebarScheduleMemos({ projectId, days }: { projectId: string; days: ProjectDay[] }) {
  const schedules = useProjectStore((state) => state.schedules).filter(
    (item) => item.project_id === projectId
  );
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const t = useT();

  const byDay = useMemo(
    () =>
      days
        .map((day) => ({
          day,
          items: schedules
            .filter((item) => item.day_id === day.id && (item.description?.trim() || item.location?.trim()))
            .sort(
              (a, b) => Number(b.all_day) - Number(a.all_day) || a.start_time.localeCompare(b.start_time)
            )
        }))
        .filter((group) => group.items.length > 0),
    [days, schedules]
  );

  if (!byDay.length) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs leading-5 text-muted">
        {t("sidebar.memoEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {byDay.map(({ day, items }) => (
        <div key={day.id}>
          <p className="text-[11px] font-medium text-muted">{day.date}</p>
          <div className="mt-1 flex flex-col gap-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedSchedule(item.id);
                  setViewMode("grid");
                }}
                className="rounded-lg border border-border bg-black/[0.02] px-2.5 py-2 text-left transition hover:border-primary"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? "#2383e2" }}
                  />
                  <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {item.all_day ? t("grid.allDay") : item.start_time.slice(0, 5)}
                  </span>
                </span>
                {item.location?.trim() ? (
                  <span className="mt-1 block truncate text-[11px] text-muted">📍 {item.location}</span>
                ) : null}
                {item.description?.trim() ? (
                  <span className="mt-1 block whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground/80">
                    {item.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

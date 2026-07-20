"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

// Standalone notes live in the sidebar; this view collects the memos written on
// schedules so they can be read in one place.
export function NotesView({ projectId, days }: { projectId: string; days: ProjectDay[] }) {
  const schedules = useProjectStore((state) => state.schedules).filter(
    (item) => item.project_id === projectId
  );
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const setViewMode = useUiStore((state) => state.setViewMode);

  const byDay = useMemo(
    () =>
      days.map((day) => ({
        day,
        items: schedules
          .filter((item) => item.day_id === day.id && (item.description?.trim() || item.location?.trim()))
          .sort((a, b) => Number(b.all_day) - Number(a.all_day) || a.start_time.localeCompare(b.start_time))
      })),
    [days, schedules]
  );

  const hasScheduleMemos = byDay.some((group) => group.items.length > 0);

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background p-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays size={16} className="text-primary" />
          일정에 적은 메모
        </h2>

        {hasScheduleMemos ? (
          <div className="flex flex-col gap-4">
            {byDay
              .filter((group) => group.items.length > 0)
              .map(({ day, items }) => (
                <div key={day.id}>
                  <p className="text-xs font-medium text-muted">{day.date}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedSchedule(item.id);
                          setViewMode("grid");
                        }}
                        className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color ?? "#2383e2" }}
                          />
                          <span className="text-sm font-medium text-foreground">{item.title}</span>
                          <span className="text-xs text-muted">
                            {item.all_day
                              ? "종일"
                              : `${item.start_time.slice(0, 5)} – ${item.end_time.slice(0, 5)}`}
                          </span>
                        </div>
                        {item.location?.trim() ? (
                          <p className="mt-1 text-xs text-muted">📍 {item.location}</p>
                        ) : null}
                        {item.description?.trim() ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
            일정 상세에서 메모를 적으면 여기에 모여요.
          </p>
        )}
      </div>
    </div>
  );
}

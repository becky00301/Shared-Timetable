"use client";

import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { useUiStore } from "@/stores/ui-store";

export function TimetableHeader({ isWeekly = false }: { isWeekly?: boolean }) {
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const weekStartsOnSunday = useUiStore((state) => state.weekStartsOnSunday);
  const setWeekStartsOnSunday = useUiStore((state) => state.setWeekStartsOnSunday);
  const t = useT();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setViewMode("grid")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
            viewMode === "grid" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
          )}
        >
          <Clock size={14} />
          {t("grid.tabGrid")}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("month")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
            viewMode === "month" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
          )}
        >
          <CalendarDays size={14} />
          {t("grid.tabMonth")}
        </button>
      </div>

      {isWeekly ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{t("grid.weekStart")}</span>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setWeekStartsOnSunday(false)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition",
                !weekStartsOnSunday ? "bg-primary text-white" : "text-muted hover:bg-black/6"
              )}
            >
              {t("grid.mon")}
            </button>
            <button
              type="button"
              onClick={() => setWeekStartsOnSunday(true)}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition",
                weekStartsOnSunday ? "bg-primary text-white" : "text-muted hover:bg-black/6"
              )}
            >
              {t("grid.sun")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

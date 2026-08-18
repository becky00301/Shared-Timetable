"use client";

import Link from "next/link";
import { AlarmClock, ArrowLeft, CalendarDays, Clock, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

export function TimetableHeader({
  isWeekly = false,
  mobileTitle,
  canEdit = false
}: {
  isWeekly?: boolean;
  /** Rendered only below `lg`, next to the view toggle. The desktop sidebar
      already shows the project title, so this folds the separate mobile
      title bar into this row instead of stacking a second fixed bar above it. */
  mobileTitle?: string;
  canEdit?: boolean;
}) {
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const weekStartsOnSunday = useUiStore((state) => state.weekStartsOnSunday);
  const setWeekStartsOnSunday = useUiStore((state) => state.setWeekStartsOnSunday);
  const gridZoom = useUiStore((state) => state.gridZoom);
  const setGridZoom = useUiStore((state) => state.setGridZoom);
  const resetGridZoom = useUiStore((state) => state.resetGridZoom);
  const activeMode = useUiStore((state) => state.activeMode);
  const setMode = useUiStore((state) => state.setMode);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const isGuest = useProjectStore((state) => state.isGuest);
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {mobileTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:hidden">
            {/* Guests have no dashboard to go back to — this is their only page. */}
            {isGuest ? null : (
              <Link
                href="/dashboard"
                aria-label={t("project.goDashboard")}
                className="shrink-0 rounded-md p-1 text-muted transition hover:bg-black/8 hover:text-foreground"
              >
                <ArrowLeft size={18} />
              </Link>
            )}
            <span className="truncate text-sm font-semibold text-foreground">{mobileTitle}</span>
          </div>
        ) : null}
        {/* Icon-only below sm: with a title sharing this row, the full labels
            leave almost no width for the title on phone-sized screens. */}
        {/* A segmented control, not two buttons: the selected view is a white
            pill lifted off a grey track. Filling it with the near-black primary
            made a view switch look like the page's main action. */}
        <div className="grid shrink-0 grid-cols-2 gap-0.5 rounded-[10px] bg-black/[0.05] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-sm transition sm:px-3",
              viewMode === "grid"
                ? "bg-background font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                : "text-muted hover:text-foreground"
            )}
          >
            <Clock size={14} />
            <span className="hidden sm:inline">{t("grid.tabGrid")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("month");
              setMode("schedule");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-sm transition sm:px-3",
              viewMode === "month"
                ? "bg-background font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                : "text-muted hover:text-foreground"
            )}
          >
            <CalendarDays size={14} />
            <span className="hidden sm:inline">{t("grid.tabMonth")}</span>
          </button>
        </div>

        {/* Scaling only applies to the time grid, so it disappears in month view. */}
        {viewMode === "grid" ? (
          <>
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  const nextMode = activeMode === "wake" ? "schedule" : "wake";
                  setMode(nextMode);
                  if (nextMode === "wake") setSelectedSchedule(null);
                }}
                aria-pressed={activeMode === "wake"}
                title={t("grid.wakeMode")}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border px-2.5 text-sm font-medium transition sm:px-3",
                  activeMode === "wake"
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-muted hover:bg-black/6 hover:text-foreground"
                )}
              >
                <AlarmClock size={15} />
                <span className="hidden sm:inline">{t("grid.wakeMode")}</span>
              </button>
            ) : null}

            <div className="flex shrink-0 items-center gap-0.5 rounded-[10px] bg-black/[0.05] p-0.5">
              <button
                type="button"
                onClick={() => setGridZoom(gridZoom - ZOOM_STEP)}
                disabled={gridZoom <= MIN_ZOOM}
                aria-label={t("grid.zoomOut")}
                title={t("grid.zoomOut")}
                className="rounded-[8px] p-1.5 text-muted transition hover:bg-black/6 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Minus size={14} />
              </button>
              {/* Tabular figures stop the row shifting as the percentage changes. */}
              <button
                type="button"
                onClick={resetGridZoom}
                aria-label={t("grid.zoomReset")}
                title={t("grid.zoomReset")}
                className="min-w-11 rounded-[8px] px-1 py-1 text-xs tabular-nums text-muted transition hover:bg-black/6 hover:text-foreground"
              >
                {Math.round(gridZoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setGridZoom(gridZoom + ZOOM_STEP)}
                disabled={gridZoom >= MAX_ZOOM}
                aria-label={t("grid.zoomIn")}
                title={t("grid.zoomIn")}
                className="rounded-[8px] p-1.5 text-muted transition hover:bg-black/6 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Plus size={14} />
              </button>
            </div>
          </>
        ) : null}
      </div>

      {isWeekly ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{t("grid.weekStart")}</span>
          <div className="grid grid-cols-2 gap-0.5 rounded-[10px] bg-black/[0.05] p-0.5">
            <button
              type="button"
              onClick={() => setWeekStartsOnSunday(false)}
              className={cn(
                "rounded-[8px] px-2.5 py-1 text-sm transition",
                !weekStartsOnSunday
                  ? "bg-background font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                  : "text-muted hover:text-foreground"
              )}
            >
              {t("grid.mon")}
            </button>
            <button
              type="button"
              onClick={() => setWeekStartsOnSunday(true)}
              className={cn(
                "rounded-[8px] px-2.5 py-1 text-sm transition",
                weekStartsOnSunday
                  ? "bg-background font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                  : "text-muted hover:text-foreground"
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

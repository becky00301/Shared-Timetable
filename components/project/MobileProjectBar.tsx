"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarClock, RotateCw, StickyNote, Wallet, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { SidebarBudget } from "@/components/project/SidebarBudget";
import { SidebarNotes } from "@/components/project/SidebarNotes";
import { SidebarScheduleMemos } from "@/components/project/SidebarScheduleMemos";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/stores/ui-store";
import type { Project, ProjectDay } from "@/types/project";

type Sheet = "budget" | "notes";

/** One block of a sheet: the same titled card the desktop sidebar uses. */
function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <h2 className="border-b border-border-muted px-3 py-2.5 text-xs font-semibold text-muted">{title}</h2>
      <div className="p-3">{children}</div>
    </section>
  );
}

/**
 * The phone's stand-in for the desktop sidebar's budget and notes, which are
 * hidden below `lg`. A floating bar opens each as a full-screen page; the page
 * takes a history entry, so the phone's own back gesture closes it instead of
 * leaving the timetable.
 */
export function MobileProjectBar({
  project,
  days,
  canEdit,
  onRefresh
}: {
  project: Project;
  days: ProjectDay[];
  canEdit: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const t = useT();

  useEffect(() => {
    const onPopState = () => {
      const state = window.history.state as { mobileSheet?: Sheet } | null;
      setSheet(state?.mobileSheet ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const close = useCallback(() => {
    if ((window.history.state as { mobileSheet?: Sheet } | null)?.mobileSheet) window.history.back();
    else setSheet(null);
  }, []);

  function show(next: Sheet | null) {
    if (next === sheet) return;
    if (next === null) {
      close();
      return;
    }
    // Cleared first, so a schedule picked from inside the sheet is a change
    // the effect below can see.
    setSelectedSchedule(null);
    // Next's router keeps its own entries in history state; spread it so a
    // back press still lands on a page the router recognises. Moving between
    // the two sheets swaps the entry, so one back press still returns to the
    // timetable.
    const state = { ...window.history.state, mobileSheet: next };
    if (sheet) window.history.replaceState(state, "");
    else window.history.pushState(state, "");
    setSheet(next);
  }

  // Tapping a schedule in either sheet opens its details over the timetable,
  // so the sheet has to get out of the way.
  useEffect(() => {
    if (sheet && selectedScheduleId) close();
  }, [sheet, selectedScheduleId, close]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(t("mobileBar.refreshFailed"));
    } finally {
      setRefreshing(false);
    }
  }

  const tabs: { key: Sheet | null; label: string; icon: LucideIcon }[] = [
    { key: null, label: t("mobileBar.timetable"), icon: CalendarClock },
    { key: "budget", label: t("budget.title"), icon: Wallet },
    { key: "notes", label: t("sidebar.notes"), icon: StickyNote }
  ];
  const itemClass =
    "flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2.5 text-sm font-semibold transition active:bg-black/[0.06] disabled:opacity-60";

  return (
    <>
      {/* Above everything, sheets included, so it stays put as the way between
          the timetable, budget and notes. Frosted rather than opaque, so the
          timetable still reads through it. */}
      <nav
        data-mobile-project-bar
        className="fixed inset-x-3 bottom-3 z-[60] flex justify-around rounded-full border border-white/70 bg-white/75 p-1 shadow-[0_8px_30px_oklch(0_0_0/14%)] backdrop-blur-xl lg:hidden"
      >
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => show(key)}
            aria-current={sheet === key ? "page" : undefined}
            className={cn(itemClass, sheet === key ? "bg-black/[0.07] text-foreground" : "text-muted")}
          >
            <Icon size={17} className="shrink-0" />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" onClick={refresh} disabled={refreshing} className={cn(itemClass, "text-muted")}>
          <RotateCw size={17} className={cn("shrink-0", refreshing && "animate-spin")} />
          <span>{t("mobileBar.refresh")}</span>
        </button>
      </nav>

      {sheet ? (
        <div className="fixed inset-0 z-40 flex h-dvh flex-col bg-surface lg:hidden">
          {/* Built like the timetable's own header row (py-2 around a 36px
              row, same back arrow and title), so switching tabs doesn't make
              the top of the screen jump. */}
          <div className="flex shrink-0 items-center border-b border-border bg-surface px-4 py-2">
            <div className="flex min-h-9 min-w-0 flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={close}
                aria-label={t("common.back")}
                className="shrink-0 rounded-md p-1 text-muted transition hover:bg-black/8 hover:text-foreground"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="truncate text-sm font-semibold text-foreground">{project.title}</h1>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-24">
            <div className="flex flex-col gap-3">
              {sheet === "budget" ? (
                <SheetSection title={t("budget.title")}>
                  <SidebarBudget project={project} canEdit={canEdit} />
                </SheetSection>
              ) : (
                <>
                  <SheetSection title={t("sidebar.notes")}>
                    <SidebarNotes projectId={project.id} canEdit={canEdit} />
                  </SheetSection>
                  <SheetSection title={t("sidebar.scheduleMemos")}>
                    <SidebarScheduleMemos projectId={project.id} days={days} />
                  </SheetSection>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

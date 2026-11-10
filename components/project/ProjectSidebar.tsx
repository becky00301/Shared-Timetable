"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportToolbar } from "@/components/export/ExportToolbar";
import { ParticipantList } from "@/components/project/ParticipantList";
import { RoleBadge } from "@/components/project/RoleBadge";
import { SelectedDatesCalendar } from "@/components/project/SelectedDatesCalendar";
import { SidebarBudget } from "@/components/project/SidebarBudget";
import { SidebarNotes } from "@/components/project/SidebarNotes";
import { SidebarScheduleMemos } from "@/components/project/SidebarScheduleMemos";
import { CollapsibleTitle, useCollapsedPanels } from "@/components/project/CollapsibleTitle";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { Project, ProjectDay, ProjectMember, ProjectRole } from "@/types/project";

/** Desktop sidebar width: 320px by default, draggable between these bounds and
    remembered per browser. The timetable takes whatever is left. */
const SIDEBAR_DEFAULT_WIDTH = 320;
const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 640;
/** The timetable always keeps at least this much of the window. */
const TIMETABLE_MIN_WIDTH = 480;
const SIDEBAR_WIDTH_KEY = "planner.sidebarWidth";

function clampSidebarWidth(width: number) {
  const roomLeft =
    typeof window === "undefined" ? SIDEBAR_MAX_WIDTH : window.innerWidth - TIMETABLE_MIN_WIDTH;
  return Math.round(
    Math.max(SIDEBAR_MIN_WIDTH, Math.min(width, SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, roomLeft)))
  );
}

function useSidebarWidth() {
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
      if (saved) setWidth(clampSidebarWidth(saved));
    } catch {
      // Storage blocked: the default width is fine.
    }
    const onResize = () => setWidth((current) => clampSidebarWidth(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  function commit(next: number) {
    const clamped = clampSidebarWidth(next);
    setWidth(clamped);
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
    } catch {
      // Not remembered, still applied.
    }
  }
  return { width, setWidth: (next: number) => setWidth(clampSidebarWidth(next)), commit };
}

/**
 * One block of the sidebar: a titled card with its own header row.
 *
 * These sections used to be headings separated only by margin, which left the
 * column reading as one long scroll with no edges. Giving each a card and a
 * header — title left, count or control right — makes the boundaries visible
 * without changing any colour.
 */
function Panel({
  title,
  aside,
  children,
  bodyClassName,
  headless = false,
  collapsed = false,
  onToggle
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  /** For a child that already draws its own header row — the card would
      otherwise label it twice. Such a child folds itself. */
  headless?: boolean;
  /** Folded down to its header row; the title toggles it. */
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (headless) {
    return <section className="rounded-xl border border-border bg-background">{children}</section>;
  }
  return (
    <section className="rounded-xl border border-border bg-background">
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2.5",
          !collapsed && "border-b border-border-muted"
        )}
      >
        {onToggle && title ? (
          <CollapsibleTitle title={title} collapsed={collapsed} onToggle={onToggle} />
        ) : (
          <h2 className="text-xs font-semibold text-muted">{title}</h2>
        )}
        {aside}
      </div>
      {collapsed ? null : <div className={cn("p-3", bodyClassName)}>{children}</div>}
    </section>
  );
}

/** The small count chip the panel headers carry, as in a nav badge. */
function CountChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs tabular-nums text-muted">
      {children}
    </span>
  );
}

export function ProjectSidebar({
  project,
  days,
  members,
  currentRole,
  canEdit
}: {
  project: Project;
  days: ProjectDay[];
  members: ProjectMember[];
  currentRole: ProjectRole;
  canEdit: boolean;
}) {
  const updateProject = useProjectStore((state) => state.updateProject);
  const isGuest = useProjectStore((state) => state.isGuest);
  const setShareOpen = useUiStore((state) => state.setShareOpen);
  const t = useT();
  const canRename = currentRole === "owner" || currentRole === "editor";
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project.title);
  const panels = useCollapsedPanels();
  const fold = (id: string) => ({ collapsed: panels.isCollapsed(id), onToggle: () => panels.toggle(id) });
  const sidebar = useSidebarWidth();
  const [resizing, setResizing] = useState(false);
  const widthRef = useRef(sidebar.width);
  widthRef.current = sidebar.width;

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;
    setResizing(true);
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (move: PointerEvent) => sidebar.setWidth(startWidth + move.clientX - startX);
    const onUp = (up: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      setResizing(false);
      sidebar.commit(startWidth + up.clientX - startX);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function saveTitle() {
    setEditingTitle(false);
    const next = titleDraft.trim();
    if (!next || next === project.title) {
      setTitleDraft(project.title);
      return;
    }
    updateProject(project.id, { title: next }).catch((error) => {
      console.error(error);
      toast.error(t("card.renameFailed"));
      setTitleDraft(project.title);
    });
  }

  // Tight horizontal padding: the cards carry their own, and stacking the
  // column's 20px on top of theirs pushed content 33px off the edge in a
  // 320px column.
  return (
    <div className="relative hidden shrink-0 lg:flex" style={{ width: sidebar.width }}>
      <aside className="flex w-full flex-col overflow-y-auto border-r border-border bg-surface px-3 py-4">
        {/* Guests have no dashboard to go back to — this is their only page. */}
        {isGuest ? null : (
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
          >
            <ArrowLeft size={15} />
            {t("common.dashboard")}
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted">{t("sidebar.sharedTimetable")}</p>
            {editingTitle ? (
              <Input
                autoFocus
                className="mt-2"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setTitleDraft(project.title);
                    setEditingTitle(false);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                disabled={!canRename}
                onClick={() => {
                  setTitleDraft(project.title);
                  setEditingTitle(true);
                }}
                className="group mt-2 flex items-center gap-1.5 text-left disabled:cursor-default"
                title={canRename ? t("sidebar.renameHint") : undefined}
              >
                <span className="truncate text-2xl font-semibold text-foreground">{project.title}</span>
                {canRename ? (
                  <Pencil size={14} className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
                ) : null}
              </button>
            )}
            {project.description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{project.description}</p>
            ) : null}
          </div>
          <RoleBadge role={currentRole} />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button size="sm" className="w-full" onClick={() => setShareOpen(true)}>
            <Share2 size={15} />
            {t("share.openCta")}
          </Button>
          <ExportToolbar project={project} targetId="timetable-export" />
        </div>

        {/* Even gaps now that each block has an edge of its own; the old mt-8
            was doing the separating. */}
        <div className="mt-6 flex flex-col gap-3 pb-2">
          <Panel
            {...fold("members")}
            title={t("sidebar.participants")}
            aside={<CountChip>{members.length}</CountChip>}
            bodyClassName="p-1.5"
          >
            <ParticipantList members={members} canManage={currentRole === "owner"} />
          </Panel>

          <Panel headless>
            <SelectedDatesCalendar days={days} projectId={project.id} canEdit={canEdit} {...fold("dates")} />
          </Panel>

          <Panel {...fold("budget")} title={t("budget.title")}>
            <SidebarBudget project={project} canEdit={canEdit} />
          </Panel>

          <Panel {...fold("notes")} title={t("sidebar.notes")}>
            <SidebarNotes projectId={project.id} canEdit={canEdit} />
          </Panel>

          <Panel {...fold("scheduleMemos")} title={t("sidebar.scheduleMemos")}>
            <SidebarScheduleMemos projectId={project.id} days={days} />
          </Panel>
        </div>
      </aside>
      {/* Drag to resize; double-click puts it back. Sits over the border so
          it is easy to catch; kept inside the sidebar so the timetable's sticky
          layers never cover it. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("sidebar.resize")}
        aria-valuenow={sidebar.width}
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        tabIndex={0}
        className={cn(
          "absolute inset-y-0 right-0 z-30 w-2 cursor-col-resize touch-none outline-none",
          "after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:bg-[var(--accent)] after:opacity-0 after:transition-opacity",
          "hover:after:opacity-60 focus-visible:after:opacity-60",
          resizing && "after:opacity-60"
        )}
        onPointerDown={startResize}
        onDoubleClick={() => sidebar.commit(SIDEBAR_DEFAULT_WIDTH)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            sidebar.commit(sidebar.width + (event.key === "ArrowRight" ? 16 : -16));
          }
        }}
      />
    </div>
  );
}

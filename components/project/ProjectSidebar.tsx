"use client";

import { useState, type ReactNode } from "react";
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
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { Project, ProjectDay, ProjectMember, ProjectRole } from "@/types/project";

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
  headless = false
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  /** For a child that already draws its own header row — the card would
      otherwise label it twice. */
  headless?: boolean;
}) {
  if (headless) {
    return <section className="rounded-xl border border-border bg-background">{children}</section>;
  }
  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border-muted px-3 py-2.5">
        <h2 className="text-xs font-semibold text-muted">{title}</h2>
        {aside}
      </div>
      <div className={cn("p-3", bodyClassName)}>{children}</div>
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
    <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface px-3 py-4 lg:flex">
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
          title={t("sidebar.participants")}
          aside={<CountChip>{members.length}</CountChip>}
          bodyClassName="p-1.5"
        >
          <ParticipantList members={members} canManage={currentRole === "owner"} />
        </Panel>

        <Panel headless>
          <SelectedDatesCalendar days={days} projectId={project.id} canEdit={canEdit} />
        </Panel>

        <Panel title={t("budget.title")}>
          <SidebarBudget project={project} canEdit={canEdit} />
        </Panel>

        <Panel title={t("sidebar.notes")}>
          <SidebarNotes projectId={project.id} canEdit={canEdit} />
        </Panel>

        <Panel title={t("sidebar.scheduleMemos")}>
          <SidebarScheduleMemos projectId={project.id} days={days} />
        </Panel>
      </div>
    </aside>
  );
}

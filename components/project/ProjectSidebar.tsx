"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportToolbar } from "@/components/export/ExportToolbar";
import { ParticipantList } from "@/components/project/ParticipantList";
import { RoleBadge } from "@/components/project/RoleBadge";
import { SelectedDatesCalendar } from "@/components/project/SelectedDatesCalendar";
import { SidebarNotes } from "@/components/project/SidebarNotes";
import { SidebarScheduleMemos } from "@/components/project/SidebarScheduleMemos";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { Project, ProjectDay, ProjectMember, ProjectRole } from "@/types/project";

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

  return (
    <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-5 lg:flex">
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

      {/* Section labels sit a level below the project title and the content
          they head: before, every heading in this column carried the same
          weight, so the eye had nothing to climb. */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted">{t("sidebar.participants")}</h2>
        <span className="text-xs tabular-nums text-muted">
          {t("common.peopleCount", { count: members.length })}
        </span>
      </div>
      <div className="mt-2 -mx-2">
        <ParticipantList members={members} canManage={currentRole === "owner"} />
      </div>

      <div className="mt-8">
        <SelectedDatesCalendar days={days} projectId={project.id} canEdit={canEdit} />
      </div>

      <div className="mt-8">
        <h2 className="text-xs font-semibold text-muted">{t("sidebar.notes")}</h2>
      </div>
      <div className="mt-2">
        <SidebarNotes projectId={project.id} canEdit={canEdit} />
      </div>

      <div className="mt-8">
        <h2 className="text-xs font-semibold text-muted">{t("sidebar.scheduleMemos")}</h2>
      </div>
      <div className="mt-2 pb-2">
        <SidebarScheduleMemos projectId={project.id} days={days} />
      </div>
    </aside>
  );
}

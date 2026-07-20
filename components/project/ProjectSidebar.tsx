"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ExportToolbar } from "@/components/export/ExportToolbar";
import { GoogleCalendarSync } from "@/components/project/GoogleCalendarSync";
import { ParticipantList } from "@/components/project/ParticipantList";
import { RoleBadge } from "@/components/project/RoleBadge";
import { SelectedDatesCalendar } from "@/components/project/SelectedDatesCalendar";
import { useProjectStore } from "@/stores/project-store";
import type { Project, ProjectDay, ProjectMember, ProjectRole } from "@/types/project";

export function ProjectSidebar({
  project,
  days,
  members,
  currentRole
}: {
  project: Project;
  days: ProjectDay[];
  members: ProjectMember[];
  currentRole: ProjectRole;
}) {
  const updateProject = useProjectStore((state) => state.updateProject);
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
      toast.error("이름을 변경하지 못했어요.");
      setTitleDraft(project.title);
    });
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-5 lg:flex">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={15} />
        대시보드
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">공유 시간표</p>
          {editingTitle ? (
            <Input
              autoFocus
              className="mt-2"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
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
              title={canRename ? "클릭해서 이름 수정" : undefined}
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

      <div className="mt-5">
        <ExportToolbar project={project} targetId="timetable-export" />
      </div>

      <div className="mt-3">
        <GoogleCalendarSync projectId={project.id} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">참여자</h2>
        <span className="text-xs text-muted">{members.length}명</span>
      </div>
      <div className="mt-3">
        <ParticipantList members={members} canManage={currentRole === "owner"} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">선택한 날짜</h2>
      </div>
      <div className="mt-3">
        <SelectedDatesCalendar days={days} />
      </div>
    </aside>
  );
}

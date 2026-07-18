"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportToolbar } from "@/components/export/ExportToolbar";
import { ParticipantList } from "@/components/project/ParticipantList";
import { RoleBadge } from "@/components/project/RoleBadge";
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
  const setAddDateOpen = useUiStore((state) => state.setAddDateOpen);
  const activeMode = useUiStore((state) => state.activeMode);
  const setMode = useUiStore((state) => state.setMode);
  const removeDay = useProjectStore((state) => state.removeDay);
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
    <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-surface p-5 lg:flex">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={15} />
        대시보드
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">Selected-date document</p>
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
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{project.description}</p>
        </div>
        <RoleBadge role={currentRole} />
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            className={`rounded-lg px-3 py-2 text-sm transition ${
              activeMode === "schedule" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
            }`}
            onClick={() => setMode("schedule")}
          >
            Schedule
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm transition ${
              activeMode === "availability" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
            }`}
            onClick={() => setMode("availability")}
          >
            Availability
          </button>
        </div>
      </div>

      <div className="mt-5">
        <ExportToolbar project={project} targetId="timetable-export" />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Participants</h2>
        <span className="text-xs text-muted">{members.length} people</span>
      </div>
      <div className="mt-3">
        <ParticipantList members={members} canManage={currentRole === "owner"} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Selected dates</h2>
        <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setAddDateOpen(true)}>
          <CalendarPlus size={15} />
          Add
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-2 overflow-auto">
        {days.length ? (
          days.map((day) => (
            <div
              key={day.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{format(new Date(day.date), "MMM d, yyyy")}</p>
                <p className="text-xs text-muted">{format(new Date(day.date), "EEEE")}</p>
              </div>
              <button
                className="editor-only rounded-md p-1 text-muted transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                disabled={!canEdit}
                onClick={() =>
                  removeDay(day.id).catch((error) => {
                    console.error(error);
                    toast.error("Could not remove the date.");
                  })
                }
                aria-label="Remove date"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm leading-6 text-muted">
            원하는 날짜를 추가해서 시간표를 시작하세요.
          </div>
        )}
      </div>

      <Button className="editor-only mt-auto" disabled={!canEdit} onClick={() => setAddDateOpen(true)}>
        <Plus size={16} />
        Add selected date
      </Button>
    </aside>
  );
}

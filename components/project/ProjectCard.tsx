"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/stores/project-store";
import type { Project } from "@/types/project";
import type { ProjectDay } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";

export function ProjectCard({
  project,
  days,
  schedules
}: {
  project: Project;
  days: ProjectDay[];
  schedules: ScheduleItem[];
}) {
  const updateProject = useProjectStore((state) => state.updateProject);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.title);

  function saveTitle() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === project.title) {
      setDraft(project.title);
      return;
    }
    updateProject(project.id, { title: next }).catch((error) => {
      console.error(error);
      toast.error("이름을 변경하지 못했어요.");
      setDraft(project.title);
    });
  }

  return (
    <div
      className="group relative flex min-h-48 flex-col justify-between rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:bg-[#1d1d1d]"
      onContextMenu={(event) => {
        event.preventDefault();
        setDraft(project.title);
        setEditing(true);
      }}
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraft(project.title);
                setEditing(false);
              }
            }}
          />
          <p className="text-xs text-muted">Enter로 저장 · Esc로 취소</p>
        </div>
      ) : (
        <Link href={`/plans/${project.slug}`} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{project.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{project.description}</p>
            </div>
            <div className="rounded-lg border border-border bg-white/5 p-2 text-muted group-hover:text-white">
              <CalendarDays size={18} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {days.slice(0, 4).map((day) => (
              <span key={day.id} className="rounded-md bg-white/6 px-2 py-1 text-xs text-muted">
                {day.date}
              </span>
            ))}
          </div>
        </Link>
      )}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
        <span>{schedules.length} schedule blocks</span>
        <span className="inline-flex items-center gap-1">
          <Users size={14} />
          우클릭으로 이름 수정
        </span>
      </div>
    </div>
  );
}

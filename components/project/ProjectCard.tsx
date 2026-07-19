"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, MousePointer2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useContextMenu } from "@/components/ui/context-menu";
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
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.title);

  const { onContextMenu, menu } = useContextMenu([
    {
      label: "이름 수정",
      onSelect: () => {
        setDraft(project.title);
        setEditing(true);
      }
    },
    {
      label: "삭제",
      danger: true,
      onSelect: () => {
        if (!window.confirm(`"${project.title}" 시간표를 삭제할까요? 되돌릴 수 없어요.`)) return;
        deleteProject(project.id)
          .then(() => toast.success("시간표를 삭제했어요."))
          .catch((error) => {
            console.error(error);
            toast.error("삭제하지 못했어요. 소유자만 삭제할 수 있어요.");
          });
      }
    }
  ]);

  const sortedDates = days.map((day) => day.date).sort();
  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  const fmt = (iso: string) => format(new Date(iso), "yyyy.M.d");
  const dateRange = !first
    ? null
    : first === last
      ? `${fmt(first)} (${sortedDates.length}일)`
      : `${fmt(first)} ~ ${fmt(last)} (${sortedDates.length}일)`;

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
      className="group relative flex min-h-48 flex-col justify-between rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:bg-black/[0.04]"
      onContextMenu={onContextMenu}
    >
      {menu}
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
              <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{project.description}</p>
            </div>
            <div className="rounded-lg border border-border bg-black/5 p-2 text-muted group-hover:text-foreground">
              <CalendarDays size={18} />
            </div>
          </div>
          <div>
            {dateRange ? (
              <span className="inline-flex rounded-md bg-black/6 px-2 py-1 text-xs text-muted">
                {dateRange}
              </span>
            ) : (
              <span className="text-xs text-muted">아직 날짜가 없어요</span>
            )}
          </div>
        </Link>
      )}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
        <span>일정 {schedules.length}개</span>
        <span className="inline-flex items-center gap-1">
          <MousePointer2 size={14} />
          우클릭 메뉴
        </span>
      </div>
    </div>
  );
}

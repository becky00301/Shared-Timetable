"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, MousePointer2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useContextMenu } from "@/components/ui/context-menu";
import { useT } from "@/lib/i18n/locale";
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
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.title);

  const { onContextMenu, menu } = useContextMenu([
    {
      label: t("common.rename"),
      onSelect: () => {
        setDraft(project.title);
        setEditing(true);
      }
    },
    {
      label: t("common.delete"),
      danger: true,
      onSelect: () => {
        if (!window.confirm(t("card.confirmDelete", { title: project.title }))) return;
        deleteProject(project.id)
          .then(() => toast.success(t("card.deleted")))
          .catch((error) => {
            console.error(error);
            toast.error(t("card.deleteFailed"));
          });
      }
    }
  ]);

  const sortedDates = days.map((day) => day.date).sort();
  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];
  const fmtDate = (iso: string) => format(new Date(iso), "yyyy.M.d");
  const dayCount = t("common.days", { count: sortedDates.length });
  const dateRange = !first
    ? null
    : first === last
      ? `${fmtDate(first)} (${dayCount})`
      : `${fmtDate(first)} ~ ${fmtDate(last)} (${dayCount})`;

  function saveTitle() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === project.title) {
      setDraft(project.title);
      return;
    }
    updateProject(project.id, { title: next }).catch((error) => {
      console.error(error);
      toast.error(t("card.renameFailed"));
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
          <p className="text-xs text-muted">{t("card.renameHint")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Stretched link: covers the whole card so clicking anywhere opens
              it, while right-click (context menu) still bubbles to the card. */}
          <Link
            href={`/plans/${project.slug}`}
            aria-label={project.title}
            className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
          />
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
              <span className="text-xs text-muted">{t("card.noDates")}</span>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
        <span>{t("card.scheduleCount", { count: schedules.length })}</span>
        <span className="inline-flex items-center gap-1">
          <MousePointer2 size={14} />
          {t("card.contextHint")}
        </span>
      </div>
    </div>
  );
}

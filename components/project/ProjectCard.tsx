"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { MousePointer2 } from "lucide-react";
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
      className="group relative flex min-h-36 flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-border-strong hover:bg-black/[0.02]"
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
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
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
          {/* The old card carried a calendar icon on every tile — identical
              across the grid, so it added weight without telling anyone
              anything. What differs between cards is the title, the dates and
              the schedule count, so only those remain. */}
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-foreground">{project.title}</h3>
            {project.description ? (
              <p className="line-clamp-2 text-sm leading-6 text-muted">{project.description}</p>
            ) : null}
          </div>
        </div>
      )}
      {/* Dates and schedule count are the two facts that separate one timetable
          from another, so they share a single meta line at the foot of the card
          instead of floating apart. */}
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
        <span className="truncate tabular-nums">
          {dateRange ?? t("card.noDates")}
          <span className="mx-1.5 text-border-emphasis">·</span>
          {t("card.scheduleCount", { count: schedules.length })}
        </span>
        {/* A hint for a hidden interaction, shown only while the pointer is on
            the card it applies to. */}
        <span className="inline-flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <MousePointer2 size={13} />
          {t("card.contextHint")}
        </span>
      </div>
    </div>
  );
}

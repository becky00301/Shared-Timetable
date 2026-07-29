"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ProjectSetup } from "@/components/project/ProjectSetup";
import { ProjectSidebar } from "@/components/project/ProjectSidebar";
import { ScheduleDetailPanel } from "@/components/project/ScheduleDetailPanel";
import { ShareModal } from "@/components/project/ShareModal";
import { MonthCalendarView } from "@/components/timetable/MonthCalendarView";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { TimetableHeader } from "@/components/timetable/TimetableHeader";
import { useProjectRealtime } from "@/lib/supabase/realtime";
import { useT } from "@/lib/i18n/locale";
import { canEdit as roleCanEdit } from "@/lib/permissions/roles";
import { orderDays } from "@/lib/utils/days";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

export default function ProjectPage() {
  const params = useParams<{ slug: string }>();
  const project = useProjectStore((state) => state.getProjectBySlug(params.slug));
  const allDays = useProjectStore((state) => state.days);
  const allMembers = useProjectStore((state) => state.members);
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const loadProject = useProjectStore((state) => state.loadProject);
  const viewMode = useUiStore((state) => state.viewMode);
  const weekStartsOnSunday = useUiStore((state) => state.weekStartsOnSunday);
  const [notFound, setNotFound] = useState(false);
  const t = useT();

  useEffect(() => {
    setNotFound(false);
    loadProject(params.slug).then((result) => {
      if (!result) setNotFound(true);
    }).catch((error) => {
      console.error(error);
      toast.error(t("project.loadFailed"));
      setNotFound(true);
    });
  }, [params.slug, loadProject, t]);

  const onSync = useCallback(() => {
    loadProject(params.slug).catch((error) => console.error(error));
  }, [params.slug, loadProject]);
  useProjectRealtime(project?.id ?? "", onSync);

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold">{notFound ? t("project.notFound") : t("common.loading")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {notFound ? t("project.notFoundBody") : t("project.loadingBody")}
          </p>
          {notFound ? (
            <Link className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" href="/dashboard">
              {t("project.backToDashboard")}
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  const isWeekly = project.kind === "weekly";
  const days = orderDays(
    allDays.filter((day) => day.project_id === project.id),
    weekStartsOnSunday,
    isWeekly
  );
  const members = allMembers.filter((member) => member.project_id === project.id);
  const currentRole = members.find((member) => member.user_id === currentUserId)?.role ?? "viewer";
  const canEdit = roleCanEdit(currentRole);

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <ProjectSidebar
        project={project}
        days={days}
        members={members}
        currentRole={currentRole}
        canEdit={canEdit}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        {days.length === 0 ? (
          <>
            <div className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
              <Link
                href="/dashboard"
                aria-label={t("project.goDashboard")}
                className="rounded-md p-1.5 text-muted transition hover:bg-black/8 hover:text-foreground"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate font-semibold text-foreground">{project.title}</h1>
                <p className="text-xs text-muted">{t(`role.${currentRole}`)}</p>
              </div>
            </div>
            <ProjectSetup projectId={project.id} canEdit={canEdit} />
          </>
        ) : (
          <>
            <TimetableHeader isWeekly={isWeekly} mobileTitle={project.title} />
            {viewMode === "month" ? (
              <MonthCalendarView projectId={project.id} days={days} />
            ) : (
              <div className="flex min-h-0 flex-1">
                <TimetableGrid
                  projectId={project.id}
                  days={days}
                  members={members}
                  canEdit={canEdit}
                  weekdayOnly={isWeekly}
                />
              </div>
            )}
          </>
        )}
      </section>
      <ScheduleDetailPanel days={days} canEdit={canEdit} />
      <ShareModal project={project} />
    </main>
  );
}

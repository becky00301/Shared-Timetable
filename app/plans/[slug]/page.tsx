"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ProjectSetup } from "@/components/project/ProjectSetup";
import { GuestLinkBanner } from "@/components/project/GuestLinkBanner";
import { ProjectSidebar } from "@/components/project/ProjectSidebar";
import { ScheduleDetailPanel } from "@/components/project/ScheduleDetailPanel";
import { ShareModal } from "@/components/project/ShareModal";
import { MonthCalendarView } from "@/components/timetable/MonthCalendarView";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { TimetableHeader } from "@/components/timetable/TimetableHeader";
import { useProjectRealtime } from "@/lib/supabase/realtime";
import { useT } from "@/lib/i18n/locale";
import { SITE_NAME } from "@/lib/seo";
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
  const isGuest = useProjectStore((state) => state.isGuest);
  const loadProject = useProjectStore((state) => state.loadProject);
  const undoScheduleChange = useProjectStore((state) => state.undoScheduleChange);
  const viewMode = useUiStore((state) => state.viewMode);
  const weekStartsOnSunday = useUiStore((state) => state.weekStartsOnSunday);
  const [notFound, setNotFound] = useState(false);
  const t = useT();
  const currentRole = project
    ? allMembers.find((member) => member.project_id === project.id && member.user_id === currentUserId)?.role ?? "viewer"
    : "viewer";
  const canEdit = Boolean(project) && roleCanEdit(currentRole);

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

  // The layout's static title covers the load, then the tab takes the
  // timetable's own name — which is how you tell four open plans apart. It
  // follows a rename too, since the sidebar can retitle the project in place.
  useEffect(() => {
    if (project?.title) document.title = `${project.title} | ${SITE_NAME}`;
  }, [project?.title]);

  useEffect(() => {
    if (!project?.embed_token) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("embed") === project.embed_token) return;

    url.searchParams.set("embed", project.embed_token);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [project?.embed_token]);

  const onSync = useCallback(() => {
    loadProject(params.slug).catch((error) => console.error(error));
  }, [params.slug, loadProject]);
  useProjectRealtime(project?.id ?? "", onSync);

  useEffect(() => {
    const projectId = project?.id;
    if (!projectId || !canEdit) return;
    const activeProjectId = projectId;

    function onUndo(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (
        event.key.toLowerCase() !== "z" ||
        (!event.ctrlKey && !event.metaKey) ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      event.preventDefault();
      undoScheduleChange(activeProjectId)
        .then((undone) => {
          if (undone) toast.success(t("grid.undoSuccess"));
        })
        .catch((error) => {
          console.error(error);
          toast.error(t("grid.undoFailed"));
        });
    }

    window.addEventListener("keydown", onUndo);
    return () => window.removeEventListener("keydown", onUndo);
  }, [project?.id, canEdit, undoScheduleChange, t]);

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
        <GuestLinkBanner slug={params.slug} />
        {days.length === 0 ? (
          <>
            <div className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
              {/* Guests have no dashboard to go back to — this is their only page. */}
              {isGuest ? null : (
                <Link
                  href="/dashboard"
                  aria-label={t("project.goDashboard")}
                  className="rounded-md p-1.5 text-muted transition hover:bg-black/8 hover:text-foreground"
                >
                  <ArrowLeft size={18} />
                </Link>
              )}
              <div className="min-w-0">
                <h1 className="truncate font-semibold text-foreground">{project.title}</h1>
                <p className="text-xs text-muted">{t(`role.${currentRole}`)}</p>
              </div>
            </div>
            <ProjectSetup projectId={project.id} canEdit={canEdit} />
          </>
        ) : (
          <>
            <TimetableHeader isWeekly={isWeekly} mobileTitle={project.title} canEdit={canEdit} />
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

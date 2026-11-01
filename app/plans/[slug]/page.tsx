"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProjectSetup } from "@/components/project/ProjectSetup";
import { GuestLinkBanner } from "@/components/project/GuestLinkBanner";
import { MobileProjectBar } from "@/components/project/MobileProjectBar";
import { ProjectSidebar } from "@/components/project/ProjectSidebar";
import { RemovedFromProjectNotice } from "@/components/project/RemovedFromProjectNotice";
import { ScheduleDetailPanel } from "@/components/project/ScheduleDetailPanel";
import { ShareModal } from "@/components/project/ShareModal";
import { MonthCalendarView } from "@/components/timetable/MonthCalendarView";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { TimetableHeader } from "@/components/timetable/TimetableHeader";
import { useMemberRemovalNotice } from "@/lib/supabase/member-events";
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
  // Who removed this reader from the timetable, once that happens; "" when
  // only the fallback below noticed and the name isn't known.
  const [removedBy, setRemovedBy] = useState<string | null>(null);
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
  // Nothing on this page scrolls the document, so a drag that starts on the
  // top bar (or runs past the grid's edge) would only rubber-band the whole
  // page on a phone. Locked here rather than globally, since the landing and
  // dashboard do scroll the document.
  useEffect(() => {
    const root = document.documentElement;
    const previous = [root.style.overscrollBehavior, document.body.style.overscrollBehavior];
    root.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    return () => {
      [root.style.overscrollBehavior, document.body.style.overscrollBehavior] = previous;
    };
  }, []);

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

  // The owner's name, kept for the fallback: by the time a reload finds the
  // timetable gone, the member list it came from can't be read any more.
  const ownerNameRef = useRef("");
  ownerNameRef.current =
    allMembers.find((member) => member.project_id === project?.id && member.role === "owner")?.user?.name ??
    ownerNameRef.current;

  const onSync = useCallback(() => {
    loadProject(params.slug)
      .then((result) => {
        // A reload that can no longer see a timetable this tab was showing
        // means the reader was taken out of it, even if the owner's
        // announcement never arrived.
        if (!result) setRemovedBy((current) => current ?? ownerNameRef.current);
      })
      .catch((error) => console.error(error));
  }, [params.slug, loadProject]);
  useProjectRealtime(project?.id ?? "", onSync);
  useMemberRemovalNotice(project?.id ?? "", currentUserId, setRemovedBy);

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
        <RemovedFromProjectNotice removedBy={removedBy} />
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold">{notFound ? t("project.notFound") : t("common.loading")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {notFound ? t("project.notFoundBody") : t("project.loadingBody")}
          </p>
          {notFound ? (
            <Link className="mt-5 inline-flex rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] px-4 py-2 text-sm font-medium transition" href="/dashboard">
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
    // h-dvh, not h-screen: on phones 100vh is taller than the visible area, so
    // the page itself would scroll and drag the top bar with it.
    <main className="flex h-dvh overflow-hidden bg-background text-foreground">
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
            <MobileProjectBar
              project={project}
              days={days}
              canEdit={canEdit}
              onRefresh={() => loadProject(params.slug)}
            />
          </>
        )}
      </section>
      <ScheduleDetailPanel days={days} canEdit={canEdit} />
      <ShareModal project={project} />
      <RemovedFromProjectNotice removedBy={removedBy} />
    </main>
  );
}

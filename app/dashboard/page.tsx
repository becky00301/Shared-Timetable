"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, LayoutGrid, Plus } from "lucide-react";
import { toast } from "sonner";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { CreateProjectModal } from "@/components/project/CreateProjectModal";
import { ProjectCard } from "@/components/project/ProjectCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { Project } from "@/types/project";

type ProjectGroup = {
  key: "ongoing" | "upcoming" | "past";
  title: "dashboard.ongoingProjects" | "dashboard.upcomingProjects" | "dashboard.pastProjects";
  empty: "dashboard.noOngoingProjects" | "dashboard.noUpcomingProjects" | "dashboard.noPastProjects";
  projects: Project[];
};

export default function DashboardPage() {
  const router = useRouter();
  const t = useT();
  const allProjects = useProjectStore((state) => state.projects);
  const projectsLoaded = useProjectStore((state) => state.projectsLoaded);
  const days = useProjectStore((state) => state.days);
  const schedules = useProjectStore((state) => state.schedules);

  const today = format(new Date(), "yyyy-MM-dd");
  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const datesByProject = new Map<string, string[]>();
    for (const day of days) {
      const dates = datesByProject.get(day.project_id) ?? [];
      dates.push(day.date);
      datesByProject.set(day.project_id, dates);
    }

    const timelines = allProjects.map((project) => {
      const projectDates = datesByProject.get(project.id)?.sort() ?? [];
      return {
        project,
        firstDate: projectDates[0] ?? null,
        lastDate: projectDates[projectDates.length - 1] ?? null
      };
    });
    const stable = (a: typeof timelines[number], b: typeof timelines[number]) =>
      a.project.created_at.localeCompare(b.project.created_at) || a.project.id.localeCompare(b.project.id);

    const ongoing = timelines
      .filter(({ firstDate, lastDate }) => firstDate !== null && firstDate <= today && lastDate! >= today)
      .sort((a, b) => a.lastDate!.localeCompare(b.lastDate!) || a.firstDate!.localeCompare(b.firstDate!) || stable(a, b));
    const upcoming = timelines
      .filter(({ firstDate }) => firstDate === null || firstDate > today)
      .sort((a, b) => {
        if (a.firstDate === null) return b.firstDate === null ? stable(a, b) : 1;
        if (b.firstDate === null) return -1;
        return a.firstDate.localeCompare(b.firstDate) || stable(a, b);
      });
    const past = timelines
      .filter(({ lastDate }) => lastDate !== null && lastDate < today)
      .sort((a, b) => b.lastDate!.localeCompare(a.lastDate!) || stable(a, b));

    return [
      {
        key: "ongoing",
        title: "dashboard.ongoingProjects",
        empty: "dashboard.noOngoingProjects",
        projects: ongoing.map(({ project }) => project)
      },
      {
        key: "upcoming",
        title: "dashboard.upcomingProjects",
        empty: "dashboard.noUpcomingProjects",
        projects: upcoming.map(({ project }) => project)
      },
      {
        key: "past",
        title: "dashboard.pastProjects",
        empty: "dashboard.noPastProjects",
        projects: past.map(({ project }) => project)
      }
    ];
  }, [allProjects, days, today]);
  const projects = useMemo(
    () => projectGroups.flatMap((group) => group.projects),
    [projectGroups]
  );
  const loadDashboard = useProjectStore((state) => state.loadDashboard);
  const setCreateProjectOpen = useUiStore((state) => state.setCreateProjectOpen);
  const [loadError, setLoadError] = useState(false);
  const [dashboardView, setDashboardView] = useState<"projects" | "calendar">("projects");

  // This page is prerendered, so a client-side navigation can reach it without
  // passing through middleware. Verify the session here too, and clear any
  // cached data before redirecting.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        useProjectStore.getState().reset();
        router.replace("/login?next=%2Fdashboard");
        return;
      }
      // Guests are a single-timetable trial with no dashboard. Send them back
      // to their one timetable rather than showing an account-shaped page.
      if (data.user.is_anonymous) {
        const slug = await useProjectStore.getState().findGuestProjectSlug();
        if (cancelled) return;
        router.replace(slug ? `/plans/${slug}` : "/login");
        return;
      }
      loadDashboard().catch((error) => {
        console.error(error);
        setLoadError(true);
        toast.error(t("dashboard.loadFailed"));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loadDashboard, router, t]);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-5 py-10">
        {/* The page title is wayfinding, not the content: at 4xl it outweighed
            every timetable listed below it. */}
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("dashboard.title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("dashboard.subtitle")}</p>
          </div>
          <Button onClick={() => setCreateProjectOpen(true)}>
            <Plus size={16} />
            {t("dashboard.new")}
          </Button>
        </div>
        {/* Same segmented control as the timetable header, so switching views
            looks like the same gesture in both places. */}
        <div className="mt-6 inline-grid grid-cols-2 gap-0.5 rounded-lg bg-black/[0.05] p-0.5">
          <button
            type="button"
            onClick={() => setDashboardView("projects")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[7px] px-3 py-1.5 text-sm transition",
              dashboardView === "projects"
                ? "bg-background font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                : "text-muted hover:text-foreground"
            )}
          >
            <LayoutGrid size={15} />
            {t("dashboard.projectsView")}
          </button>
          <button
            type="button"
            onClick={() => setDashboardView("calendar")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[7px] px-3 py-1.5 text-sm transition",
              dashboardView === "calendar"
                ? "bg-background font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                : "text-muted hover:text-foreground"
            )}
          >
            <CalendarDays size={15} />
            {t("dashboard.calendar")}
          </button>
        </div>
        {/* Wait for the full list. Opening a single timetable leaves just that
            project cached, and rendering that would flash a one-card dashboard
            before the rest arrived. */}
        {!projectsLoaded && !loadError ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted">
            {t("common.loading")}
          </div>
        ) : loadError ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted">
            {t("dashboard.loadFailedRetry")}
          </div>
        ) : projects.length && dashboardView === "projects" ? (
          <div className="mt-8 space-y-12">
            {projectGroups.map((group, index) => (
              <section
                key={group.key}
                className={cn(index > 0 && "border-t border-border pt-8")}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{t(group.title)}</h2>
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-black/6 px-2 py-0.5 text-xs tabular-nums text-muted">
                    {group.projects.length}
                  </span>
                </div>
                {group.projects.length ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {group.projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        days={days.filter((day) => day.project_id === project.id)}
                        schedules={schedules.filter((item) => item.project_id === project.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 border-l-2 border-border py-2 pl-4 text-sm text-muted">
                    {t(group.empty)}
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : projects.length ? (
          <DashboardCalendar projects={projects} days={days} schedules={schedules} />
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted">
            {t("dashboard.empty")}
          </div>
        )}
      </main>
      <CreateProjectModal />
    </AppShell>
  );
}

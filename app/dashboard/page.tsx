"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function DashboardPage() {
  const router = useRouter();
  const t = useT();
  const allProjects = useProjectStore((state) => state.projects);
  const projectsLoaded = useProjectStore((state) => state.projectsLoaded);
  const days = useProjectStore((state) => state.days);
  const schedules = useProjectStore((state) => state.schedules);

  // Newest first, and stable: the store's array order shifts as individual
  // projects are refetched, so sort here rather than trusting insertion order.
  const projects = useMemo(
    () => [...allProjects].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [allProjects]
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
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-8 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-semibold text-foreground">{t("dashboard.title")}</h1>
            <p className="mt-2 text-muted">{t("dashboard.subtitle")}</p>
          </div>
          <Button onClick={() => setCreateProjectOpen(true)}>
            <Plus size={16} />
            {t("dashboard.new")}
          </Button>
        </div>
        <div className="mt-6 inline-grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setDashboardView("projects")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
              dashboardView === "projects" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
            )}
          >
            <LayoutGrid size={15} />
            {t("dashboard.projectsView")}
          </button>
          <button
            type="button"
            onClick={() => setDashboardView("calendar")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
              dashboardView === "calendar" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
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
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                days={days.filter((day) => day.project_id === project.id)}
                schedules={schedules.filter((item) => item.project_id === project.id)}
              />
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

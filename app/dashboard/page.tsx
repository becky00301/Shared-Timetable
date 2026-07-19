"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { CreateProjectModal } from "@/components/project/CreateProjectModal";
import { ProjectCard } from "@/components/project/ProjectCard";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

export default function DashboardPage() {
  const projects = useProjectStore((state) => state.projects);
  const days = useProjectStore((state) => state.days);
  const schedules = useProjectStore((state) => state.schedules);
  const loading = useProjectStore((state) => state.loading);
  const loadDashboard = useProjectStore((state) => state.loadDashboard);
  const setCreateProjectOpen = useUiStore((state) => state.setCreateProjectOpen);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadDashboard().catch((error) => {
      console.error(error);
      setLoadError(true);
      toast.error("프로젝트를 불러오지 못했어요.");
    });
  }, [loadDashboard]);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-8 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-semibold text-foreground">대시보드</h1>
            <p className="mt-2 text-muted">함께 만드는 공유 시간표 목록이에요.</p>
          </div>
          <Button onClick={() => setCreateProjectOpen(true)}>
            <Plus size={16} />
            새 시간표
          </Button>
        </div>
        {loading && !projects.length ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted">
            불러오는 중...
          </div>
        ) : loadError ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted">
            프로젝트를 불러오지 못했어요. 새로고침해 보세요.
          </div>
        ) : projects.length ? (
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
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted">
            아직 만든 일정표가 없어요. 첫 프로젝트를 만들어보세요.
          </div>
        )}
      </main>
      <CreateProjectModal />
    </AppShell>
  );
}

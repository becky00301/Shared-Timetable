"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AddDateModal } from "@/components/project/AddDateModal";
import { ProjectSidebar } from "@/components/project/ProjectSidebar";
import { ScheduleDetailPanel } from "@/components/project/ScheduleDetailPanel";
import { ShareModal } from "@/components/project/ShareModal";
import { MobileTimeline } from "@/components/mobile/MobileTimeline";
import { ScheduleItemModal } from "@/components/timetable/ScheduleItemModal";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { useProjectRealtime } from "@/lib/supabase/realtime";
import { canEdit as roleCanEdit } from "@/lib/permissions/roles";
import { useProjectStore } from "@/stores/project-store";

export default function ProjectPage() {
  const params = useParams<{ slug: string }>();
  const project = useProjectStore((state) => state.getProjectBySlug(params.slug));
  const allDays = useProjectStore((state) => state.days);
  const allMembers = useProjectStore((state) => state.members);
  const schedules = useProjectStore((state) => state.schedules);
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const loadProject = useProjectStore((state) => state.loadProject);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setNotFound(false);
    loadProject(params.slug).then((result) => {
      if (!result) setNotFound(true);
    }).catch((error) => {
      console.error(error);
      toast.error("Could not load this project.");
      setNotFound(true);
    });
  }, [params.slug, loadProject]);

  const onSync = useCallback(() => {
    loadProject(params.slug).catch((error) => console.error(error));
  }, [params.slug, loadProject]);
  useProjectRealtime(project?.id ?? "", onSync);

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-white">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold">{notFound ? "Project not found" : "Loading..."}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {notFound
              ? "This timetable does not exist, or you do not have access to it."
              : "Fetching your timetable."}
          </p>
          {notFound ? (
            <Link className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" href="/dashboard">
              Back to dashboard
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  const days = allDays
    .filter((day) => day.project_id === project.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const members = allMembers.filter((member) => member.project_id === project.id);
  const currentRole = members.find((member) => member.user_id === currentUserId)?.role ?? "viewer";
  const canEdit = roleCanEdit(currentRole);

  return (
    <main className="flex h-screen overflow-hidden bg-background text-white">
      <ProjectSidebar
        project={project}
        days={days}
        members={members}
        currentRole={currentRole}
        canEdit={canEdit}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border bg-[#121212] px-4 lg:hidden">
          <div>
            <h1 className="font-semibold text-white">{project.title}</h1>
            <p className="text-xs text-muted">{currentRole}</p>
          </div>
        </div>
        <MobileTimeline
          days={days}
          schedules={schedules.filter((item) => item.project_id === project.id)}
          canEdit={canEdit}
        />
        <div className="hidden min-h-0 flex-1 lg:flex">
          <TimetableGrid projectId={project.id} days={days} members={members} canEdit={canEdit} />
        </div>
      </section>
      <ScheduleDetailPanel days={days} canEdit={canEdit} />
      <AddDateModal projectId={project.id} />
      <ShareModal project={project} />
      <ScheduleItemModal projectId={project.id} days={days} canEdit={canEdit} />
    </main>
  );
}

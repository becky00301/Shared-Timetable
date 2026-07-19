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
import { ScheduleItemModal } from "@/components/timetable/ScheduleItemModal";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { TimetableHeader } from "@/components/timetable/TimetableHeader";
import { useProjectRealtime } from "@/lib/supabase/realtime";
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

  useEffect(() => {
    setNotFound(false);
    loadProject(params.slug).then((result) => {
      if (!result) setNotFound(true);
    }).catch((error) => {
      console.error(error);
      toast.error("이 시간표를 불러오지 못했어요.");
      setNotFound(true);
    });
  }, [params.slug, loadProject]);

  const onSync = useCallback(() => {
    loadProject(params.slug).catch((error) => console.error(error));
  }, [params.slug, loadProject]);
  useProjectRealtime(project?.id ?? "", onSync);

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold">{notFound ? "시간표를 찾을 수 없어요" : "불러오는 중..."}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {notFound
              ? "이 시간표가 없거나 접근 권한이 없어요."
              : "시간표를 불러오고 있어요."}
          </p>
          {notFound ? (
            <Link className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" href="/dashboard">
              대시보드로 돌아가기
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
      <ProjectSidebar project={project} days={days} members={members} currentRole={currentRole} />
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
          <Link
            href="/dashboard"
            aria-label="대시보드로 이동"
            className="rounded-md p-1.5 text-muted transition hover:bg-black/8 hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-semibold text-foreground">{project.title}</h1>
            <p className="text-xs text-muted">
              {currentRole === "owner" ? "소유자" : currentRole === "editor" ? "편집자" : "뷰어"}
            </p>
          </div>
        </div>
        {days.length === 0 ? (
          <ProjectSetup projectId={project.id} canEdit={canEdit} />
        ) : (
          <>
            <TimetableHeader isWeekly={isWeekly} />
            {viewMode === "month" ? (
              <MonthCalendarView projectId={project.id} days={days} canEdit={canEdit} />
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
      <ScheduleItemModal projectId={project.id} days={days} canEdit={canEdit} />
    </main>
  );
}

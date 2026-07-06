"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/project-store";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const project = useProjectStore((state) =>
    state.projects.find((candidate) => candidate.invite_token === params.token)
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-glow">
        <p className="text-sm uppercase tracking-wide text-muted">PlanTogether invite</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          {project ? project.title : "Invite not found"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {project
            ? "Join this project as a viewer. Editor-scoped invite tokens are prepared for v1."
            : "The token does not match a project in the local sample store."}
        </p>
        <Button className="mt-6" asChild>
          <Link href={project ? `/plans/${project.slug}` : "/dashboard"}>
            {project ? "Join project" : "Back to dashboard"}
          </Link>
        </Button>
      </div>
    </main>
  );
}

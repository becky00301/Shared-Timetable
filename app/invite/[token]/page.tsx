"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useProjectStore } from "@/stores/project-store";

type Status = "checking" | "needs-login" | "joining" | "error";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const joinByInviteToken = useProjectStore((state) => state.joinByInviteToken);
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    async function run() {
      if (!supabase) {
        setStatus("error");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (!cancelled) setStatus("needs-login");
        return;
      }
      if (!cancelled) setStatus("joining");
      try {
        const slug = await joinByInviteToken(params.token);
        if (!cancelled) router.replace(`/plans/${slug}`);
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [params.token, joinByInviteToken, router]);

  const loginHref = `/login?next=${encodeURIComponent(`/invite/${params.token}`)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-glow">
        <p className="text-sm uppercase tracking-wide text-muted">PlanTogether invite</p>
        {status === "checking" || status === "joining" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold text-white">Joining project...</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Hang on while we add you as a viewer.</p>
          </>
        ) : status === "needs-login" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold text-white">Sign in to join</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              You need a PlanTogether account before joining this project.
            </p>
            <Button className="mt-6" asChild>
              <Link href={loginHref}>Sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold text-white">Invite not found</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              This invite link is invalid, expired, or you don&apos;t have access.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

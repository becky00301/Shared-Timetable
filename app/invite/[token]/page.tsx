"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmbeddedTimetable } from "@/components/embed/EmbeddedTimetable";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { EMBED_TOKEN_PATTERN, parseTimetable, type EmbeddedTimetableData } from "@/lib/embed/timetable";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";

type Status = "checking" | "preview" | "needs-login" | "joining" | "error";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const joinByInviteToken = useProjectStore((state) => state.joinByInviteToken);
  const [status, setStatus] = useState<Status>("checking");
  const [preview, setPreview] = useState<EmbeddedTimetableData | null>(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    async function loadPreview(viewKey: string) {
      const { data, error } = await supabase!.rpc("get_embedded_timetable", { embed_token_value: viewKey });
      if (error) {
        console.error(error);
        return null;
      }
      return parseTimetable(data);
    }

    async function run() {
      if (!supabase) {
        setStatus("error");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        // Signed out: show the timetable read-only first, when the link
        // carries its view key. Logging in from there comes back here and
        // joins as an editor.
        const viewKey = new URLSearchParams(window.location.search).get("view");
        const timetable = viewKey && EMBED_TOKEN_PATTERN.test(viewKey) ? await loadPreview(viewKey) : null;
        if (cancelled) return;
        setPreview(timetable);
        setStatus(timetable ? "preview" : "needs-login");
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

  if (status === "preview" && preview) {
    return (
      <EmbeddedTimetable
        title={preview.project.title}
        slug={preview.project.slug}
        kind={preview.project.kind}
        days={preview.days}
        schedules={preview.schedules}
        standalone
        joinHref={loginHref}
      />
    );
  }

  return (
    <AuthShell wide className="text-center">
        <p className="text-sm text-muted">{t("invite.eyebrow")}</p>
        {status === "checking" || status === "joining" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground">{t("invite.joining")}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{t("invite.joiningBody")}</p>
          </>
        ) : status === "needs-login" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground">{t("invite.needLogin")}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{t("invite.needLoginBody")}</p>
            <Button className="mt-6" asChild>
              <Link href={loginHref}>{t("invite.loginOrSignup")}</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground">{t("invite.failed")}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{t("invite.failedBody")}</p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard">{t("invite.goDashboard")}</Link>
            </Button>
          </>
        )}
    </AuthShell>
  );
}

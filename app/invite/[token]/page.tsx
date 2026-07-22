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
        <p className="text-sm text-muted">PlanTogether 초대</p>
        {status === "checking" || status === "joining" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold text-foreground">참여하는 중...</h1>
            <p className="mt-3 text-sm leading-6 text-muted">잠시만요, 시간표에 참여자로 등록하고 있어요.</p>
          </>
        ) : status === "needs-login" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold text-foreground">로그인하고 참여하기</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              참여하려면 계정이 필요해요. 로그인하거나 회원가입을 마치면 이 시간표에 자동으로 참여됩니다.
            </p>
            <Button className="mt-6" asChild>
              <Link href={loginHref}>로그인 · 회원가입</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold text-foreground">참여하지 못했어요</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              초대 링크가 올바르지 않거나 만료됐어요. 초대한 분에게 링크를 다시 받아주세요.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard">대시보드로 이동</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

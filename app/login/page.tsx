"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const authError = searchParams.get("error");

  useEffect(() => {
    if (authError) {
      toast.error(`로그인에 실패했어요: ${authError}`);
    }
  }, [authError]);

  async function loginWithEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!email) return;
    if (!supabase) {
      toast.info("Add Supabase environment variables to enable email login.");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    setSending(false);
    if (error) {
      console.error(error);
      toast.error("로그인 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSent(true);
    toast.success("로그인 링크를 보냈어요. 메일함을 확인해주세요.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-glow">
        <Link href="/" className="text-sm text-muted transition hover:text-foreground">
          PlanTogether
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-foreground">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          이메일을 입력하면 로그인 링크를 보내드려요. 비밀번호는 필요 없습니다.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {sent ? (
            <div className="rounded-lg border border-border bg-black/[0.03] p-4 text-sm leading-6 text-foreground">
              <p className="font-medium">{email}</p>
              <p className="mt-1 text-muted">
                위 주소로 로그인 링크를 보냈어요. 메일의 링크를 누르면 바로 로그인됩니다. 메일이 안 보이면
                스팸함도 확인해주세요.
              </p>
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={loginWithEmail}>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
              <Button type="submit" disabled={sending}>
                <Mail size={17} />
                {sending ? "보내는 중..." : "로그인 링크 받기"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

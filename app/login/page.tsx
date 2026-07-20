"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      toast.info("Supabase 환경변수를 설정해주세요.");
      return;
    }
    if (!email || !password) return;
    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (mode === "signup" && !agreed) {
      toast.error("개인정보 수집·이용에 동의해주세요.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          toast.info("가입이 완료됐어요. 이제 로그인해주세요.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/invalid login credentials/i.test(message)) {
        toast.error("이메일 또는 비밀번호가 올바르지 않아요.");
      } else if (/already registered/i.test(message)) {
        toast.error("이미 가입된 이메일이에요. 로그인해주세요.");
        setMode("signin");
      } else {
        console.error(error);
        toast.error(message || "문제가 생겼어요. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-glow">
        <Link href="/" className="text-sm text-muted transition hover:text-foreground">
          PlanTogether
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-foreground">
          {mode === "signin" ? "로그인" : "회원가입"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "signin"
            ? "이메일과 비밀번호로 로그인하세요."
            : "이메일과 비밀번호로 계정을 만들어요."}
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            이메일
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            비밀번호
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6자 이상"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "signup" ? (
            <label className="flex items-start gap-2 rounded-lg border border-border bg-black/[0.02] p-3 text-sm leading-6 text-muted">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-[color:var(--primary)]"
              />
              <span>
                <span className="text-foreground">개인정보 수집·이용에 동의합니다.</span> (필수)
                <br />
                이메일과 작성한 시간표가 저장되며, 서비스 운영을 위해 Supabase·Vercel에 처리를 위탁해요.{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  개인정보처리방침
                </Link>
              </span>
            </label>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "signin" ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <button
            type="button"
            className="font-medium text-primary transition hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "회원가입" : "로그인"}
          </button>
        </p>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";

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
  const t = useT();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function startGuest() {
    if (!supabase) {
      toast.info(t("auth.error.notConfigured"));
      return;
    }
    setGuestLoading(true);
    try {
      await useProjectStore.getState().signInAsGuest();
      router.push(next);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t("auth.guest.failed"));
    } finally {
      setGuestLoading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      toast.info(t("auth.error.notConfigured"));
      return;
    }
    if (!email || !password) return;
    if (password.length < 6) {
      toast.error(t("auth.error.shortPassword"));
      return;
    }
    if (mode === "signup" && !agreed) {
      toast.error(t("auth.error.consent"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          toast.info(t("auth.signupComplete"));
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
        toast.error(t("auth.error.badCredentials"));
      } else if (/already registered/i.test(message)) {
        toast.error(t("auth.error.alreadyRegistered"));
        setMode("signin");
      } else {
        console.error(error);
        toast.error(t("auth.error.generic"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            Planner Together
          </Link>
          <LocaleToggle />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-foreground">
          {mode === "signin" ? t("auth.signin.title") : t("auth.signup.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "signin" ? t("auth.signin.subtitle") : t("auth.signup.subtitle")}
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            {t("auth.email")}
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
            {t("auth.password")}
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.password.placeholder")}
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
                <span className="text-foreground">{t("auth.consent.label")}</span> {t("auth.consent.required")}
                <br />
                {t("auth.consent.body")}{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  {t("common.privacy")}
                </Link>
              </span>
            </label>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? t("auth.submitting") : mode === "signin" ? t("auth.signin.title") : t("auth.signup.submit")}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
          <button
            type="button"
            className="font-medium text-primary transition hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? t("auth.signup.title") : t("auth.signin.title")}
          </button>
        </p>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          {t("auth.guest.divider")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" disabled={guestLoading} onClick={startGuest}>
          {guestLoading ? t("auth.guest.starting") : t("auth.guest.cta")}
        </Button>
        <p className="mt-2 text-center text-xs leading-5 text-muted">{t("auth.guest.hint")}</p>
      </div>
    </main>
  );
}

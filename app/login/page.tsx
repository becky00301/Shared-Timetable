"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { GoogleMark } from "@/components/ui/google-mark";
import { NaverMark } from "@/components/ui/naver-mark";
import { Input } from "@/components/ui/input";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";
import { parseProjectSlug } from "@/lib/utils/claim-link";
import { getSafeNextPath } from "@/lib/utils/navigation";
import { useProjectStore } from "@/stores/project-store";

// Google sign-in needs a client set up in Google Cloud and the provider
// enabled in Supabase. Until both are done the button would fail on click, so
// it only appears once the deployment says the provider is live.
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";

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
  const next = getSafeNextPath(searchParams.get("next"));
  // Set when someone arrives from a retired trial timetable: once they have an
  // account, that timetable is moved across before they land anywhere.
  const claimSlug = parseProjectSlug(searchParams.get("claim") ?? "");
  const supabase = createSupabaseBrowserClient();
  const t = useT();

  // Arriving from "make a timetable" should land on sign-up, not sign-in.
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "custom:naver" | null>(null);
  const busy = loading || socialLoading !== null;
  const [agreed, setAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // /auth/callback sends failures back here rather than leaving someone on a
  // blank screen wondering whether it worked.
  const authError = searchParams.get("error");
  useEffect(() => {
    if (authError) {
      toast.error(t(authError === "provider_email_needs_verification" ? "auth.error.verifyProviderEmail" : "auth.error.generic"));
    }
  }, [authError, t]);

  async function signInWithSocial(provider: "google" | "custom:naver") {
    if (busy) return;
    if (!supabase) {
      toast.info(t("auth.error.notConfigured"));
      return;
    }
    setSocialLoading(provider);
    try {
      // The browser leaves the app, so the destination travels with the
      // request. A pending claim rides along as a query on
      // the destination, which the dashboard picks up.
      const destination = claimSlug ? `/dashboard?claim=${encodeURIComponent(claimSlug)}` : next;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error(t("auth.error.generic"));
      setSocialLoading(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!supabase) {
      toast.info(t("auth.error.notConfigured"));
      return;
    }
    if (!email || !password) return;
    if (password.length < 6) {
      toast.error(t("auth.error.shortPassword"));
      return;
    }
    // Consent applies to email sign-up only. Social sign-in has its own flow.
    if (mode === "signup" && !termsAgreed) {
      toast.error(t("auth.error.terms"));
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
      // A failed claim must not strand someone who has just signed in, so it
      // only redirects the landing spot — it never blocks the login itself.
      if (claimSlug) {
        try {
          const slug = await useProjectStore.getState().claimGuestProject(claimSlug);
          toast.success(t("claim.success"));
          router.push(`/plans/${slug}`);
          router.refresh();
          return;
        } catch (error) {
          console.error(error);
          toast.error(t("claim.error.generic"));
        }
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
    <AuthShell>
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            Planner Together
          </Link>
          <LocaleToggle />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-foreground">
          {mode === "signin" ? t("auth.signin.title") : t("auth.signup.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "signin" ? t("auth.signin.subtitle") : t("auth.signup.subtitle")}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {GOOGLE_AUTH_ENABLED ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => signInWithSocial("google")}
            >
              <GoogleMark />
              {socialLoading === "google" ? t("auth.submitting") : t("auth.google")}
            </Button>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#03A94D] px-5 text-sm font-medium text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03A94D] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => signInWithSocial("custom:naver")}
          >
            <NaverMark />
            {socialLoading === "custom:naver" ? t("auth.submitting") : t("auth.naver")}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">{t("auth.social.termsNotice")}</p>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          {t("auth.or")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="flex flex-col gap-4" onSubmit={submit}>
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
            <>
              <label className="flex items-start gap-2 rounded-lg border border-border bg-black/[0.02] p-3 text-sm leading-6 text-muted">
                <input
                  type="checkbox"
                  required
                  checked={termsAgreed}
                  onChange={(event) => setTermsAgreed(event.target.checked)}
                  disabled={busy}
                  className="mt-1 size-4 shrink-0 accent-[color:var(--primary)]"
                />
                <span>
                  <Link href="/terms" target="_blank" className="font-medium text-primary underline underline-offset-2">
                    {t("auth.terms.label")}
                  </Link>{" "}
                  {t("auth.consent.required")}
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-border bg-black/[0.02] p-3 text-sm leading-6 text-muted">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  disabled={busy}
                  className="mt-1 size-4 shrink-0 accent-[color:var(--primary)]"
                />
                {/* Same shape as the terms line above: one linked sentence. What
                    is collected and who processes it is on the linked page. */}
                <span>
                  <Link href="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-2">
                    {t("auth.consent.label")}
                  </Link>{" "}
                  {t("auth.consent.required")}
                </span>
              </label>
            </>
          ) : null}

          <Button type="submit" disabled={busy || (mode === "signup" && (!termsAgreed || !agreed))}>
            {loading ? t("auth.submitting") : mode === "signin" ? t("auth.signin.title") : t("auth.signup.submit")}
          </Button>
        </form>

        {/* Only offered when signing in — during sign-up there is no password
            to recover yet. */}
        {mode === "signin" ? (
          <p className="mt-3 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-muted transition hover:text-foreground"
            >
              {t("auth.forgot.link")}
            </Link>
          </p>
        ) : null}

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

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted">
          <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-foreground">
            {t("common.terms")}
          </Link>
          <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground">
            {t("common.privacy")}
          </Link>
        </div>

    </AuthShell>
  );
}

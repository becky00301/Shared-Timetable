"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient();
  const t = useT();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      toast.info(t("auth.error.notConfigured"));
      return;
    }
    if (!email) return;
    setSending(true);
    try {
      // The recovery link lands on the shared auth callback, which exchanges
      // the token for a session and then forwards to the form below.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
      });
    } catch (error) {
      console.error(error);
    } finally {
      // Always report the same outcome: telling the visitor whether an address
      // is registered would turn this form into an account-existence oracle.
      setSending(false);
      setSent(true);
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
        <h1 className="mt-6 text-3xl font-semibold text-foreground">{t("auth.forgot.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t("auth.forgot.subtitle")}</p>

        {sent ? (
          <p className="mt-6 rounded-lg border border-border bg-black/[0.02] p-4 text-sm leading-6 text-muted">
            {t("auth.forgot.sent")}
          </p>
        ) : (
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
            <Button type="submit" disabled={sending || !email}>
              {sending ? t("auth.forgot.sending") : t("auth.forgot.submit")}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center">
          <Link href="/login" className="text-sm text-muted transition hover:text-foreground">
            {t("auth.forgot.back")}
          </Link>
        </p>
      </div>
    </main>
  );
}

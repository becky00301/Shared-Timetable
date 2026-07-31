"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const t = useT();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  // null while the recovery session is still being read, so the form isn't
  // flashed to someone whose link turned out to be spent.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      setHasSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, [supabase]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 6) {
      toast.error(t("auth.error.shortPassword"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("auth.reset.mismatch"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("auth.reset.done"));
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t("auth.error.generic"));
    } finally {
      setSaving(false);
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
        <h1 className="mt-6 text-3xl font-semibold text-foreground">{t("auth.reset.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t("auth.reset.subtitle")}</p>

        {hasSession === null ? null : hasSession ? (
          <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("auth.reset.newPassword")}
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.password.placeholder")}
                autoComplete="new-password"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              {t("auth.reset.confirmPassword")}
              <Input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder={t("auth.password.placeholder")}
                autoComplete="new-password"
              />
            </label>
            <Button type="submit" disabled={saving || !password || !confirm}>
              {saving ? t("auth.reset.saving") : t("auth.reset.submit")}
            </Button>
          </form>
        ) : (
          <>
            <p className="mt-6 rounded-lg border border-border bg-black/[0.02] p-4 text-sm leading-6 text-muted">
              {t("auth.reset.expired")}
            </p>
            <Button className="mt-4 w-full" asChild>
              <Link href="/forgot-password">{t("auth.forgot.submit")}</Link>
            </Button>
          </>
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

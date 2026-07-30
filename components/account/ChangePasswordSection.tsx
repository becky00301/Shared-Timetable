"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ChangePasswordSection({ email }: { email: string }) {
  const t = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t("auth.error.shortPassword"));
      return;
    }
    if (newPassword !== confirmation) {
      toast.error(t("auth.reset.mismatch"));
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.info(t("auth.error.notConfigured"));
      return;
    }

    setSaving(true);
    setCurrentPasswordError(false);
    try {
      const { error: verificationError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });
      if (verificationError) {
        setCurrentPasswordError(true);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      toast.success(t("auth.reset.done"));
    } catch (error) {
      console.error(error);
      toast.error(t("auth.error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="change-password-title">
      <h2 id="change-password-title" className="text-xl font-semibold text-foreground">
        {t("account.change.title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">{t("account.change.body")}</p>

      <form className="mt-6 flex max-w-lg flex-col gap-4" onSubmit={submit}>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("account.password.label")}
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setCurrentPasswordError(false);
            }}
            placeholder={t("account.password.placeholder")}
            autoComplete="current-password"
            aria-invalid={currentPasswordError}
            disabled={saving}
            autoFocus
          />
          {currentPasswordError ? (
            <span className="text-xs text-red-600" role="alert">
              {t("account.password.incorrect")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("auth.reset.newPassword")}
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={t("auth.password.placeholder")}
            autoComplete="new-password"
            disabled={saving}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("auth.reset.confirmPassword")}
          <Input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={t("auth.password.placeholder")}
            autoComplete="new-password"
            disabled={saving}
          />
        </label>

        <Button
          type="submit"
          className="mt-1 self-start"
          disabled={saving || !currentPassword || !newPassword || !confirmation}
        >
          {saving ? t("auth.reset.saving") : t("auth.reset.submit")}
        </Button>
      </form>
    </section>
  );
}

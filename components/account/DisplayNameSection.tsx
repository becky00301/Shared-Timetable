"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHOSEN_NAME_KEY, DISPLAY_NAME_MAX, checkDisplayName } from "@/lib/auth/display-name";
import { useT } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function DisplayNameSection({ user, name, onSaved }: {
  user: User;
  name: string;
  onSaved: (user: User) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const check = checkDisplayName(draft);
    if (!check.ok) {
      setError(check.reason === "empty" ? t("account.name.empty")
        : check.reason === "too-long" ? t("account.name.tooLong", { max: String(DISPLAY_NAME_MAX) })
          : t("account.name.invalid"));
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.info(t("auth.error.notConfigured"));
      return;
    }
    setSaving(true);
    try {
      // The auth.users trigger copies `name` into public.users, which members,
      // cursors, chat and ownership dialogs read. `chosen_name` keeps it from
      // being replaced by a provider's name at the next sign-in.
      const { data, error: saveError } = await supabase.auth.updateUser({
        data: { name: check.name, [CHOSEN_NAME_KEY]: check.name }
      });
      if (saveError || !data.user) throw saveError ?? new Error("no-user");
      // Same value as the trigger writes; RLS only allows a member's own row.
      await supabase.from("users").update({ name: check.name }).eq("id", user.id);
      onSaved(data.user);
      setDraft(check.name);
      toast.success(t("account.name.saved"));
    } catch {
      setError(t("auth.error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="change-name-title">
      <h2 id="change-name-title" className="text-xl font-semibold text-foreground">
        {t("account.name.title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted [:lang(en)_&]:leading-[1.4]">{t("account.name.body")}</p>

      <form className="mt-6 flex max-w-lg flex-col gap-4" onSubmit={submit} noValidate>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t("account.name.label")}
          <Input
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setError(null); }}
            maxLength={DISPLAY_NAME_MAX * 2}
            autoComplete="nickname"
            aria-invalid={Boolean(error)}
            disabled={saving}
          />
          {error ? <span className="text-xs text-red-600" role="alert">{error}</span> : null}
        </label>

        <Button
          type="submit"
          className="mt-1 self-start"
          disabled={saving || !draft.trim() || draft.trim() === name}
        >
          {saving ? t("auth.submitting") : t("account.name.save")}
        </Button>
      </form>
    </section>
  );
}

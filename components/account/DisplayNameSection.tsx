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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraft(name);
    setError(null);
    setEditing(true);
  }

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
    if (check.name === name) {
      setEditing(false);
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
      setEditing(false);
      toast.success(t("account.name.saved"));
    } catch {
      setError(t("auth.error.generic"));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {t("account.name.label")}
        <span className="min-w-0 break-all font-medium text-foreground">{name}</span>
        <button type="button" className="text-muted underline underline-offset-2 transition hover:text-foreground" onClick={startEditing}>
          {t("account.name.edit")}
        </button>
      </p>
    );
  }

  return (
    <form className="mt-5 text-sm" onSubmit={submit} noValidate>
      <label htmlFor="display-name" className="text-muted">{t("account.name.label")}</label>
      <div className="mt-2 flex max-w-sm gap-2">
        <Input
          id="display-name"
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setError(null); }}
          maxLength={DISPLAY_NAME_MAX * 2}
          autoComplete="nickname"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "display-name-error" : undefined}
          onKeyDown={(event) => { if (event.key === "Escape") setEditing(false); }}
        />
        <Button type="submit" disabled={saving}>{saving ? t("auth.submitting") : t("account.name.save")}</Button>
        <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
          {t("account.name.cancel")}
        </Button>
      </div>
      {error ? <p id="display-name-error" className="mt-2 text-red-600" role="alert">{error}</p> : null}
    </form>
  );
}

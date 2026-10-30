"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale";
import { naverProfileConsentRequest } from "@/lib/auth/naver-profile-consent";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function NaverProfileNotice() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function importName() {
    if (loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("supabase-unconfigured");
      const { error } = await supabase.auth.signInWithOAuth(naverProfileConsentRequest(window.location.origin));
      if (error) throw error;
    } catch {
      setFailed(true);
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
      <p className="leading-6 text-muted">{t("account.naver.profileMissing")}</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={importName} disabled={loading}>
        {loading ? t("auth.submitting") : t("account.naver.importName")}
      </Button>
      {failed ? <p className="mt-2 text-red-600" role="alert">{t("auth.error.generic")}</p> : null}
    </div>
  );
}

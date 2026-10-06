"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { ClaimProjectError, type ClaimFailure, useProjectStore } from "@/stores/project-store";

const FAILURE_MESSAGE: Record<ClaimFailure, MessageKey> = {
  "invalid-link": "claim.error.invalidLink",
  "not-found": "claim.error.notFound",
  owned: "claim.error.owned",
  "needs-account": "claim.error.needsAccount",
  unknown: "claim.error.generic"
};

/** Brings a timetable made before guest mode was retired into this account,
    using the /plans link its guest was told to keep. */
export function ClaimProjectCard() {
  const router = useRouter();
  const claimGuestProject = useProjectStore((state) => state.claimGuestProject);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useT();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!link.trim() || loading) return;
    setLoading(true);
    try {
      const slug = await claimGuestProject(link);
      toast.success(t("claim.success"));
      setLink("");
      router.push(`/plans/${slug}`);
    } catch (error) {
      if (error instanceof ClaimProjectError) {
        toast.error(t(FAILURE_MESSAGE[error.reason]));
      } else {
        console.error(error);
        toast.error(t("claim.error.generic"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Download size={18} className="mt-0.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{t("claim.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{t("claim.body")}</p>
          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
            <label className="sr-only" htmlFor="claim-link">
              {t("claim.inputLabel")}
            </label>
            <Input
              id="claim-link"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder={t("claim.placeholder")}
              autoComplete="off"
              spellCheck={false}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !link.trim()}>
              {loading ? t("claim.submitting") : t("claim.submit")}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

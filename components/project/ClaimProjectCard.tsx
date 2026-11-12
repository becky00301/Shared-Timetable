"use client";

import { Download } from "lucide-react";
import { useT } from "@/lib/i18n/locale";

/** Explains how to bring over a timetable made before guest mode was
    retired. Pasting its link here used to be enough, but a link is not proof
    of being that guest: only the guest's own browser session can hand the
    timetable over now, from the banner on the timetable itself. */
export function ClaimProjectCard() {
  const t = useT();

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Download size={18} className="mt-0.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{t("claim.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{t("claim.body")}</p>
        </div>
      </div>
    </section>
  );
}

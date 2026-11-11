"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/locale";
import { RELEASES, formatReleaseDate } from "@/lib/updates";

/** One line on the dashboard with the newest update, linking to the rest. */
export function UpdatesNotice() {
  const { locale } = useLocale();
  const t = useT();
  const latest = RELEASES[0];
  if (!latest) return null;
  const [first, ...rest] = latest.changes;

  return (
    <Link
      href="/updates"
      className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-black/[0.02]"
    >
      <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-foreground)]">
        {t("dashboard.updates.badge")}
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">
        <span className="font-medium">{first[locale].title}</span>
        {rest.length ? (
          <span className="text-muted"> {t("dashboard.updates.more", { count: String(rest.length) })}</span>
        ) : null}
        <span className="hidden text-muted sm:inline"> · {formatReleaseDate(latest.date, locale)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-muted">
        <span className="hidden sm:inline">{t("dashboard.updates.link")}</span>
        <ChevronRight size={15} aria-hidden="true" />
      </span>
    </Link>
  );
}

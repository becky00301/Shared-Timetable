"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { SURVEY_ENDS_AT, SURVEY_URL, surveyLink } from "@/lib/survey";

// A two-day user survey; everyone who answers gets a coffee voucher. It is in Korean, so the
// banner is shown to the Korean interface only, and it takes itself down when
// the window closes.

export function SurveyBanner({ signedIn }: { signedIn: boolean | null }) {
  const { locale } = useLocale();
  // Decided after mount: the page is prerendered, and the clock on the
  // server at build time is not the reader's.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(Date.now() < SURVEY_ENDS_AT);
  }, []);

  if (!open || !SURVEY_URL || signedIn !== true || locale !== "ko") return null;

  return (
    <a
      href={surveyLink("dashboard")}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.07] px-4 py-3 text-sm transition hover:bg-[var(--accent)]/[0.12]"
    >
      <span aria-hidden="true" className="text-lg leading-none">☕</span>
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-foreground [word-break:keep-all]">설문 참여하시는 모든 분께 아메리카노 한 잔 드려요!</span>
        <span className="block text-xs text-muted [word-break:keep-all] sm:inline sm:pl-2">약 1분 · 11/21(토)까지</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 font-medium text-[var(--accent)]">
        참여하기
        <ArrowUpRight size={15} aria-hidden="true" />
      </span>
    </a>
  );
}

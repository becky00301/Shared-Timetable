"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { markSurveyDone, surveyDone, SURVEY_ENDS_AT, SURVEY_URL, surveyLink } from "@/lib/survey";

const SHOW_AFTER_MS = 1000;

/**
 * The survey offer for people who open a timetable straight from a link and
 * never pass the dashboard banner. It waits a second so the timetable is
 * seen first, slides up from the bottom without covering it, and is offered
 * until the survey is opened on this device; there is no close button.
 */
export function SurveyNudge({ enabled }: { enabled: boolean }) {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!enabled || locale !== "ko" || !SURVEY_URL || Date.now() >= SURVEY_ENDS_AT || surveyDone()) return;
    const timer = window.setTimeout(() => {
      setMounted(true);
      // One frame at the start position, then the transition slides it in.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => setShown(true)));
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, locale]);

  if (!mounted) return null;

  function dismiss() {
    markSurveyDone();
    setShown(false);
    window.setTimeout(() => setMounted(false), 300);
  }

  return (
    <div
      role="status"
      className={`fixed inset-x-3 bottom-[76px] z-[45] mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-[var(--accent)]/25 bg-background/95 py-2 pl-3 pr-3 text-sm shadow-[0_10px_30px_-10px_oklch(0_0_0/30%)] backdrop-blur-md transition duration-300 ease-out motion-reduce:transition-none lg:bottom-5 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <span aria-hidden="true" className="text-base leading-none">☕</span>
      <a
        href={surveyLink("timetable")}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span className="min-w-0 flex-1 [word-break:keep-all]">
          <span className="font-semibold text-foreground">설문 참여하시는 모든 분께 아메리카노 한 잔 드려요!</span>
          <span className="block text-xs text-muted">약 1분 · 11/21(토)까지</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 font-medium text-[var(--accent)]">
          참여하기
          <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}

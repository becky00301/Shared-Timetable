"use client";

import Link from "next/link";
import { CalendarRange, MousePointerClick, Share2, Users } from "lucide-react";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { useLocale, useT } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";

const FEATURES: { icon: typeof Share2; title: MessageKey; body: MessageKey }[] = [
  { icon: MousePointerClick, title: "landing.feature.drag.title", body: "landing.feature.drag.body" },
  { icon: CalendarRange, title: "landing.feature.dates.title", body: "landing.feature.dates.body" },
  { icon: Users, title: "landing.feature.collab.title", body: "landing.feature.collab.body" },
  { icon: Share2, title: "landing.feature.share.title", body: "landing.feature.share.body" }
];

// Fixed positions so the starfield renders identically on server and client.
const DOTS = [
  [6, 18, 2], [14, 62, 1], [22, 30, 2], [31, 76, 1], [38, 12, 2], [44, 48, 1],
  [52, 84, 2], [58, 22, 1], [66, 58, 2], [72, 34, 1], [79, 72, 2], [86, 16, 1],
  [92, 46, 2], [9, 88, 1], [27, 8, 1], [48, 66, 1], [63, 90, 2], [83, 54, 1],
  [95, 80, 1], [17, 40, 1], [40, 92, 1], [70, 6, 1], [88, 34, 2], [3, 52, 1]
] as const;

export function LandingContent({ loggedIn }: { loggedIn: boolean }) {
  const t = useT();
  const appHref = loggedIn ? "/dashboard" : "/login";

  return (
    <main className="bg-background text-foreground">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#5c6fa0] via-[#8fa2ca] to-[#eef2f9]">
        {/* starfield */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {DOTS.map(([top, left, size], i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white/50"
              style={{ top: `${top}%`, left: `${left}%`, width: size, height: size }}
            />
          ))}
        </div>

        <div className="relative">
          <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
            <span className="flex items-center gap-1.5 text-lg font-semibold text-white">
              📅 PlanTogether
            </span>
            <nav className="flex items-center gap-2 sm:gap-3">
              <LocaleToggle className="border-white/30 bg-white/10 text-white backdrop-blur" />
              <Link
                href={appHref}
                className="hidden px-3 py-2 text-sm font-medium text-white/90 transition hover:text-white sm:block"
              >
                {loggedIn ? t("common.dashboard") : t("common.login")}
              </Link>
              <Link
                href={appHref}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2a3348] shadow-sm transition hover:bg-white/90"
              >
                {loggedIn ? t("landing.cta.mine") : t("common.signup")}
              </Link>
            </nav>
          </header>

          <div className="mx-auto max-w-3xl px-5 pb-20 pt-16 text-center sm:pt-24">
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-7xl">
              {t("landing.hero.line1")}
              <br />
              {t("landing.hero.line2")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              {t("landing.hero.body")}
            </p>
            <div className="mt-9 flex justify-center">
              <Link
                href={appHref}
                className="rounded-full bg-[#14161c] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              >
                {loggedIn ? t("landing.cta.mine") : t("landing.cta.start")}
              </Link>
            </div>

            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- features */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground">
                <feature.icon size={20} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{t(feature.title)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{t(feature.body)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------- footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 text-sm text-muted sm:flex-row">
          <span>© PlanTogether</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="transition hover:text-foreground">
              {t("common.privacy")}
            </Link>
            <Link href={appHref} className="transition hover:text-foreground">
              {loggedIn ? t("common.dashboard") : t("common.login")}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/** A soft, floating timetable preview — the landing's product visual. */
function HeroMockup() {
  const { locale } = useLocale();
  const ko = locale === "ko";
  const days = ko ? ["월", "화", "수"] : ["Mon", "Tue", "Wed"];
  const allDay = ko ? "종일" : "All-day";
  const blocks = [
    { col: 0, top: 14, height: 40, color: "#2383e2", label: ko ? "출발" : "Depart" },
    { col: 1, top: 30, height: 56, color: "#8b5cf6", label: ko ? "로마 구경" : "Rome tour" },
    { col: 2, top: 8, height: 32, color: "#22c55e", label: ko ? "체크인" : "Check-in" },
    { col: 2, top: 52, height: 44, color: "#f59e0b", label: ko ? "저녁" : "Dinner" }
  ];
  const chipA = ko ? "칼리아리" : "Cagliari";
  const chipB = ko ? "윤아랑" : "Meet Yuna";

  return (
    <div className="relative mx-auto mt-14 max-w-lg">
      {/* floating chips (above the card so they read as detached) */}
      <div className="absolute -left-5 -top-5 z-20 hidden rotate-[-6deg] rounded-xl bg-white px-3 py-2 shadow-xl sm:block">
        <p className="text-xs font-semibold text-[#2383e2]">{chipA}</p>
        <p className="text-[10px] text-neutral-400">{allDay}</p>
      </div>
      <div className="absolute -right-10 top-8 z-20 hidden rotate-[7deg] rounded-xl bg-white px-3 py-2 shadow-xl sm:block">
        <p className="text-xs font-semibold text-[#8b5cf6]">{chipB}</p>
        <p className="text-[10px] text-neutral-400">14:00</p>
      </div>

      {/* the timetable card */}
      <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-2xl">
        <div className="grid grid-cols-3 border-b border-neutral-100 bg-neutral-50/70 text-center text-xs font-medium text-neutral-500">
          {days.map((d) => (
            <div key={d} className="py-2.5">
              {d}
            </div>
          ))}
        </div>
        <div className="relative grid h-52 grid-cols-3">
          {[0, 1, 2].map((c) => (
            <div key={c} className="relative border-r border-neutral-100 last:border-r-0">
              {[0, 1, 2, 3, 4].map((r) => (
                <div key={r} className="h-[20%] border-b border-neutral-50 last:border-b-0" />
              ))}
            </div>
          ))}
          {blocks.map((b, i) => (
            <div
              key={i}
              className="absolute rounded-md px-1.5 py-1 text-[10px] font-semibold text-white shadow-sm"
              style={{
                left: `calc(${(b.col / 3) * 100}% + 4px)`,
                width: `calc(${100 / 3}% - 8px)`,
                top: `${b.top}%`,
                height: `${b.height}%`,
                backgroundColor: b.color
              }}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

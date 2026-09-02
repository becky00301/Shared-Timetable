"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  FileDown,
  ImageDown,
  MousePointer2,
  MousePointerClick,
  Share2,
  Sheet,
  Users
} from "lucide-react";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { useLocale, useT } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { useProjectStore } from "@/stores/project-store";

const FEATURES: { icon: typeof Share2; title: MessageKey; body: MessageKey }[] = [
  { icon: MousePointerClick, title: "landing.feature.drag.title", body: "landing.feature.drag.body" },
  { icon: CalendarRange, title: "landing.feature.dates.title", body: "landing.feature.dates.body" },
  { icon: Users, title: "landing.feature.collab.title", body: "landing.feature.collab.body" },
  { icon: Share2, title: "landing.feature.share.title", body: "landing.feature.share.body" }
];

const FEATURE_ACCENTS = [
  {
    card: "border-[#cfe0ff] bg-[#f7faff] hover:border-[#a9c6ff]",
    icon: "bg-[#dce9ff] text-[#2864cf]"
  },
  {
    card: "border-[#f4dfa0] bg-[#fffdf5] hover:border-[#ebc95f]",
    icon: "bg-[#fff0b8] text-[#9b5b00]"
  },
  {
    card: "border-[#bfe7d7] bg-[#f6fcf9] hover:border-[#83cfb4]",
    icon: "bg-[#d8f3e8] text-[#14765a]"
  },
  {
    card: "border-[#f4cbc5] bg-[#fff8f7] hover:border-[#e99a90]",
    icon: "bg-[#ffe1dc] text-[#bd493e]"
  }
] as const;

// Fixed positions so the starfield renders identically on server and client.
const DOTS = [
  [6, 18, 2], [14, 62, 1], [22, 30, 2], [31, 76, 1], [38, 12, 2], [44, 48, 1],
  [52, 84, 2], [58, 22, 1], [66, 58, 2], [72, 34, 1], [79, 72, 2], [86, 16, 1],
  [92, 46, 2], [9, 88, 1], [27, 8, 1], [48, 66, 1], [63, 90, 2], [83, 54, 1],
  [95, 80, 1], [17, 40, 1], [40, 92, 1], [70, 6, 1], [88, 34, 2], [3, 52, 1]
] as const;

export function LandingContent({ loggedIn }: { loggedIn: boolean }) {
  const t = useT();
  const router = useRouter();
  const appHref = loggedIn ? "/dashboard" : "/login";
  const finalBodySentences = t("landing.final.body").match(/[^.!?。！？]+[.!?。！？]+/g) ?? [
    t("landing.final.body")
  ];

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    // The store lives in memory across client-side navigations, so it has to be
    // cleared explicitly or the next page still renders the old account's data.
    useProjectStore.getState().reset();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="bg-[#fbfcff] text-foreground">
      {/* ---------------------------------------------------------------- hero */}
      {/* A clear blue carries the product's calendar identity, then softens into
          the page background so the timetable preview remains the focal point. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#315fe8] via-[#76a6ef] to-[#fbfcff]">
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
          <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-5 sm:px-5">
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-white sm:text-lg">
              Planner<span className="hidden min-[360px]:inline"> Together</span>
            </span>
            <nav className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <LocaleToggle className="border-white/30 bg-white/10 backdrop-blur" invert />
              {loggedIn ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="hidden px-3 py-2 text-white/90 transition hover:text-white sm:block"
                >
                  {/* `button { font: inherit }` in globals.css beats any
                      text-size utility on the button itself. */}
                  <span className="text-sm font-medium">{t("common.logout")}</span>
                </button>
              ) : (
                <Link
                  href={appHref}
                  className="hidden px-3 py-2 text-sm font-medium text-white/90 transition hover:text-white sm:block"
                >
                  {t("common.login")}
                </Link>
              )}
              <Link
                href={appHref}
                className="shrink-0 whitespace-nowrap rounded-full bg-[#fff1a8] px-3 py-2 text-xs font-semibold text-[#253353] shadow-sm transition hover:bg-[#ffe77a] sm:px-4 sm:text-sm"
              >
                {loggedIn ? t("landing.cta.mine") : t("common.signup")}
              </Link>
            </nav>
          </header>

          <div className="mx-auto max-w-3xl px-5 pb-20 pt-16 text-center sm:pt-24">
            <p className="mb-4 text-sm font-semibold tracking-[0.12em] text-white sm:text-base">
              {t("landing.hero.brand")}
            </p>
            {/* Pretendard at 800 turns Korean headlines into a wall of strokes;
                700 at a slightly smaller size stays emphatic and readable. */}
            <h1 className="text-[2.75rem] font-bold leading-[1.12] tracking-[-0.02em] text-white sm:text-6xl">
              {t("landing.hero.line1")}
              <br />
              {t("landing.hero.line2")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-white sm:text-lg">
              <span className="block">{t("landing.hero.body1")}</span>
              <span className="block">{t("landing.hero.body2")}</span>
            </p>
            <div className="mt-9 flex justify-center">
              <Link
                href={appHref}
                className="whitespace-nowrap rounded-full bg-[#ffd15c] px-7 py-3.5 text-sm font-semibold text-[#1d2944] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffc83d] hover:shadow-xl active:translate-y-0"
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
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("landing.how.eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("landing.how.title")}
          </h2>
        </div>

        {/* overview cards — the table of contents */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <a
              key={feature.title}
              href={`#feature-${i}`}
              className={cn(
                "rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-glow",
                FEATURE_ACCENTS[i].card
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  FEATURE_ACCENTS[i].icon
                )}
              >
                <feature.icon size={18} />
              </span>
              <h3 className="mt-3 font-semibold text-foreground">{t(feature.title)}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{t(feature.body)}</p>
            </a>
          ))}
        </div>

        {/* detailed sections with animated mockups */}
        <div className="mt-24 flex flex-col gap-24 sm:mt-32 sm:gap-32">
          <DetailSection id="feature-0" n={1} title={t("landing.feature.drag.title")} body={t("landing.detail.drag.body")}>
            <DragMockup />
          </DetailSection>
          <DetailSection id="feature-1" n={2} reverse title={t("landing.feature.dates.title")} body={t("landing.detail.dates.body")}>
            <DatesMockup />
          </DetailSection>
          <DetailSection id="feature-2" n={3} title={t("landing.feature.collab.title")} body={t("landing.detail.collab.body")}>
            <CollabMockup />
          </DetailSection>
          <DetailSection id="feature-3" n={4} reverse title={t("landing.feature.share.title")} body={t("landing.detail.share.body")}>
            <ShareMockup />
          </DetailSection>
        </div>
      </section>

      {/* ------------------------------------------------------------ final cta */}
      <section className="px-5 pb-20 sm:pb-28">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#315fe8] via-[#1f74ad] to-[#137563] px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* Same starfield as the hero, so the page closes where it opened. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {DOTS.map(([top, left, size], i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white/40"
                style={{ top: `${top}%`, left: `${left}%`, width: size, height: size }}
              />
            ))}
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("landing.final.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/85">
              {finalBodySentences.map((sentence) => (
                <span key={sentence} className="block sm:whitespace-nowrap">
                  {sentence.trim()}
                </span>
              ))}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={appHref}
                className="w-full whitespace-nowrap rounded-full bg-[#fff1a8] px-7 py-3.5 text-sm font-semibold text-[#253353] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffe77a] hover:shadow-xl active:translate-y-0 sm:w-auto"
              >
                {loggedIn ? t("landing.cta.mine") : t("landing.cta.start")}
              </Link>
              {loggedIn ? null : (
                <Link
                  href="/login"
                  className="w-full whitespace-nowrap rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                >
                  {t("landing.final.guest")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 text-sm text-muted sm:flex-row">
          <span>© Planner Together</span>
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

/** One feature: number + copy on one side, an animated mockup on the other. */
function DetailSection({
  id,
  n,
  title,
  body,
  reverse,
  children
}: {
  id: string;
  n: number;
  title: string;
  body: string;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        // Side-by-side from `tablet` up: stacking these until `lg` left the
        // 800-1023px range with a narrow centered mockup and wide empty
        // margins on both sides.
        "flex scroll-mt-24 flex-col gap-8 tablet:flex-row tablet:items-center tablet:gap-10 lg:gap-16",
        reverse && "tablet:flex-row-reverse"
      )}
    >
      <div className="flex-1">
        <span className="text-sm font-semibold text-muted">{`0${n}`}</span>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h3>
        <p className="mt-3 max-w-md text-base leading-7 text-muted">{body}</p>
      </div>
      <div className="flex-1">
        {/* Only capped while stacked — once the row kicks in, the flex column
            sizes it, which keeps the calendar's aspect-square cells sane. */}
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-glow tablet:mx-0 tablet:max-w-none tablet:p-5 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

const EASE = "cubic-bezier(0.23,1,0.32,1)";

/** 01 — drag to draw a schedule block down a column. */
function DragMockup() {
  const { locale } = useLocale();
  const label = locale === "ko" ? "저녁 식사" : "Dinner";
  return (
    <div className="relative h-44 overflow-hidden rounded-xl border border-neutral-100 bg-white">
      <div className="grid h-full grid-cols-3">
        {[0, 1, 2].map((c) => (
          <div key={c} className="border-r border-neutral-100 last:border-r-0">
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="h-1/4 border-b border-neutral-50 last:border-b-0" />
            ))}
          </div>
        ))}
      </div>
      <div className="absolute left-[37%] top-4 w-[26%]">
        <div
          className="flex h-24 origin-top items-start rounded-[4px] bg-[#7FA6DE] px-2 py-1.5 text-[11px] font-semibold text-[#111827] shadow-sm"
          style={{ animation: `lp-draw 4s ${EASE} infinite` }}
        >
          {label}
        </div>
      </div>
      <MousePointer2
        size={18}
        className="absolute left-[59%] top-4 fill-neutral-800 text-neutral-800 drop-shadow"
        style={{ animation: `lp-cursor-down 4s ${EASE} infinite` }}
      />
    </div>
  );
}

/** 02 — pick a date range on a mini calendar. */
function DatesMockup() {
  const { locale } = useLocale();
  const dows = locale === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["S", "M", "T", "W", "T", "F", "S"];
  const range = [16, 17, 18, 19, 20]; // grid indices to select in sequence
  const start = 3; // first cell shows day 1 at index 3
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-neutral-400">
        {dows.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: 35 }, (_, i) => {
          const day = i - start + 1;
          const show = day >= 1 && day <= 30;
          const sel = range.includes(i);
          return (
            <div key={i} className="relative flex aspect-square items-center justify-center">
              {sel ? (
                <span
                  className="absolute inset-0.5 rounded-md bg-[#7FA6DE]"
                  style={{ animation: `lp-cell-on 4s ${EASE} infinite`, animationDelay: `${range.indexOf(i) * 130}ms` }}
                />
              ) : null}
              <span className={cn("relative", sel ? "font-semibold text-white" : "text-neutral-500")}>
                {show ? day : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 03 — two collaborators editing the same grid live. */
function CollabMockup() {
  const { locale } = useLocale();
  const [meA, meB] = locale === "ko" ? ["민지", "나"] : ["Minji", "You"];
  const b1 = locale === "ko" ? "회의" : "Meeting";
  const b2 = locale === "ko" ? "점심" : "Lunch";
  return (
    <div className="relative h-44 overflow-hidden rounded-xl border border-neutral-100 bg-white">
      <div className="grid h-full grid-cols-3">
        {[0, 1, 2].map((c) => (
          <div key={c} className="border-r border-neutral-100 last:border-r-0">
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="h-1/4 border-b border-neutral-50 last:border-b-0" />
            ))}
          </div>
        ))}
      </div>
      {/* blocks the two people drop in */}
      <div
        className="absolute left-[6%] top-6 w-[26%] rounded-[4px] bg-[#DE9095] px-2 py-1 text-[11px] font-semibold text-[#111827] shadow-sm"
        style={{ height: 44, animation: `lp-pop 4s ${EASE} infinite`, animationDelay: "200ms" }}
      >
        {b1}
      </div>
      <div
        className="absolute left-[68%] top-16 w-[26%] rounded-[4px] bg-[#7FA6DE] px-2 py-1 text-[11px] font-semibold text-[#111827] shadow-sm"
        style={{ height: 44, animation: `lp-pop 4s ${EASE} infinite`, animationDelay: "1400ms" }}
      >
        {b2}
      </div>
      {/* live cursors */}
      <div className="absolute left-[10%] top-2" style={{ animation: `lp-cursor-a 4s ${EASE} infinite` }}>
        <MousePointer2 size={16} className="fill-[#E93D82] text-[#E93D82]" />
        <span className="ml-2 rounded bg-[#E93D82] px-1.5 py-0.5 text-[9px] font-medium text-white">{meA}</span>
      </div>
      <div className="absolute right-[10%] top-4" style={{ animation: `lp-cursor-b 4s ${EASE} infinite` }}>
        <MousePointer2 size={16} className="fill-[#0091FF] text-[#0091FF]" />
        <span className="ml-2 rounded bg-[#0091FF] px-1.5 py-0.5 text-[9px] font-medium text-white">{meB}</span>
      </div>
    </div>
  );
}

/** 04 — copy the link / export to a file. */
function ShareMockup() {
  const { locale } = useLocale();
  const ko = locale === "ko";
  const copy = ko ? "복사" : "Copy";
  const copied = ko ? "복사됨!" : "Copied!";
  const tiles = [
    { icon: ImageDown, label: "PNG" },
    { icon: FileDown, label: "PDF" },
    { icon: Sheet, label: ko ? "엑셀" : "Excel" }
  ];
  return (
    <div className="relative rounded-xl border border-neutral-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-400">
          plannertogether.app/invite/8f2a…
        </div>
        <span className="rounded-lg bg-[#14161c] px-3 py-2 text-xs font-medium text-white">{copy}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiles.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-lg bg-neutral-100 py-3 text-[11px] font-medium text-neutral-600"
          >
            <Icon size={18} className="text-neutral-500" />
            {label}
          </div>
        ))}
      </div>
      <div
        className="absolute right-4 top-12 rounded-md bg-[#30A46C] px-2 py-1 text-[10px] font-semibold text-white shadow-md"
        style={{ animation: `lp-copied 4s ${EASE} infinite` }}
      >
        {copied}
      </div>
    </div>
  );
}

/** A soft, floating timetable preview — the landing's product visual. */
/** One 9s loop shared by every cursor and block; each peer is offset within it
    so the three of them take turns rather than moving in unison. */
const HERO_LOOP = "9s";

function HeroMockup() {
  const { locale } = useLocale();
  const ko = locale === "ko";
  const days = ko ? ["월", "화", "수"] : ["Mon", "Tue", "Wed"];

  // The first block is already on the grid; the rest get drawn by a peer.
  // Cursors keep the bright identity colours the app assigns to people, while
  // the blocks they leave behind use the schedule palette — the same split the
  // real timetable has.
  const settled = { col: 0, top: 14, height: 40, color: "#7FA6DE", label: ko ? "출발" : "Depart" };
  const peers = [
    {
      name: ko ? "민지" : "Minji",
      color: "#8E4EC6",
      blockColor: "#DE9095",
      from: ["-70px", "-46px"],
      delay: "0s",
      block: { col: 1, top: 30, height: 56, label: ko ? "로마 구경" : "Rome tour" }
    },
    {
      name: ko ? "지훈" : "Alex",
      color: "#30A46C",
      blockColor: "#8FBF7E",
      from: ["84px", "-34px"],
      delay: "1.2s",
      block: { col: 2, top: 8, height: 32, label: ko ? "체크인" : "Check-in" }
    },
    {
      name: ko ? "나" : "Me",
      color: "#E2A400",
      blockColor: "#DCB05E",
      from: ["48px", "72px"],
      delay: "2.4s",
      block: { col: 2, top: 52, height: 44, label: ko ? "저녁" : "Dinner" }
    }
  ];

  const blockBox = (b: { col: number; top: number; height: number }) => ({
    left: `calc(${(b.col / 3) * 100}% + 4px)`,
    width: `calc(${100 / 3}% - 8px)`,
    top: `${b.top}%`,
    height: `${b.height}%`
  });

  return (
    <div className="relative mx-auto mt-14 max-w-lg">
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

          <div
            className="absolute rounded-[4px] px-1.5 py-1 text-[10px] font-semibold text-[#111827] shadow-sm"
            style={{ ...blockBox(settled), backgroundColor: settled.color }}
          >
            {settled.label}
          </div>

          {peers.map((peer) => (
            <div
              key={peer.name}
              className="absolute rounded-[4px] px-1.5 py-1 text-[10px] font-semibold text-[#111827] shadow-sm"
              style={{
                ...blockBox(peer.block),
                backgroundColor: peer.blockColor,
                animation: `hero-block ${HERO_LOOP} ease-out ${peer.delay} infinite`
              }}
            >
              {peer.block.label}
            </div>
          ))}

          {/* Cursors sit at the corner of the block they just drew. */}
          {peers.map((peer) => (
            <div
              key={peer.name}
              aria-hidden
              className="pointer-events-none absolute z-10 flex items-start gap-1"
              style={
                {
                  // Anchored inside the column, not on its edge, so the name
                  // label has room instead of being clipped by the card.
                  left: `calc(${((peer.block.col + 0.5) / 3) * 100}% - 8px)`,
                  // Capped so a cursor on a block that reaches the bottom of
                  // the grid isn't clipped by the card's overflow-hidden.
                  top: `${Math.min(peer.block.top + peer.block.height, 82)}%`,
                  "--from-x": peer.from[0],
                  "--from-y": peer.from[1],
                  animation: `hero-cursor ${HERO_LOOP} cubic-bezier(0.23, 1, 0.32, 1) ${peer.delay} infinite`
                } as React.CSSProperties
              }
            >
              <MousePointer2 size={15} className="shrink-0 drop-shadow" style={{ color: peer.color }} fill={peer.color} />
              {/* White ring keeps the label legible even when it lands on a
                  block of the same colour. */}
              <span
                className="whitespace-nowrap rounded-full border border-white/80 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: peer.color }}
              >
                {peer.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

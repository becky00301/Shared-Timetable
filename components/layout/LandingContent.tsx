"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown, FileDown, ImageDown, MousePointer2, Sheet } from "lucide-react";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { REVEAL_EASE, Reveal } from "@/components/ui/reveal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { getScheduleInkColor } from "@/lib/utils/schedule-colors";
import { useLocale, useT } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { useProjectStore } from "@/stores/project-store";

/** A use case, illustrated. The drawing carries the situation at a glance;
    the words underneath only have to add the detail it cannot show. */
type UseCase = { art: () => ReactElement; title: MessageKey; body: MessageKey };

// One flat ink for every silhouette, so six separate drawings read as one set.
// One flat ink for every silhouette and one tint behind every drawing, so six
// separate illustrations read as a single set. Fills only — no strokes.
const ART_INK = "#2F3847";
const ART_TINT = "#ECEEF1";

/** Shared frame: same canvas, same tinted panel behind every illustration. */
function CaseArt({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 200 110" aria-hidden className="h-auto w-full">
      <rect width="200" height="110" rx="14" fill={ART_TINT} />
      {children}
    </svg>
  );
}

/** The route and the weekly loop are both drawn as dots, so the two cards
    that need to show movement share one motif. */
const TRIP_TRAIL: [number, number, number][] = [
  [40, 80, 2],
  [57, 71, 2.4],
  [74, 62, 2.8],
  [91, 54, 3.1],
  [108, 47, 3.4]
];

function TripArt() {
  return (
    <CaseArt>
      <g fill="#FFFFFF">
        <ellipse cx="44" cy="30" rx="17" ry="9" />
        <ellipse cx="58" cy="27" rx="11" ry="7" />
        <ellipse cx="158" cy="84" rx="15" ry="8" />
      </g>
      <g fill="#7FA6DE">
        {TRIP_TRAIL.map(([cx, cy, r]) => (
          <circle key={cx} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g transform="translate(24 60)">
        <path d="M8 0A8 8 0 0 0 0 8c0 5.6 8 14 8 14s8-8.4 8-14A8 8 0 0 0 8 0Z" fill="#DE9095" />
        <circle cx="8" cy="8" r="3" fill={ART_TINT} />
      </g>
      <g transform="translate(130 18) rotate(-10)">
        <path d="M0 13 36 0 17 18Z" fill="#B9CFF0" />
        <path d="M17 18 36 0 24 28Z" fill="#3F5F94" />
      </g>
    </CaseArt>
  );
}

function RetreatArt() {
  return (
    <CaseArt>
      <path d="M0 86h200v10a14 14 0 0 1-14 14H14A14 14 0 0 1 0 96Z" fill="#C2DCB6" />
      <path d="M44 86 74 36l30 50Z" fill="#8FBF7E" />
      <path d="M74 36 86 86H62Z" fill="#4A7040" />
      {/* Campfire, with two people sat the way people sit at one. */}
      <g transform="translate(132 54)">
        <path d="M14 0c7 8 10 14 10 19a10 10 0 0 1-20 0c0-4 2-6 4-9 1 4 3 5 4 5-1-5 0-11 2-15Z" fill="#DCB05E" />
        <rect x="0" y="26" width="28" height="5" rx="2.5" fill={ART_INK} transform="rotate(-8 14 28)" />
        <rect x="0" y="26" width="28" height="5" rx="2.5" fill={ART_INK} transform="rotate(8 14 28)" />
      </g>
      <g fill={ART_INK}>
        <circle cx="112" cy="70" r="7" />
        <path d="M103 86a9 9 0 0 1 18 0Z" />
        <circle cx="176" cy="70" r="7" />
        <path d="M167 86a9 9 0 0 1 18 0Z" />
      </g>
    </CaseArt>
  );
}

/** Hung along the curve a string of bunting makes, so the flags still read as
    bunting now that the string itself is gone. */
const EVENT_FLAGS: [number, number, string][] = [
  [34, 22, "#DE9095"],
  [60, 27, "#EDD3A1"],
  [86, 30, "#8FBF7E"],
  [112, 30, "#7FA6DE"],
  [138, 27, "#EFC3C5"],
  [164, 22, "#DCB05E"]
];

function EventArt() {
  return (
    <CaseArt>
      {EVENT_FLAGS.map(([x, y, fill]) => (
        <path key={x} d={`M${x - 7} ${y}h14l-7 16Z`} fill={fill} />
      ))}
      {/* A booth: striped awning over an open counter. */}
      <g transform="translate(56 54)">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={i * 17.6}
            y="0"
            width="17.6"
            height="12"
            fill={i % 2 ? "#FFFFFF" : "#DE9095"}
          />
        ))}
        <rect x="0" y="12" width="88" height="32" fill="#FFFFFF" />
        <rect x="0" y="40" width="88" height="4" fill="#D8DCE2" />
      </g>
      <g fill={ART_INK}>
        <circle cx="32" cy="70" r="7" />
        <path d="M22 100V84a10 10 0 0 1 20 0v16Z" />
        <circle cx="168" cy="76" r="6.5" />
        <path d="M159 100V89a9 9 0 0 1 18 0v11Z" />
      </g>
    </CaseArt>
  );
}

function ClassArt() {
  return (
    <CaseArt>
      {/* A stack of books, widest at the bottom the way a stack settles. */}
      <rect x="46" y="76" width="108" height="14" rx="4" fill="#3F5F94" />
      <rect x="52" y="60" width="96" height="14" rx="4" fill="#DE9095" />
      <rect x="58" y="44" width="84" height="14" rx="4" fill="#DCB05E" />
      <g fill="#FFFFFF" opacity="0.6">
        <rect x="52" y="80" width="10" height="6" rx="2" />
        <rect x="58" y="64" width="10" height="6" rx="2" />
        <rect x="64" y="48" width="10" height="6" rx="2" />
      </g>
      <g transform="translate(150 26) rotate(28)">
        <rect x="0" y="0" width="9" height="34" fill="#EDD3A1" />
        <rect x="0" y="0" width="9" height="7" fill="#EFC3C5" />
        <path d="M0 34h9l-4.5 9Z" fill={ART_INK} />
      </g>
    </CaseArt>
  );
}

function HolidayArt() {
  return (
    <CaseArt>
      {/* Rays as tapered wedges rather than strokes, rotated around the sun. */}
      <g fill="#DCB05E">
        {[-62, -31, 0, 31, 62].map((angle) => (
          <path key={angle} d="M97 40h6l-3 -16Z" transform={`rotate(${angle} 100 72)`} />
        ))}
      </g>
      <circle cx="100" cy="72" r="26" fill="#DCB05E" />
      {/* The horizon the sun is still coming up over. */}
      <path d="M0 82h200v14a14 14 0 0 1-14 14H14A14 14 0 0 1 0 96Z" fill="#EDD3A1" />
      <g fill="#FFFFFF">
        <ellipse cx="40" cy="36" rx="15" ry="8" />
        <ellipse cx="52" cy="33" rx="10" ry="6" />
      </g>
    </CaseArt>
  );
}

/** Sixteen dots around the dumbbell: the same slot coming back every week. */
const ROUTINE_LOOP = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  return [100 + 46 * Math.sin(angle), 55 - 46 * Math.cos(angle)] as const;
});

function RoutineArt() {
  return (
    <CaseArt>
      <g fill="#6FBDB2">
        {ROUTINE_LOOP.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="2.6" />
        ))}
        <path d="M100 2l10 7-10 7Z" />
      </g>
      <g transform="translate(100 55)">
        <rect x="-18" y="-4" width="36" height="8" rx="4" fill={ART_INK} />
        <rect x="-30" y="-13" width="11" height="26" rx="4" fill="#2F6E68" />
        <rect x="19" y="-13" width="11" height="26" rx="4" fill="#2F6E68" />
        <rect x="-38" y="-7.5" width="8" height="15" rx="3" fill={ART_INK} />
        <rect x="30" y="-7.5" width="8" height="15" rx="3" fill={ART_INK} />
      </g>
    </CaseArt>
  );
}

/** The feature grid. Uneven spans and a tint per family, each panel showing
    the thing it describes rather than an icon standing in for it. */
const BENTO: {
  title: MessageKey;
  body: MessageKey;
  span: string;
  tint: string;
  /** Full-width panels read better with the copy beside the picture than
      stacked above it. */
  wide?: boolean;
  Mockup: () => ReactElement;
}[] = [
  {
    title: "landing.feature.drag.title",
    body: "landing.detail.drag.body",
    span: "lg:col-span-4",
    tint: "bg-[#F5F8FC]",
    Mockup: DragMockup
  },
  {
    title: "landing.feature.dates.title",
    body: "landing.feature.dates.body",
    span: "lg:col-span-2",
    tint: "bg-[#FCFAF4]",
    Mockup: DatesMockup
  },
  {
    title: "landing.feature.share.title",
    body: "landing.feature.share.body",
    span: "lg:col-span-2",
    tint: "bg-[#FDF7F7]",
    Mockup: ShareMockup
  },
  {
    title: "landing.feature.collab.title",
    body: "landing.detail.collab.body",
    span: "lg:col-span-4",
    tint: "bg-[#F4FAF9]",
    Mockup: CollabMockup
  },
  {
    title: "landing.feature.chat.title",
    body: "landing.feature.chat.body",
    span: "lg:col-span-6",
    tint: "bg-[#FBF6F7]",
    wide: true,
    Mockup: CursorChatMockup
  }
];

const FAQ: [MessageKey, MessageKey][] = [
  ["landing.faq.q1", "landing.faq.a1"],
  ["landing.faq.q2", "landing.faq.a2"],
  ["landing.faq.q3", "landing.faq.a3"],
  ["landing.faq.q4", "landing.faq.a4"],
  ["landing.faq.q5", "landing.faq.a5"]
];

/** Two groups, one per timetable kind, so a reader lands on the mode that
    fits them before the create dialog ever asks. */
const USE_CASE_GROUPS: { label: MessageKey; cases: UseCase[] }[] = [
  {
    label: "landing.cases.rangeLabel",
    cases: [
      { art: TripArt, title: "landing.cases.trip.title", body: "landing.cases.trip.body" },
      { art: RetreatArt, title: "landing.cases.mt.title", body: "landing.cases.mt.body" },
      { art: EventArt, title: "landing.cases.event.title", body: "landing.cases.event.body" }
    ]
  },
  {
    label: "landing.cases.weeklyLabel",
    cases: [
      { art: ClassArt, title: "landing.cases.school.title", body: "landing.cases.school.body" },
      { art: HolidayArt, title: "landing.cases.vacation.title", body: "landing.cases.vacation.body" },
      { art: RoutineArt, title: "landing.cases.routine.title", body: "landing.cases.routine.body" }
    ]
  }
];


// Fixed positions so the starfield renders identically on server and client.
export function LandingContent({ loggedIn }: { loggedIn: boolean }) {
  const t = useT();
  // Honoured by hand here rather than only in Reveal, because these cards
  // animate inline instead of being wrapped.
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  // Signed out visitors land in the dashboard too: it asks for an account
  // at the point they try to make something, not at the door.
  const appHref = "/dashboard";

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
    <main className="bg-white text-foreground">
      {/* ----------------------------------------------------------------- nav */}
      {/* Floats over the page rather than sitting in a bar, so the hero starts
          at the top of the window instead of under a strip of chrome. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <nav className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-full bg-[#15181E] py-2 pl-5 pr-2 text-sm text-white/75 shadow-[0_8px_30px_oklch(0_0_0/18%)]">
          <Link href="/" className="shrink-0 font-semibold text-white">
            Planner<span className="hidden sm:inline"> Together</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="whitespace-nowrap transition hover:text-white">
              {t("landing.nav.features")}
            </a>
            <a href="#cases" className="whitespace-nowrap transition hover:text-white">
              {t("landing.nav.cases")}
            </a>
            <a href="#faq" className="whitespace-nowrap transition hover:text-white">
              {t("landing.nav.faq")}
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LocaleToggle className="border-white/20 bg-white/10" invert />
            {loggedIn ? (
              <button type="button" onClick={signOut} className="hidden px-2 transition hover:text-white sm:block">
                <span className="text-sm">{t("common.logout")}</span>
              </button>
            ) : null}
            <Link
              href={appHref}
              className="whitespace-nowrap rounded-full bg-[#FFC94F] px-4 py-2 text-xs font-semibold text-[#2F3847] transition hover:bg-[#FFB92E] sm:text-sm"
            >
              {loggedIn ? t("landing.cta.mine") : t("landing.nav.start")}
            </Link>
          </div>
        </nav>
      </div>

      {/* ---------------------------------------------------------------- hero */}
      {/* White, so the only colour on screen is the timetable itself. */}
      <section className="relative overflow-hidden px-5 pt-32 sm:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-[0.12em] text-muted">{t("landing.hero.brand")}</p>
          {/* Grey line, then black: the sentence lands on the second half.
              Tracking stays at -0.02em — Korean letterforms run together at
              the tighter settings Latin display type can take. */}
          <h1 className="mt-5 text-[2.75rem] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-6xl">
            <span className="block text-[#A2A9B4]">{t("landing.hero.line1")}</span>
            <span className="block text-[#101317]">{t("landing.hero.line2")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
            <span className="block">{t("landing.hero.body1")}</span>
            <span className="block">{t("landing.hero.body2")}</span>
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={appHref}
              className="w-full whitespace-nowrap rounded-full bg-[#FFC94F] px-7 py-3.5 text-sm font-semibold text-[#2F3847] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#FFB92E] active:translate-y-0 sm:w-auto"
            >
              {loggedIn ? t("landing.cta.mine") : t("landing.cta.start")}
            </Link>
            {loggedIn ? null : (
              <Link
                href="/login"
                className="w-full whitespace-nowrap rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition hover:bg-black/[0.03] sm:w-auto"
              >
                {t("landing.final.login")}
              </Link>
            )}
          </div>
        </div>

        {/* Tilted and running off the bottom edge, so the page reads as a
            window onto the product rather than a brochure of it. */}
        <div className="relative mx-auto mt-16 max-w-xl">
          <div className="origin-top -rotate-[1.5deg]">
            <HeroMockup />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white"
          />
        </div>
      </section>

      {/* ----------------------------------------------------------- statement */}
      <section className="px-5 py-24 sm:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t("landing.statement.eyebrow")}
          </p>
          <p className="mt-6 text-2xl font-semibold leading-[1.5] tracking-[-0.015em] sm:text-[1.75rem]">
            <span className="text-[#A2A9B4]">{t("landing.statement.problem")}</span>{" "}
            <span className="text-[#101317]">{t("landing.statement.answer")}</span>
          </p>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------- features */}
      <section id="features" className="scroll-mt-24 px-5 pb-24 sm:pb-32">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("landing.how.eyebrow")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
              {t("landing.how.title")}
            </h2>
          </Reveal>

          {/* Uneven on purpose: equal cards read as a spec sheet. */}
          <div className="mt-12 grid gap-4 lg:grid-cols-6">
            {BENTO.map((panel, i) => (
              <motion.div
                key={panel.title}
                className={cn(
                  "flex flex-col overflow-hidden rounded-3xl border border-border p-6",
                  panel.span,
                  panel.tint
                )}
                initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: REVEAL_EASE }}
              >
                {panel.wide ? (
                  <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{t(panel.title)}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{t(panel.body)}</p>
                    </div>
                    <panel.Mockup />
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-foreground">{t(panel.title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{t(panel.body)}</p>
                    <div className="mt-6 flex-1">
                      <panel.Mockup />
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ use cases */}
      <section id="cases" className="scroll-mt-24 border-t border-border px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">
              {t("landing.cases.eyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
              {t("landing.cases.title")}
            </h2>
          </Reveal>

          <div className="mt-12 flex flex-col gap-10">
            {USE_CASE_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3">
                  <h3 className="shrink-0 text-sm font-semibold text-foreground">{t(group.label)}</h3>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {group.cases.map((useCase, index) => (
                    <motion.div
                      key={useCase.title}
                      className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-glow"
                      initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.45, delay: index * 0.07, ease: REVEAL_EASE }}
                      whileHover={reduceMotion ? undefined : { y: -4 }}
                    >
                      <useCase.art />
                      <h4 className="mt-4 font-semibold text-foreground">{t(useCase.title)}</h4>
                      <p className="mt-1.5 text-sm leading-6 text-muted">{t(useCase.body)}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ faq */}
      <section id="faq" className="scroll-mt-24 border-t border-border px-5 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("landing.faq.eyebrow")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
              {t("landing.faq.title")}
            </h2>
          </Reveal>
          {/* <details> so a question can be opened before the page has
              hydrated, and so the browser's own find-in-page reaches it. */}
          <div className="mt-12 border-t border-border">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group border-b border-border py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  {t(question)}
                  <ChevronDown
                    size={18}
                    aria-hidden
                    className="shrink-0 text-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 pr-8 text-sm leading-7 text-muted">{t(answer)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ final cta */}
      <section className="px-5 pb-24 sm:pb-32">
        <Reveal className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#15181E] px-6 py-16 text-center sm:px-12 sm:py-20">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
            {t("landing.final.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/70">{t("landing.final.body")}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={appHref}
              className="w-full whitespace-nowrap rounded-full bg-[#FFC94F] px-7 py-3.5 text-sm font-semibold text-[#2F3847] transition hover:-translate-y-0.5 hover:bg-[#FFB92E] active:translate-y-0 sm:w-auto"
            >
              {loggedIn ? t("landing.cta.mine") : t("landing.cta.start")}
            </Link>
            {loggedIn ? null : (
              <Link
                href="/login"
                className="w-full whitespace-nowrap rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                {t("landing.final.login")}
              </Link>
            )}
          </div>
        </Reveal>
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

const EASE = "cubic-bezier(0.23,1,0.32,1)";

/** 01 — drag to draw a schedule block down a column. */
function DragMockup() {
  const { locale } = useLocale();
  const label = locale === "ko" ? "저녁 식사" : "Dinner";
  return (
    <div className="relative h-44 overflow-hidden rounded-xl border border-[#ECEEF1] bg-white">
      <div className="grid h-full grid-cols-3">
        {[0, 1, 2].map((c) => (
          <div key={c} className="border-r border-[#ECEEF1] last:border-r-0">
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="h-1/4 border-b border-[#F3F5F7] last:border-b-0" />
            ))}
          </div>
        ))}
      </div>
      <div className="absolute left-[37%] top-4 w-[26%]">
        <div
          className="flex h-24 origin-top items-start rounded-[4px] bg-[#B9CFF0] px-2 py-1.5 text-[11px] font-semibold shadow-sm"
          style={{ color: getScheduleInkColor("#B9CFF0"), animation: `lp-draw 4s ${EASE} infinite` }}
        >
          {label}
        </div>
      </div>
      <MousePointer2
        size={18}
        className="absolute left-[59%] top-4 fill-[#2F3847] text-[#2F3847] drop-shadow"
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
    <div className="rounded-xl border border-[#ECEEF1] bg-white p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-[#8A919E]">
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
              <span className={cn("relative", sel ? "font-semibold text-white" : "text-[#59616F]")}>
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
    <div className="relative h-44 overflow-hidden rounded-xl border border-[#ECEEF1] bg-white">
      <div className="grid h-full grid-cols-3">
        {[0, 1, 2].map((c) => (
          <div key={c} className="border-r border-[#ECEEF1] last:border-r-0">
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="h-1/4 border-b border-[#F3F5F7] last:border-b-0" />
            ))}
          </div>
        ))}
      </div>
      {/* blocks the two people drop in */}
      <div
        className="absolute left-[6%] top-6 w-[26%] rounded-[4px] bg-[#EFC3C5] px-2 py-1 text-[11px] font-semibold shadow-sm"
        style={{
          color: getScheduleInkColor("#EFC3C5"),
          height: 44,
          animation: `lp-pop 4s ${EASE} infinite`,
          animationDelay: "200ms"
        }}
      >
        {b1}
      </div>
      <div
        className="absolute left-[68%] top-16 w-[26%] rounded-[4px] bg-[#B9CFF0] px-2 py-1 text-[11px] font-semibold shadow-sm"
        style={{
          color: getScheduleInkColor("#B9CFF0"),
          height: 44,
          animation: `lp-pop 4s ${EASE} infinite`,
          animationDelay: "1400ms"
        }}
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
    <div className="relative rounded-xl border border-[#ECEEF1] bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate rounded-lg border border-[#E1E3E7] bg-[#F7F8F9] px-3 py-2 text-[11px] text-[#8A919E]">
          plannertogether.app/invite/8f2a…
        </div>
        <span className="rounded-lg bg-[#2F3847] px-3 py-2 text-xs font-medium text-white">{copy}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiles.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-lg bg-[#ECEEF1] py-3 text-[11px] font-medium text-[#59616F]"
          >
            <Icon size={18} className="text-[#59616F]" />
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
/** Keycap, then the line it opens. Wide and horizontal, because this panel
    runs the full width of the grid. */
function CursorChatMockup() {
  const { locale } = useLocale();
  const ko = locale === "ko";
  const said = ko ? "이때 출발할까?" : "Leave around then?";
  const hint = ko ? "누르면" : "opens";

  return (
    <div className="relative flex h-40 items-center justify-center gap-5 overflow-hidden rounded-xl border border-[#ECEEF1] bg-white px-5">
      <div aria-hidden className="absolute inset-0 grid grid-cols-4">
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className="border-r border-[#F3F5F7] last:border-r-0" />
        ))}
      </div>
      <kbd className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#E1E3E7] bg-[#F7F8F9] text-xl font-semibold text-[#2F3847] shadow-[0_2px_0_#E1E3E7]">
        /
      </kbd>
      <span className="relative shrink-0 text-xs text-[#8A919E]">{hint}</span>
      <div className="relative flex shrink-0 items-start">
        <MousePointer2 size={18} className="fill-[#E93D82] text-[#E93D82]" />
        <span className="ml-2 whitespace-nowrap rounded-full bg-[#E93D82] px-3 py-1 text-[11px] text-white">
          {said}
        </span>
      </div>
    </div>
  );
}

const HERO_LOOP = "9s";
const HERO_HOURS = ["09", "11", "13", "15", "17"];

function HeroMockup() {
  const { locale } = useLocale();
  const ko = locale === "ko";
  const days = ko ? ["월", "화", "수"] : ["Mon", "Tue", "Wed"];

  // The first block is already on the grid; the rest get drawn by a peer.
  // Cursors keep the bright identity colours the app assigns to people, while
  // the blocks they leave behind use the schedule palette — the same split the
  // real timetable has.
  const settled = { col: 0, top: 14, height: 40, color: "#B9CFF0", label: ko ? "출발" : "Depart" };
  const peers = [
    {
      name: ko ? "민지" : "Minji",
      color: "#8E4EC6",
      blockColor: "#EFC3C5",
      from: ["-70px", "-46px"],
      delay: "0s",
      block: { col: 1, top: 30, height: 56, label: ko ? "로마 구경" : "Rome tour" }
    },
    {
      name: ko ? "지훈" : "Alex",
      color: "#30A46C",
      blockColor: "#C2DCB6",
      from: ["84px", "-34px"],
      delay: "1.2s",
      block: { col: 2, top: 8, height: 32, label: ko ? "체크인" : "Check-in" }
    },
    {
      name: ko ? "나" : "Me",
      color: "#E2A400",
      blockColor: "#EDD3A1",
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
    <div className="relative mx-auto max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-[#E1E3E7] bg-white text-left shadow-xl">
        {/* Two columns, four cells: the hour gutter and the day header share
            their row heights with the grid instead of being pinned to a
            hand-measured offset. */}
        <div className="grid" style={{ gridTemplateColumns: "2.25rem 1fr" }}>
          <div className="border-b border-r border-[#ECEEF1] bg-[#ECEEF1]" />
          <div className="grid grid-cols-3 border-b border-[#ECEEF1] bg-[#ECEEF1] text-center text-xs font-medium text-[#59616F]">
            {days.map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* The hours are what make this read as a timetable rather than three
              columns of coloured boxes. */}
          <div className="h-52 border-r border-[#ECEEF1]">
            {HERO_HOURS.map((hour) => (
              <div
                key={hour}
                className="flex h-[20%] items-start justify-end pr-1.5 pt-1 text-[9px] font-medium tabular-nums text-[#8A919E]"
              >
                {hour}
              </div>
            ))}
          </div>

          <div className="relative grid h-52 grid-cols-3">
            {[0, 1, 2].map((c) => (
              <div key={c} className="relative border-r border-[#ECEEF1] last:border-r-0">
                {[0, 1, 2, 3, 4].map((r) => (
                  <div key={r} className="h-[20%] border-b border-[#F3F5F7] last:border-b-0" />
                ))}
              </div>
            ))}

          <div
              className="absolute rounded-[4px] px-1.5 py-1 text-[10px] font-semibold shadow-sm"
              style={{
                ...blockBox(settled),
                backgroundColor: settled.color,
                color: getScheduleInkColor(settled.color)
              }}
            >
              {settled.label}
            </div>

            {peers.map((peer) => (
              <div
                key={peer.name}
                className="absolute rounded-[4px] px-1.5 py-1 text-[10px] font-semibold shadow-sm"
                style={{
                  ...blockBox(peer.block),
                  backgroundColor: peer.blockColor,
                  color: getScheduleInkColor(peer.blockColor),
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
    </div>
  );
}

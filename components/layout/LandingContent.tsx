"use client";

import Link from "next/link";
import { CalendarRange, MousePointerClick, Share2, Users } from "lucide-react";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { useT } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";

const FEATURES: { icon: typeof Share2; title: MessageKey; body: MessageKey }[] = [
  { icon: MousePointerClick, title: "landing.feature.drag.title", body: "landing.feature.drag.body" },
  { icon: CalendarRange, title: "landing.feature.dates.title", body: "landing.feature.dates.body" },
  { icon: Users, title: "landing.feature.collab.title", body: "landing.feature.collab.body" },
  { icon: Share2, title: "landing.feature.share.title", body: "landing.feature.share.body" }
];

export function LandingContent({ loggedIn }: { loggedIn: boolean }) {
  const t = useT();
  const appHref = loggedIn ? "/dashboard" : "/login";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <span className="text-lg font-semibold">📅 PlanTogether</span>
        <nav className="flex items-center gap-2">
          <LocaleToggle />
          <Link
            href={appHref}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            {loggedIn ? t("common.dashboard") : t("common.login")}
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {t("landing.hero.line1")}
          <br className="sm:hidden" /> {t("landing.hero.line2")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
          {t("landing.hero.body")}
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href={appHref}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
          >
            {loggedIn ? t("landing.cta.mine") : t("landing.cta.start")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
              <feature.icon className="text-primary" size={22} />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{t(feature.title)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{t(feature.body)}</p>
            </div>
          ))}
        </div>
      </section>

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

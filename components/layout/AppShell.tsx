"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";
import { isEmailLessNaverAccount, naverAccountLabel } from "@/lib/auth/social-account";
import type { User } from "@supabase/supabase-js";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState<{ email: string | null; isGuest: boolean; isNaver: boolean; id: string } | null>(null);
  const supabase = createSupabaseBrowserClient();
  const signedIn = Boolean(user);
  const label = user?.isGuest ? t("guest.badge") : user?.email ||
    (user?.isNaver ? naverAccountLabel(user.id) : t("account.page.title"));

  useEffect(() => {
    if (!supabase) return;
    const read = (u: User | null) => u ? {
      email: u.email ?? null, isGuest: Boolean(u.is_anonymous),
      isNaver: isEmailLessNaverAccount(u), id: u.id
    } : null;
    supabase.auth.getUser().then(({ data }) => setUser(read(data.user)));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(read(session?.user ?? null));
    });
    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    // The store lives in memory across client-side navigations, so it has to be
    // cleared explicitly or the next page still renders the old account's data.
    useProjectStore.getState().reset();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          {/* Same lockup as the landing nav — plain wordmark, no tile — so the
              two headers read as the same product in different clothes. */}
          <Link href="/" className="shrink-0 whitespace-nowrap font-semibold text-foreground">
            Planner<span className="hidden sm:inline"> Together</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            {/* Guests are a single-timetable trial with no dashboard. */}
            {user?.isGuest ? null : (
              <Link href="/dashboard" className="transition hover:text-foreground">
                {t("common.dashboard")}
              </Link>
            )}
            {!signedIn ? (
              <Link href="/login" className="transition hover:text-foreground">
                {t("common.login")}
              </Link>
            ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <LocaleToggle />
            {signedIn ? (
              <>
                {user?.isGuest ? (
                  <span className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-2 py-1">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-blue-700">
                      {label?.slice(0, 1)}
                    </span>
                    <span className="hidden max-w-40 truncate text-sm text-muted sm:block" title={label ?? undefined}>
                      {label}
                    </span>
                  </span>
                ) : (
                  <Link
                    href="/account"
                    aria-label={t("account.page.open")}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 transition hover:border-primary/40 hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-blue-700">
                      {label?.slice(0, 1)}
                    </span>
                    <span className="hidden max-w-40 truncate text-sm text-muted sm:block" title={label ?? undefined}>
                      {label}
                    </span>
                  </Link>
                )}
                <Button size="sm" variant="outline" onClick={signOut}>
                  {t("common.logout")}
                </Button>
              </>
            ) : (
              // A signed-out visitor is already inside the app — the dashboard
              // is the only page they can reach — so the action here is the
              // account, not another way in.
              <Button asChild size="sm">
                <Link href="/login?mode=signup&next=%2Fdashboard">{t("common.signup")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

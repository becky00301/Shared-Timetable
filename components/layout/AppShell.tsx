"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const signedIn = Boolean(email);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
              <CalendarClock size={18} />
            </span>
            Planner Together
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="/dashboard" className="transition hover:text-foreground">
              {t("common.dashboard")}
            </Link>
            {!signedIn ? (
              <Link href="/login" className="transition hover:text-foreground">
                {t("common.login")}
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            {signedIn ? (
              <>
                <span className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-blue-700">
                    {email?.slice(0, 1)}
                  </span>
                  <span className="hidden max-w-40 truncate text-sm text-muted sm:block" title={email ?? undefined}>
                    {email}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={signOut}>
                  {t("common.logout")}
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/dashboard">{t("common.openApp")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

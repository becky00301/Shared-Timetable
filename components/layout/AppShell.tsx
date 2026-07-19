"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
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
            PlanTogether
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="/dashboard" className="transition hover:text-foreground">
              대시보드
            </Link>
            {!signedIn ? (
              <Link href="/login" className="transition hover:text-foreground">
                로그인
              </Link>
            ) : null}
          </nav>
          {signedIn ? (
            <Button size="sm" variant="outline" onClick={signOut}>
              로그아웃
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/dashboard">앱 열기</Link>
            </Button>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

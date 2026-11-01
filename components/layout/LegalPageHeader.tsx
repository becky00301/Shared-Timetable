"use client";

import { useRouter } from "next/navigation";
import { LocaleToggle } from "@/components/layout/LocaleToggle";

export function LegalPageHeader({ backLabel }: { backLabel: string }) {
  const router = useRouter();

  // A real back, not a link home. Sign-up opens these pages in a new tab,
  // which has nothing to go back to; closing that tab is the way back to the
  // form (a browser allows it for a tab with a single page). If the tab
  // can't be closed, home is the only place left to go.
  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    window.close();
    window.setTimeout(() => {
      if (!window.closed) router.push("/");
    }, 150);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-11 items-center text-sm text-muted transition hover:text-foreground"
        >
          {backLabel}
        </button>
        <LocaleToggle />
      </div>
    </header>
  );
}

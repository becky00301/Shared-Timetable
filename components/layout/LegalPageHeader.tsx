"use client";

import Link from "next/link";
import { LocaleToggle } from "@/components/layout/LocaleToggle";

export function LegalPageHeader({ backLabel }: { backLabel: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm text-muted transition hover:text-foreground"
        >
          {backLabel}
        </Link>
        <LocaleToggle />
      </div>
    </header>
  );
}

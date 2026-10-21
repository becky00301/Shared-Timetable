"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { REVEAL_EASE } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";

/**
 * The shell every front-door page sits in: log in, sign up, password reset,
 * invite. These are the pages closest to the landing, so they carry its
 * surface — white behind, a soft wide-radius card, no heavy glow.
 *
 * The working surfaces (the timetable, the dashboard list) deliberately do not
 * use this: a tool wants density, not a centred marketing card.
 */
export function AuthShell({
  children,
  wide = false,
  className
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12">
      <motion.div
        initial={reduced ? undefined : { opacity: 0, y: 12 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: REVEAL_EASE }}
        className={cn(
          "w-full rounded-2xl border border-border bg-white p-7 shadow-[0_10px_40px_oklch(0_0_0/6%)] sm:p-8",
          wide ? "max-w-lg" : "max-w-md",
          className
        )}
      >
        {children}
      </motion.div>
    </main>
  );
}

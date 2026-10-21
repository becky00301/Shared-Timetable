"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** The easing the landing's own mockups already animate on, so a section
    arriving matches the motion inside it. */
export const REVEAL_EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Fades a section up as it comes into view, once.
 *
 * Someone who has asked their system to reduce motion gets the content
 * outright — not a slower version of the same movement.
 */
export function Reveal({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      // `once` so scrolling back up doesn't replay it, and a low amount so a
      // tall card starts arriving as soon as its top edge shows.
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: REVEAL_EASE }}
    >
      {children}
    </motion.div>
  );
}

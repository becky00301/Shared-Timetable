"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type LiveCursor = {
  userId: string;
  name: string;
  color: string;
  /** Position as a fraction of the grid's content box, so it lands on the same
      cell for everyone regardless of window size or scroll offset. */
  x: number;
  y: number;
  at: number;
};

type CursorPayload = Omit<LiveCursor, "at">;

const SEND_INTERVAL_MS = 60;
const STALE_AFTER_MS = 8000;

const CURSOR_COLORS = [
  "#E5484D",
  "#F76B15",
  "#F5D90A",
  "#30A46C",
  "#0091FF",
  "#8E4EC6",
  "#E93D82"
];

export function cursorColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/**
 * Broadcasts this user's pointer position over the project's realtime channel
 * and returns everyone else's. Positions are relative to `contentRef`, which
 * should wrap the whole scrollable grid content.
 */
export function useLiveCursors({
  projectId,
  userId,
  name,
  contentRef
}: {
  projectId: string;
  userId: string | null;
  name: string;
  contentRef: RefObject<HTMLElement | null>;
}) {
  const [cursors, setCursors] = useState<LiveCursor[]>([]);
  // Keep the label out of the effect deps: it arrives a beat after the user id
  // and would otherwise tear down and rebuild the channel.
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !projectId || !userId) return;

    const channel = supabase.channel(`cursors:${projectId}`, {
      config: { broadcast: { self: false } }
    });

    channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
      const cursor = payload as CursorPayload;
      if (!cursor?.userId || cursor.userId === userId) return;
      setCursors((prev) => [
        ...prev.filter((item) => item.userId !== cursor.userId),
        { ...cursor, at: Date.now() }
      ]);
    });

    channel.on("broadcast", { event: "cursor-leave" }, ({ payload }) => {
      const leavingId = (payload as { userId?: string })?.userId;
      if (!leavingId) return;
      setCursors((prev) => prev.filter((item) => item.userId !== leavingId));
    });

    channel.subscribe();

    const color = cursorColor(userId);
    let pending: { x: number; y: number } | null = null;
    let lastSent: { x: number; y: number } | null = null;

    const onPointerMove = (event: PointerEvent) => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      // Outside the grid: treat it as having left rather than pinning the
      // cursor to the nearest edge.
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        pending = null;
        return;
      }
      pending = { x, y };
    };

    const onPointerLeave = () => {
      pending = null;
      lastSent = null;
      channel.send({ type: "broadcast", event: "cursor-leave", payload: { userId } });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    const sendTimer = window.setInterval(() => {
      if (!pending) return;
      if (lastSent && lastSent.x === pending.x && lastSent.y === pending.y) return;
      lastSent = pending;
      channel.send({
        type: "broadcast",
        event: "cursor",
        payload: { userId, name: nameRef.current, color, x: pending.x, y: pending.y }
      });
    }, SEND_INTERVAL_MS);

    // Drop cursors from people who closed the tab without a clean leave.
    const pruneTimer = window.setInterval(() => {
      const cutoff = Date.now() - STALE_AFTER_MS;
      setCursors((prev) => (prev.some((item) => item.at < cutoff) ? prev.filter((item) => item.at >= cutoff) : prev));
    }, 2000);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.clearInterval(sendTimer);
      window.clearInterval(pruneTimer);
      channel.send({ type: "broadcast", event: "cursor-leave", payload: { userId } });
      supabase.removeChannel(channel);
      setCursors([]);
    };
  }, [projectId, userId, contentRef]);

  return cursors;
}

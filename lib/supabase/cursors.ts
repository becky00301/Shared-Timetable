"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type LiveCursor = {
  userId: string;
  name: string;
  color: string;
  /** What this person is typing right now, shown beside their pointer. Empty
      or absent means they have no cursor chat open. */
  chat?: string;
  /** Position as a fraction of the grid's content box, so it lands on the same
      cell for everyone regardless of window size, zoom, or scroll offset. */
  x: number;
  y: number;
  at: number;
};

type CursorPayload = Omit<LiveCursor, "at">;

/** A block someone is dragging out but hasn't named/saved yet. */
export type PeerDraft = {
  userId: string;
  name: string;
  color: string;
  dayId: string;
  startMinutes: number;
  endMinutes: number;
  at: number;
};

/** What the local grid reports about its own in-progress drag. */
export type LocalDraft = { dayId: string; startMinutes: number; endMinutes: number } | null;

type DraftPayload = Omit<PeerDraft, "at"> | { userId: string; clear: true };

const SEND_INTERVAL_MS = 60;
const STALE_AFTER_MS = 8000;
// Re-announce an open draft well inside STALE_AFTER_MS: while someone types a
// name their pointer stops, so without this their block would be pruned.
const DRAFT_HEARTBEAT_MS = 2500;

/** A line beside a pointer, not a paragraph. */
export const MAX_CURSOR_CHAT = 120;

const CURSOR_COLORS = ["#E5484D", "#F76B15", "#E2A400", "#30A46C", "#0091FF", "#8E4EC6", "#E93D82"];

export function cursorColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/**
 * Broadcasts this user's pointer position and in-progress draft block over the
 * project's realtime channel, and returns everyone else's.
 *
 * Sends are held until the channel reports SUBSCRIBED — Supabase drops
 * broadcasts published on a channel that hasn't finished joining.
 */
export function useLiveCursors({
  projectId,
  userId,
  name,
  contentRef,
  draft = null,
  chatText = null
}: {
  projectId: string;
  userId: string | null;
  name: string;
  contentRef: RefObject<HTMLElement | null>;
  draft?: LocalDraft;
  /** The local cursor-chat text, broadcast as it is typed. */
  chatText?: string | null;
}) {
  const [cursors, setCursors] = useState<LiveCursor[]>([]);
  const [peerDrafts, setPeerDrafts] = useState<PeerDraft[]>([]);
  // Where this user's own pointer is, as grid fractions. Kept in a ref because
  // it changes on every pointer move and only the chat input reads it — as
  // state it would re-render the whole grid at pointer rate.
  const selfPosition = useRef<{ x: number; y: number } | null>(null);
  // Keep the label and draft out of the effect deps: they change while the
  // channel is live and would otherwise tear it down and rebuild it.
  const nameRef = useRef(name);
  nameRef.current = name;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const chatRef = useRef(chatText);
  chatRef.current = chatText;

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
        {
          ...cursor,
          // Arrives from another client, so clamp it rather than trusting it.
          chat: String(cursor.chat ?? "").slice(0, MAX_CURSOR_CHAT),
          at: Date.now()
        }
      ]);
    });

    channel.on("broadcast", { event: "draft" }, ({ payload }) => {
      const next = payload as DraftPayload;
      if (!next?.userId || next.userId === userId) return;
      setPeerDrafts((prev) => {
        const others = prev.filter((item) => item.userId !== next.userId);
        return "clear" in next ? others : [...others, { ...next, at: Date.now() }];
      });
    });

    channel.on("broadcast", { event: "cursor-leave" }, ({ payload }) => {
      const leavingId = (payload as { userId?: string })?.userId;
      if (!leavingId) return;
      setCursors((prev) => prev.filter((item) => item.userId !== leavingId));
    });

    let joined = false;
    channel.subscribe((status) => {
      joined = status === "SUBSCRIBED";
    });

    const color = cursorColor(userId);
    let pending: { x: number; y: number } | null = null;
    let lastSent: { x: number; y: number } | null = null;
    let inside = false;

    const onPointerMove = (event: PointerEvent) => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      // Outside the grid: announce a leave once rather than pinning the cursor
      // to the nearest edge.
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        pending = null;
        if (inside) {
          inside = false;
          if (joined) channel.send({ type: "broadcast", event: "cursor-leave", payload: { userId } });
        }
        return;
      }
      inside = true;
      pending = { x, y };
      selfPosition.current = pending;
    };

    window.addEventListener("pointermove", onPointerMove);

    let lastSentChat = "";
    let lastCursorAt = 0;
    let lastDraftKey = "";
    let lastDraftAt = 0;
    const draftKey = (d: LocalDraft) =>
      d ? `${d.dayId}:${d.startMinutes}:${d.endMinutes}` : "";

    const sendTimer = window.setInterval(() => {
      if (!joined) return;

      // Chat has to reach people even when the pointer is still — someone
      // typing a message stops moving — and an open message has to keep being
      // re-announced or the reader would prune the cursor it hangs off.
      const chat = (chatRef.current ?? "").slice(0, MAX_CURSOR_CHAT);
      const target = pending ?? lastSent;
      const moved =
        pending && (!lastSent || lastSent.x !== pending.x || lastSent.y !== pending.y);
      const chatChanged = chat !== lastSentChat;
      const chatDue = chat !== "" && Date.now() - lastCursorAt > DRAFT_HEARTBEAT_MS;

      if (target && (moved || chatChanged || chatDue)) {
        lastSent = target;
        lastSentChat = chat;
        lastCursorAt = Date.now();
        channel.send({
          type: "broadcast",
          event: "cursor",
          payload: { userId, name: nameRef.current, color, x: target.x, y: target.y, chat }
        });
      }

      // Drafts change on every drag frame, then sit still while the name is
      // typed — so send on change, and keep re-announcing an open one.
      const current = draftRef.current;
      const key = draftKey(current);
      const now = Date.now();
      const changed = key !== lastDraftKey;
      const due = key !== "" && now - lastDraftAt > DRAFT_HEARTBEAT_MS;
      if (changed || due) {
        lastDraftKey = key;
        lastDraftAt = now;
        channel.send({
          type: "broadcast",
          event: "draft",
          payload: current
            ? { userId, name: nameRef.current, color, ...current }
            : { userId, clear: true }
        });
      }
    }, SEND_INTERVAL_MS);

    // Drop cursors and drafts from people who closed the tab without a clean
    // leave.
    const pruneTimer = window.setInterval(() => {
      const cutoff = Date.now() - STALE_AFTER_MS;
      setCursors((prev) =>
        prev.some((item) => item.at < cutoff) ? prev.filter((item) => item.at >= cutoff) : prev
      );
      setPeerDrafts((prev) =>
        prev.some((item) => item.at < cutoff) ? prev.filter((item) => item.at >= cutoff) : prev
      );
    }, 2000);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.clearInterval(sendTimer);
      window.clearInterval(pruneTimer);
      if (joined) {
        channel.send({ type: "broadcast", event: "cursor-leave", payload: { userId } });
        channel.send({ type: "broadcast", event: "draft", payload: { userId, clear: true } });
      }
      supabase.removeChannel(channel);
      setCursors([]);
      setPeerDrafts([]);
    };
  }, [projectId, userId, contentRef]);

  return { cursors, peerDrafts, selfPosition };
}

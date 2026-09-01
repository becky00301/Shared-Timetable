"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cursorColor } from "@/lib/supabase/cursors";

export type ChatMessage = {
  id: string;
  userId: string;
  name: string;
  color: string;
  body: string;
  at: number;
  /** Own messages are echoed locally, since the channel is opened with
      broadcast self disabled. */
  mine: boolean;
};

export const MAX_MESSAGE_LENGTH = 500;

// Nothing is persisted, so this cap only bounds the tab's own memory during a
// long session. Older lines scroll out of reach rather than being "deleted".
const MAX_MESSAGES = 200;

/**
 * A live, unsaved conversation between the people currently on a timetable.
 * Messages travel over their own Realtime channel — separate from the cursor
 * channel, which is mounted with the grid and fires every 60ms, while chat has
 * to stay alive across the grid, month and setup views.
 *
 * Nothing is written to the database: closing the tab ends the conversation.
 */
export function useLiveChat({
  projectId,
  userId,
  name
}: {
  projectId: string;
  userId: string | null;
  name: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const joinedRef = useRef(false);
  // Kept in a ref so renaming yourself mid-session doesn't tear the channel
  // down and rebuild it.
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !projectId || !userId) return;

    const channel = supabase.channel(`chat:${projectId}`, {
      config: { broadcast: { self: false } }
    });

    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const incoming = payload as Partial<ChatMessage> | null;
      if (!incoming?.id || !incoming.userId || incoming.userId === userId) return;
      // Everything here arrives from another client, so treat it as untrusted
      // input: clamp the length and drop anything empty.
      const body = String(incoming.body ?? "").slice(0, MAX_MESSAGE_LENGTH).trim();
      if (!body) return;

      const message: ChatMessage = {
        id: String(incoming.id).slice(0, 40),
        userId: String(incoming.userId),
        name: String(incoming.name ?? "").slice(0, 60),
        color: cursorColor(String(incoming.userId)),
        body,
        at: Date.now(),
        mine: false
      };
      setMessages((prev) =>
        prev.some((item) => item.id === message.id) ? prev : [...prev, message].slice(-MAX_MESSAGES)
      );
    });

    channel.subscribe((status) => {
      joinedRef.current = status === "SUBSCRIBED";
      setConnected(status === "SUBSCRIBED");
    });
    channelRef.current = channel;

    return () => {
      joinedRef.current = false;
      channelRef.current = null;
      setConnected(false);
      setMessages([]);
      supabase.removeChannel(channel);
    };
  }, [projectId, userId]);

  const send = useCallback(
    (raw: string) => {
      const body = raw.trim().slice(0, MAX_MESSAGE_LENGTH);
      // Supabase drops broadcasts published before the channel finishes
      // joining, so a message sent too early would vanish silently.
      if (!body || !userId || !joinedRef.current || !channelRef.current) return false;

      const message: ChatMessage = {
        id: nanoid(10),
        userId,
        name: nameRef.current,
        color: cursorColor(userId),
        body,
        at: Date.now(),
        mine: true
      };
      channelRef.current.send({ type: "broadcast", event: "message", payload: message });
      setMessages((prev) => [...prev, message].slice(-MAX_MESSAGES));
      return true;
    },
    [userId]
  );

  return { messages, send, connected };
}

"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Removal = { userId: string; by: string };

// One channel per open project, shared by the listener and the sender, so the
// owner's tab never joins the same topic twice.
const channels = new Map<string, RealtimeChannel>();

/**
 * Tells someone they were just removed from a timetable. Postgres change
 * events can't carry this: a DELETE can't be filtered by project, so the
 * removed member's subscription never sees it. The owner announces it on a
 * broadcast channel instead, the way live cursors travel.
 */
export function useMemberRemovalNotice(
  projectId: string,
  currentUserId: string | null,
  onRemoved: (by: string) => void
) {
  const removedRef = useRef(onRemoved);
  removedRef.current = onRemoved;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !projectId) return;
    const channel = supabase.channel(`members:${projectId}`, {
      config: { broadcast: { self: false } }
    });
    channel.on("broadcast", { event: "removed" }, ({ payload }) => {
      const removal = payload as Partial<Removal>;
      if (removal.userId && removal.userId === currentUserId) removedRef.current(removal.by ?? "");
    });
    channel.subscribe();
    channels.set(projectId, channel);
    return () => {
      channels.delete(projectId);
      supabase.removeChannel(channel);
    };
  }, [projectId, currentUserId]);
}

/** Sent by the owner right after the membership row is deleted. */
export function announceMemberRemoval(projectId: string, removal: Removal) {
  const channel = channels.get(projectId);
  if (!channel) return;
  channel.send({ type: "broadcast", event: "removed", payload: removal }).catch((error) => console.error(error));
}

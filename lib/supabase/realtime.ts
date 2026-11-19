"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  isSyncTable,
  registerSyncChannel,
  unregisterSyncChannel,
  type SyncTable
} from "@/lib/supabase/project-sync";

// Changes arrive in bursts (adding a date range is a row per day), so they are
// collected for a moment and read back in one pass.
const COALESCE_MS = 300;

// A tab that was hidden this long may have slept through messages, so it
// reads everything again when it comes back.
const STALE_AFTER_HIDDEN_MS = 30_000;

/**
 * Keeps an open timetable in step with everyone else editing it.
 *
 * Whoever saves tells the others which tables changed, over a broadcast
 * channel (see announceProjectChange), and they read back only those tables.
 * This used to be the database's change feed on every table, which kept the
 * database decoding every write for every open tab, and made each change
 * reload the whole timetable.
 *
 * Membership is still on the change feed: it changes rarely, and a join or
 * removal can come from a page that is not on this channel.
 */
export function useProjectRealtime(
  projectId: string,
  onSync: () => void,
  onTables: (tables: SyncTable[]) => void
) {
  // Kept in refs so a new callback identity doesn't tear down the channels.
  const syncRef = useRef(onSync);
  syncRef.current = onSync;
  const tablesRef = useRef(onTables);
  tablesRef.current = onTables;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !projectId) return;

    let timer: number | undefined;
    let full = false;
    const pending = new Set<SyncTable>();
    const flush = () => {
      timer = undefined;
      if (full) {
        full = false;
        pending.clear();
        syncRef.current();
        return;
      }
      const tables = [...pending];
      pending.clear();
      if (tables.length) tablesRef.current(tables);
    };
    const queue = (tables: SyncTable[] | "all") => {
      if (tables === "all") full = true;
      else tables.forEach((table) => pending.add(table));
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(flush, COALESCE_MS);
    };

    const channel = supabase.channel(`project-sync:${projectId}`, {
      config: { broadcast: { self: false } }
    });
    channel.on("broadcast", { event: "changed" }, ({ payload }) => {
      // From another client, so only known table names are taken.
      const tables = Array.isArray(payload?.tables) ? payload.tables.filter(isSyncTable) : [];
      if (tables.length) queue(tables);
    });
    let joinedBefore = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        registerSyncChannel(projectId, channel);
        // A rejoin after a dropped connection may have missed messages.
        if (joinedBefore) queue("all");
        joinedBefore = true;
      } else {
        unregisterSyncChannel(projectId, channel);
      }
    });

    const members = supabase.channel(`project:${projectId}`);
    members.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${projectId}` },
      () => queue("all")
    );
    members.subscribe();

    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null) {
        if (Date.now() - hiddenAt >= STALE_AFTER_HIDDEN_MS) queue("all");
        hiddenAt = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      unregisterSyncChannel(projectId, channel);
      supabase.removeChannel(channel);
      supabase.removeChannel(members);
    };
  }, [projectId]);
}

"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TABLES = ["schedule_items", "project_days", "availability", "project_members"] as const;

// Kept on its own channel: a database that has not yet run migration 015 has no
// project_expenses table, and a failed binding takes down every table sharing
// its channel. Isolated, the timetable keeps syncing either way.
const OPTIONAL_TABLES = ["project_expenses"] as const;

// Each callback refetches the whole project, so bursts get collapsed into one
// pass. A burst is normal: adding a date range inserts a row per day, and every
// insert arrives as its own event.
const COALESCE_MS = 300;

export function useProjectRealtime(projectId: string, onSync: () => void) {
  // Kept in a ref so a new callback identity doesn't tear down the channel.
  const syncRef = useRef(onSync);
  syncRef.current = onSync;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !projectId) return;

    let timer: number | undefined;
    const scheduleSync = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        syncRef.current();
      }, COALESCE_MS);
    };

    const channel = supabase.channel(`project:${projectId}`);
    TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `project_id=eq.${projectId}`
        },
        scheduleSync
      );
    });
    channel.subscribe();

    const optionalChannel = supabase.channel(`project-optional:${projectId}`);
    OPTIONAL_TABLES.forEach((table) => {
      optionalChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `project_id=eq.${projectId}`
        },
        scheduleSync
      );
    });
    optionalChannel.subscribe();

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      supabase.removeChannel(channel);
      supabase.removeChannel(optionalChannel);
    };
  }, [projectId]);
}

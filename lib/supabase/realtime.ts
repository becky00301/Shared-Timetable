"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TABLES = ["schedule_items", "project_days", "availability", "project_members"] as const;

export function useProjectRealtime(projectId: string, onSync: () => void) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !projectId) return;

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
        onSync
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, onSync]);
}

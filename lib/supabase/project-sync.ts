"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Tables whose changes are passed between people looking at the same
 * timetable. Members are not here: they are still watched on the database,
 * because a join or removal can happen from a page that isn't this timetable.
 */
export const SYNC_TABLES = ["schedule_items", "project_days", "project_notes", "project_expenses", "projects"] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export function isSyncTable(value: unknown): value is SyncTable {
  return typeof value === "string" && (SYNC_TABLES as readonly string[]).includes(value);
}

// The open timetable's broadcast channel, once it has joined.
const channels = new Map<string, RealtimeChannel>();

export function registerSyncChannel(projectId: string, channel: RealtimeChannel) {
  channels.set(projectId, channel);
}

export function unregisterSyncChannel(projectId: string, channel: RealtimeChannel) {
  if (channels.get(projectId) === channel) channels.delete(projectId);
}

/**
 * Tells everyone else on this timetable which tables just changed. It carries
 * no data: receivers read those tables back through the API, so row security
 * still decides what they see, and a forged message costs one extra read.
 */
export function announceProjectChange(projectId: string | null | undefined, tables: SyncTable[]) {
  if (!projectId || !tables.length) return;
  const channel = channels.get(projectId);
  if (!channel) return;
  void channel.send({ type: "broadcast", event: "changed", payload: { tables } }).catch(() => {});
}

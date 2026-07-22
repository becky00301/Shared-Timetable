"use client";

import { MousePointer2 } from "lucide-react";
import type { LiveCursor } from "@/lib/supabase/cursors";

export function LiveCursors({ cursors }: { cursors: LiveCursor[] }) {
  if (!cursors.length) return null;

  return (
    // pointer-events-none so the overlay never blocks drawing schedules;
    // editor-only keeps other people's cursors out of PNG/PDF exports.
    <div className="editor-only pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute -translate-y-0.5 transition-transform duration-75 ease-linear"
          style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        >
          <MousePointer2 size={18} fill={cursor.color} color={cursor.color} strokeWidth={1.5} />
          <span
            className="ml-3 inline-block max-w-[140px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import type { LiveCursor } from "@/lib/supabase/cursors";

/**
 * Renders other people's pointers over the timetable.
 *
 * Positions arrive as fractions of the grid, so the overlay measures itself and
 * converts them to pixels — that keeps movement on `transform` (compositor
 * only) instead of animating `left`/`top`, which would relayout every frame.
 */
export function LiveCursors({ cursors }: { cursors: LiveCursor[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // pointer-events-none so the overlay never blocks drawing schedules;
    // editor-only keeps other people's cursors out of PNG/PDF exports.
    <div ref={ref} className="editor-only pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate3d(${cursor.x * box.width}px, ${cursor.y * box.height}px, 0)`,
            transition: "transform 90ms linear"
          }}
        >
          <MousePointer2 size={18} fill={cursor.color} color={cursor.color} strokeWidth={1.5} />
          <span
            className="ml-3 inline-block max-w-[140px] translate-y-0.5 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </span>
          {/* What they are typing right now. A pale bubble rather than another
              solid colour chip: the name is an identity tag and stays loud,
              while the message is prose and has to stay readable at length. */}
          {cursor.chat ? (
            <div
              className="ml-3 mt-1 max-w-[220px] whitespace-pre-wrap break-words rounded-lg border bg-surface px-2 py-1 text-[11px] leading-4 text-foreground shadow-sm"
              style={{ borderColor: cursor.color }}
            >
              {cursor.chat}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

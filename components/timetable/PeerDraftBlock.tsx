"use client";

import { durationToHeight, minutesToTime, minutesToTop } from "@/lib/utils/time";

/**
 * Someone else's in-progress drag — the block they've pulled out but haven't
 * named yet. Dashed and translucent so it reads as "not saved", and inert so
 * it never intercepts your own drawing.
 */
export function PeerDraftBlock({
  startMinutes,
  endMinutes,
  name,
  color
}: {
  startMinutes: number;
  endMinutes: number;
  name: string;
  color: string;
}) {
  const top = minutesToTop(startMinutes);
  const height = Math.max(
    18,
    durationToHeight(minutesToTime(startMinutes), minutesToTime(endMinutes))
  );

  return (
    <div
      className="pointer-events-none absolute left-1 right-1 z-20 overflow-hidden rounded-lg border-2 border-dashed px-1.5 py-1 sm:left-2 sm:right-2"
      style={{ top, height, borderColor: color, backgroundColor: `${color}24` }}
    >
      <span
        className="inline-block max-w-full truncate rounded px-1 py-px text-[10px] font-semibold leading-tight text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  );
}

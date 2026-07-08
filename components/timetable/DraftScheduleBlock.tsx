"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { durationToHeight, formatTimeRange, minutesToTop, timeToMinutes } from "@/lib/utils/time";

export function DraftScheduleBlock({
  startTime,
  endTime,
  naming,
  onCommit,
  onCancel
}: {
  startTime: string;
  endTime: string;
  naming: boolean;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const top = minutesToTop(timeToMinutes(startTime));
  const height = Math.max(34, durationToHeight(startTime, endTime));

  function finish() {
    if (title.trim()) onCommit(title.trim());
    else onCancel();
  }

  return (
    <div
      className={cn(
        "absolute left-2 right-2 z-20 overflow-hidden rounded-lg border border-white/40 bg-primary/80 p-2 shadow-lg",
        !naming && "pointer-events-none"
      )}
      style={{ top, height }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {naming ? (
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              finish();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          onBlur={finish}
          placeholder="일정 이름 입력"
          className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-white/60 focus:outline-none"
        />
      ) : (
        <p className="text-sm font-semibold text-white/90">새 일정</p>
      )}
      <p className="mt-0.5 truncate text-xs text-white/85">{formatTimeRange(startTime, endTime)}</p>
    </div>
  );
}

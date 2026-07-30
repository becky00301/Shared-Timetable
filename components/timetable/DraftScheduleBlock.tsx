"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { durationToHeight, formatTimeRange, minutesToTop, timeToMinutes } from "@/lib/utils/time";

export function DraftScheduleBlock({
  startTime,
  endTime,
  naming,
  hourHeight,
  onCommit,
  onCancel
}: {
  startTime: string;
  endTime: string;
  naming: boolean;
  hourHeight: number;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const t = useT();
  const top = minutesToTop(timeToMinutes(startTime), hourHeight);
  const height = Math.max(34, durationToHeight(startTime, endTime, hourHeight));

  // Blur or Enter commits the typed name; the parent creates the schedule only
  // when a name was entered, and discards the draft otherwise.
  function finish() {
    onCommit(title.trim());
  }

  return (
    <div
      className={cn(
        "absolute left-2 right-2 z-20 overflow-hidden rounded-lg border border-black/40 bg-primary/80 p-2 shadow-lg",
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
          placeholder={t("grid.draftPlaceholder")}
          className="w-full bg-transparent text-sm font-semibold text-white placeholder:text-white/60 focus:outline-none"
        />
      ) : (
        <p className="text-sm font-semibold text-white/90">{t("grid.newSchedule")}</p>
      )}
      <p className="mt-0.5 truncate text-xs text-white/85">{formatTimeRange(startTime, endTime)}</p>
    </div>
  );
}

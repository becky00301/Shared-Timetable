"use client";

import { useState } from "react";
import { VERTICAL_INSET } from "@/components/timetable/ScheduleBlock";
import { cn } from "@/lib/utils/cn";
import { defaultScheduleColor, getScheduleTextColor } from "@/lib/utils/schedule-colors";
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
  // Drawn in the colour the event will be saved with, so nothing changes
  // when the name is entered and it becomes a real block.
  const [color] = useState(defaultScheduleColor);
  const textColor = getScheduleTextColor(color);
  const t = useT();
  const top = minutesToTop(timeToMinutes(startTime), hourHeight);
  const height = Math.max(34, durationToHeight(startTime, endTime, hourHeight));

  // Blur or Enter commits the typed name; the parent creates the schedule only
  // when a name was entered, and discards the draft otherwise.
  function finish() {
    onCommit(title.trim());
  }

  return (
    // Same box as a saved event (ScheduleBlock): hairline side gaps, a pixel
    // inside the hour lines, faint outline, same type.
    <div
      className={cn(
        "absolute left-0.5 right-0.5 z-20 flex flex-col overflow-hidden rounded-[4px] border border-black/[0.06] px-1.5 py-2 text-left shadow-lg sm:p-2",
        !naming && "pointer-events-none"
      )}
      style={{
        top: top + VERTICAL_INSET,
        height: height - VERTICAL_INSET * 2,
        backgroundColor: color,
        color: textColor
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mt-1 min-w-0">
        {naming ? (
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;

              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
              }
            }}
            onBlur={finish}
            placeholder={t("grid.draftPlaceholder")}
            // 16px on phones: iOS zooms the page into any smaller input.
            className="w-full bg-transparent text-base font-semibold leading-tight text-current placeholder:text-current placeholder:opacity-60 focus:outline-none sm:text-sm"
          />
        ) : (
          <p className="text-[11px] font-semibold leading-tight text-current sm:text-sm">{t("grid.newSchedule")}</p>
        )}
        <p className="mt-1 truncate text-[9px] leading-tight text-current opacity-[0.82] sm:text-xs">
          {formatTimeRange(startTime, endTime)}
        </p>
      </div>
    </div>
  );
}

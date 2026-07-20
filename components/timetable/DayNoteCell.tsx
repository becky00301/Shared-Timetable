"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectDay } from "@/types/project";

// Google Calendar's 종일 row: a short note about what the day is for.
export function DayNoteCell({ day, canEdit }: { day: ProjectDay; canEdit: boolean }) {
  const updateDayNote = useProjectStore((state) => state.updateDayNote);
  const [value, setValue] = useState(day.note ?? "");

  useEffect(() => {
    setValue(day.note ?? "");
  }, [day.note]);

  function save() {
    const next = value.trim();
    if (next === (day.note ?? "")) return;
    updateDayNote(day.id, next).catch((error) => {
      console.error(error);
      toast.error("메모를 저장하지 못했어요.");
      setValue(day.note ?? "");
    });
  }

  if (!canEdit) {
    return (
      <div className="flex h-9 items-center px-1.5">
        {day.note ? (
          <span className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs text-foreground" title={day.note}>
            {day.note}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-9 items-center px-1.5">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setValue(day.note ?? "");
            event.currentTarget.blur();
          }
        }}
        placeholder="종일 메모"
        title={value || "종일 메모"}
        className="w-full truncate rounded bg-transparent px-1.5 py-0.5 text-xs text-foreground outline-none transition placeholder:text-muted/70 hover:bg-black/[0.04] focus:bg-primary/10"
      />
    </div>
  );
}

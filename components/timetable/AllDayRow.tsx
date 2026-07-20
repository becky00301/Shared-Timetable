"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useContextMenu } from "@/components/ui/context-menu";
import type { ScheduleItem } from "@/types/schedule";

// Google Calendar's 종일 row: click the empty area to add an all-day item.
export function AllDayRow({
  items,
  canEdit,
  selectedScheduleId,
  onCreate,
  onSelect,
  onDelete
}: {
  items: ScheduleItem[];
  canEdit: boolean;
  selectedScheduleId: string | null;
  onCreate: (title: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState("");

  function finish() {
    const next = title.trim();
    setNaming(false);
    setTitle("");
    if (next) onCreate(next);
  }

  return (
    <div
      className={cn("min-h-9 space-y-0.5 p-1", canEdit && !naming && "cursor-pointer")}
      onClick={(event) => {
        // Only the empty area starts a new all-day item.
        if (!canEdit || naming || event.target !== event.currentTarget) return;
        setNaming(true);
      }}
    >
      {items.map((item) => (
        <AllDayChip
          key={item.id}
          item={item}
          canEdit={canEdit}
          isSelected={selectedScheduleId === item.id}
          onSelect={() => onSelect(item.id)}
          onDelete={() => onDelete(item.id)}
        />
      ))}

      {naming ? (
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={finish}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              finish();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setNaming(false);
              setTitle("");
            }
          }}
          placeholder="종일 일정 (비우면 취소)"
          className="w-full rounded bg-primary/10 px-1.5 py-0.5 text-xs text-foreground outline-none placeholder:text-muted"
        />
      ) : null}
    </div>
  );
}

function AllDayChip({
  item,
  canEdit,
  isSelected,
  onSelect,
  onDelete
}: {
  item: ScheduleItem;
  canEdit: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { onContextMenu, menu } = useContextMenu(
    canEdit ? [{ label: "삭제", onSelect: onDelete, danger: true }] : []
  );

  return (
    <>
      {menu}
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={onContextMenu}
        title={item.title}
        className={cn(
          "block w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium text-white",
          isSelected && "ring-2 ring-black/30"
        )}
        style={{ backgroundColor: item.color ?? "#2383e2" }}
      >
        {item.title}
      </button>
    </>
  );
}

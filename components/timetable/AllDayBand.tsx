"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n/locale";
import { useContextMenu } from "@/components/ui/context-menu";
import type { ProjectDay } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";

const LANE_HEIGHT = 22;
const BAND_PADDING = 8;

type Placed = { item: ScheduleItem; start: number; end: number; lane: number };

// Pack spans into lanes so overlapping ranges stack instead of colliding.
function packLanes(items: ScheduleItem[], indexByDayId: Map<string, number>): Placed[] {
  const spans = items
    .map((item) => {
      const start = indexByDayId.get(item.day_id);
      if (start === undefined) return null;
      const rawEnd = item.end_day_id ? indexByDayId.get(item.end_day_id) : undefined;
      const end = rawEnd === undefined ? start : Math.max(start, rawEnd);
      return { item, start, end };
    })
    .filter((span): span is { item: ScheduleItem; start: number; end: number } => span !== null)
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const laneEnds: number[] = [];
  return spans.map((span) => {
    let lane = laneEnds.findIndex((end) => end < span.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.end);
    } else {
      laneEnds[lane] = span.end;
    }
    return { ...span, lane };
  });
}

// First lane with nothing overlapping the given range — where a new bar lands.
function firstFreeLane(placed: Placed[], start: number, end: number) {
  for (let lane = 0; ; lane += 1) {
    const taken = placed.some(
      (span) => span.lane === lane && span.start <= end && span.end >= start
    );
    if (!taken) return lane;
  }
}

export function AllDayBand({
  days,
  items,
  canEdit,
  selectedScheduleId,
  onCreate,
  onSelect,
  onDelete
}: {
  days: ProjectDay[];
  items: ScheduleItem[];
  canEdit: boolean;
  selectedScheduleId: string | null;
  onCreate: (startDayId: string, endDayId: string, title: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ start: number; end: number; naming: boolean } | null>(null);
  const [title, setTitle] = useState("");
  const t = useT();

  const indexByDayId = useMemo(
    () => new Map(days.map((day, index) => [day.id, index])),
    [days]
  );
  const placed = useMemo(() => packLanes(items, indexByDayId), [items, indexByDayId]);
  const laneCount = placed.reduce((max, span) => Math.max(max, span.lane + 1), 0);

  // Every lane is always shown; the band grows and the timed grid below moves
  // down with it.
  const draftLane = draft ? firstFreeLane(placed, draft.start, draft.end) : null;
  const visibleLanes = draftLane !== null ? Math.max(laneCount, draftLane + 1) : laneCount;
  const pct = (value: number) => `${(value / Math.max(1, days.length)) * 100}%`;

  function columnAt(clientX: number) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(days.length - 1, Math.floor(ratio * days.length)));
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!canEdit || event.button !== 0 || draft) return;
    if (event.target !== event.currentTarget) return;
    const anchor = columnAt(event.clientX);
    setDraft({ start: anchor, end: anchor, naming: false });

    const onMove = (moveEvent: PointerEvent) => {
      const current = columnAt(moveEvent.clientX);
      setDraft((prev) =>
        prev ? { ...prev, start: Math.min(anchor, current), end: Math.max(anchor, current) } : prev
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDraft((prev) => (prev ? { ...prev, naming: true } : prev));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function commitDraft() {
    const name = title.trim();
    const current = draft;
    setDraft(null);
    setTitle("");
    if (!current || !name) return;
    onCreate(days[current.start].id, days[current.end].id, name);
  }

  return (
    <div
      className="relative flex-1"
      style={{ height: Math.max(1, visibleLanes) * LANE_HEIGHT + BAND_PADDING }}
    >
      <div
        ref={areaRef}
        className={cn("absolute inset-0", canEdit && !draft && "cursor-cell")}
        onPointerDown={startDrag}
      >
        {placed.map((span) => (
          <AllDayBar
            key={span.item.id}
            span={span}
            canEdit={canEdit}
            isSelected={selectedScheduleId === span.item.id}
            left={pct(span.start)}
            width={pct(span.end - span.start + 1)}
            onSelect={() => onSelect(span.item.id)}
            onDelete={() => onDelete(span.item.id)}
          />
        ))}

        {draft ? (
          <div
            className="pointer-events-none absolute px-0.5"
            style={{
              left: pct(draft.start),
              width: pct(draft.end - draft.start + 1),
              top: (draftLane ?? 0) * LANE_HEIGHT + 2,
              height: LANE_HEIGHT - 4
            }}
          >
            {draft.naming ? (
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setDraft(null);
                    setTitle("");
                  }
                }}
                placeholder={t("grid.allDayPlaceholder")}
                className="pointer-events-auto h-full w-full rounded bg-primary px-1.5 text-xs font-medium text-white outline-none placeholder:text-white/70"
              />
            ) : (
              <div className="h-full w-full rounded bg-primary/60" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AllDayBar({
  span,
  canEdit,
  isSelected,
  left,
  width,
  onSelect,
  onDelete
}: {
  span: Placed;
  canEdit: boolean;
  isSelected: boolean;
  left: string;
  width: string;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const { onContextMenu, menu } = useContextMenu(
    canEdit ? [{ label: t("common.delete"), onSelect: onDelete, danger: true }] : []
  );

  return (
    <>
      {menu}
      <button
        type="button"
        data-schedule-id={span.item.id}
        onClick={onSelect}
        onContextMenu={onContextMenu}
        onPointerDown={(event) => event.stopPropagation()}
        title={span.item.title}
        className={cn(
          "absolute truncate rounded px-1.5 text-left text-xs font-medium leading-[18px] text-white",
          isSelected && "ring-2 ring-black/30"
        )}
        style={{
          left,
          width,
          top: span.lane * LANE_HEIGHT,
          height: LANE_HEIGHT - 4,
          marginTop: 2,
          backgroundColor: span.item.color ?? "#2383e2"
        }}
      >
        {span.item.title}
      </button>
    </>
  );
}

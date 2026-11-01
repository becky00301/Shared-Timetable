// Hour labels only. The header spacer and 종일 label are rendered by
// TimetableGrid so each row can align its own left cell. No lines here: the
// labels sit nudged up onto the grid's hour lines, so a rule of their own
// would run straight through the text.
export function TimeColumn({ hourHeight }: { hourHeight: number }) {
  return (
    <div className="w-12 shrink-0 border-r border-border bg-surface">
      {Array.from({ length: 24 }).map((_, hour) => (
        <div
          key={hour}
          className="pr-2 text-right text-xs text-muted"
          style={{ height: hourHeight }}
        >
          <span className="-translate-y-2 inline-block">{String(hour).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}

// Hour labels only. The header spacer and 종일 label are rendered by
// TimetableGrid so each row can align its own left cell.
export function TimeColumn() {
  return (
    <div className="w-16 shrink-0 border-r border-border bg-surface">
      {Array.from({ length: 24 }).map((_, hour) => (
        <div key={hour} className="h-[72px] border-b border-black/[0.04] pr-2 text-right text-xs text-muted">
          <span className="-translate-y-2 inline-block">{String(hour).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}

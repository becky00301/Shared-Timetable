export function TimeColumn() {
  return (
    <div className="sticky left-0 z-40 w-16 shrink-0 border-r border-border bg-surface">
      <div className="sticky top-0 z-10 h-12 border-b border-border bg-surface" />
      {/* Matches the all-day note row height in DateColumn. */}
      <div className="sticky top-12 z-10 flex h-9 items-center justify-end border-b border-border bg-surface pr-2 text-[11px] text-muted">
        종일
      </div>
      {Array.from({ length: 24 }).map((_, hour) => (
        <div key={hour} className="h-[72px] border-b border-black/[0.04] pr-2 text-right text-xs text-muted">
          <span className="-translate-y-2 inline-block">{String(hour).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}

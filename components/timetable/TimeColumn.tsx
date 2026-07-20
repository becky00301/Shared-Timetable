export function TimeColumn() {
  return (
    <div className="sticky left-0 z-40 w-16 shrink-0 border-r border-border bg-surface">
      <div className="h-12 border-b border-border" />
      {Array.from({ length: 24 }).map((_, hour) => (
        <div key={hour} className="h-[72px] border-b border-black/[0.04] pr-2 text-right text-xs text-muted">
          <span className="-translate-y-2 inline-block">{String(hour).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}

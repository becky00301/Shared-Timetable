"use client";

import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";

export function SleepDurationField({
  value,
  disabled,
  onChange,
  className
}: {
  value: number;
  disabled: boolean;
  onChange: (minutes: number) => void;
  className?: string;
}) {
  const t = useT();
  const hours = value / 60;
  const formattedHours = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);

  return (
    <label className={cn("block space-y-2 text-sm text-muted", className)}>
      <span className="flex items-center justify-between gap-3">
        <span>{t("grid.sleepDuration")}</span>
        <output className="font-medium tabular-nums text-foreground">
          {t("grid.sleepDurationHours", { hours: formattedHours })}
        </output>
      </span>
      <input
        type="range"
        min={60}
        max={720}
        step={30}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={t("grid.sleepDuration")}
      />
      <span className="flex justify-between text-[11px] tabular-nums text-muted/80" aria-hidden="true">
        <span>{t("grid.sleepDurationHours", { hours: "1" })}</span>
        <span>{t("grid.sleepDurationHours", { hours: "12" })}</span>
      </span>
    </label>
  );
}

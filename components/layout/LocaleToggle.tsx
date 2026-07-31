"use client";

import { cn } from "@/lib/utils/cn";
import { useLocale } from "@/lib/i18n/locale";

const OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "EN" }
] as const;

export function LocaleToggle({
  className,
  invert
}: {
  className?: string;
  /** For placement over photos/gradients: the unselected label blends against
      whatever's behind it instead of using the fixed muted-gray tone, which
      washes out on colored backgrounds. */
  invert?: boolean;
}) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-border bg-surface p-0.5 text-xs",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          aria-pressed={locale === option.value}
          className={cn(
            "whitespace-nowrap rounded-full px-2.5 py-1 font-medium transition-colors",
            locale === option.value
              ? "bg-primary text-white"
              : invert
                ? "text-white mix-blend-difference hover:bg-white/15"
                : "text-muted hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

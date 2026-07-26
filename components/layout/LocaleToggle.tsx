"use client";

import { cn } from "@/lib/utils/cn";
import { useLocale } from "@/lib/i18n/locale";

const OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "EN" }
] as const;

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface p-0.5 text-xs",
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
            "rounded-full px-2.5 py-1 font-medium transition-colors",
            locale === option.value
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

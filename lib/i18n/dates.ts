"use client";

import { useLocale, type Locale } from "@/lib/i18n/locale";

const WEEKDAYS: Record<Locale, string[]> = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
};

/** Short weekday label for a getDay() index (0 = Sunday). */
export function weekdayLabel(dayIndex: number, locale: Locale) {
  return WEEKDAYS[locale][dayIndex] ?? "";
}

/** "8월 17일" / "Aug 17" */
export function monthDayLabel(date: Date, locale: Locale) {
  if (locale === "ko") return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "2026년 8월" / "August 2026" */
export function yearMonthLabel(date: Date, locale: Locale) {
  if (locale === "ko") return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Locale-aware date formatters bound to the current locale, so callers don't
 * have to thread the locale through every call site.
 */
export function useDateFormat() {
  const { locale } = useLocale();
  return {
    locale,
    weekday: (dayIndex: number) => weekdayLabel(dayIndex, locale),
    weekdays: () => WEEKDAYS[locale],
    monthDay: (date: Date) => monthDayLabel(date, locale),
    yearMonth: (date: Date) => yearMonthLabel(date, locale)
  };
}

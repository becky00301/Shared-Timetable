// Amounts are stored as SQL numeric, which PostgREST may hand back as either a
// number or a string depending on driver settings — every value that crosses
// the wire goes through toAmount so the rest of the app only ever sees numbers.

import type { Locale } from "@/lib/i18n/locale";

export const DEFAULT_CURRENCY = "KRW";

/** Currencies offered in the picker. Anything else already stored still
    formats correctly; it just isn't selectable. */
export const BUDGET_CURRENCIES = ["KRW", "USD", "JPY", "EUR", "GBP"] as const;

/** Currencies without minor units, where "1,500.00" would read as noise. */
const ZERO_DECIMAL_CURRENCIES = new Set(["KRW", "JPY"]);

export const MAX_AMOUNT = 999_999_999_999;

export function currencyFractionDigits(currency: string) {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/** Coerces a numeric column into a finite number, or null when it is unset. */
export function toAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Reads what the user typed. Thousands separators and a currency symbol are
 * tolerated, since people paste amounts as they see them elsewhere.
 * An empty field means "no amount", which is different from 0.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  // Rounded to cents regardless of currency: a stray third decimal is a typo
  // in every currency the picker offers.
  return Math.min(MAX_AMOUNT, Number(parsed.toFixed(2)));
}

/** Value for a text input — plain digits, so re-parsing is lossless. */
export function amountToInput(amount: number | null | undefined) {
  return amount === null || amount === undefined ? "" : String(amount);
}

export function formatMoney(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: Locale = "ko"
) {
  const digits = currencyFractionDigits(currency);
  try {
    return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(amount);
  } catch {
    // An unknown currency code would throw; fall back to a plain number.
    return `${new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
      maximumFractionDigits: digits
    }).format(amount)} ${currency}`;
  }
}

/** Compact form for tight spots like a schedule block label. */
export function formatMoneyShort(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: Locale = "ko"
) {
  try {
    return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1
    }).format(amount);
  } catch {
    return formatMoney(amount, currency, locale);
  }
}

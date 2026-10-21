import { getScheduleTextColor } from "@/lib/utils/schedule-colors";

/**
 * The accent is the colour of "the button that starts something" — the one
 * the landing page and the app share. People can change it, so nothing may
 * assume it is light or dark: the label colour is derived, never hardcoded.
 */
export const ACCENT_STORAGE_KEY = "plantogether.accent";
export const DEFAULT_ACCENT = "#2F62C4";

export const ACCENTS = [
  { hex: "#2F62C4", label: "accent.blue" },
  { hex: "#3F5F94", label: "accent.navy" },
  { hex: "#2F6E68", label: "accent.teal" },
  { hex: "#4A7040", label: "accent.green" },
  { hex: "#FFC94F", label: "accent.sand" },
  { hex: "#8C4249", label: "accent.rose" },
  { hex: "#6D4AA8", label: "accent.violet" },
  { hex: "#2F3847", label: "accent.ink" }
] as const;

export const isAccent = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());

/** A shade down for hover. Computed rather than color-mix so the value is a
    plain hex everywhere, including in the pre-paint script. */
export function darken(hex: string, amount = 0.12) {
  const n = hex.trim().replace("#", "");
  const channels = [0, 2, 4].map((o) => Number.parseInt(n.slice(o, o + 2), 16));
  return (
    "#" +
    channels
      .map((c) => Math.max(0, Math.round(c * (1 - amount))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Same rule the schedule blocks use, so a pale accent gets dark text and a
    deep one gets white without anybody choosing. */
export const accentForeground = (hex: string) => getScheduleTextColor(hex);

export function applyAccent(hex: string) {
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-hover", darken(hex));
  root.style.setProperty("--accent-foreground", accentForeground(hex));
}

export function readStoredAccent() {
  try {
    const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    return isAccent(stored) ? stored : DEFAULT_ACCENT;
  } catch {
    // Private windows can throw on localStorage access.
    return DEFAULT_ACCENT;
  }
}

export function storeAccent(hex: string) {
  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, hex);
  } catch {
    // The colour still applies for this page; it just will not be remembered.
  }
}

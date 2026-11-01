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

/**
 * The app icon, drawn in the chosen accent. The calendar face uses the derived
 * foreground rather than a fixed white, so a pale accent keeps the same
 * contrast inside the icon that the button has.
 */
export function accentIconSvg(hex: string) {
  const fg = accentForeground(hex);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${hex}" />
  <rect x="14" y="17" width="36" height="32" rx="5" fill="${fg}" />
  <path d="M14 25h36" stroke="${hex}" stroke-width="4" />
  <path d="M23 13v9M41 13v9" stroke="${fg}" stroke-width="5" stroke-linecap="round" />
  <path d="M24 38l6 6 12-15" fill="none" stroke="${hex}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
}

const FAVICON_MARK = "data-accent-favicon";

/**
 * Repaints icon links in the head without removing nodes owned by React.
 *
 * Next re-inserts its own link for app/icon.svg during hydration, and a
 * browser given two will generally take the last. Repaint Next's links too:
 * removing them makes React crash when it removes old metadata on navigation.
 */
export function applyAccentFavicon(hex: string) {
  const href = `data:image/svg+xml,${encodeURIComponent(accentIconSvg(hex))}`;
  document
    .querySelectorAll<HTMLLinkElement>(`link[rel~="icon"]:not([${FAVICON_MARK}])`)
    .forEach((link) => {
      if (link.href !== href) link.href = href;
    });

  let link = document.querySelector<HTMLLinkElement>(`link[${FAVICON_MARK}]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.setAttribute(FAVICON_MARK, "");
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/**
 * Keeps it that way. Next can add its link back on a route change, so the head
 * is watched and the accent icon reasserted — only when a foreign one appears,
 * so this never reacts to its own work.
 */
export function watchAccentFavicon(hex: string) {
  applyAccentFavicon(hex);
  const observer = new MutationObserver((records) => {
    const foreign = records.some((record) =>
      [...record.addedNodes].some(
        (node) =>
          node instanceof HTMLLinkElement &&
          node.rel.split(/\s+/).includes("icon") &&
          !node.hasAttribute(FAVICON_MARK)
      )
    );
    if (foreign) applyAccentFavicon(hex);
  });
  observer.observe(document.head, { childList: true });
  return () => observer.disconnect();
}

/** Fired on window whenever the accent is applied, so a picker on screen can
    follow a change that came from the account rather than from a click. */
export const ACCENT_CHANGE_EVENT = "plantogether:accent";

export function applyAccent(hex: string) {
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-hover", darken(hex));
  root.style.setProperty("--accent-foreground", accentForeground(hex));
  applyAccentFavicon(hex);
  window.dispatchEvent(new CustomEvent(ACCENT_CHANGE_EVENT, { detail: hex }));
}

/** Whether this browser has a colour of its own saved, as opposed to falling
    back to the default. */
export function hasStoredAccent() {
  try {
    return isAccent(window.localStorage.getItem(ACCENT_STORAGE_KEY));
  } catch {
    return false;
  }
}

/** The accent saved on the signed-in account, in its Supabase user metadata —
    which follows the person to every device without a schema change. */
export function accountAccent(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.accent;
  return typeof value === "string" && isAccent(value) ? value : null;
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

// A grid rather than a grab bag: each column is one hue, each row one step
// darker. Picking any two colours gives a pair that already agrees, and a full
// day of blocks reads as one timetable instead of a set of warning lights.
// Every entry is checked against getScheduleTextColor so its label lands on the
// right side of the contrast threshold.
export const SCHEDULE_COLOR_GROUPS = [
  // neutral   violet     blue       teal       green      amber      rose
  ["#ECEEF1", "#E6DFF5", "#DCE7F8", "#D6EDEA", "#DEEBD8", "#F6E9CF", "#F7DFE0"],
  ["#D8DCE2", "#CFC3EC", "#B9CFF0", "#ADDCD6", "#C2DCB6", "#EDD3A1", "#EFC3C5"],
  ["#A8B0BC", "#A391D9", "#7FA6DE", "#6FBDB2", "#8FBF7E", "#DCB05E", "#DE9095"],
  ["#545C68", "#5B4892", "#3F5F94", "#2F6E68", "#4A7040", "#8A6224", "#8C4249"]
] as const;

export const DEFAULT_SCHEDULE_COLOR = "#B9CFF0";

export function getScheduleTextColor(backgroundColor?: string | null) {
  const normalized = backgroundColor?.trim().replace(/^#/, "");
  if (!normalized || !/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) return "#FFFFFF";

  const hex = normalized.length === 3
    ? normalized.split("").map((digit) => `${digit}${digit}`).join("")
    : normalized;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance > 0.179 ? "#111827" : "#FFFFFF";
}

/**
 * Ink in the block's own colour family rather than flat black: same hue, a
 * little more saturated so it stays a colour, and taken only as dark as it
 * needs to be to stay comfortably legible on that block.
 *
 * Black on a pastel block reads as a sticker stuck on top of it. This reads as
 * the block's own writing. The search walks from the lightest end down and
 * stops at the first value clearing the target, so the ink keeps as much of
 * its colour as legibility allows.
 */
const INK_TARGET_RATIO = 7;
const inkCache = new Map<string, string>();

function channels(hex: string) {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((d) => `${d}${d}`).join("") : h;
  return [0, 2, 4].map((o) => Number.parseInt(full.slice(o, o + 2), 16) / 255);
}

function relativeLuminance([r, g, b]: number[]) {
  const [lr, lg, lb] = [r, g, b].map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: number[], b: number[]) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Minimal HSL round trip; the palette is plain sRGB so this is enough.
function toHsl([r, g, b]: number[]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl([h, s, l]: number[]) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

const toHex = (rgb: number[]) =>
  "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

export function getScheduleInkColor(backgroundColor?: string | null) {
  const normalized = backgroundColor?.trim().replace(/^#/, "");
  if (!normalized || !/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) return "#FFFFFF";
  const cached = inkCache.get(normalized);
  if (cached) return cached;

  const bg = channels(normalized);
  const [h, s] = toHsl(bg);
  const saturated = Math.min(1, s * 1.35);
  // A dark block needs its ink lighter, not darker, so walk the other way.
  const darkBlock = relativeLuminance(bg) <= 0.179;
  const steps = darkBlock
    ? Array.from({ length: 101 }, (_, i) => i / 100)
    : Array.from({ length: 101 }, (_, i) => 1 - i / 100);

  let ink = darkBlock ? "#FFFFFF" : "#111827";
  for (const l of steps) {
    const candidate = fromHsl([h, saturated, l]);
    if (contrast(candidate, bg) >= INK_TARGET_RATIO) {
      ink = toHex(candidate);
      break;
    }
  }
  inkCache.set(normalized, ink);
  return ink;
}

/**
 * The colour a new event starts with: the palette column whose hue is
 * nearest the reader's accent, in the second row — the same light shade the
 * fixed default used to be. A near-grey accent (ink) maps to the neutral
 * column. Anything unreadable keeps the old default.
 */
export function scheduleColorForAccent(accent: string | null | undefined): string {
  if (!accent || !/^#?[0-9a-f]{6}$/i.test(accent.trim())) return DEFAULT_SCHEDULE_COLOR;
  const [hue, saturation] = toHsl(channels(accent));
  const shade = SCHEDULE_COLOR_GROUPS[1];
  if (saturation < 0.25) return shade[0];

  let best = 1;
  let bestDistance = Infinity;
  // Columns 1… are the hues; each is judged by its strongest swatch.
  for (let column = 1; column < shade.length; column += 1) {
    const [columnHue] = toHsl(channels(SCHEDULE_COLOR_GROUPS[3][column]));
    const gap = Math.abs(hue - columnHue);
    const distance = Math.min(gap, 1 - gap);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = column;
    }
  }
  return shade[best];
}

/** scheduleColorForAccent for the accent currently on the page. */
export function defaultScheduleColor(): string {
  if (typeof document === "undefined") return DEFAULT_SCHEDULE_COLOR;
  return scheduleColorForAccent(getComputedStyle(document.documentElement).getPropertyValue("--accent"));
}

export const SCHEDULE_COLOR_GROUPS = [
  ["#FF1053", "#FF8811", "#F4D06F", "#F5FBDA", "#B9D175"],
  ["#D9EFBD", "#9DD9D2", "#C5F9FC", "#66C7F4", "#D4E5FB"],
  ["#6C6EA0", "#392F5A", "#5320C0", "#450C3F", "#A33E79"],
  ["#4F032E", "#1D0C13", "#D9D2C4", "#EDEDE8", "#FFF8F0"]
] as const;

export const DEFAULT_SCHEDULE_COLOR = "#5320C0";

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

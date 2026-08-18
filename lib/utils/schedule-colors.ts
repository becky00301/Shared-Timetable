// A grid rather than a grab bag: each column is one hue, each row one step
// darker. Picking any two colours gives a pair that already agrees, and a full
// day of blocks reads as one timetable instead of a set of warning lights.
// Every entry is checked against getScheduleTextColor so its label lands on the
// right side of the contrast threshold.
export const SCHEDULE_COLOR_GROUPS = [
  // neutral   blue       teal       green      amber      rose
  ["#ECEEF1", "#DCE7F8", "#D6EDEA", "#DEEBD8", "#F6E9CF", "#F7DFE0"],
  ["#D8DCE2", "#B9CFF0", "#ADDCD6", "#C2DCB6", "#EDD3A1", "#EFC3C5"],
  ["#A8B0BC", "#7FA6DE", "#6FBDB2", "#8FBF7E", "#DCB05E", "#DE9095"],
  ["#545C68", "#3F5F94", "#2F6E68", "#4A7040", "#8A6224", "#8C4249"]
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

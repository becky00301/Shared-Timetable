/**
 * The downloaded file is named after the timetable, because that is what the
 * person recognises in a folder a month later — not its slug.
 *
 * Characters that break a path on Windows or macOS are dropped rather than
 * substituted, so "9/10 여행" becomes "910 여행" instead of growing symbols
 * nobody typed.
 */
export function exportFilename(title: string | null | undefined, extension: string) {
  const safe = (title ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    // Trailing dots and spaces are legal to create but awkward on Windows.
    .replace(/[. ]+$/, "")
    .slice(0, 80);
  return `${safe || "timetable"}.${extension}`;
}

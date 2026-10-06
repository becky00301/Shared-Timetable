/** Slugs are `slugify(title)-nanoid(4)`, so they stay inside the nanoid
    alphabet plus the dashes slugify leaves behind. */
const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * Pulls the timetable slug out of whatever the person pasted. They were told
 * to save a link, so that is the common case, but a bare slug typed by hand
 * works too.
 *
 * Accepts `https://host/plans/my-trip-aB3x`, `/plans/my-trip-aB3x` and
 * `my-trip-aB3x`, with or without a query string or fragment.
 */
export function parseProjectSlug(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const fromLink = raw.match(/\/plans\/([^/?#\s]+)/);
  let candidate = fromLink ? fromLink[1] : raw;
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    // A stray percent sign is not a link we can read; fall through to the
    // pattern check, which rejects it.
  }

  return SLUG_PATTERN.test(candidate) ? candidate : null;
}

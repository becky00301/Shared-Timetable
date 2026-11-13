/** Longest display name a member can choose, counted in characters. */
export const DISPLAY_NAME_MAX = 30;

/** user_metadata key holding the name a member chose on the account page.
 * Sign-in providers can rewrite user_metadata.name on every login, so the
 * chosen name lives under its own key and is copied back into `name` after
 * each sign-in. Keep in sync with lib/auth/naver-profile.ts. */
export const CHOSEN_NAME_KEY = "chosen_name";

// Control characters and bidi overrides could break or spoof name tags.
const UNSAFE = /[\p{Cc}‎‏‪-‮⁦-⁩]/u;

export type DisplayNameCheck = { ok: true; name: string } | { ok: false; reason: "empty" | "too-long" | "invalid" };

export function checkDisplayName(value: string): DisplayNameCheck {
  const name = value.normalize("NFC").trim();
  if (!name) return { ok: false, reason: "empty" };
  if (UNSAFE.test(name)) return { ok: false, reason: "invalid" };
  if ([...name].length > DISPLAY_NAME_MAX) return { ok: false, reason: "too-long" };
  return { ok: true, name };
}

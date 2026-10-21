"use client";

import { useEffect } from "react";
import { readStoredAccent, watchAccentFavicon } from "@/lib/theme/accent";

/**
 * Repaints the tab icon in the chosen accent, on every page.
 *
 * The colour variables are already set before the first paint by a script in
 * the document head; the icon is handled here instead because it is a <link>
 * React owns, and a tab icon arriving a moment late is not something anyone
 * sees happen.
 */
export function AccentEffect() {
  useEffect(() => watchAccentFavicon(readStoredAccent()), []);

  return null;
}

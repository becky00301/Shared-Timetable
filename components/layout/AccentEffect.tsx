"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  accountAccent,
  applyAccent,
  hasStoredAccent,
  readStoredAccent,
  storeAccent,
  watchAccentFavicon
} from "@/lib/theme/accent";

/**
 * Repaints the tab icon in the chosen accent, on every page, and keeps the
 * accent in step with the account.
 *
 * The colour variables are already set before the first paint by a script in
 * the document head, from this browser's saved value; the icon is handled
 * here instead because it is a <link> React owns, and a tab icon arriving a
 * moment late is not something anyone sees happen.
 *
 * The account copy wins when the two differ, so a colour picked on one device
 * reaches the others on their next visit (and from then on before first
 * paint, since it is saved locally too). An account with no colour yet takes
 * this browser's, so an existing choice carries over.
 */
export function AccentEffect() {
  useEffect(() => watchAccentFavicon(readStoredAccent()), []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    function reconcile(metadata: Record<string, unknown> | undefined) {
      if (!supabase) return;
      const saved = accountAccent(metadata);
      if (saved) {
        if (saved !== readStoredAccent()) {
          applyAccent(saved);
          storeAccent(saved);
        }
        return;
      }
      if (hasStoredAccent()) {
        supabase.auth.updateUser({ data: { accent: readStoredAccent() } }).catch((error) => console.error(error));
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) reconcile(data.session.user.user_metadata);
      })
      .catch((error) => console.error(error));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) reconcile(session.user.user_metadata);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}

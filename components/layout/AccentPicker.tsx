"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  ACCENTS,
  accentForeground,
  applyAccent,
  readStoredAccent,
  storeAccent
} from "@/lib/theme/accent";
import { useT } from "@/lib/i18n/locale";

/**
 * Lets someone pick the accent — the colour of every primary button, here and
 * on the landing page.
 *
 * The choice lives in this browser rather than on the account, so it needs no
 * migration and applies instantly. The trade is that it does not follow anyone
 * to a second device.
 */
export function AccentPicker() {
  const t = useT();
  // null until the stored value has been read, so the first paint does not
  // mark the default as selected when something else is saved.
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(readStoredAccent());
  }, []);

  function choose(hex: string) {
    applyAccent(hex);
    storeAccent(hex);
    setSelected(hex);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs text-muted">{t("accent.label")}</span>
      <div className="flex items-center gap-1.5">
        {ACCENTS.map(({ hex, label }) => {
          const active = selected === hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => choose(hex)}
              aria-label={t(label)}
              aria-pressed={active}
              title={t(label)}
              className="flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-white transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              style={{ backgroundColor: hex }}
            >
              {active ? <Check size={13} style={{ color: accentForeground(hex) }} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

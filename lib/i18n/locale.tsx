"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { messages, type MessageKey } from "@/lib/i18n/messages";

export type Locale = "ko" | "en";

const STORAGE_KEY = "plantogether.locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "ko" || stored === "en" ? stored : null;
  } catch {
    // Private browsing can throw on localStorage access.
    return null;
  }
}

/** Pages whose address names their language. /en is the English landing:
    it has to render in English on the server, so search engines index it as
    the English page rather than a second copy of the Korean one. */
export function localeForPath(pathname: string | null): Locale | null {
  return pathname === "/en" || pathname?.startsWith("/en/") ? "en" : null;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // The server has no way to know the reader's language, so pages start on
  // Korean to match the markup, then correct on mount from storage or the
  // browser's own preference. A page whose address names a language starts
  // and stays there.
  const pinned = localeForPath(usePathname());
  const [locale, setLocaleState] = useState<Locale>(pinned ?? "ko");

  // The provider outlives page changes, so a language-named page has to win
  // each time the reader arrives on it, not only on a fresh load.
  useEffect(() => {
    if (pinned) setLocaleState(pinned);
  }, [pinned]);

  // Everywhere else, correct once on load.
  useEffect(() => {
    if (pinned) return;
    // Crawlers render with an English browser locale, so following it would
    // index the Korean site in English. They keep the Korean markup instead.
    if (/bot|crawl|spider|slurp|yeti/i.test(navigator.userAgent)) return;
    const next = readStoredLocale() ?? (navigator.language.startsWith("ko") ? "ko" : "en");
    setLocaleState(next);
    // Mount only: re-running when leaving /en would undo the reader's choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't persist; the UI still switches.
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const entry = messages[key];
      const text = entry[locale] ?? entry.ko;
      if (!vars) return text;
      return text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
      );
    },
    [locale]
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside <LocaleProvider>.");
  return value;
}

/** Shorthand for the common case of only needing the translate function. */
export function useT() {
  return useLocale().t;
}

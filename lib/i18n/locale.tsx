"use client";

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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // The app is statically prerendered, so the server has no way to know the
  // reader's language. Start on Korean to match the markup, then correct on
  // mount from storage or the browser's own preference.
  const [locale, setLocaleState] = useState<Locale>("ko");

  useEffect(() => {
    const next = readStoredLocale() ?? (navigator.language.startsWith("ko") ? "ko" : "en");
    setLocaleState(next);
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

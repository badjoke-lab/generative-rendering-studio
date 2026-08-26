import { useEffect, useMemo, useState } from "react";
import { en, type TranslationKey } from "./locales/en";
import { ja } from "./locales/ja";

export type Locale = "en" | "ja";

const STORAGE_KEY = "ui-locale";
const dictionaries = { en, ja } as const;

function detectLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ja") return stored;
  return window.navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  };

  const t = useMemo(() => {
    return (key: TranslationKey) => dictionaries[locale][key] ?? en[key];
  }, [locale]);

  return { locale, setLocale, t };
}

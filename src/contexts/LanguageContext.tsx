"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

const STORAGE_KEY = "business-dss-locale";
const EXPLICIT_STORAGE_KEY = "business-dss-locale-explicit";
const COOKIE_NAME = "locale";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "de";
  const explicit = localStorage.getItem(EXPLICIT_STORAGE_KEY) === "1";
  if (!explicit) return "de";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "de") return stored;
  return "de";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>("de");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getStoredLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=31536000`;
  }, [locale, mounted]);

  const setLocale = useCallback((next: Locale) => {
    if (next === locale) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(EXPLICIT_STORAGE_KEY, "1");
    }
    setLocaleState(next);
    // Re-render current route so Server Components pick up locale cookie.
    router.refresh();
  }, [locale, router]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

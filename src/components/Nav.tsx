"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";

const mainNavItems = [
  { href: "/home", key: "home" as const },
  { href: "/dashboard", key: "plans" as const },
  { href: "/artifacts", key: "artifacts" as const },
  { href: "/study", key: "study" as const },
  { href: "/evaluation", key: "useCaseEvaluation" as const },
  { href: "/chat", key: "advisorChat" as const },
];

const settingsNavItems = [
  { href: "/settings", key: "settingsPage" as const },
  { href: "/runs", key: "runsAudit" as const },
  { href: "/profile", key: "businessProfile" as const },
  { href: "/workflow-overview", key: "processDiagram" as const },
  { href: "/insights", key: "insights" as const },
  { href: "/knowledge", key: "knowledgeBase" as const },
];

function pathMatchesNav(pathname: string, href: string): boolean {
  if (href === "/home") {
    return pathname === "/home" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkBase = "rounded-lg px-3 py-2 transition";
const linkInactive = `${linkBase} border border-transparent text-[var(--muted)] hover:border-teal-100 hover:bg-teal-50 hover:text-teal-700 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50 dark:hover:text-teal-300`;
const linkActive = `${linkBase} border border-teal-400 bg-teal-50 font-medium text-teal-800 shadow-sm dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200`;

export default function Nav({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  const [isInIframe, setIsInIframe] = useState(false);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useLanguage();
  const t = getTranslations(locale);
  const isAuthed = Boolean(userEmail);

  const settingsPathActive = useMemo(
    () => settingsNavItems.some((item) => pathMatchesNav(pathname, item.href)),
    [pathname]
  );

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isEmbed || isInIframe) return null;

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card)]/90 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          prefetch={false}
          className="text-lg font-semibold tracking-tight text-[var(--foreground)] transition hover:text-teal-600 dark:hover:text-teal-400"
        >
          Grow Your Business
        </Link>

        {/* Desktop nav + Settings */}
        <div className="hidden flex-wrap items-center gap-1 text-sm font-medium md:flex">
          {mainNavItems.map((item) => {
            const active = isAuthed && pathMatchesNav(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={isAuthed ? item.href : `/login?next=${encodeURIComponent(item.href)}`}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={
                  isAuthed
                    ? active
                      ? linkActive
                      : linkInactive
                    : "rounded-lg px-3 py-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-500 dark:text-gray-500 dark:hover:bg-gray-900/40 dark:hover:text-gray-400"
                }
              >
                {t.nav[item.key]}
              </Link>
            );
          })}
          {isAuthed ? (
            <div className="relative ml-2" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  settingsPathActive
                    ? "border-teal-400 bg-teal-50 text-teal-800 shadow-sm dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                    : "border-transparent text-[var(--muted)] hover:border-teal-100 hover:bg-teal-50 hover:text-teal-700 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50 dark:hover:text-teal-300"
                }`}
                aria-label={t.nav.settings}
                aria-expanded={settingsOpen}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-2 shadow-xl">
                  <div className="px-2">
                    {settingsNavItems.map((item) => {
                      const active = pathMatchesNav(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setSettingsOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`block rounded-lg border px-3 py-2 text-sm transition ${
                            active
                              ? "border-teal-400 bg-teal-50 font-medium text-teal-800 shadow-sm dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                              : "border-transparent text-[var(--foreground)] hover:border-teal-100 hover:bg-teal-50 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50"
                          }`}
                        >
                          {t.nav[item.key]}
                        </Link>
                      );
                    })}
                    <form action="/api/auth/logout" method="post" className="mt-1">
                      <button
                        type="submit"
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      >
                        {t.auth.logout}
                      </button>
                    </form>
                  </div>
                  <div className="mt-1 border-t border-[var(--card-border)] px-4 py-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t.nav.language}</label>
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as "en" | "de")}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                    >
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              prefetch={false}
              className="ml-2 rounded-lg bg-teal-600 px-3 py-2 text-white transition hover:bg-teal-700"
            >
              {t.auth.submitLogin}
            </Link>
          )}
        </div>

        {/* Burger button (mobile) */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-teal-50 dark:hover:bg-teal-950/50 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--card-border)] bg-[var(--card)] px-6 py-4 md:hidden">
          <div className="mb-3 flex flex-col gap-2 border-b border-[var(--card-border)] pb-3">
            {!isAuthed && (
              <Link
                href="/login"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="rounded-lg bg-teal-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {t.auth.submitLogin}
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {mainNavItems.map((item) => {
              const active = isAuthed && pathMatchesNav(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={isAuthed ? item.href : `/login?next=${encodeURIComponent(item.href)}`}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={
                    isAuthed
                      ? active
                        ? "rounded-lg border border-teal-400 bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-800 shadow-sm transition dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                        : "rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-teal-100 hover:bg-teal-50 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50"
                      : "rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-500 dark:text-gray-500 dark:hover:bg-gray-900/40 dark:hover:text-gray-400"
                  }
                >
                  {t.nav[item.key]}
                </Link>
              );
            })}
            {isAuthed && (
              <div className="mt-2 border-t border-[var(--card-border)] pt-2">
                <p className="mb-2 px-3 text-xs font-medium text-[var(--muted)]">{t.nav.settings}</p>
                {settingsNavItems.map((item) => {
                  const active = pathMatchesNav(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                        active
                          ? "border-teal-400 bg-teal-50 text-teal-800 shadow-sm dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                          : "border-transparent text-[var(--foreground)] hover:border-teal-100 hover:bg-teal-50 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50"
                      }`}
                    >
                      {t.nav[item.key]}
                    </Link>
                  );
                })}
                <form action="/api/auth/logout" method="post" className="mt-1">
                  <button
                    type="submit"
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    {t.auth.logout}
                  </button>
                </form>
                <div className="mt-2 border-t border-[var(--card-border)] px-3 pt-3">
                  <label className="mb-1 block text-xs text-[var(--muted)]">{t.nav.language}</label>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as "en" | "de")}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";

const mainNavItems = [
  { href: "/", key: "homepage" as const },
  { href: "/home", key: "home" as const },
  { href: "/dashboard", key: "plans" as const },
  { href: "/artifacts", key: "artifacts" as const },
  { href: "/manual", key: "userGuide" as const },
  { href: "/workflow-overview", key: "processDiagram" as const },
  { href: "/study", key: "study" as const },
  { href: "/evaluation", key: "useCaseEvaluation" as const },
  { href: "/chat", key: "advisorChat" as const },
];
const appNavHrefs = new Set(["/", "/home", "/dashboard", "/artifacts"]);
const studyNavHrefs = new Set(["/manual", "/workflow-overview", "/study", "/evaluation", "/chat"]);

const settingsNavItems = [
  { href: "/profile", key: "businessProfile" as const },
  { href: "/knowledge", key: "knowledgeBase" as const },
  { href: "/insights", key: "insights" as const },
  { href: "/runs", key: "runsAudit" as const },
  { href: "/settings", key: "settingsPage" as const },
];
function pathMatchesNav(pathname: string, href: string): boolean {
  if (href === "/home") {
    return pathname === "/home";
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
  const [studyExpanded, setStudyExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useLanguage();
  const t = getTranslations(locale);
  const isAuthed = Boolean(userEmail);
  const studyTabLabel = "Studie";
  const dashboardTabLabel = "Dashboard";

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
    <>
    <nav className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card)]/90 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          {/* Burger button (mobile) */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-teal-50 dark:hover:bg-teal-950/50"
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
          <a
            href={isAuthed ? "/home" : "/"}
            className="text-lg font-semibold tracking-tight text-[var(--foreground)] transition hover:text-teal-600 dark:hover:text-teal-400"
          >
            Grow Your Business
          </a>
        </div>

        {/* Desktop nav + Settings */}
        {!isAuthed && (
          <div className="hidden items-center gap-2 md:flex">
            <div className="inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--background)]/70 p-1">
              <a
                href="/"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  !pathname.startsWith("/dashboard/mosaic")
                    ? "bg-teal-600 text-white"
                    : "text-[var(--muted)] hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                }`}
              >
                {studyTabLabel}
              </a>
              <a
                href="/dashboard/mosaic"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pathname.startsWith("/dashboard/mosaic")
                    ? "bg-teal-600 text-white"
                    : "text-[var(--muted)] hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                }`}
              >
                {dashboardTabLabel}
              </a>
            </div>
          </div>
        )}

        {isAuthed && (
          <div className="hidden items-center gap-2 md:flex">
            <div className="inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--background)]/70 p-1">
              <a
                href="/home"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  !pathname.startsWith("/dashboard/mosaic")
                    ? "bg-teal-600 text-white"
                    : "text-[var(--muted)] hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                }`}
              >
                {studyTabLabel}
              </a>
              <a
                href="/dashboard/mosaic"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pathname.startsWith("/dashboard/mosaic")
                    ? "bg-teal-600 text-white"
                    : "text-[var(--muted)] hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                }`}
              >
                {dashboardTabLabel}
              </a>
            </div>
          </div>
        )}

      </div>

    </nav>
    {open && (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          aria-label="Menü schließen"
          onClick={() => setOpen(false)}
        />
        <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-r border-[var(--card-border)] bg-[var(--card)] px-4 py-4 shadow-xl sm:w-96">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--card-border)] pb-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">Menü</p>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              onClick={() => setOpen(false)}
              aria-label="Menü schließen"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {isAuthed ? (
              <>
                <div className="mt-1 pb-2">
                  <p className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold text-[var(--muted)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h14V10" />
                    </svg>
                    App
                  </p>
                  <div className="mt-1 border-b border-[var(--card-border)]" />
                </div>
                {mainNavItems.filter((item) => appNavHrefs.has(item.href)).map((item) => {
                  const active = pathMatchesNav(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "block w-full rounded-lg border border-teal-400 bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-800 shadow-sm transition dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                          : "block w-full rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-teal-100 hover:bg-teal-50 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50"
                      }
                    >
                      {t.nav[item.key]}
                    </Link>
                  );
                })}
                <div className="mt-3 pb-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStudyExpanded((v) => !v)}
                    className="mb-1 flex w-full items-center justify-between px-3 text-left text-xs font-semibold text-[var(--muted)]"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Studie
                    </span>
                    <span>{studyExpanded ? "▾" : "▸"}</span>
                  </button>
                  <div className="mt-1 border-b border-[var(--card-border)]" />
                </div>
                {studyExpanded ? <div className="mt-1 space-y-2">
                  {mainNavItems.filter((item) => studyNavHrefs.has(item.href)).map((item) => {
                    const active = pathMatchesNav(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={
                          active
                            ? "block w-full rounded-lg border border-teal-400 bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-800 shadow-sm transition dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                            : "block w-full rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-teal-100 hover:bg-teal-50 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50"
                        }
                      >
                        {t.nav[item.key]}
                      </Link>
                    );
                  })}
                </div> : null}
              </>
            ) : (
              <>
                <div className="mt-1 pb-2">
                  <p className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold text-[var(--muted)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h14V10" />
                    </svg>
                    App
                  </p>
                  <div className="mt-1 border-b border-[var(--card-border)]" />
                </div>
                {mainNavItems.filter((item) => appNavHrefs.has(item.href)).map((item) => {
                  const active = pathMatchesNav(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={`/login?next=${encodeURIComponent(item.href)}`}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "block w-full rounded-lg border border-teal-400 bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-800 shadow-sm transition dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                          : "block w-full rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-teal-100 hover:bg-teal-50 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50"
                      }
                    >
                      {t.nav[item.key]}
                    </Link>
                  );
                })}
                <div className="mt-3 pb-2 pt-2">
                  <p className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold text-[var(--muted)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Studie
                  </p>
                  <div className="mt-1 border-b border-[var(--card-border)]" />
                </div>
                {mainNavItems.filter((item) => studyNavHrefs.has(item.href)).map((item) => {
                  const active = pathMatchesNav(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={`/login?next=${encodeURIComponent(item.href)}`}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "block w-full rounded-lg border border-teal-400 bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-800 shadow-sm transition dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200"
                          : "block w-full rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-teal-100 hover:bg-teal-50 dark:hover:border-teal-900/50 dark:hover:bg-teal-950/50"
                      }
                    >
                      {t.nav[item.key]}
                    </Link>
                  );
                })}
              </>
            )}
            {isAuthed && (
              <div className="mt-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSettingsExpanded((v) => !v)}
                  className="mb-2 flex w-full items-center justify-between px-3 text-left text-xs font-semibold text-[var(--muted)]"
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t.nav.settings}
                  </span>
                  <span>{settingsExpanded ? "▾" : "▸"}</span>
                </button>
                <div className="mb-2 border-b border-zinc-300/80 dark:border-zinc-700/80" />
                {settingsExpanded ? settingsNavItems.map((item) => {
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
                }) : null}
                {settingsExpanded ? <form action="/api/auth/logout" method="post" className="mt-1">
                  <button
                    type="submit"
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    {t.auth.logout}
                  </button>
                </form> : null}
                {settingsExpanded ? <div className="mt-2 border-t border-[var(--card-border)] px-3 pt-3">
                  <label className="mb-1 block text-xs text-[var(--muted)]">{t.nav.language}</label>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as "en" | "de")}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div> : null}
              </div>
            )}
          </div>
        </aside>
      </div>
    )}
    </>
  );
}

"use client";

import "./globals.css";
import { useEffect } from "react";
import Link from "next/link";

/**
 * Wird nur bei Fehlern im Root-Layout gerendert (eigener html/body, kein Nav).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              Kritischer Fehler
            </p>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-[var(--foreground)]">
              Die Anwendung konnte nicht gestartet werden
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Bitte laden Sie die Seite neu oder öffnen Sie die Startseite. Technische Details finden
              Sie in den Server-Logs.
            </p>
            {error.digest ? (
              <p className="mt-4 rounded-lg bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--muted)]">
                Digest: {error.digest}
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Erneut versuchen
              </button>
              <Link
                href="/"
                className="rounded-xl border border-[var(--card-border)] px-5 py-2.5 text-center text-sm font-semibold text-[var(--foreground)] transition hover:border-teal-300 hover:text-teal-700 dark:hover:text-teal-300"
              >
                Zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

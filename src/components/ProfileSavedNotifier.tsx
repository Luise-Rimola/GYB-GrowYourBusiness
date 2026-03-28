"use client";

import { useEffect } from "react";

/** Im Assistenten-Iframe: Parent informieren, dass das Profil gespeichert wurde. */
export function ProfileSavedNotifier() {
  useEffect(() => {
    try {
      window.parent.postMessage({ type: "assistant-iframe-done", reason: "profile" }, "*");
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
      Profil gespeichert. Im Assistenten geht es mit „Erledigt & weiter“ weiter.
    </p>
  );
}

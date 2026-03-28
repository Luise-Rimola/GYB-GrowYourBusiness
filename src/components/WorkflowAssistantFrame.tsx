"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { SUBMIT_BUTTON_PENDING_CLASS } from "@/lib/submitButtonStyle";

type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
};

export function WorkflowAssistantFrame({
  steps,
}: {
  steps: AssistantStep[];
}) {
  const firstOpen = steps.findIndex((s) => !s.completed);
  const initialIndex = firstOpen >= 0 ? firstOpen : Math.max(steps.length - 1, 0);
  const [index, setIndex] = useState(initialIndex);
  const [locallyDone, setLocallyDone] = useState<Record<number, boolean>>({});
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [pendingSubmit, setPendingSubmit] = useState(false);
  const pendingNextIndexRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);

  const current = steps[index];
  const completedCount = useMemo(
    () => steps.filter((s, i) => s.completed || locallyDone[i]).length,
    [steps, locallyDone]
  );

  function isDoneAt(i: number, doneMap: Record<number, boolean>) {
    return Boolean(steps[i]?.completed || doneMap[i]);
  }

  function findNextOpenIndex(fromIndex: number, doneMap: Record<number, boolean>) {
    for (let i = Math.max(0, fromIndex); i < steps.length; i++) {
      if (!isDoneAt(i, doneMap)) return i;
    }
    return Math.max(steps.length - 1, 0);
  }

  function getIframeHref() {
    try {
      return iframeRef.current?.contentWindow?.location.href ?? null;
    } catch {
      return null;
    }
  }

  function iframeAppearsToBeFbForm(href: string | null) {
    if (!href) return false;
    return (
      href.includes("/study/fb1") ||
      href.includes("/study/fb4") ||
      href.includes("/study/fb2/") ||
      href.includes("/study/fb2") ||
      href.includes("/study/fb3/") ||
      href.includes("/study/fb3")
    );
  }

  function goNext(markDone: boolean) {
    if (pendingSubmit) return;

    let nextDone = locallyDone;
    if (markDone) {
      nextDone = { ...locallyDone, [index]: true };
      setLocallyDone(nextDone);
      if (current.href.startsWith("/knowledge")) {
        document.cookie = "docs_step_done=1; path=/; max-age=31536000; samesite=lax";
      }
    }

    const nextIndex = findNextOpenIndex(index + 1, nextDone);

    if (!markDone) {
      setIndex(nextIndex);
      return;
    }

    const iframeHref = getIframeHref();
    const shouldSubmit = iframeAppearsToBeFbForm(iframeHref);
    if (!shouldSubmit) {
      setIndex(nextIndex);
      return;
    }

    // Wir überlassen das iframe dem echten Submit/Redirect-Prozess.
    // Danach wechseln wir erst zur nächsten Step.
    pendingNextIndexRef.current = nextIndex;
    setPendingSubmit(true);

    const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const targetOrigin = typeof window !== "undefined" ? window.location.origin : "*";
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "assistant-submit", token }, targetOrigin);
    } catch {
      // Fallback: falls postMessage nicht klappt, nicht endlos warten.
    }

    if (pendingTimeoutRef.current) window.clearTimeout(pendingTimeoutRef.current);
    pendingTimeoutRef.current = window.setTimeout(() => {
      if (pendingNextIndexRef.current != null) {
        setPendingSubmit(false);
        setIndex(pendingNextIndexRef.current);
      } else {
        setPendingSubmit(false);
      }
      pendingNextIndexRef.current = null;
    }, 3500);
  }

  if (!current) return null;
  const iframeSrc = toEmbedHref(current.href);

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) window.clearTimeout(pendingTimeoutRef.current);
    };
  }, []);

  function onIframeLoad() {
    if (!pendingSubmit) return;

    const href = getIframeHref();
    const saved =
      href?.includes("saved=fb1") ||
      href?.includes("saved=fb2") ||
      href?.includes("saved=fb3") ||
      href?.includes("saved=fb4");

    if (!saved) return;
    const nextIndex = pendingNextIndexRef.current;
    if (nextIndex == null) return;

    if (pendingTimeoutRef.current) window.clearTimeout(pendingTimeoutRef.current);
    pendingTimeoutRef.current = null;
    pendingNextIndexRef.current = null;
    setPendingSubmit(false);
    setIndex(nextIndex);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-3 overflow-hidden sm:h-[calc(100vh-8.5rem)] sm:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Workflow-Assistent
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Schritt {index + 1} von {steps.length} — {completedCount} erledigt
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 self-start rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--background)] sm:self-auto"
        >
          Assistent beenden
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border-[0.5px] border-[var(--card-border)] bg-[var(--card)] p-[3px] sm:rounded-2xl sm:border sm:p-4">
        <p className="mb-[3px] text-sm font-medium text-[var(--foreground)] sm:mb-3">{current.label}</p>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border-[0.5px] border-[var(--card-border)] bg-white sm:rounded-xl sm:border">
          <iframe
            ref={iframeRef}
            title={current.label}
            src={iframeSrc}
            onLoad={onIframeLoad}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={pendingSubmit || index === 0}
          className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--background)] disabled:opacity-50"
        >
          Zurück
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => goNext(false)}
            disabled={pendingSubmit || index >= steps.length - 1}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
          >
            Überspringen
          </button>
          <button
            type="button"
            onClick={() => goNext(true)}
            disabled={pendingSubmit || index >= steps.length - 1}
            aria-busy={pendingSubmit}
            className={`rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-100 ${pendingSubmit ? SUBMIT_BUTTON_PENDING_CLASS : ""}`}
          >
            Erledigt & weiter
          </button>
        </div>
      </div>
    </div>
  );
}

function toEmbedHref(href: string): string {
  const [baseWithQuery, hash] = href.split("#", 2);
  const base = baseWithQuery || "/";
  const withEmbed = base.includes("?")
    ? `${base}&embed=1`
    : `${base}?embed=1`;
  return hash ? `${withEmbed}#${hash}` : withEmbed;
}

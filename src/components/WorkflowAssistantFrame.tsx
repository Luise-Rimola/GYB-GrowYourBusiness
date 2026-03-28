"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_TRANSITION_EVENT } from "@/components/NavigationTransition";
import { iframeShowsStepCompletion } from "@/lib/assistantIframeCompletion";
import { SUBMIT_BUTTON_PENDING_CLASS } from "@/lib/submitButtonStyle";

const ASSISTANT_DONE_HREFS_KEY = "gyb-assistant-done-hrefs-v1";

type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
};

function dispatchAssistantPulse(phase: "start" | "end") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NAV_TRANSITION_EVENT, { detail: { phase } }));
}

function readPersistedDoneHrefs(): Set<string> {
  try {
    const raw = localStorage.getItem(ASSISTANT_DONE_HREFS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function persistDoneHref(href: string) {
  try {
    const s = readPersistedDoneHrefs();
    s.add(href);
    localStorage.setItem(ASSISTANT_DONE_HREFS_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

export function WorkflowAssistantFrame({
  steps,
}: {
  steps: AssistantStep[];
}) {
  const persistedDone = useMemo(() => {
    if (typeof window === "undefined") return new Set<string>();
    return readPersistedDoneHrefs();
  }, []);

  const firstOpen = steps.findIndex(
    (s) => !s.completed && !persistedDone.has(s.href),
  );
  const initialIndex = firstOpen >= 0 ? firstOpen : Math.max(steps.length - 1, 0);
  const [index, setIndex] = useState(initialIndex);
  const indexRef = useRef(initialIndex);
  indexRef.current = index;
  const [locallyDone, setLocallyDone] = useState<Record<number, boolean>>({});
  const [doneTick, setDoneTick] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hydratedFromStorage = useRef(false);

  const [pendingSubmit, setPendingSubmit] = useState(false);
  const pendingNextIndexRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);
  const lastCompletionUrlRef = useRef<string | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    if (hydratedFromStorage.current) return;
    hydratedFromStorage.current = true;
    try {
      const done = readPersistedDoneHrefs();
      const i = steps.findIndex((s) => !s.completed && !done.has(s.href));
      if (i >= 0) setIndex(i);
    } catch {
      /* ignore */
    }
  }, [steps]);

  useEffect(() => {
    lastCompletionUrlRef.current = null;
  }, [index]);

  const current = steps[index];
  const completedCount = useMemo(() => {
    const doneHref = readPersistedDoneHrefs();
    return steps.filter(
      (s, i) => s.completed || locallyDone[i] || doneHref.has(s.href),
    ).length;
  }, [steps, locallyDone, doneTick]);

  function isDoneAt(i: number, doneMap: Record<number, boolean>) {
    const st = stepsRef.current;
    const href = st[i]?.href;
    if (!href) return true;
    return Boolean(
      st[i]?.completed || doneMap[i] || readPersistedDoneHrefs().has(href),
    );
  }

  function findNextOpenIndex(fromIndex: number, doneMap: Record<number, boolean>) {
    const st = stepsRef.current;
    for (let i = Math.max(0, fromIndex); i < st.length; i++) {
      if (!isDoneAt(i, doneMap)) return i;
    }
    return Math.max(st.length - 1, 0);
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

  function clearPendingTimers() {
    if (pendingTimeoutRef.current) window.clearTimeout(pendingTimeoutRef.current);
    pendingTimeoutRef.current = null;
  }

  function tryCompleteFromIframe() {
    const href = getIframeHref();
    if (!href) return;
    const idx = indexRef.current;
    const stepHref = stepsRef.current[idx]?.href ?? "";
    if (!iframeShowsStepCompletion(stepHref, href)) return;
    if (lastCompletionUrlRef.current === href) return;
    lastCompletionUrlRef.current = href;

    clearPendingTimers();
    const savedPendingNext = pendingNextIndexRef.current;
    pendingNextIndexRef.current = null;
    setPendingSubmit(false);
    persistDoneHref(stepHref);
    setDoneTick((t) => t + 1);

    setLocallyDone((d) => {
      const nextDone = { ...d, [idx]: true };
      const nextIndex = savedPendingNext ?? findNextOpenIndex(idx + 1, nextDone);
      queueMicrotask(() => {
        setIndex(nextIndex);
        dispatchAssistantPulse("end");
      });
      return nextDone;
    });
  }

  function goNext(markDone: boolean) {
    if (pendingSubmit) return;
    dispatchAssistantPulse("start");

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
      requestAnimationFrame(() => dispatchAssistantPulse("end"));
      return;
    }

    const iframeHref = getIframeHref();
    const shouldSubmit = iframeAppearsToBeFbForm(iframeHref);
    if (!shouldSubmit) {
      persistDoneHref(current.href);
      setDoneTick((t) => t + 1);
      setIndex(nextIndex);
      requestAnimationFrame(() => dispatchAssistantPulse("end"));
      return;
    }

    pendingNextIndexRef.current = nextIndex;
    setPendingSubmit(true);

    const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const targetOrigin = typeof window !== "undefined" ? window.location.origin : "*";
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "assistant-submit", token }, targetOrigin);
    } catch {
      /* ignore */
    }

    clearPendingTimers();
    pendingTimeoutRef.current = window.setTimeout(() => {
      tryCompleteFromIframe();
    }, 4000);
  }

  const tryCompleteRef = useRef(tryCompleteFromIframe);
  tryCompleteRef.current = tryCompleteFromIframe;

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) window.clearTimeout(pendingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string } | null;
      if (d?.type === "assistant-iframe-done") {
        lastCompletionUrlRef.current = null;
        tryCompleteRef.current();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function onIframeLoad() {
    if (pendingSubmit) {
      tryCompleteFromIframe();
      return;
    }
    tryCompleteFromIframe();
    requestAnimationFrame(() => dispatchAssistantPulse("end"));
  }

  if (!current) return null;
  const iframeSrc = toEmbedHref(current.href);

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
          href="/study"
          className="shrink-0 self-start rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--background)] sm:self-auto"
        >
          Assistent beenden
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border-[0.5px] border-[var(--card-border)] bg-[var(--card)] p-[3px] sm:rounded-2xl sm:border sm:p-4">
        <p className="mb-[3px] text-sm font-medium text-[var(--foreground)] sm:mb-3">{current.label}</p>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border-[0.5px] border-[var(--card-border)] bg-white sm:rounded-xl sm:border">
          <iframe
            key={`${index}-${iframeSrc}`}
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
          onClick={() => {
            dispatchAssistantPulse("start");
            setIndex((i) => Math.max(i - 1, 0));
            requestAnimationFrame(() => dispatchAssistantPulse("end"));
          }}
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
  const withEmbed = base.includes("?") ? `${base}&embed=1` : `${base}?embed=1`;
  return hash ? `${withEmbed}#${hash}` : withEmbed;
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const FALLBACK_MS = 12_000;

type Phase = "off" | "loading" | "exit";

/** Overlay nur für Assistenten-Schritte (ohne Routenwechsel der Parent-Seite). */
export const NAV_TRANSITION_EVENT = "app-nav-transition";

function shouldTriggerAnchorNav(
  a: HTMLAnchorElement,
  ev: MouseEvent,
): boolean {
  if (ev.defaultPrevented) return false;
  if (ev.button !== 0) return false;
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return false;
  const href = a.getAttribute("href");
  if (!href || href === "#" || href.startsWith("#")) return false;
  if (a.target === "_blank") return false;
  if (a.hasAttribute("download")) return false;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    const next = `${url.pathname}${url.search}`;
    const cur = `${window.location.pathname}${window.location.search}`;
    return next !== cur;
  } catch {
    return false;
  }
}

function NavigationTransitionClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const routeKey = `${pathname}?${searchKey}`;

  const [phase, setPhase] = useState<Phase>("off");
  const overlaySourceRef = useRef<"route" | "assistant" | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    clearFallback();
    overlaySourceRef.current = "route";
    setPhase("loading");
    fallbackTimerRef.current = setTimeout(() => {
      setPhase("off");
      overlaySourceRef.current = null;
      fallbackTimerRef.current = null;
    }, FALLBACK_MS);
  }, [clearFallback]);

  useEffect(() => {
    setPhase((p) => {
      if (p !== "loading") return p;
      if (overlaySourceRef.current !== "route") return p;
      return "exit";
    });
  }, [routeKey]);

  useEffect(() => {
    return () => clearFallback();
  }, [clearFallback]);

  useEffect(() => {
    function onAssistantNav(e: Event) {
      const ce = e as CustomEvent<{ phase?: string }>;
      const p = ce.detail?.phase;
      if (p === "start") {
        clearFallback();
        overlaySourceRef.current = "assistant";
        setPhase("loading");
        fallbackTimerRef.current = setTimeout(() => {
          setPhase("off");
          overlaySourceRef.current = null;
          fallbackTimerRef.current = null;
        }, FALLBACK_MS);
        return;
      }
      if (p === "end") {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        overlaySourceRef.current = "assistant";
        setPhase("exit");
      }
    }
    window.addEventListener(NAV_TRANSITION_EVENT, onAssistantNav as EventListener);
    return () => window.removeEventListener(NAV_TRANSITION_EVENT, onAssistantNav as EventListener);
  }, [clearFallback]);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const el = ev.target;
      if (!(el instanceof Element)) return;
      const a = el.closest("a");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (!shouldTriggerAnchorNav(a, ev)) return;
      startLoading();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [startLoading]);

  const onExitEnd = useCallback(() => {
    setPhase((p) => {
      if (p === "exit") {
        clearFallback();
        overlaySourceRef.current = null;
        return "off";
      }
      return p;
    });
  }, [clearFallback]);

  if (phase === "off") return null;

  return (
    <div
      className={
        phase === "exit"
          ? "nav-transition-root nav-transition-exit"
          : "nav-transition-root nav-transition-loading"
      }
      aria-hidden
      aria-busy={phase === "loading"}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (phase !== "exit") return;
        if (e.animationName !== "nav-pixel-exit" && e.animationName !== "nav-transition-fade-out")
          return;
        onExitEnd();
      }}
    />
  );
}

export function NavigationTransition() {
  return (
    <Suspense fallback={null}>
      <NavigationTransitionClient />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV_TRANSITION_EVENT } from "@/components/NavigationTransition";
import { iframeShowsStepCompletion } from "@/lib/assistantIframeCompletion";
import { SUBMIT_BUTTON_PENDING_CLASS } from "@/lib/submitButtonStyle";

const ASSISTANT_DONE_HREFS_KEY = "gyb-assistant-done-hrefs-v1";
const ASSISTANT_INDEX_KEY = "gyb-assistant-index-v1";

function parseRunIdFromAssistantHref(href: string): string | null {
  const path = href.split("#")[0]?.split("?")[0] ?? "";
  const m = /^\/runs\/([^/]+)/.exec(path);
  return m ? m[1] : null;
}

function isRunAssistantStepHref(href: string): boolean {
  return parseRunIdFromAssistantHref(href) !== null;
}

function isPhaseDashboardAssistantHref(href: string): boolean {
  return href.includes("/dashboard") && href.includes("assistant_phase=");
}

function isStudyQuestionnaireStepHref(href: string): boolean {
  return href.startsWith("/study/fb1") || href.includes("/study/fb2") || href.includes("/study/fb3") || href.includes("/study/fb4") || href.startsWith("/study/fb5");
}

type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
  phaseId?: string;
};

type StepInfoContent = {
  title: string;
  whatToDo: string;
  whyItMatters: string;
  resultHint: string;
};

type AssistantPhaseRunStatus = {
  id: string;
  phaseId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  totalSteps: number;
  completedSteps: number;
  createdAt?: string | null;
};

function getAssistantPhaseIdFromHref(href: string | null): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, "https://assistant.local");
    const fromQuery = u.searchParams.get("assistant_phase") ?? u.searchParams.get("phase");
    if (fromQuery) return fromQuery;
    const hash = u.hash ?? "";
    if (hash.startsWith("#phase-")) return hash.slice("#phase-".length) || null;
  } catch {
    /* ignore */
  }
  return null;
}

function phaseInfoById(phaseId: string): StepInfoContent | null {
  const byPhase: Record<string, StepInfoContent> = {
    ideation: {
      title: "KI-Analyseprozess: Ideen- und Konzeptphase",
      whatToDo:
        "Prüfen Sie Problem, Zielgruppe, Wertversprechen und Wettbewerb strukturiert. Öffnen Sie einzelne Prozesse und arbeiten Sie die Schritte sauber durch.",
      whyItMatters:
        "Diese Phase legt das strategische Fundament. Fehler in Annahmen oder Positionierung wirken sich auf alle Folgephasen aus.",
      resultHint:
        "Nutzen Sie Notizen für Hypothesen, offene Fragen und Belege, damit spätere Entscheidungen nachvollziehbar bleiben.",
    },
    validation: {
      title: "KI-Analyseprozess: Validierungsphase",
      whatToDo:
        "Validieren Sie Machbarkeit, USP und Kundenakzeptanz. Fokussieren Sie auf belastbare Nachweise statt auf reine Annahmen.",
      whyItMatters:
        "Hier entscheidet sich, ob die Idee real tragfähig ist. Gute Validierung senkt Risiko vor Investitionen und Rollout.",
      resultHint:
        "Dokumentieren Sie Unsicherheiten und Gegenargumente im Notizfeld pro Schritt.",
    },
    launch: {
      title: "KI-Analyseprozess: Gründungs- / Launchphase",
      whatToDo:
        "Arbeiten Sie die Kernprozesse für Markteintritt, Finanzierung und operative Vorbereitung nacheinander ab.",
      whyItMatters:
        "Diese Phase verbindet Strategie mit Umsetzung. Qualität hier beeinflusst Geschwindigkeit und Stabilität des Starts.",
      resultHint:
        "Halten Sie in Notizen fest, welche Voraussetzungen erfüllt sind und was noch fehlt.",
    },
    scaling: {
      title: "KI-Analyseprozess: Wachstumsphase",
      whatToDo:
        "Bewerten Sie Skalierungshebel, Margen und operative Engpässe. Priorisieren Sie Maßnahmen mit klarer Wirkung.",
      whyItMatters:
        "Im Wachstum steigen Komplexität und Kosten. Strukturierte Priorisierung verhindert ineffizientes Skalieren.",
      resultHint:
        "Notieren Sie Abhängigkeiten zwischen Teams, KPIs und Ressourcen im jeweiligen Schritt.",
    },
    tech_digital: {
      title: "KI-Analyseprozess: Technologie & Digitalisierung",
      whatToDo:
        "Prüfen Sie passende Tools, Automatisierungspotenziale und Implementierungsaufwand pro Anwendungsfall.",
      whyItMatters:
        "Technikentscheidungen beeinflussen Effizienz, Qualität und Skalierbarkeit langfristig.",
      resultHint:
        "Erfassen Sie in Notizen Integrationsrisiken, Datenanforderungen und Betriebsauswirkungen.",
    },
    maturity: {
      title: "KI-Analyseprozess: Strategiephase",
      whatToDo:
        "Optimieren Sie Prozesse, Portfolio und Steuerungslogik auf Stabilität, Profitabilität und Resilienz.",
      whyItMatters:
        "In der Strategiephase entstehen Wettbewerbsvorteile vor allem durch konsequente Exzellenz in der Ausführung.",
      resultHint:
        "Notieren Sie Verbesserungsideen mit direktem Bezug zu Effizienz, Kosten und Kundennutzen.",
    },
    renewal: {
      title: "KI-Analyseprozess: Strategische Optionen / Exit / Transformation",
      whatToDo:
        "Analysieren Sie strategische Optionen, Risiken und Szenarien inkl. Unternehmenswert, Exit-Kanälen, Rechtsformwechsel, Expansion und Börsengang.",
      whyItMatters:
        "Diese Phase entscheidet über langfristige Zukunftsfähigkeit und die Qualität großer Richtungsentscheidungen.",
      resultHint:
        "Dokumentieren Sie in Notizen Annahmen, Trigger und Entscheidungsgrenzen transparent.",
    },
  };
  return byPhase[phaseId] ?? null;
}

function normalizeStepPath(href: string): string {
  try {
    if (href.startsWith("http://") || href.startsWith("https://")) {
      const u = new URL(href);
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* ignore and use raw href */
  }
  return href;
}

function stepInfoFromHref(href: string): StepInfoContent {
  const path = normalizeStepPath(href);
  let phaseId = "";
  try {
    const u = new URL(path, "https://assistant.local");
    phaseId = u.searchParams.get("assistant_phase") ?? u.searchParams.get("phase") ?? "";
    if (!phaseId && u.hash.startsWith("#phase-")) {
      phaseId = u.hash.slice("#phase-".length);
    }
  } catch {
    phaseId = "";
  }

  if (path.startsWith("/profile")) {
    return {
      title: "Unternehmensprofil ausfüllen",
      whatToDo:
        "Pflegen Sie Stammdaten, Angebot, Zielgruppe, Standort und Rahmenbedingungen möglichst konkret ein. Nutzen Sie den Web-Enrich-Button, wenn passende öffentliche Infos vorhanden sind.",
      whyItMatters:
        "Diese Angaben steuern die Qualität aller folgenden KI-Auswertungen. Unscharfe Profilangaben führen später zu generischen oder unpassenden Empfehlungen.",
      resultHint:
        "Gut ausgefülltes Profil = bessere Baseline, bessere Runs und belastbarere Entscheidungen.",
    };
  }
  if (path.startsWith("/study/fb1")) {
    return {
      title: "Fragebogen: Ausgangslage",
      whatToDo:
        "Bewerten Sie den Ist-Zustand Ihres Unternehmens vor dem KI-Einsatz ehrlich und konsistent.",
      whyItMatters:
        "FB1 ist die Ausgangsbasis für den Vorher-Nachher-Vergleich. Nur mit einer sauberen Baseline ist der spätere KI-Nutzen nachvollziehbar.",
      resultHint:
        "Die Werte aus FB1 sind Ihr Referenzpunkt für die späteren Verbesserungen.",
    };
  }
  if (path.startsWith("/study/info/")) {
    return {
      title: "Kontext vor Fragebogen",
      whatToDo:
        "Lesen Sie den Phasen- und Bereichskontext aufmerksam, bevor Sie den nächsten Fragebogen ausfüllen.",
      whyItMatters:
        "So verstehen Sie, welche Prozesse und Kriterien in dieser Kategorie wirklich gemeint sind. Das reduziert Missverständnisse bei der Bewertung.",
      resultHint:
        "Ein klarer Kontext führt zu vergleichbareren und valideren Fragebogenantworten.",
    };
  }
  if (path.startsWith("/study/fb2")) {
    return {
      title: "Fragebogen: Ausgangssituation ohne KI-Tool",
      whatToDo:
        "Bewerten Sie den ausgewählten Bereich so, wie er in Ihrer Praxis aktuell ohne KI-Unterstützung funktioniert.",
      whyItMatters:
        "Hier wird die reale Ausgangssituation praxisnah festgehalten. Diese Einschätzung dient als Vorher-Stand für den späteren Vergleich.",
      resultHint:
        "Je realistischer diese Bewertung ist, desto aussagekräftiger ist später die Evaluation des Tool-Nutzens.",
    };
  }
  if (path.startsWith("/runs/")) {
    return {
      title: "KI-Prozess ausführen",
      whatToDo:
        "Bearbeiten Sie alle Prozessschritte vollständig, prüfen Sie die Antworten und speichern Sie gültige Ergebnisse pro Schritt.",
      whyItMatters:
        "Die KI-Analyse-Ergebnisse sind die operative Grundlage für Artefakte, Folgeentscheidungen und die Nachher-Bewertung im Fragebogen.",
      resultHint:
        "Nutzen Sie in einzelnen Schritten auch das Notizfeld für zusätzliche Informationen, Annahmen oder Kontext, die für die jeweilige Analyse wichtig sein können.",
    };
  }
  if (path.includes("/dashboard")) {
    const phaseInfo = phaseId ? phaseInfoById(phaseId) : null;
    if (phaseInfo) return phaseInfo;
    return {
      title: "Prozesse in Planungsphasen",
      whatToDo:
        "Wählen Sie pro Phase die relevanten Prozesse aus, öffnen Sie einzelne Prozesse und führen Sie die Schritte nacheinander aus.",
      whyItMatters:
        "Die Prozessausführung bildet die Grundlage für belastbare KI-Analyse-Ergebnisse und spätere Bewertung.",
      resultHint:
        "Wenn keine konkrete Phase aktiv ist, wählen Sie zuerst die passende Phase und starten dann den jeweiligen Prozess.",
    };
  }
  if (path.startsWith("/artifacts")) {
    return {
      title: "Artefakte prüfen",
      whatToDo:
        "Prüfen Sie die erzeugten Dokumente auf Verständlichkeit, inhaltliche Qualität und praktische Nutzbarkeit.",
      whyItMatters:
        "Nur brauchbare Artefakte sollten in Entscheidungen und Bewertungen einfließen. Schlechte Artefakte verfälschen den Gesamteindruck.",
      resultHint:
        "Wenn nötig, Runs nachschärfen und Artefakte erneut erzeugen.",
    };
  }
  if (path.startsWith("/study/fb3")) {
    return {
      title: "Fragebogen: Situation mit KI-Tool",
      whatToDo:
        "Bewerten Sie denselben Bereich erneut, diesmal auf Basis der Arbeit mit KI-Tool und den daraus entstandenen Ergebnissen.",
      whyItMatters:
        "So wird sichtbar, wie sich die Situation mit Tool-Unterstützung verändert hat. Der Vergleich mit der Ausgangssituation zeigt Verbesserungen und verbleibende Lücken.",
      resultHint:
        "Zusammen mit dem Fragebogen \"Situation ohne KI Tool\" entsteht eine belastbare Vorher-/Nachher-Bewertung zur praktischen Evaluation.",
    };
  }
  if (path.startsWith("/study/fb4")) {
    return {
      title: "Fragebogen: Gesamtbewertung",
      whatToDo:
        "Bewerten Sie übergreifend Nutzbarkeit, Technologieakzeptanz, Vergleich sowie organisatorische Einbettung.",
      whyItMatters:
        "FB4 verdichtet die Erfahrungen aus allen Kategorien zu einer Managementsicht auf Einführung, Skalierung und Governance.",
      resultHint:
        "Hier entsteht die Grundlage für Rollout-Entscheidungen im Unternehmen.",
    };
  }
  if (path.startsWith("/study/fb5")) {
    return {
      title: "Fragebogen: Abschluss",
      whatToDo:
        "Geben Sie Ihre abschließende Gesamteinschätzung, offene Punkte und nächste Prioritäten ein.",
      whyItMatters:
        "FB5 schließt die Evaluation methodisch ab und verdichtet die wichtigsten Erkenntnisse für die Nachsteuerung.",
      resultHint:
        "Die Antworten aus FB5 helfen, konkrete Folgeaktionen für den Betrieb festzulegen.",
    };
  }
  if (path.startsWith("/knowledge")) {
    return {
      title: "Wissensquellen verwalten",
      whatToDo:
        "Laden Sie relevante interne und externe Quellen hoch und halten Sie die Wissensbasis aktuell.",
      whyItMatters:
        "Die Qualität der Quellen beeinflusst direkt die Genauigkeit und Nachvollziehbarkeit der KI-Antworten.",
      resultHint:
        "Bessere Quellen = weniger Halluzinationen, bessere Begründungen und stabilere Ergebnisse.",
    };
  }
  return {
    title: "Schrittinformationen",
    whatToDo:
      "Bearbeiten Sie den aktuellen Schritt vollständig und speichern Sie Ihre Eingaben.",
    whyItMatters:
      "Jeder Schritt baut auf dem vorherigen auf und beeinflusst die Qualität der Folgeergebnisse.",
    resultHint:
      "Wenn verfügbar, nutzen Sie das Notizfeld im Schritt für zusätzliche Hinweise, die für die Analyse wichtig sein können.",
  };
}

function dispatchAssistantPulse(phase: "start" | "end") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NAV_TRANSITION_EVENT, { detail: { phase } }));
}

function readPersistedDoneHrefs(storageScope: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${ASSISTANT_DONE_HREFS_KEY}:${storageScope}`);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function persistDoneHref(href: string, storageScope: string) {
  try {
    const s = readPersistedDoneHrefs(storageScope);
    s.add(href);
    localStorage.setItem(`${ASSISTANT_DONE_HREFS_KEY}:${storageScope}`, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}


export function WorkflowAssistantFrame({
  steps,
  assistantTitle = "Studiendurchführungs Assistent",
  storageScope = "default",
}: {
  steps: AssistantStep[];
  assistantTitle?: string;
  storageScope?: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  const [locallyDone, setLocallyDone] = useState<Record<number, boolean>>({});
  const [persistedDone, setPersistedDone] = useState<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hydratedFromStorage = useRef(false);

  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [resolvedIframeHref, setResolvedIframeHref] = useState<string | null>(null);
  const [runProcessUnlocked, setRunProcessUnlocked] = useState<Record<number, boolean>>({});
  const [processCompleteModalOpen, setProcessCompleteModalOpen] = useState(false);
  const [phaseRunStatus, setPhaseRunStatus] = useState<AssistantPhaseRunStatus | null>(null);
  const [allPhaseJobs, setAllPhaseJobs] = useState<Array<AssistantPhaseRunStatus | null>>([]);
  const pendingNextIndexRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);
  const lastCompletionUrlRef = useRef<string | null>(null);
  const lastManualNavAtRef = useRef<number>(0);
  const suppressAutoAdvanceUntilRef = useRef<number>(0);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const isProfileStep = (steps[index]?.href ?? "").startsWith("/profile");

  useEffect(() => {
    if (hydratedFromStorage.current) return;
    hydratedFromStorage.current = true;
    try {
      const done = readPersistedDoneHrefs(storageScope);
      setPersistedDone(done);
      const raw = window.localStorage.getItem(`${ASSISTANT_INDEX_KEY}:${storageScope}`);
      const n = raw != null ? Number(raw) : NaN;
      const url = new URL(window.location.href);
      const forceNextOpenOnStart = url.searchParams.get("start") === "1";
      const firstIncompleteFromPersisted = steps.findIndex(
        (s) => !s.completed && !done.has(s.href),
      );
      const fallbackFromPersisted =
        firstIncompleteFromPersisted >= 0
          ? firstIncompleteFromPersisted
          : Math.max(steps.length - 1, 0);

      if (forceNextOpenOnStart) {
        url.searchParams.delete("start");
        const cleaned = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(window.history.state, "", cleaned || "/assistant");
      }

      if (forceNextOpenOnStart) {
        setIndex(fallbackFromPersisted);
        return;
      }

      if (!Number.isFinite(n)) {
        // New profiles/scopes start explicitly at step 1.
        setIndex(0);
        return;
      }

      const clamped = Math.max(0, Math.min(Math.floor(n), Math.max(steps.length - 1, 0)));
      // Preserve exact step on reload/back-forward navigation.
      setIndex(clamped);
    } catch {
      /* ignore */
    }
  }, [steps, storageScope]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${ASSISTANT_INDEX_KEY}:${storageScope}`, String(index));
    } catch {
      /* ignore */
    }
  }, [index, storageScope]);

  useEffect(() => {
    lastCompletionUrlRef.current = null;
    setResolvedIframeHref(null);
  }, [index]);

  const current = steps[index];
  const completedCount = useMemo(() => {
    return steps.filter(
      (s, i) => s.completed || locallyDone[i] || persistedDone.has(s.href),
    ).length;
  }, [steps, locallyDone, persistedDone]);

  function isStepAlreadyDone(i: number): boolean {
    const step = stepsRef.current[i];
    if (!step) return false;
    return step.completed || Boolean(locallyDone[i]) || persistedDone.has(step.href);
  }

  function markDoneHref(href: string) {
    persistDoneHref(href, storageScope);
    setPersistedDone((prev) => {
      const next = new Set(prev);
      next.add(href);
      return next;
    });
  }

  function nextSequentialIndex(fromIndex: number) {
    const st = stepsRef.current;
    const lastIndex = Math.max(st.length - 1, 0);
    return Math.min(fromIndex + 1, lastIndex);
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
    // Do not auto-advance right after a manual navigation (back/open step).
    if (!pendingSubmit && Date.now() < suppressAutoAdvanceUntilRef.current) return;
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
    markDoneHref(stepHref);

    setLocallyDone((d) => {
      const nextDone = { ...d, [idx]: true };
      const nextIndex = savedPendingNext ?? nextSequentialIndex(idx);
      queueMicrotask(() => {
        setIndex(nextIndex);
        dispatchAssistantPulse("end");
      });
      return nextDone;
    });
  }

  function goNext() {
    if (pendingSubmit) return;
    setProcessCompleteModalOpen(false);
    dispatchAssistantPulse("start");

    if (index >= steps.length - 1) {
      markDoneHref(current.href);
      router.push(assistantExitHref);
      requestAnimationFrame(() => dispatchAssistantPulse("end"));
      return;
    }

    const nextDone = { ...locallyDone, [index]: true };
    setLocallyDone(nextDone);
    if (current.href.startsWith("/knowledge")) {
      document.cookie = "docs_step_done=1; path=/; max-age=31536000; samesite=lax";
    }

    const nextIndex = nextSequentialIndex(index);

    const iframeHref = getIframeHref();
    const shouldSubmit = iframeAppearsToBeFbForm(iframeHref);
    if (!shouldSubmit) {
      markDoneHref(current.href);
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
      // If the embedded form did not complete (e.g. validation error inside iframe),
      // do not keep the assistant in a locked pending state.
      if (pendingNextIndexRef.current !== null) {
        pendingNextIndexRef.current = null;
        setPendingSubmit(false);
        dispatchAssistantPulse("end");
      }
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
    const id = window.setInterval(() => {
      const href = getIframeHref();
      if (!href) return;
      setResolvedIframeHref((prev) => (prev === href ? prev : href));
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const currentHref = stepsRef.current[indexRef.current]?.href ?? "";
    if (!currentHref.startsWith("/profile")) return;
    if (!resolvedIframeHref) return;
    if (!resolvedIframeHref.includes("/dashboard") && !resolvedIframeHref.includes("assistantContinue=fb2")) return;
    const idx = indexRef.current;
    const doneHref = stepsRef.current[idx]?.href ?? currentHref;
    markDoneHref(doneHref);
    setLocallyDone((d) => ({ ...d, [idx]: true }));
    queueMicrotask(() => {
      setIndex(nextSequentialIndex(idx));
      dispatchAssistantPulse("end");
    });
  }, [resolvedIframeHref]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; runId?: string } | null;
      if (d?.type === "assistant-reload") {
        window.location.reload();
        return;
      }
      if (d?.type === "assistant-iframe-done") {
        const currentHref = stepsRef.current[indexRef.current]?.href ?? "";
        const isQuestionnaireStep = isStudyQuestionnaireStepHref(currentHref);
        if (!pendingSubmit && !isProfileStep && !isQuestionnaireStep) return;
        lastCompletionUrlRef.current = null;
        tryCompleteRef.current();
        return;
      }
      if (d?.type === "assistant-run-process-complete" && e.origin === window.location.origin) {
        const rid = String(d.runId ?? "");
        const idx = indexRef.current;
        const step = stepsRef.current[idx];
        const stepRid = step?.href ? parseRunIdFromAssistantHref(step.href) : null;
        if (rid && stepRid === rid) {
          // Silently unlock "Erledigt & weiter". Do NOT open the modal — the user
          // should be free to read the Prüfprotokoll inside the iframe first
          // and advance manually when ready.
          setRunProcessUnlocked((m) => ({ ...m, [idx]: true }));
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pendingSubmit, isProfileStep]);

  const stepHrefForPhaseProgress = steps[index]?.href ?? "";
  const phaseIdForProgress = useMemo(() => {
    const fromLive = (() => {
      try {
        return getAssistantPhaseIdFromHref(iframeRef.current?.contentWindow?.location.href ?? null);
      } catch {
        return null;
      }
    })();
    return (
      fromLive ??
      getAssistantPhaseIdFromHref(resolvedIframeHref) ??
      getAssistantPhaseIdFromHref(stepHrefForPhaseProgress)
    );
  }, [resolvedIframeHref, stepHrefForPhaseProgress, index]);

  useEffect(() => {
    const phaseId = phaseIdForProgress;
    if (!phaseId) {
      setPhaseRunStatus(null);
      return;
    }
    let disposed = false;
    let timer: number | null = null;

    const fetchPhaseRunStatus = async () => {
      try {
        const res = await fetch(`/api/phase-runs/status?phaseId=${encodeURIComponent(phaseId)}`, {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          job?: AssistantPhaseRunStatus | null;
        };
        if (!disposed) {
          setPhaseRunStatus(data.job ?? null);
        }
      } catch {
        /* ignore transient polling failures */
      }
    };

    void fetchPhaseRunStatus();
    timer = window.setInterval(() => {
      void fetchPhaseRunStatus();
    }, 2500);

    return () => {
      disposed = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [phaseIdForProgress]);

  useEffect(() => {
    let disposed = false;
    let timer: number | null = null;
    const fetchAllPhaseProgress = async () => {
      try {
        const res = await fetch("/api/phase-runs/status?all=1", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          jobs?: Array<AssistantPhaseRunStatus | null>;
        };
        if (!disposed) {
          setAllPhaseJobs(Array.isArray(data.jobs) ? data.jobs : []);
        }
      } catch {
        /* ignore transient polling failures */
      }
    };
    void fetchAllPhaseProgress();
    timer = window.setInterval(() => {
      void fetchAllPhaseProgress();
    }, 2500);
    return () => {
      disposed = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, []);

  function onIframeLoad() {
    const iframeHref = getIframeHref();
    if (iframeHref) setResolvedIframeHref(iframeHref);
    const currentHref = stepsRef.current[indexRef.current]?.href ?? "";
    const isQuestionnaireStep = isStudyQuestionnaireStepHref(currentHref);
    const isProfileStepNow = currentHref.startsWith("/profile");
    if (
      isProfileStepNow &&
      iframeHref &&
      iframeHref.includes("/dashboard")
    ) {
      // Hard guard: profile step must never stay active when iframe already
      // moved into phase execution dashboard.
      const idx = indexRef.current;
      const doneHref = stepsRef.current[idx]?.href ?? currentHref;
      markDoneHref(doneHref);
      setLocallyDone((d) => ({ ...d, [idx]: true }));
      queueMicrotask(() => {
        setIndex(nextSequentialIndex(idx));
        dispatchAssistantPulse("end");
      });
      return;
    }
    if (
      isQuestionnaireStep &&
      iframeHref &&
      !iframeShowsStepCompletion(currentHref, iframeHref) &&
      !iframeHref.includes("/study/fb1") &&
      !iframeHref.includes("/study/fb2") &&
      !iframeHref.includes("/study/fb3") &&
      !iframeHref.includes("/study/fb4") &&
      !iframeHref.includes("/study/fb5")
    ) {
      // Keep questionnaire steps visually consistent in assistant mode:
      // if iframe drifts to unrelated pages, snap back to the expected step.
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.location.replace(toEmbedHref(currentHref));
          return;
        }
      } catch {
        /* ignore cross-origin/replace issues */
      }
    }
    if (pendingSubmit || isProfileStep || isQuestionnaireStep) {
      tryCompleteFromIframe();
      return;
    }
    requestAnimationFrame(() => dispatchAssistantPulse("end"));
  }

  if (!current) return null;
  const isDashboardPhaseStep = isPhaseDashboardAssistantHref(current.href);
  const dashboardRefreshToken =
    isDashboardPhaseStep && phaseRunStatus
      ? `${phaseRunStatus.status}-${phaseRunStatus.completedSteps}-${phaseRunStatus.totalSteps}`
      : "static";
  const iframeSrc = (() => {
    const base = toEmbedHref(current.href);
    if (!isDashboardPhaseStep) return base;
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}assistant_refresh=${encodeURIComponent(dashboardRefreshToken)}`;
  })();
  const liveIframeHref = getIframeHref();
  const stepInfo = stepInfoFromHref(liveIframeHref ?? resolvedIframeHref ?? current.href);

  const topProgressPercent = (() => {
    if (!phaseRunStatus) return 0;
    if (phaseRunStatus.status === "completed") return 100;
    if (!phaseRunStatus.totalSteps || phaseRunStatus.totalSteps <= 0) return 0;
    return Math.max(
      0,
      Math.min(100, Math.round((phaseRunStatus.completedSteps / phaseRunStatus.totalSteps) * 100)),
    );
  })();
  const showTopProgress =
    Boolean(phaseRunStatus) &&
    (phaseRunStatus?.status === "queued" ||
      phaseRunStatus?.status === "running");
  const isProfileStepNow = (steps[index]?.href ?? "").startsWith("/profile");
  const relevantPhaseJobs = allPhaseJobs.filter(
    (job): job is AssistantPhaseRunStatus => Boolean(job),
  );
  const allPhasesTotalCount = allPhaseJobs.length;
  const allPhasesCompletedCount = relevantPhaseJobs.filter((job) => job.status === "completed").length;
  const allPhasesProgressPercent =
    allPhasesTotalCount > 0
      ? Math.max(0, Math.min(100, Math.round((allPhasesCompletedCount / allPhasesTotalCount) * 100)))
      : 0;
  const allStartedPhasesCount = relevantPhaseJobs.filter((job) => job.status !== "queued" || job.totalSteps > 0).length;
  const showAllPhasesProgress = allPhasesTotalCount > 0 && allStartedPhasesCount > 0;

  const assistantExitHref = current.phaseId
    ? `/dashboard?view=overview&phase=${encodeURIComponent(current.phaseId)}#phase-${encodeURIComponent(current.phaseId)}`
    : "/home";
  const showCompletedPhaseHint = isPhaseDashboardAssistantHref(current.href) && Boolean(current.completed);

  const erledigtDisabled = pendingSubmit;

  return (
    <div className="mx-auto flex h-[calc(100dvh-9.5rem)] w-full max-w-[1240px] flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/75 p-3 sm:h-[calc(100vh-10rem)] sm:gap-4 sm:p-4 dark:border-slate-700/60 dark:bg-slate-900/35">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-teal-700 dark:border-teal-700/70 dark:bg-teal-950/40 dark:text-teal-200">
            {assistantTitle}
          </div>
          <p className="mt-1 text-base font-semibold text-[var(--foreground)] sm:text-lg">{current.label}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Schritt {index + 1} von {steps.length} — {completedCount} erledigt
          </p>
          {showAllPhasesProgress ? (
            <div className="mt-2 w-full max-w-xl">
              <p className="mb-1 text-xs font-medium text-[var(--muted)]">
                Phasenfortschritt: {allPhasesCompletedCount}/{allPhasesTotalCount} abgeschlossen ({allPhasesProgressPercent}%) - gestartet: {allStartedPhasesCount}/{allPhasesTotalCount}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out"
                  style={{ width: `${allPhasesProgressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
          {!isProfileStepNow && !showAllPhasesProgress && showTopProgress ? (
            <div className="mt-2 w-full max-w-xl">
              <p className="mb-1 text-xs font-medium text-[var(--muted)]">
                {phaseRunStatus?.status === "queued"
                  ? `KI-Analyse startet … (${topProgressPercent}%)`
                  : `KI-Analyse Fortschritt: ${phaseRunStatus?.completedSteps ?? 0}/${phaseRunStatus?.totalSteps ?? 0} (${topProgressPercent}%)`}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out"
                  style={{ width: `${topProgressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <div className="group relative">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-base font-bold text-amber-900 shadow-sm transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Informationen zu diesem Schritt anzeigen"
              title="Infos zu diesem Schritt"
            >
              i
            </button>
            <div className="pointer-events-none absolute right-0 top-11 z-20 hidden w-[min(34rem,88vw)] rounded-xl border border-amber-300 bg-amber-50 p-3 text-left shadow-lg group-hover:block group-focus-within:block">
              <p className="text-sm font-semibold text-amber-900">{stepInfo.title}</p>
              <p className="mt-1 text-sm text-amber-950">
                <span className="font-semibold">Was tun:</span> {stepInfo.whatToDo}
              </p>
              <p className="mt-1 text-sm text-amber-950">
                <span className="font-semibold">Warum:</span> {stepInfo.whyItMatters}
              </p>
              <p className="mt-1 text-sm text-amber-900">
                <span className="font-semibold">Nutzen:</span> {stepInfo.resultHint}
              </p>
              <span
                aria-hidden
                className="absolute -top-2 right-3 h-3 w-3 rotate-45 border-l border-t border-amber-300 bg-amber-50"
              />
            </div>
          </div>
          <Link
            href={assistantExitHref}
            prefetch={false}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--background)]"
          >
            Assistent beenden
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <iframe
          key={`${index}-${iframeSrc}-${dashboardRefreshToken}`}
          ref={iframeRef}
          title={current.label}
          src={iframeSrc}
          onLoad={onIframeLoad}
          className="h-full w-full"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {showCompletedPhaseHint ? (
          <div className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/35 dark:text-amber-100">
            Dieser Schritt ist bereits abgeschlossen. Sie können die einzelnen Analyseschritte ansehen,
            Informationen ergänzen und bei Bedarf neu analysieren lassen, um die Genauigkeit zu verbessern.
            Andernfalls einfach auf „Erledigt & weiter“ klicken.
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (index === 0) {
              router.push(assistantExitHref);
              return;
            }
            dispatchAssistantPulse("start");
            lastManualNavAtRef.current = Date.now();
            suppressAutoAdvanceUntilRef.current = Date.now() + 5000;
            pendingNextIndexRef.current = null;
            setPendingSubmit(false);
            clearPendingTimers();
            setIndex((i) => Math.max(i - 1, 0));
            requestAnimationFrame(() => dispatchAssistantPulse("end"));
          }}
          className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--background)]"
        >
          Zurück
        </button>
        {isProfileStep ? (
          <p className="text-xs text-[var(--muted)]">
            Mit den Daten aus diesem Formular kann die KI alle Analysen durchführen. Beim manuellen KI-Analyse-Start können Sie zusätzlich pro Analyse im Notizfeld weitere Informationen ergänzen, um die Ergebnisse zu verbessern.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {runProcessUnlocked[index] && isRunAssistantStepHref(current.href) ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600" />
                Prozess abgeschlossen — Prüfprotokoll ansehen oder weiter
              </span>
            ) : null}
            <button
              type="button"
              onClick={goNext}
              disabled={erledigtDisabled}
              aria-busy={pendingSubmit}
              className={`rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-45 ${pendingSubmit ? SUBMIT_BUTTON_PENDING_CLASS : ""}`}
            >
              Erledigt & weiter
            </button>
          </div>
        )}
      </div>

      {processCompleteModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-process-complete-title"
        >
          <div className="max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl">
            <h2 id="assistant-process-complete-title" className="text-base font-semibold text-[var(--foreground)]">
              Prozess abgeschlossen
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Dieser Prozess ist vollständig abgeschlossen. Klicken Sie auf „Erledigt & weiter“, um fortzufahren.
            </p>
            <button
              type="button"
              onClick={() => setProcessCompleteModalOpen(false)}
              className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Verstanden
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toEmbedHref(href: string): string {
  const [baseWithQuery, hash] = href.split("#", 2);
  let base = baseWithQuery || "/";
  const phaseFromHash = hash?.startsWith("artifacts-phase-")
    ? hash.slice("artifacts-phase-".length)
    : null;
  if (base.startsWith("/assistant/workflows")) {
    try {
      const q = base.includes("?") ? base.split("?")[1] ?? "" : "";
      const sp = new URLSearchParams(q);
      const phase = sp.get("phase");
      base = phase ? `/dashboard?assistant_phase=${encodeURIComponent(phase)}#phase-${encodeURIComponent(phase)}` : "/dashboard?view=execution";
    } catch {
      base = "/dashboard?view=execution";
    }
  }
  if (base.startsWith("/artifacts") && phaseFromHash) {
    const sep = base.includes("?") ? "&" : "?";
    base = `${base}${sep}phase=${encodeURIComponent(phaseFromHash)}`;
  }
  const withEmbed = base.includes("?") ? `${base}&embed=1` : `${base}?embed=1`;
  return hash ? `${withEmbed}#${hash}` : withEmbed;
}

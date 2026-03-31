"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/Section";
import {
  SCENARIOS,
  getScenarioCategories,
  localizeScenario,
  type Scenario,
  type ScenarioCategory,
} from "@/lib/scenarios";

type Step = "select" | "user" | "ai" | "compare";

type ScenarioEvaluationFlowProps = {
  locale: string;
  t: {
    scenarioSelectTitle: string;
    scenarioSelectDesc: string;
    scenarioQuestion: string;
    kpis: string;
    scenarioStep1Title: string;
    scenarioStep1Desc: string;
    yourAnswer: string;
    yourConfidence: string;
    confidenceLabel: string;
    next: string;
    scenarioStep2Title: string;
    scenarioStep2Desc: string;
    getAiAnswer: string;
    copyPromptPasteResponse: string;
    copyPrompt: string;
    pasteResponse: string;
    continueManual: string;
    loading: string;
    aiAnswer: string;
    aiConfidence: string;
    scenarioStep3Title: string;
    scenarioStep3Desc: string;
    preferLabel: string;
    preferUser: string;
    preferAi: string;
    yourConfidenceInAi: string;
    evalIndicators?: string;
    evalVerstaendlichkeit?: string;
    evalVerstaendlichkeitQ?: string;
    evalRelevanz?: string;
    evalRelevanzQ?: string;
    evalNuetzlichkeit?: string;
    evalNuetzlichkeitQ?: string;
    evalVollstaendigkeit?: string;
    evalVollstaendigkeitQ?: string;
    evalNachvollziehbarkeit?: string;
    evalNachvollziehbarkeitQ?: string;
    evalPraktikabilitaet?: string;
    evalPraktikabilitaetQ?: string;
    evalVertrauen?: string;
    evalVertrauenQ?: string;
    evalQuellenqualitaet?: string;
    evalQuellenqualitaetQ?: string;
    runAiEval?: string;
    runAiEvalHint?: string;
    save: string;
    saved: string;
    back: string;
    error: string;
  };
  onSaveStep1: (scenarioId: number, userAnswer: string, userConfidence: number) => Promise<string | void>;
  onSaveStep2: (
    evaluationId: string,
    aiAnswer: string,
    aiConfidence: number,
    aiSources: unknown[]
  ) => Promise<void>;
  onSaveStep3: (
    evaluationId: string,
    userPrefers: "user" | "ai",
    userConfidenceInAi: number,
    userEvaluation?: {
      verstaendlichkeit: number;
      relevanz: number;
      nuetzlichkeit: number;
      vollstaendigkeit: number;
      nachvollziehbarkeit: number;
      praktikabilitaet: number;
      vertrauen: number;
      quellenqualitaet: number;
    }
  ) => Promise<void>;
  initialCategory?: ScenarioCategory;
};

export function ScenarioEvaluationFlow({
  locale,
  t,
  onSaveStep1,
  onSaveStep2,
  initialCategory,
  onSaveStep3,
}: ScenarioEvaluationFlowProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [userConfidence, setUserConfidence] = useState(50);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiConfidence, setAiConfidence] = useState(50);
  const [aiSources, setAiSources] = useState<{ title: string; type?: string; url?: string }[]>([]);
  const [userPrefers, setUserPrefers] = useState<"user" | "ai" | null>(null);
  const [userConfidenceInAi, setUserConfidenceInAi] = useState(50);
  const [userEval, setUserEval] = useState({
    verstaendlichkeit: 3,
    relevanz: 3,
    nuetzlichkeit: 3,
    vollstaendigkeit: 3,
    nachvollziehbarkeit: 3,
    praktikabilitaet: 3,
    vertrauen: 3,
    quellenqualitaet: 3,
  });
  const [evaluationId, setEvaluationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promptText, setPromptText] = useState<string>("");
  const [manualResponse, setManualResponse] = useState("");
  const isEn = locale === "en";
  const categoryLabels = getScenarioCategories(isEn ? "en" : "de");

  const handleSelectScenario = (s: Scenario) => {
    setSelectedScenario(localizeScenario(s, isEn ? "en" : "de"));
    setStep("user");
    setUserAnswer("");
    setUserConfidence(50);
    setAiAnswer("");
    setAiConfidence(50);
    setAiSources([]);
    setUserPrefers(null);
    setUserConfidenceInAi(50);
    setUserEval({
      verstaendlichkeit: 3,
      relevanz: 3,
      nuetzlichkeit: 3,
      vollstaendigkeit: 3,
      nachvollziehbarkeit: 3,
      praktikabilitaet: 3,
      vertrauen: 3,
      quellenqualitaet: 3,
    });
    setEvaluationId("");
    setPromptText("");
    setManualResponse("");
  };

  const handleSaveStep1 = async () => {
    if (!selectedScenario || !userAnswer.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const id = await onSaveStep1(selectedScenario.id, userAnswer.trim(), userConfidence);
      if (id) setEvaluationId(id);
      setStep("ai");
    } catch (e) {
      setMessage({ type: "error", text: t.error });
    } finally {
      setLoading(false);
    }
  };

  const handleGetAiAnswer = async () => {
    if (!selectedScenario) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/evaluation/scenario-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          userAnswer: userAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (isEn ? "Error" : "Fehler"));
      setAiAnswer(data.answer);
      setAiConfidence(data.confidence);
      setAiSources(data.sources ?? []);
      if (evaluationId) {
        await onSaveStep2(evaluationId, data.answer, data.confidence, data.sources ?? []);
      }
      setStep("compare");
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : t.error,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPrompt = async () => {
    if (!selectedScenario) return;
    setLoading(true);
    try {
      const res = await fetch("/api/evaluation/scenario-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          userAnswer: userAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (isEn ? "Error" : "Fehler"));
      setPromptText(data.prompt ?? "");
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : t.error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-load prompt when entering step 2 so manual users can copy immediately.
    if (step !== "ai" || !selectedScenario || promptText.trim()) return;
    void handleFetchPrompt();
  }, [step, selectedScenario, promptText]);

  function parseManualResponse(raw: string): { answer: string; confidence: number; sources: { title: string; type?: string; url?: string }[] } {
    let answer = raw;
    let confidence = 50;
    const sources: { title: string; type?: string; url?: string }[] = [];
    // Prefer explicit final "Konfidenz: xx%" and avoid picking "KI-Konfidenz: xx%"
    const preferredMatches = Array.from(raw.matchAll(/(?:^|\n)[^\n]*(?!KI-)(?:Konfidenz|Confidence)[^0-9\n]{0,12}(\d{1,3})\s*%?/gim));
    const fallbackMatches = Array.from(raw.matchAll(/(?:^|\n)[^\n]*(?:KI-)?(?:Konfidenz|Confidence)[^0-9\n]{0,12}(\d{1,3})\s*%?/gim));
    const matchToUse = (preferredMatches.length > 0 ? preferredMatches : fallbackMatches).at(-1);
    if (matchToUse?.[1]) {
      confidence = Math.min(100, Math.max(0, parseInt(matchToUse[1], 10)));
      answer = answer
        .replace(/^.*(?:KI-)?(?:Konfidenz|Confidence)[^0-9\n]{0,12}\d{1,3}\s*%?.*$/gim, "")
        .trim();
    }
    const jsonBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1].trim()) as unknown;
        if (Array.isArray(parsed)) {
          sources.push(
            ...parsed
              .filter((s): s is { title?: string; type?: string; url?: string } => s && typeof s === "object")
              .map((s) => ({ title: String(s.title ?? ""), type: s.type, url: s.url }))
          );
        }
      } catch {
        // ignore
      }
    }
    return { answer: answer.replace(/```(?:json)?[\s\S]*?```/g, "").trim(), confidence, sources };
  }

  const handleManualContinue = async () => {
    if (!manualResponse.trim() || !evaluationId) return;
    const looksLikePrompt =
      manualResponse.includes("=== SYSTEM ===") ||
      manualResponse.includes("=== USER ===") ||
      manualResponse.includes("## Unternehmensdaten") ||
      manualResponse.includes("## Profil") ||
      (manualResponse.includes("## Dokumente") && manualResponse.includes("Relevante KPIs"));
    if (looksLikePrompt) {
      setMessage({
        type: "error",
        text: isEn
          ? "This looks like the prompt, not the AI answer. Please paste the answer from ChatGPT/Claude (recommendation + confidence + sources), not the prompt."
          : "Das sieht aus wie der Prompt, nicht die KI-Antwort. Bitte die Antwort aus ChatGPT/Claude einfügen (Empfehlung + Konfidenz + Quellen), nicht den Prompt.",
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { answer, confidence, sources } = parseManualResponse(manualResponse);
      setAiAnswer(answer);
      setAiConfidence(confidence);
      setAiSources(sources);
      await onSaveStep2(evaluationId, answer, confidence, sources);
      setStep("compare");
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : t.error });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep3 = async () => {
    if (!evaluationId || userPrefers === null) return;
    setLoading(true);
    setMessage(null);
    try {
      await onSaveStep3(evaluationId, userPrefers, userConfidenceInAi, userEval);
      setMessage({ type: "success", text: t.saved });
    } catch {
      setMessage({ type: "error", text: t.error });
    } finally {
      setLoading(false);
    }
  };

  if (step === "select") {
    const categoriesToShow = initialCategory
      ? [initialCategory]
      : (Object.keys(categoryLabels) as ScenarioCategory[]);
    return (
      <Section title={t.scenarioSelectTitle} description={t.scenarioSelectDesc}>
        <div className="space-y-4">
          {categoriesToShow.map((cat) => (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">
                {categoryLabels[cat]}
              </h3>
              <div className="flex flex-col gap-2">
                {getScenariosByCategory(cat).map((s) => {
                  const localized = localizeScenario(s, isEn ? "en" : "de");
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectScenario(s)}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-left text-sm leading-snug transition hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30"
                    >
                      <span className="font-medium">{s.id}.</span> {localized.question}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  if (!selectedScenario) return null;

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
        <p className="text-sm font-medium text-[var(--foreground)]">
          {t.scenarioQuestion}: {selectedScenario.question}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t.kpis}: {selectedScenario.kpis.join(", ")}
        </p>
      </div>

      {step === "user" && (
        <Section title={t.scenarioStep1Title} description={t.scenarioStep1Desc}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                {t.yourAnswer}
              </label>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm placeholder:text-[var(--muted)]"
                placeholder={isEn ? "Your answer..." : "Ihre Antwort..."}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                {t.yourConfidence} (0–100 %)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={userConfidence}
                  onChange={(e) => setUserConfidence(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-12 text-sm font-medium">{userConfidence} %</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm"
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={handleSaveStep1}
                disabled={!userAnswer.trim() || loading}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? t.loading : t.next}
              </button>
            </div>
          </div>
        </Section>
      )}

      {step === "ai" && (
        <Section title={t.scenarioStep2Title} description={t.scenarioStep2Desc}>
          <p className="mb-4 text-sm text-[var(--muted)]">
            {t.scenarioStep2Desc}
          </p>
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGetAiAnswer}
              disabled={loading}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? t.loading : t.getAiAnswer}
            </button>
          </div>
          <div className="border-t border-[var(--card-border)] pt-6">
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
              {t.copyPromptPasteResponse}
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-medium text-[var(--muted)]">{t.copyPrompt}</label>
                  <button
                    type="button"
                    onClick={handleFetchPrompt}
                    disabled={loading}
                    className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--background)] disabled:opacity-50"
                  >
                    {promptText ? (isEn ? "Refresh" : "Aktualisieren") : (isEn ? "Load prompt" : "Prompt laden")}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={promptText}
                  rows={6}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-slate-50 p-3 text-xs font-mono text-[var(--foreground)] dark:bg-slate-900/30 resize-none"
                  placeholder={isEn ? "Click 'Load prompt', then copy the prompt." : "Klicken Sie auf 'Prompt laden', dann können Sie den Prompt kopieren."}
                />
                {promptText && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(promptText)}
                    className="mt-1 rounded-lg border border-teal-600 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/30"
                  >
                    {isEn ? "📋 Copy to clipboard" : "📋 In Zwischenablage kopieren"}
                  </button>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  {t.pasteResponse}
                </label>
                <p className="mb-1 text-xs text-amber-600 dark:text-amber-400">
                  {isEn ? <>Paste only the <strong>answer</strong> from ChatGPT/Claude - not the prompt.</> : <>Nur die <strong>Antwort</strong> aus ChatGPT/Claude einfügen – nicht den Prompt.</>}
                </p>
                <textarea
                  value={manualResponse}
                  onChange={(e) => setManualResponse(e.target.value)}
                  rows={6}
                  placeholder={
                    isEn
                      ? "Paste the AI recommendation here (including confidence: X% and sources as JSON at the end)."
                      : "Empfehlung der KI hier einfügen (inkl. Konfidenz: X% und Quellen als JSON am Ende)."
                  }
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none"
                />
              </div>
              <button
                type="button"
                onClick={handleManualContinue}
                disabled={!manualResponse.trim() || loading}
                className="rounded-xl border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/30 disabled:opacity-50"
              >
                {loading ? t.loading : t.continueManual}
              </button>
            </div>
          </div>
        </Section>
      )}

      {step === "compare" && (
        <Section title={t.scenarioStep3Title} description={t.scenarioStep3Desc}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4">
                <h4 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  {t.yourAnswer} ({isEn ? "Confidence" : "Konfidenz"}: {userConfidence} %)
                </h4>
                <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{userAnswer}</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4">
                <h4 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                  {t.aiAnswer} ({isEn ? "Confidence" : "Konfidenz"}: {aiConfidence} %)
                </h4>
                <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{aiAnswer}</p>
                {aiSources.length > 0 && (
                  <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                    <p className="mb-1 text-xs font-medium text-[var(--muted)]">{isEn ? "Sources:" : "Quellen:"}</p>
                    <ul className="list-inside list-disc text-xs text-[var(--muted)]">
                      {aiSources.map((s, i) => (
                        <li key={i}>{s.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                {t.preferLabel}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="prefer"
                    checked={userPrefers === "user"}
                    onChange={() => setUserPrefers("user")}
                  />
                  {t.preferUser}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="prefer"
                    checked={userPrefers === "ai"}
                    onChange={() => setUserPrefers("ai")}
                  />
                  {t.preferAi}
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                {t.yourConfidenceInAi}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={userConfidenceInAi}
                  onChange={(e) => setUserConfidenceInAi(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-12 text-sm font-medium">{userConfidenceInAi} %</span>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                {t.evalIndicators ?? (isEn ? "Evaluation indicators" : "Evaluierungs-Indikatoren")}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { key: "verstaendlichkeit" as const, label: t.evalVerstaendlichkeit ?? "Verständlichkeit", q: t.evalVerstaendlichkeitQ },
                  { key: "relevanz" as const, label: t.evalRelevanz ?? "Relevanz", q: t.evalRelevanzQ },
                  { key: "nuetzlichkeit" as const, label: t.evalNuetzlichkeit ?? "Nützlichkeit", q: t.evalNuetzlichkeitQ },
                  { key: "vollstaendigkeit" as const, label: t.evalVollstaendigkeit ?? "Vollständigkeit", q: t.evalVollstaendigkeitQ },
                  { key: "nachvollziehbarkeit" as const, label: t.evalNachvollziehbarkeit ?? "Nachvollziehbarkeit", q: t.evalNachvollziehbarkeitQ },
                  { key: "praktikabilitaet" as const, label: t.evalPraktikabilitaet ?? "Praktikabilität", q: t.evalPraktikabilitaetQ },
                  { key: "vertrauen" as const, label: t.evalVertrauen ?? "Vertrauen", q: t.evalVertrauenQ },
                  { key: "quellenqualitaet" as const, label: t.evalQuellenqualitaet ?? "Quellenqualität", q: t.evalQuellenqualitaetQ },
                ].map(({ key, label, q }) => (
                  <div key={key} className="rounded-lg border border-[var(--card-border)]/50 p-3">
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{label} (1–5)</label>
                    {q && <p className="mb-2 text-xs text-[var(--muted)]">{q}</p>}
                    <select
                      value={userEval[key]}
                      onChange={(e) => setUserEval((u) => ({ ...u, [key]: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm"
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={handleSaveStep3}
                disabled={userPrefers === null || loading}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? t.loading : t.save}
              </button>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function getScenariosByCategory(cat: ScenarioCategory): Scenario[] {
  return SCENARIOS.filter((s) => s.category === cat);
}

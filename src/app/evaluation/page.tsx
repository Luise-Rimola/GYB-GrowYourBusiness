import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { ScenarioEvaluationFlow } from "@/components/ScenarioEvaluationFlow";
import { EvaluationOverviewTable } from "@/components/EvaluationOverviewTable";
import { getScenarioById } from "@/lib/scenarios";
import { getSessionFromCookies } from "@/lib/session";
import { EvaluationMailExportButton } from "@/components/EvaluationMailExportButton";

async function saveUseCase(formData: FormData) {
  "use server";
  const session = await getSessionFromCookies();
  const useCaseDescription = String(formData.get("useCaseDescription") || "").trim();
  const userDecisionApproach = String(formData.get("userDecisionApproach") || "").trim();
  if (!useCaseDescription || !userDecisionApproach) return;
  const company = await getOrCreateDemoCompany();
  await prisma.useCaseEvaluation.create({
    data: {
      companyId: company.id,
      createdBy: session?.sub ?? null,
      useCaseDescription,
      userDecisionApproach,
    },
  });
  redirect("/evaluation?tab=usecase&saved=1");
}

async function saveQuestionnaire(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  const helpful = Number(formData.get("helpful")) || 0;
  const fit = Number(formData.get("fit")) || 0;
  const userOneWord = String(formData.get("userOneWord") || "").trim();
  const userOneWordConfidenceRaw = String(formData.get("userOneWordConfidence") || "").trim();
  const aiOneWord = String(formData.get("aiOneWord") || "").trim();
  const aiOneWordConfidenceRaw = String(formData.get("aiOneWordConfidence") || "").trim();
  const userConfidenceInAiRaw = String(formData.get("userConfidenceInAi") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  if (!id) return;
  const parsePct = (raw: string) => {
    if (!raw) return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n)) return undefined;
    return Math.max(0, Math.min(100, Math.round(n)));
  };
  const userOneWordConfidence = parsePct(userOneWordConfidenceRaw);
  const aiOneWordConfidence = parsePct(aiOneWordConfidenceRaw);
  const userConfidenceInAi = parsePct(userConfidenceInAiRaw);
  await prisma.useCaseEvaluation.update({
    where: { id },
    data: {
      questionnaireJson: {
        helpful,
        fit,
        userOneWord,
        userOneWordConfidence,
        aiOneWord,
        aiOneWordConfidence,
        userConfidenceInAi,
        notes,
      },
    },
  });
  redirect("/evaluation?feedback=1");
}

async function saveScenarioStep1(
  scenarioId: number,
  userAnswer: string,
  userConfidence: number // 0-100
): Promise<string> {
  "use server";
  const session = await getSessionFromCookies();
  const company = await getOrCreateDemoCompany();
  const ev = await prisma.scenarioEvaluation.create({
    data: {
      companyId: company.id,
      createdBy: session?.sub ?? null,
      scenarioId,
      userAnswer,
      userConfidence,
    },
  });
  return ev.id;
}

async function saveScenarioStep2(
  evaluationId: string,
  aiAnswer: string,
  aiConfidence: number,
  aiSourcesJson: unknown
) {
  "use server";
  await prisma.scenarioEvaluation.update({
    where: { id: evaluationId },
    data: {
      aiAnswer,
      aiConfidence,
      aiSourcesJson: aiSourcesJson as object,
    },
  });
}

async function saveScenarioStep3(
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
) {
  "use server";
  await prisma.scenarioEvaluation.update({
    where: { id: evaluationId },
    data: {
      userPrefers,
      userConfidenceInAi,
      userEvaluationJson: userEvaluation as object | undefined,
    },
  });
}

async function deleteScenarioEvaluation(id: string) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await prisma.scenarioEvaluation.deleteMany({
    where: { id, companyId: company.id },
  });
  redirect("/evaluation?tab=overview");
}

async function deleteUseCaseEvaluation(id: string) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await prisma.useCaseEvaluation.deleteMany({
    where: { id, companyId: company.id },
  });
  redirect("/evaluation?tab=overview");
}

export default async function EvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; feedback?: string; tab?: string; category?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const isEn = locale === "en";
  const ui = {
    backToStudyEvaluation: isEn ? "Back to Study Evaluation" : "Zurück zur Studien-Evaluation",
    exportSpss: isEn ? "SPSS Download" : "SPSS-Download",
    exportPdf: isEn ? "PDF (Questions/Answers + Table)" : "PDF (Fragen/Antworten + Tabelle)",
    exportExcel: isEn ? "Excel (Analysis + Logs)" : "Excel (Auswertung + Logs)",
    goToPlans: isEn ? "Plans" : "Pläne",
    goToRuns: isEn ? "Runs" : "Läufe",
    userOneWord: isEn ? "User answer (1 word)" : "User-Antwort (1 Wort)",
    userConfidence: isEn ? "User confidence (%)" : "User-Konfidenz (%)",
    aiOneWord: isEn ? "AI answer (1 word)" : "KI-Antwort (1 Wort)",
    aiConfidence: isEn ? "AI confidence (%)" : "KI-Konfidenz (%)",
    confidenceInAi: isEn ? "Confidence in AI answer (%)" : "Konfidenz in KI-Antwort (%)",
    exYes: isEn ? "e.g. Yes" : "z. B. Ja",
    exNo: isEn ? "e.g. No" : "z. B. Nein",
    ex82: isEn ? "e.g. 82" : "z. B. 82",
    ex64: isEn ? "e.g. 64" : "z. B. 64",
    ex40: isEn ? "e.g. 40" : "z. B. 40",
  } as const;
  const params = await searchParams;
  const category = params.category as import("@/lib/scenarios").ScenarioCategory | undefined;
  const company = await getOrCreateDemoCompany();
  const [useCaseEvals, scenarioEvals] = await Promise.all([
    prisma.useCaseEvaluation.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.scenarioEvaluation.findMany({
      // Show only finalized entries where the final "Save" step was submitted.
      where: { companyId: company.id, userPrefers: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const evaluations = useCaseEvals;
  const activeTab = params.tab === "usecase" ? "usecase" : params.tab === "overview" ? "overview" : "scenario";
  const catParam = category ? `&category=${category}` : "";

  const scenarioT = {
    scenarioSelectTitle: t.evaluation.scenarioSelectTitle,
    scenarioSelectDesc: t.evaluation.scenarioSelectDesc,
    scenarioQuestion: t.evaluation.scenarioQuestion,
    kpis: t.evaluation.kpis,
    scenarioStep1Title: t.evaluation.scenarioStep1Title,
    scenarioStep1Desc: t.evaluation.scenarioStep1Desc,
    yourAnswer: t.evaluation.yourAnswer,
    yourConfidence: t.evaluation.yourConfidence,
    confidenceLabel: t.evaluation.confidenceLabel,
    next: t.evaluation.next,
    scenarioStep2Title: t.evaluation.scenarioStep2Title,
    scenarioStep2Desc: t.evaluation.scenarioStep2Desc,
    getAiAnswer: t.evaluation.getAiAnswer,
    copyPromptPasteResponse: t.evaluation.copyPromptPasteResponse,
    copyPrompt: t.evaluation.copyPrompt,
    pasteResponse: t.evaluation.pasteResponse,
    continueManual: t.evaluation.continueManual,
    loading: t.evaluation.loading,
    aiAnswer: t.evaluation.aiAnswer,
    aiConfidence: t.evaluation.aiConfidence,
    scenarioStep3Title: t.evaluation.scenarioStep3Title,
    scenarioStep3Desc: t.evaluation.scenarioStep3Desc,
    preferLabel: t.evaluation.preferLabel,
    preferUser: t.evaluation.preferUser,
    preferAi: t.evaluation.preferAi,
    yourConfidenceInAi: t.evaluation.yourConfidenceInAi,
    evalIndicators: t.evaluation.evalIndicators,
    evalVerstaendlichkeit: t.evaluation.evalVerstaendlichkeit,
    evalVerstaendlichkeitQ: t.evaluation.evalVerstaendlichkeitQ,
    evalRelevanz: t.evaluation.evalRelevanz,
    evalRelevanzQ: t.evaluation.evalRelevanzQ,
    evalNuetzlichkeit: t.evaluation.evalNuetzlichkeit,
    evalNuetzlichkeitQ: t.evaluation.evalNuetzlichkeitQ,
    evalVollstaendigkeit: t.evaluation.evalVollstaendigkeit,
    evalVollstaendigkeitQ: t.evaluation.evalVollstaendigkeitQ,
    evalNachvollziehbarkeit: t.evaluation.evalNachvollziehbarkeit,
    evalNachvollziehbarkeitQ: t.evaluation.evalNachvollziehbarkeitQ,
    evalPraktikabilitaet: t.evaluation.evalPraktikabilitaet,
    evalPraktikabilitaetQ: t.evaluation.evalPraktikabilitaetQ,
    evalVertrauen: t.evaluation.evalVertrauen,
    evalVertrauenQ: t.evaluation.evalVertrauenQ,
    evalQuellenqualitaet: t.evaluation.evalQuellenqualitaet,
    evalQuellenqualitaetQ: t.evaluation.evalQuellenqualitaetQ,
    runAiEval: t.evaluation.runAiEval,
    runAiEvalHint: t.evaluation.runAiEvalHint,
    save: t.evaluation.save,
    saved: t.evaluation.saved,
    back: t.evaluation.back,
    error: t.evaluation.error,
  };

  return (
    <div className="space-y-8">
      <header>
        {category && (
          <Link href="/study" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
            ← {ui.backToStudyEvaluation}
          </Link>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t.evaluation.title}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{t.evaluation.description}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`/api/export?scope=evaluation&format=spss&lang=${locale}`}
            download="use-case-evaluation.csv"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
          >
            {ui.exportSpss}
          </a>
          {isEn ? (
            <a
              href="/api/export?scope=evaluation&format=pdf&lang=en"
              download="use-case-evaluation-en.pdf"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
            >
              PDF Download (EN)
            </a>
          ) : (
            <a
              href="/api/export?scope=evaluation&format=pdf&lang=de"
              download="use-case-evaluation-de.pdf"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
            >
              PDF Download (DE)
            </a>
          )}
          <a
            href={`/api/export?scope=evaluation&format=excel&lang=${locale}`}
            download="use-case-evaluation.xls"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
          >
            {ui.exportExcel}
          </a>
          <EvaluationMailExportButton
            locale={isEn ? "en" : "de"}
            scenarioCount={scenarioEvals.length}
            useCaseCount={useCaseEvals.length}
          />
        </div>
      </header>

      <div className="flex gap-2 border-b border-[var(--card-border)]">
        <Link
          href={`/evaluation?tab=scenario${catParam}`}
          prefetch={false}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "scenario"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {t.evaluation.scenarioTab}
        </Link>
        <Link
          href={`/evaluation?tab=usecase${catParam}`}
          prefetch={false}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "usecase"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {t.evaluation.useCaseTab}
        </Link>
        <Link
          href={`/evaluation?tab=overview${catParam}`}
          prefetch={false}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "overview"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {t.evaluation.overviewTab}
        </Link>
      </div>

      {params.saved === "1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.evaluation.saved}
        </div>
      )}
      {params.feedback === "1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.evaluation.feedbackSaved}
        </div>
      )}

      {activeTab === "overview" ? (
        <Section title={t.evaluation.overviewTitle} description={t.evaluation.overviewDesc}>
          {scenarioEvals.length === 0 && useCaseEvals.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t.evaluation.overviewNoEvaluations}</p>
          ) : (
            <EvaluationOverviewTable
              scenarioEvals={scenarioEvals}
              useCaseEvals={useCaseEvals}
              locale={isEn ? "en" : "de"}
              t={{
                overviewDate: t.evaluation.overviewDate,
                overviewScenario: t.evaluation.overviewScenario,
                overviewUseCase: t.evaluation.overviewUseCase,
                overviewQuestion: t.evaluation.overviewQuestion,
                overviewUserPrefers: t.evaluation.overviewUserPrefers,
                preferUser: t.evaluation.preferUser,
                preferAi: t.evaluation.preferAi,
                evalUserConfidence: t.evaluation.evalUserConfidence ?? "User-Konfidenz (1–10)",
                evalVerstaendlichkeit: t.evaluation.evalVerstaendlichkeit ?? "Verständlichkeit",
                evalRelevanz: t.evaluation.evalRelevanz ?? "Relevanz",
                evalNuetzlichkeit: t.evaluation.evalNuetzlichkeit ?? "Nützlichkeit",
                evalVollstaendigkeit: t.evaluation.evalVollstaendigkeit ?? "Vollständigkeit",
                evalNachvollziehbarkeit: t.evaluation.evalNachvollziehbarkeit ?? "Nachvollziehbarkeit",
                evalPraktikabilitaet: t.evaluation.evalPraktikabilitaet ?? "Praktikabilität",
                evalVertrauen: t.evaluation.evalVertrauen ?? "Vertrauen",
                evalQuellenqualitaet: t.evaluation.evalQuellenqualitaet ?? "Quellenqualität",
                deleteBtn: t.evaluation.deleteBtn,
                deleteConfirmTitle: t.evaluation.deleteConfirmTitle,
                deleteConfirmText: t.evaluation.deleteConfirmText,
                deleteConfirmCancel: t.evaluation.deleteConfirmCancel,
                deleteConfirmOk: t.evaluation.deleteConfirmOk,
              }}
              onDeleteScenario={deleteScenarioEvaluation}
              onDeleteUseCase={deleteUseCaseEvaluation}
            />
          )}
        </Section>
      ) : activeTab === "scenario" ? (
        <ScenarioEvaluationFlow
          locale={locale}
          t={scenarioT}
          onSaveStep1={saveScenarioStep1}
          onSaveStep2={saveScenarioStep2}
          onSaveStep3={saveScenarioStep3}
          initialCategory={category}
        />
      ) : (
        <>
          <Section
            title={t.evaluation.step1Title}
            description={t.evaluation.step1Desc}
          >
            <form action={saveUseCase} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  {t.evaluation.useCaseLabel}
                </label>
                <textarea
                  name="useCaseDescription"
                  rows={3}
                  placeholder={t.evaluation.useCasePlaceholder}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm placeholder:text-[var(--muted)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  {t.evaluation.decisionApproachLabel}
                </label>
                <textarea
                  name="userDecisionApproach"
                  rows={4}
                  placeholder={t.evaluation.decisionApproachPlaceholder}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm placeholder:text-[var(--muted)]"
                  required
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                {t.evaluation.save}
              </button>
            </form>
          </Section>

          <Section
            title={t.evaluation.step2Title}
            description={t.evaluation.runScenarioDesc}
          >
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
              >
                → {ui.goToPlans}
              </Link>
              <Link
                href="/runs"
                className="rounded-xl border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
              >
                → {ui.goToRuns}
              </Link>
            </div>
          </Section>

          <Section
            title={t.evaluation.step3Title}
            description={t.evaluation.step3Desc}
          >
            {evaluations.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {t.evaluation.saveFirstHint}
              </p>
            ) : (
              <div className="space-y-4">
                {evaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4"
                  >
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {ev.useCaseDescription.slice(0, 80)}…
                    </p>
                    <form action={saveQuestionnaire} className="mt-4 space-y-3">
                      <input type="hidden" name="id" value={ev.id} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            {ui.userOneWord}
                          </label>
                          <input
                            name="userOneWord"
                            maxLength={30}
                            placeholder={ui.exYes}
                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            {ui.userConfidence}
                          </label>
                          <input
                            type="number"
                            name="userOneWordConfidence"
                            min={0}
                            max={100}
                            placeholder={ui.ex82}
                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            {ui.aiOneWord}
                          </label>
                          <input
                            name="aiOneWord"
                            maxLength={30}
                            placeholder={ui.exNo}
                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            {ui.aiConfidence}
                          </label>
                          <input
                            type="number"
                            name="aiOneWordConfidence"
                            min={0}
                            max={100}
                            placeholder={ui.ex64}
                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                            {ui.confidenceInAi}
                        </label>
                        <input
                          type="number"
                          name="userConfidenceInAi"
                          min={0}
                          max={100}
                          placeholder={ui.ex40}
                          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm md:w-56"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                          {t.evaluation.questionnaireHelpful}
                        </label>
                        <select
                          name="helpful"
                          className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                          {t.evaluation.questionnaireFit}
                        </label>
                        <select
                          name="fit"
                          className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                          {t.evaluation.questionnaireNotes}
                        </label>
                        <textarea
                          name="notes"
                          rows={2}
                          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                      >
                        {t.evaluation.save}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

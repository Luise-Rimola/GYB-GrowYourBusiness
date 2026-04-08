import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { ScenarioEvaluationFlow } from "@/components/ScenarioEvaluationFlow";
import { EvaluationOverviewTable } from "@/components/EvaluationOverviewTable";
import { getSessionFromCookies } from "@/lib/session";

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
  } as const;
  const params = await searchParams;
  if (params.tab === "usecase") {
    const sp = new URLSearchParams();
    sp.set("tab", "scenario");
    if (params.saved) sp.set("saved", params.saved);
    if (params.feedback) sp.set("feedback", params.feedback);
    if (params.category) sp.set("category", params.category);
    redirect(`/evaluation?${sp.toString()}`);
  }
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

  const activeTab = params.tab === "overview" ? "overview" : "scenario";
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
          <div className="mt-6 flex flex-wrap gap-3">
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
          </div>
        </Section>
      ) : (
        <ScenarioEvaluationFlow
          locale={locale}
          t={scenarioT}
          onSaveStep1={saveScenarioStep1}
          onSaveStep2={saveScenarioStep2}
          onSaveStep3={saveScenarioStep3}
          initialCategory={category}
        />
      )}
    </div>
  );
}

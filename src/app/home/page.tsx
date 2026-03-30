import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenarios";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { loadAssistantSteps } from "@/lib/assistantSteps";
import { AssistantStepsList } from "@/components/AssistantStepsList";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; category?: string }>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const [latestProfile, kpiValues, kpiSet, runs, decisions, participant] = await Promise.all([
    prisma.companyProfile.findFirst({
      where: { companyId: company.id },
      orderBy: { version: "desc" },
    }),
    prisma.kpiValue.findMany({ where: { companyId: company.id } }),
    prisma.companyKpiSet.findFirst({
      where: { companyId: company.id },
      orderBy: { version: "desc" },
    }),
    prisma.run.findMany({ where: { companyId: company.id } }),
    prisma.decision.findMany({ where: { companyId: company.id } }),
    getOrCreateStudyParticipant(company.id),
  ]);

  const profileComplete = latestProfile
    ? Math.round(latestProfile.completenessScore * 100)
    : 0;
  const selectedCount = (kpiSet?.selectedKpisJson as string[] | null)?.length ?? 0;
  const kpiCoverage =
    selectedCount > 0 && kpiValues.length > 0
      ? Math.round((kpiValues.length / selectedCount) * 100)
      : kpiValues.length > 0
        ? 50
        : 0;
  const activeRuns = runs.filter((r) =>
    ["draft", "running", "incomplete"].includes(r.status)
  ).length;
  const completedRuns = runs.filter((r) =>
    ["complete", "approved"].includes(r.status)
  ).length;
  const implementedDecisions = decisions.filter((d) => d.status === "scaled").length;

  const nextSteps = await loadAssistantSteps({
    companyId: company.id,
    participantId: participant.id,
    participantCompletedFb1: participant.completedFb1,
    participantCompletedFb5: Boolean((participant as { completedFb5?: boolean }).completedFb5),
    profileCompletePercent: profileComplete,
    t: {
      common: { viewArtifacts: t.common.viewArtifacts },
      home: { companyProfile: t.home.companyProfile, stepLlm: t.home.stepLlm, step2: t.home.step2, step5: t.home.step5, step6: t.home.step6 },
      study: {
        fb1Title: t.study.fb1Title,
        studyInfoStep: t.study.studyInfoStep,
        fb2Title: t.study.fb2Title,
        studyWorkflowStep: t.study.studyWorkflowStep,
        fb3Title: t.study.fb3Title,
        fb4Title: t.study.fb4Title,
        fb5Title: t.study.fb5Title,
      },
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-5">
        <Badge label={t.home.badge} tone="success" />
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
          {t.home.title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          {t.home.subtitle}
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {t.home.subtitleDetails}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/assistant"
            prefetch={false}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 hover:shadow-teal-500/30"
          >
            {t.home.startAssistant}
          </Link>
        </div>
      </header>

      {params.saved === "fb1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb1Saved}
        </div>
      )}
      {params.saved === "fb2" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb2Saved}
          {params.category && (
            <span className="ml-1 text-[var(--muted)]">
              ({SCENARIO_CATEGORIES[params.category as ScenarioCategory] ?? params.category})
            </span>
          )}
        </div>
      )}
      {params.saved === "fb3" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb3Saved}
          {params.category && (
            <span className="ml-1 text-[var(--muted)]">
              ({SCENARIO_CATEGORIES[params.category as ScenarioCategory] ?? params.category})
            </span>
          )}
        </div>
      )}

      <div className="hidden overflow-x-auto pb-1">
        <div className="grid min-w-[980px] grid-cols-4 gap-5">
          <StatCard
            href="/profile"
            title={t.home.companyProfile}
            value={latestProfile ? `v${latestProfile.version}` : "—"}
            hint={`${profileComplete}% ${t.home.complete}`}
          />
          <StatCard
            href="/insights"
            title={t.home.kpiCoverage}
            value={kpiCoverage ? `${kpiCoverage}%` : "—"}
            hint={kpiValues.length > 0 ? `${kpiValues.length} ${t.home.values}` : t.home.addKpisInData}
          />
          <StatCard
            href="/runs"
            title={t.home.activeRuns}
            value={String(activeRuns)}
            hint={runs.length > 0 ? `${completedRuns}/${runs.length} ${t.home.runsCompleted}` : t.home.startWorkflow}
          />
          <StatCard
            href="/decisions"
            title={t.home.decisions}
            value={String(implementedDecisions)}
            hint={decisions.length > 0 ? `${implementedDecisions}/${decisions.length} ${t.home.total}` : t.home.runNextBestActions}
          />
        </div>
      </div>

      <Section
        title={t.common.nextSteps}
        description={t.home.guidedPath}
      >
        <AssistantStepsList steps={nextSteps} />
      </Section>

      <Link
        href="/chat?new=1"
        prefetch={false}
        aria-label={locale === "de" ? "Neuen KI-Berater-Chat starten" : "Start new AI advisor chat"}
        title={locale === "de" ? "KI-Berater" : "AI advisor"}
        className="group fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-500/30 transition hover:scale-105 hover:bg-teal-700"
      >
        <span className="text-xl leading-none">🤖</span>
        <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition group-hover:opacity-100 dark:bg-zinc-800">
          {locale === "de" ? "KI-Berater" : "AI advisor"}
        </span>
      </Link>
    </div>
  );
}

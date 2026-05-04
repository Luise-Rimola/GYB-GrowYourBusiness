import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { loadAssistantSteps } from "@/lib/assistantSteps";
import { AssistantStepsList } from "@/components/AssistantStepsList";
import { HomeExportPackageButton } from "@/components/HomeExportPackageButton";

async function safeDb<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

async function HomePageContent({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; category?: string; openExport?: string }>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const latestProfile = await safeDb(
    () =>
      prisma.companyProfile.findFirst({
        where: { companyId: company.id },
        orderBy: { version: "desc" },
      }),
    null
  );
  const kpiValues = await safeDb(() => prisma.kpiValue.findMany({ where: { companyId: company.id } }), []);
  const kpiSet = await safeDb(
    () =>
      prisma.companyKpiSet.findFirst({
        where: { companyId: company.id },
        orderBy: { version: "desc" },
      }),
    null
  );
  const runs = await safeDb(() => prisma.run.findMany({ where: { companyId: company.id } }), []);
  const decisions = await safeDb(() => prisma.decision.findMany({ where: { companyId: company.id } }), []);
  const participant = await safeDb(
    () => getOrCreateStudyParticipant(company.id),
    {
      id: "",
      completedFb1: false,
      completedFb5: false,
    } as { id: string; completedFb1: boolean; completedFb5?: boolean }
  );

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
    locale,
    includeHandbookStep: false,
    t: {
      common: { viewArtifacts: t.common.viewArtifacts },
      home: {
        handbookStep: t.home.handbookStep,
        companyProfile: t.home.companyProfile,
        stepLlm: t.home.stepLlm,
        step2: t.home.step2,
        step5: t.home.step5,
        step6: t.home.step6,
        step7Mail: t.home.step7Mail,
      },
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
  }).catch((err: unknown) => {
    console.error("[home] loadAssistantSteps failed:", err);
    return [
      { href: "/assistant?start=1", label: t.home.startAssistant, completed: false },
      { href: "/manual", label: t.home.openGuide, completed: false },
    ];
  });

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-5">
        <Badge label={t.home.badge} tone="success" />
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
          {t.home.title}
        </h1>
        <p className="w-full text-lg leading-relaxed text-[var(--muted)]">
          {t.home.subtitle}
        </p>
        <p className="w-full text-sm leading-relaxed text-[var(--muted)]">
          {t.home.subtitleDetails}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/assistant?start=1"
            prefetch={false}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 hover:shadow-teal-500/30"
          >
            {t.home.startAssistant}
          </Link>
          <HomeExportPackageButton locale={locale} autoOpen={params.openExport === "1"} />
        </div>
      </header>

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

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50 p-6">
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className="flex w-full items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
                className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 transition-transform duration-200 group-open:rotate-90 dark:text-teal-400"
              >
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {t.common.nextSteps}
                </h2>
                <p className="text-sm text-[var(--muted)]">{t.home.guidedPath}</p>
              </div>
            </div>
          </summary>
          <div className="mt-5 space-y-4 border-t border-[var(--card-border)] pt-5">
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900/60 dark:bg-teal-950/25">
              <p className="text-sm font-semibold text-[var(--foreground)]">{t.home.studyInfoTitle}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{t.home.studyInfoBody}</p>
              <Link
                href="/manual"
                className="mt-3 inline-flex items-center rounded-lg border border-teal-300 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100/70 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-900/40"
              >
                {t.home.openGuide}
              </Link>
            </div>
            <AssistantStepsList steps={nextSteps} />
          </div>
        </details>
      </section>

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

export default async function Home(props: {
  searchParams: Promise<{ saved?: string; category?: string; openExport?: string }>;
}) {
  try {
    return await HomePageContent(props);
  } catch (err) {
    unstable_rethrow(err);
    const errorId = `home-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let params: { saved?: string; category?: string; openExport?: string } = {};
    try {
      params = await props.searchParams;
    } catch {
      // ignore parsing issues in telemetry fallback
    }
    console.error("[home][fatal-render]", {
      errorId,
      params,
      error:
        err instanceof Error
          ? {
              name: err.name,
              message: err.message,
              stack: err.stack,
              cause: err.cause,
            }
          : err,
    });
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="text-lg font-semibold">Startseite konnte nicht vollständig geladen werden</h2>
        <p className="mt-2 text-sm">
          Ein unerwarteter Server-Fehler wurde abgefangen. Bitte laden Sie die Startseite neu.
        </p>
        <p className="mt-2 rounded-md bg-amber-100/80 px-3 py-2 font-mono text-xs dark:bg-amber-900/30">
          Fehler-ID: {errorId}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/home" className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Startseite neu laden
          </Link>
          <Link href="/" className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
            Zur Landingpage
          </Link>
        </div>
      </div>
    );
  }
}

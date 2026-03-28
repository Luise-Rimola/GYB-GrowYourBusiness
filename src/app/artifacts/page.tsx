import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { ARTIFACT_LABELS, PLANNING_PHASES, WORKFLOW_TO_ARTIFACTS } from "@/lib/planningFramework";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { getArtifactEvaluationsByCompany } from "@/lib/artifactEvaluations";
import { getEarlyWarningDetails, getEarlyWarningPrimaryRiskText, hasEarlyWarningSignal } from "@/lib/earlyWarning";
import { EarlyWarningPopover } from "@/components/EarlyWarningPopover";

function displayArtifactName(
  artifact: { title: string; type: string; run?: { workflowKey: string } | null },
  locale: "de" | "en"
) {
  if (artifact.run?.workflowKey === "WF_IDEA_USP_VALIDATION" && artifact.type === "value_proposition") {
    return locale === "en" ? "Idea & USP Validation" : "Idee- & USP-Validierung";
  }
  if (artifact.run?.workflowKey === "WF_LEGAL_FOUNDATION" && artifact.type === "startup_guide") {
    return locale === "en" ? "Legal Requirements & Company Form" : "Rechtliche Vorgaben & Unternehmensform";
  }
  return artifact.title || ARTIFACT_LABELS[artifact.type] || artifact.type;
}

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; tab?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const isEn = locale === "en";
  const copy = {
    warningWhy: isEn ? "Why this warning?" : "Warum dieser Hinweis?",
    tabLibrary: isEn ? "Artifacts Library" : "Artefakt-Bibliothek",
    tabEvaluations: isEn ? "Artifact Evaluations" : "Artefakt-Evaluationen",
    exportSpss: isEn ? "SPSS Download" : "SPSS-Download",
    exportPdf: isEn ? "PDF (Questions/Answers + Table)" : "PDF (Fragen/Antworten + Tabelle)",
    exportExcel: isEn ? "Excel (Analysis + Logs)" : "Excel (Auswertung + Logs)",
    colArtifact: isEn ? "Artifact" : "Artefakt",
    colQuality: isEn ? "Quality" : "Qualität",
    colSources: isEn ? "Sources" : "Quellen",
    colRealism: isEn ? "Realism" : "Realismus",
    colClarity: isEn ? "Clarity" : "Verständlichkeit",
    colStructure: isEn ? "Structure" : "Struktur",
    colHallucination: isEn ? "Hallucination" : "Halluzination",
    colDate: isEn ? "Date" : "Datum",
    noArtifacts: isEn ? "No artifacts yet." : "Noch keine Artefakte vorhanden.",
    noArtifactsInPhase: isEn ? "No artifacts in this phase." : "Keine Artefakte in dieser Phase.",
    moreArtifacts: isEn ? "More Artifacts" : "Weitere Artefakte",
    yes: isEn ? "Yes" : "Ja",
    no: isEn ? "No" : "Nein",
    boardsTitle: isEn ? "Boards & Launch Plan" : "Boards & Launch Plan",
    checklistTitle: isEn ? "Checklist" : "Checkliste",
    checklistDesc: isEn
      ? "Launch plan / checklist (logo, website, suppliers, …)"
      : "Launch-Plan / Checkliste (Logo, Website, Lieferanten, …)",
    checklistProgressLabel: isEn ? "Progress" : "Fortschritt",
    checklistInit: isEn
      ? "Initialized on first open (not auto-completed)."
      : "Wird beim ersten Aufruf initialisiert (nicht automatisch erledigt).",
    decisionTitle: isEn ? "Decision Board" : "Decision Board",
    decisionDesc: isEn
      ? "Decision Board (Top Decisions + 30/60/90)"
      : "Decisions Board (Top Decisions + 30/60/90)",
    decisionReady: isEn ? "Ready: Decision Pack exists." : "Bereit: Decision Pack ist vorhanden.",
    decisionMissing: isEn
      ? "Not created yet: generated after workflow 'Top Decisions' (WF_NEXT_BEST_ACTIONS)."
      : "Noch nicht erstellt: entsteht nach Workflow 'Top Decisions' (WF_NEXT_BEST_ACTIONS).",
    dateLocale: isEn ? "en-US" : "de-DE",
  } as const;
  const company = await getOrCreateDemoCompany();
  const allArtifacts = await prisma.artifact.findMany({
    where: { companyId: company.id },
    include: { run: { select: { workflowKey: true } } },
    orderBy: { createdAt: "desc" },
  });
  const params = await searchParams;
  const createdCount = params.created ? Number(params.created) : 0;
  const activeTab = params.tab === "evaluations" ? "evaluations" : "library";

  // Show newest artifact per workflow+type (keeps validation artifacts separate)
  const seenWorkflowType = new Set<string>();
  const artifacts = allArtifacts.filter((a) => {
    const key = `${a.run?.workflowKey ?? "no-workflow"}:${a.type}`;
    if (seenWorkflowType.has(key)) return false;
    seenWorkflowType.add(key);
    return true;
  });

  const phaseSections = PLANNING_PHASES.map((phase) => {
    const phaseArtifacts = phase.workflowKeys.flatMap((wfKey) => {
      const wfArtifactTypes = WORKFLOW_TO_ARTIFACTS[wfKey] ?? [];
      return wfArtifactTypes
        .map((artifactType) => artifacts.find((a) => a.type === artifactType && a.run?.workflowKey === wfKey))
        .filter(Boolean) as typeof artifacts;
    });
    return { id: phase.id, name: phase.name, artifacts: phaseArtifacts };
  });
  const phaseArtifactTypeSet = new Set(phaseSections.flatMap((section) => section.artifacts.map((a) => a.type)));
  const unassignedArtifacts = artifacts.filter((a) => !phaseArtifactTypeSet.has(a.type));
  const decisionPackArtifact = artifacts.find((a) => a.type === "decision_pack");
  let launchDoneCount = 0;
  let launchTotalCount = 0;
  if (prisma.launchStage) {
    const launchStages = await prisma.launchStage.findMany({
      where: { companyId: company.id },
      include: { steps: { select: { done: true } } },
    });
    launchTotalCount = launchStages.reduce((sum, stage) => sum + stage.steps.length, 0);
    launchDoneCount = launchStages.reduce(
      (sum, stage) => sum + stage.steps.filter((step) => step.done).length,
      0
    );
  }
  const evaluations = await getArtifactEvaluationsByCompany(company.id);
  const latestEvaluationByArtifactId = new Map<string, (typeof evaluations)[number]>();
  for (const ev of evaluations) {
    if (!latestEvaluationByArtifactId.has(ev.artifactId)) {
      latestEvaluationByArtifactId.set(ev.artifactId, ev);
    }
  }

  const ArtifactCard = ({ artifact }: { artifact: (typeof artifacts)[0] }) => (
    <div
      className="flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-teal-200 hover:shadow-md dark:hover:border-teal-800"
    >
      <Link href={`/artifacts/${artifact.id}`} className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--foreground)]">{displayArtifactName(artifact, locale)}</p>
        <p className="text-xs text-[var(--muted)]">{artifact.type} · v{artifact.version}</p>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        {hasEarlyWarningSignal(artifact) && (
          <EarlyWarningPopover
            size="compact"
            panelTitle={copy.warningWhy}
            primaryRiskText={getEarlyWarningPrimaryRiskText(artifact)}
            detailMessages={getEarlyWarningDetails(artifact)}
          />
        )}
        <Link
          href={`/artifacts/${artifact.id}/evaluate`}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          {t.artifacts.evaluateArtifact}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <Section
        title={t.artifacts.title}
        description={t.artifacts.description}
      >
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-[var(--card-border)]">
            <Link
              href="/artifacts"
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === "library"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {copy.tabLibrary}
            </Link>
            <Link
              href="/artifacts?tab=evaluations"
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === "evaluations"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {copy.tabEvaluations}
            </Link>
          </div>
          {createdCount > 0 && (
            <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200">
              {t.artifacts.createdCount.replace("{count}", String(createdCount))}
            </p>
          )}
          {activeTab === "evaluations" && (
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/export?scope=artifacts&format=spss&lang=${locale}`}
                download="artifact-evaluations.csv"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
              >
                {copy.exportSpss}
              </a>
              {isEn ? (
                <a
                  href="/api/export?scope=artifacts&format=pdf&lang=en"
                  download="artifact-evaluations-en.pdf"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
                >
                  PDF Download (EN)
                </a>
              ) : (
                <a
                  href="/api/export?scope=artifacts&format=pdf&lang=de"
                  download="artifact-evaluations-de.pdf"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
                >
                  PDF Download (DE)
                </a>
              )}
              <a
                href={`/api/export?scope=artifacts&format=excel&lang=${locale}`}
                download="artifact-evaluations.xls"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
              >
                {copy.exportExcel}
              </a>
            </div>
          )}
          {activeTab === "evaluations" ? (
            artifacts.length === 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colArtifact}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colQuality}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colSources}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colRealism}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colClarity}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colStructure}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colHallucination}</th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-sm text-[var(--muted)]">
                        {copy.noArtifacts}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-6">
                {phaseSections.map((section) => (
                  <div key={`eval-${section.id}`}>
                    <h3 className="mb-3 text-base font-semibold text-[var(--foreground)]">{section.name}</h3>
                    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colArtifact}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colQuality}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colSources}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colRealism}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colClarity}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colStructure}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colHallucination}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colDate}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.artifacts.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-4 text-sm text-[var(--muted)]">
                                {copy.noArtifactsInPhase}
                              </td>
                            </tr>
                          ) : (
                            section.artifacts.map((artifact) => {
                              const ev = latestEvaluationByArtifactId.get(artifact.id);
                              return (
                                <tr key={artifact.id} className="border-b border-[var(--card-border)]/60">
                                  <td className="px-4 py-3">
                                    <Link href={`/artifacts/${artifact.id}`} className="font-medium text-teal-700 hover:underline dark:text-teal-300">
                                      {displayArtifactName(artifact, locale)}
                                    </Link>
                                    <span className="ml-2 inline-flex align-middle">
                                      {hasEarlyWarningSignal(artifact) && (
                                        <EarlyWarningPopover
                                          size="compact"
                                          panelTitle={copy.warningWhy}
                                          primaryRiskText={getEarlyWarningPrimaryRiskText(artifact)}
                                          detailMessages={getEarlyWarningDetails(artifact)}
                                        />
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.answerQuality}/5` : "—"}</td>
                                  <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.sourceQuality}/5` : "—"}</td>
                                  <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.realism}/5` : "—"}</td>
                                  <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.clarity}/5` : "—"}</td>
                                  <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.structure}/5` : "—"}</td>
                                  <td className="px-4 py-3 text-[var(--muted)]">{ev ? (ev.hallucinationPresent ? copy.yes : copy.no) : "—"}</td>
                                  <td className="px-4 py-3 text-[var(--muted)]">{ev ? new Date(ev.createdAt).toLocaleDateString(copy.dateLocale, { dateStyle: "short" }) : "—"}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {unassignedArtifacts.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-base font-semibold text-[var(--foreground)]">{copy.moreArtifacts}</h3>
                    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colArtifact}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colQuality}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colSources}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colRealism}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colClarity}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colStructure}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colHallucination}</th>
                            <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{copy.colDate}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unassignedArtifacts.map((artifact) => {
                            const ev = latestEvaluationByArtifactId.get(artifact.id);
                            return (
                              <tr key={artifact.id} className="border-b border-[var(--card-border)]/60">
                                <td className="px-4 py-3">
                                  <Link href={`/artifacts/${artifact.id}`} className="font-medium text-teal-700 hover:underline dark:text-teal-300">
                                    {displayArtifactName(artifact, locale)}
                                  </Link>
                                  <span className="ml-2 inline-flex align-middle">
                                    {hasEarlyWarningSignal(artifact) && (
                                      <EarlyWarningPopover
                                        size="compact"
                                        panelTitle={copy.warningWhy}
                                        primaryRiskText={getEarlyWarningPrimaryRiskText(artifact)}
                                        detailMessages={getEarlyWarningDetails(artifact)}
                                      />
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.answerQuality}/5` : "—"}</td>
                                <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.sourceQuality}/5` : "—"}</td>
                                <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.realism}/5` : "—"}</td>
                                <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.clarity}/5` : "—"}</td>
                                <td className="px-4 py-3 text-[var(--muted)]">{ev ? `${ev.structure}/5` : "—"}</td>
                                <td className="px-4 py-3 text-[var(--muted)]">{ev ? (ev.hallucinationPresent ? copy.yes : copy.no) : "—"}</td>
                                <td className="px-4 py-3 text-[var(--muted)]">{ev ? new Date(ev.createdAt).toLocaleDateString(copy.dateLocale, { dateStyle: "short" }) : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h3 className="mb-3 text-base font-semibold text-[var(--foreground)]">{copy.boardsTitle}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Link
                    href="/checklist"
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-4 transition hover:border-teal-300 hover:bg-teal-50/40 dark:hover:border-teal-700 dark:hover:bg-teal-950/20"
                  >
                    <p className="font-semibold text-[var(--foreground)]">{copy.checklistTitle}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{copy.checklistDesc}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {launchTotalCount > 0
                        ? `${copy.checklistProgressLabel}: ${launchDoneCount}/${launchTotalCount} ${isEn ? "done" : "erledigt"}.`
                        : copy.checklistInit}
                    </p>
                  </Link>
                  <Link
                    href="/decisions"
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-4 transition hover:border-teal-300 hover:bg-teal-50/40 dark:hover:border-teal-700 dark:hover:bg-teal-950/20"
                  >
                    <p className="font-semibold text-[var(--foreground)]">{copy.decisionTitle}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{copy.decisionDesc}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {decisionPackArtifact
                        ? copy.decisionReady
                        : copy.decisionMissing}
                    </p>
                  </Link>
                </div>
              </div>
              {artifacts.length === 0 ? (
                <></>
              ) : (
                <>
              {phaseSections.map((section) => (
                <div key={section.id}>
                  <h3 className="mb-3 text-base font-semibold text-[var(--foreground)]">{section.name}</h3>
                  {section.artifacts.length > 0 ? (
                    <div className="space-y-3">
                      {section.artifacts.map((artifact) => (
                        <ArtifactCard key={artifact.id} artifact={artifact} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-4 text-sm text-[var(--muted)]">
                      {copy.noArtifactsInPhase}
                    </p>
                  )}
                </div>
              ))}
              {unassignedArtifacts.length > 0 && (
                <div>
                  <h3 className="mb-3 text-base font-semibold text-[var(--foreground)]">{copy.moreArtifacts}</h3>
                  <div className="space-y-3">
                    {unassignedArtifacts.map((artifact) => (
                      <ArtifactCard key={artifact.id} artifact={artifact} />
                    ))}
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}
        </div>
      </Section>
    </div>
  );
}

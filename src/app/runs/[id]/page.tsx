import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { RunWizard } from "@/components/RunWizard";
import { AuditTrailTabs } from "@/components/AuditTrailTabs";
import { KpiQuestionsForm } from "@/components/KpiQuestionsForm";
import { renderPrompt } from "@/lib/promptRenderer";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { submitKpiAnswersAction } from "@/app/actions";
import { SchemaKey } from "@/types/schemas";
import { getWorkflowName, getWorkflowSubtitle, getWorkflowExplanationLines } from "@/lib/workflows";
import { mergeRunStepsIntoContext, workflowSteps } from "@/lib/workflowSteps";
import { filterContextForStep } from "@/services/contextPack";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

async function verifyStep(formData: FormData) {
  "use server";
  const stepId = String(formData.get("step_id"));
  const notes = String(formData.get("notes") || "");
  const runId = String(formData.get("run_id"));
  const step = formData.get("step");
  if (!stepId) return;
  await WorkflowService.verifyStep(stepId, notes || undefined);
  const currentStep = Math.max(0, Number(step) || 0);
  const run = await prisma.run.findUnique({ where: { id: runId } });
  const stepCount = run ? (workflowSteps[run.workflowKey] ?? []).length : 5;
  const nextStep = Math.min(currentStep + 1, Math.max(0, stepCount - 1));
  redirect(`/runs/${runId}?step=${nextStep}`);
}

async function deleteStep(formData: FormData) {
  "use server";
  const stepId = String(formData.get("step_id"));
  const runId = String(formData.get("run_id"));
  if (!stepId) return;
  await WorkflowService.deleteStep(stepId);
  redirect(`/runs/${runId}`);
}

async function updateRunNotes(formData: FormData) {
  "use server";
  const runId = String(formData.get("run_id"));
  const ideaMode = String(formData.get("idea_mode") || "").trim();
  const ideaArtifactId = String(formData.get("idea_artifact_id") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!runId) return;

  let userNotes: string | null = null;

  if (ideaMode === "existing" && ideaArtifactId && ideaArtifactId.length > 0) {
    const artifact = await prisma.artifact.findFirst({
      where: { id: ideaArtifactId, type: "app_project_plan" },
    });
    if (artifact?.contentJson && typeof artifact.contentJson === "object") {
      const content = artifact.contentJson as Record<string, unknown>;
      const overview = content.project_overview ? String(content.project_overview) : "";
      const phases = Array.isArray(content.phases)
        ? (content.phases as Array<{ phase?: string; deliverables?: string[] }>)
          .map((p) => `- ${p.phase}${p.deliverables?.length ? `: ${p.deliverables.join(", ")}` : ""}`)
          .join("\n")
        : "";
      const summary = [overview, phases ? `Phasen:\n${phases}` : null].filter(Boolean).join("\n\n");
      userNotes = summary + (notes ? `\n\nZusätzliche Notizen:\n${notes}` : "");
    } else {
      userNotes = notes || null;
    }
  } else {
    userNotes = notes || null;
  }

  // Prisma Delegate kann bei Problemen mit `prisma generate` zur Laufzeit fehlen/abgelaufen sein.
  // Dann lieber robust per SQL updaten, statt UI mit PrismaClientValidationError zu crashten.
  try {
    await (prisma as any).run.update({
      where: { id: runId },
      data: {
        userNotes,
        ideaMode: ideaMode || null,
        ideaArtifactId: ideaArtifactId || null,
      },
    });
  } catch (e) {
    const executeRaw = (prisma as any).$executeRaw;
    if (typeof executeRaw === "function") {
      await executeRaw`
        UPDATE "Run"
        SET
          "userNotes" = ${userNotes},
          "ideaMode" = ${ideaMode || null},
          "ideaArtifactId" = ${ideaArtifactId || null}
        WHERE "id" = ${runId}
      `;
    } else {
      // $executeRaw sollte eigentlich existieren, aber fallback defensiv.
      const executeRawUnsafe = (prisma as any).$executeRawUnsafe;
      if (!executeRawUnsafe) throw e;
      await executeRawUnsafe(
        `UPDATE "Run" SET "userNotes" = ?, "ideaMode" = ?, "ideaArtifactId" = ? WHERE "id" = ?`,
        userNotes,
        ideaMode || null,
        ideaArtifactId || null,
        runId
      );
    }
  }
  redirect(`/runs/${runId}`);
}

async function updateStep(formData: FormData) {
  "use server";
  const stepId = String(formData.get("step_id"));
  const runId = String(formData.get("run_id"));
  const userResponse = String(formData.get("user_response"));
  const schemaKey = String(formData.get("schema_key")) as SchemaKey;
  if (!stepId || !userResponse) return;
  await WorkflowService.updateStep({ stepId, schemaKey, userResponse });
  const step = formData.get("step");
  const q = step != null ? `?step=${step}` : "";
  redirect(`/runs/${runId}${q}`);
}

async function submitBusinessForm(formData: FormData) {
  "use server";
  const runId = String(formData.get("run_id"));
  const run = await prisma.run.findUnique({ where: { id: runId } });
  if (!run) return;
  await import("@/lib/intake").then((m) => m.processIntakeForm(run.companyId, formData));
  if (run.workflowKey === "WF_BUSINESS_FORM") {
    try {
      await (prisma as any).run.update({ where: { id: runId }, data: { status: "complete" } });
    } catch {
      const executeRaw = (prisma as any).$executeRaw;
      if (typeof executeRaw === "function") {
        await executeRaw`
          UPDATE "Run"
          SET "status" = ${"complete"}
          WHERE "id" = ${runId}
        `;
      }
    }
    const { WIZARD_WORKFLOW_ORDER } = await import("@/lib/planningFramework");
    const [inProgress, completed] = await Promise.all([
      prisma.run.findMany({ where: { companyId: run.companyId, status: { in: ["draft", "running", "incomplete"] } } }),
      prisma.run.findMany({ where: { companyId: run.companyId, status: "complete" }, select: { workflowKey: true } }),
    ]);
    const completedKeys = new Set(completed.map((r) => r.workflowKey));
    for (const key of WIZARD_WORKFLOW_ORDER) {
      const existing = inProgress.find((r) => r.workflowKey === key);
      if (existing) redirect(`/runs/${existing.id}?step=0`);
      if (!completedKeys.has(key)) {
        const contextPack = await ContextPackService.build(run.companyId, key);
        const newRun = await WorkflowService.createRun(run.companyId, key, contextPack);
        redirect(`/runs/${newRun.id}?step=0`);
      }
    }
    redirect("/dashboard");
  }
  const step = formData.get("step");
  const q = step != null ? `?step=${step}` : "";
  redirect(`/runs/${runId}${q}`);
}

async function saveRunStep(formData: FormData) {
  "use server";
  const runId = String(formData.get("run_id"));
  const stepKey = String(formData.get("step_key"));
  const schemaKey = String(formData.get("schema_key")) as SchemaKey;
  const response = String(formData.get("user_response"));

  // App-Ideen: Notiz soll in prompt & DB landen (auch wenn der Nutzer den separaten "Notizen speichern"-Button noch nicht gedrückt hat).
  const notes = String(formData.get("notes") || "");
  const ideaMode = String(formData.get("idea_mode") || "").trim(); // "new" | "existing"
  const ideaArtifactId = String(formData.get("idea_artifact_id") || "").trim();

  const run = await prisma.run.findUnique({ where: { id: runId }, include: { steps: true } });
  if (!run) return;
  const runStepsLatest = run.steps.reduce<typeof run.steps>((acc, step) => {
    const existing = acc.find((s) => s.stepKey === step.stepKey);
    if (!existing || new Date(step.createdAt) > new Date(existing.createdAt)) {
      return [...acc.filter((s) => s.stepKey !== step.stepKey), step];
    }
    return acc;
  }, []);
  const freshBase = (await ContextPackService.build(run.companyId, run.workflowKey)) as unknown as Record<string, unknown>;
  const needsMergedContext = ["kpi_gap_scan", "industry_research", "financial_planning", "financial_monthly_h1", "financial_monthly_h2", "app_requirements", "app_tech_spec", "app_mvp_guide", "app_page_specs", "app_db_schema"].includes(stepKey);
  let contextPack = needsMergedContext ? mergeRunStepsIntoContext(freshBase, runStepsLatest, stepKey) : freshBase;
  contextPack = filterContextForStep(contextPack, run.workflowKey, stepKey);
  const locale = await getServerLocale();
  const prompt = renderPrompt(run.workflowKey, stepKey, contextPack, locale);
  const userNotesForPrompt = notes.trim() || (run.userNotes ?? "").trim() || "(keine)";
  const promptRendered = prompt.rendered.replace("{{USER_NOTES}}", userNotesForPrompt);

  // Persistiere Notiz-/Ideenmetadaten in der Run (wichtig für späteres Speichern der nächsten Schritte).
  if (notes.trim() || ideaMode || ideaArtifactId) {
    const shouldOverwriteUserNotes = notes.trim().length > 0 || ideaMode === "new";
    const userNotesToStore = shouldOverwriteUserNotes
      ? notes.trim() ? notes.trim() : null
      : run.userNotes ?? null;
    try {
      await (prisma as any).run.update({
        where: { id: runId },
        data: {
          userNotes: userNotesToStore,
          ideaMode: ideaMode || null,
          ideaArtifactId: ideaArtifactId || null,
        },
      });
    } catch {
      const executeRaw = (prisma as any).$executeRaw;
      if (typeof executeRaw === "function") {
        await executeRaw`
          UPDATE "Run"
          SET
            "userNotes" = ${notes.trim() ? notes.trim() : null},
            "ideaMode" = ${ideaMode || null},
            "ideaArtifactId" = ${ideaArtifactId || null}
          WHERE "id" = ${runId}
        `;
      } else {
        const executeRawUnsafe = (prisma as any).$executeRawUnsafe;
        if (typeof executeRawUnsafe !== "function") return;
        await executeRawUnsafe(
          `UPDATE "Run" SET "userNotes" = ?, "ideaMode" = ?, "ideaArtifactId" = ? WHERE "id" = ?`,
          notes.trim() ? notes.trim() : null,
          ideaMode || null,
          ideaArtifactId || null,
          runId
        );
      }
    }
  }

  await WorkflowService.saveStep({
    runId,
    stepKey,
    schemaKey,
    promptRendered,
    userResponse: response,
    promptTemplateVersion: prompt.template.version,
  });
  const step = formData.get("step");
  const q = step != null ? `?step=${step}` : "";
  redirect(`/runs/${runId}${q}`);
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const { id } = await params;
  const run = await prisma.run.findUnique({
    where: { id },
    include: { steps: true },
  });

  if (!run) {
    notFound();
  }

  const runStepsLatest = run.steps.reduce<typeof run.steps>((acc, step) => {
    const existing = acc.find((s) => s.stepKey === step.stepKey);
    if (!existing || new Date(step.createdAt) > new Date(existing.createdAt)) {
      return [...acc.filter((s) => s.stepKey !== step.stepKey), step];
    }
    return acc;
  }, []);

  const steps = workflowSteps[run.workflowKey] ?? [];
  const hasBusinessFormStep = steps.some((s) => s.stepKey === "business_form");

  let businessFormStep: { existing: Record<string, unknown>; submitAction: (fd: FormData) => Promise<void>; isComplete: boolean } | undefined;
  if (hasBusinessFormStep && run.workflowKey === "WF_BUSINESS_FORM") {
    const [latestSession, latestProfile] = await Promise.all([
      prisma.intakeSession.findFirst({
        where: { companyId: run.companyId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.companyProfile.findFirst({
        where: { companyId: run.companyId },
        orderBy: { version: "desc" },
      }),
    ]);
    const existing = (latestSession?.answersJson ?? {}) as Record<string, unknown>;
    const isComplete = (latestProfile?.completenessScore ?? 0) >= 0.5;
    businessFormStep = {
      existing,
      submitAction: submitBusinessForm,
      isComplete,
    };
  }
  const completedStepKeys = new Set(runStepsLatest.map((s) => s.stepKey));
  if (hasBusinessFormStep && businessFormStep?.isComplete) completedStepKeys.add("business_form");

  const kpiPlanStep = runStepsLatest.find((s) => s.stepKey === "kpi_computation_plan");
  const kpiAnswersStep = runStepsLatest.find((s) => s.stepKey === "kpi_questions_answer");
  const hasKpiQuestionsStep = steps.some((s) => s.stepKey === "kpi_questions_answer");
  let kpiQuestionsStep: { plan: { questions_simple: string[]; mapping_to_kpi_keys: string[]; default_estimates_if_unknown: string[] }; existingAnswers: string[]; submitAction: (fd: FormData) => Promise<void>; isComplete: boolean } | undefined;
  if (hasKpiQuestionsStep && kpiPlanStep?.parsedOutputJson && typeof kpiPlanStep.parsedOutputJson === "object") {
    const plan = kpiPlanStep.parsedOutputJson as { questions_simple?: string[]; mapping_to_kpi_keys?: string[]; default_estimates_if_unknown?: string[] };
    const questions_simple = plan.questions_simple ?? [];
    const mapping_to_kpi_keys = plan.mapping_to_kpi_keys ?? [];
    const default_estimates_if_unknown = plan.default_estimates_if_unknown ?? [];
    const existingAnswers = (kpiAnswersStep?.parsedOutputJson as { answers?: string[] } | null)?.answers ?? [];
    kpiQuestionsStep = {
      plan: { questions_simple, mapping_to_kpi_keys, default_estimates_if_unknown },
      existingAnswers,
      submitAction: submitKpiAnswersAction,
      isComplete: kpiAnswersStep != null && kpiAnswersStep.schemaValidationPassed,
    };
  }

  const allStepsComplete = steps.length > 0 && steps.every((s) => completedStepKeys.has(s.stepKey));
  const verifiedCount = runStepsLatest.filter((s) => s.verifiedByUser).length;

  let appDevelopmentConfig: { existingIdeas: { id: string; title: string }[] } | undefined;
  if (run.workflowKey === "WF_APP_DEVELOPMENT") {
    const appIdeas = await prisma.artifact.findMany({
      where: { companyId: run.companyId, type: "app_project_plan" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    appDevelopmentConfig = {
      existingIdeas: appIdeas.map((a) => ({
        id: a.id,
        title: a.title || `App-Idee ${new Date(a.createdAt).toLocaleDateString("de-DE")}`,
      })),
    };
  }

  // Use fresh context with latest artifacts (real_estate, financial_planning, etc.) so ChatGPT gets the data
  const freshContext = await ContextPackService.build(run.companyId, run.workflowKey);
  const freshContextRecord = freshContext as unknown as Record<string, unknown>;

  return (
    <div className="space-y-8">
      <Section
        compact
        title={getWorkflowName(run.workflowKey)}
        description={
          <>
            <span className="block text-[11px] font-medium text-[var(--muted)]">{getWorkflowSubtitle(run.workflowKey, run.id, run.status)}</span>
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--muted)]">
              {getWorkflowExplanationLines(run.workflowKey).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-[var(--muted)]">Schritte</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {steps.map((s, i) => (
                  <span
                    key={s.stepKey}
                    className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)]"
                  >
                    {i + 1}. {s.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        }
        descriptionCollapsible
        descriptionToggleLabel="Workflow-Details anzeigen"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/runs"
              className="font-medium text-[var(--muted)] transition hover:text-teal-600 dark:hover:text-teal-400"
            >
              ← Alle Läufe
            </Link>
            {run.workflowKey !== "WF_BUSINESS_FORM" && (
              <>
                <span className="rounded-lg border border-[var(--card-border)] bg-slate-50 px-2.5 py-1 text-xs font-medium dark:bg-slate-900/50">
                  Schritte: {runStepsLatest.length}/{steps.length}
                </span>
                <span className="rounded-lg border border-[var(--card-border)] bg-slate-50 px-2.5 py-1 text-xs font-medium dark:bg-slate-900/50">
                  Verifiziert: {verifiedCount}/{runStepsLatest.length}
                </span>
              </>
            )}
            {allStepsComplete && (
              <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                ✓ Abgeschlossen
              </span>
            )}
          </div>
        }
      >
        {null}
      </Section>

      <Section title="">
        <Suspense fallback={<div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">Wizard wird geladen…</div>}>
          <RunWizard
            run={{
              id: run.id,
              userNotes: run.userNotes ?? "",
              ideaMode: run.ideaMode ?? null,
              ideaArtifactId: run.ideaArtifactId ?? null,
              steps: runStepsLatest.map((s) => ({
                id: s.id,
                stepKey: s.stepKey,
                userPastedResponse: s.userPastedResponse,
                verifiedByUser: s.verifiedByUser,
                schemaValidationPassed: s.schemaValidationPassed,
                validationErrorsJson: s.validationErrorsJson ?? undefined,
              })),
            }}
            stepsConfig={steps}
            promptsByStepKey={Object.fromEntries(
              steps.map((s) => {
                if (s.stepKey === "business_form" || s.stepKey === "kpi_questions_answer") return [s.stepKey, ""];
                let context: Record<string, unknown> =
                  s.stepKey === "kpi_gap_scan" ||
                  s.stepKey === "industry_research" ||
                  s.stepKey === "personnel_plan" ||
                  s.stepKey === "financial_planning" ||
                  s.stepKey === "financial_monthly_h1" ||
                  s.stepKey === "financial_monthly_h2" ||
                  s.stepKey === "app_ideas" ||
                  s.stepKey === "app_requirements" ||
                  s.stepKey === "app_tech_spec" ||
                  s.stepKey === "app_mvp_guide" ||
                  s.stepKey === "app_page_specs" ||
                  s.stepKey === "app_db_schema"
                    ? mergeRunStepsIntoContext(freshContextRecord, runStepsLatest, s.stepKey)
                    : freshContextRecord;
                context = filterContextForStep(context, run.workflowKey, s.stepKey);
                const p = renderPrompt(run.workflowKey, s.stepKey, context, locale);
                return [s.stepKey, p.rendered];
              })
            )}
            saveStep={saveRunStep}
            verifyStep={verifyStep}
            updateStep={updateStep}
            saveRunNotes={updateRunNotes}
            runNotesLabel={locale === "de" ? "Was sollte die KI zu diesem Thema wissen?" : "What should the AI know about this topic?"}
            runNotesPlaceholder={t.runs.runNotesPlaceholder}
            businessFormStep={businessFormStep}
            kpiQuestionsStep={kpiQuestionsStep}
            appDevelopmentConfig={appDevelopmentConfig}
            showStepList={false}
          />
        </Suspense>
      </Section>

      {runStepsLatest.length > 0 && (
        <div id="pruefprotokoll">
          <Section title={locale === "de" ? "Prüfprotokoll" : "Audit Trail"} description="Ergebnisse pro Schritt prüfen.">
            <AuditTrailTabs
              steps={[...runStepsLatest]
                .sort((a, b) => {
                  const orderA = steps.findIndex((s) => s.stepKey === a.stepKey);
                  const orderB = steps.findIndex((s) => s.stepKey === b.stepKey);
                  return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
                })
                .map((step) => ({
                  id: step.id,
                  stepKey: step.stepKey,
                  stepLabel: steps.find((s) => s.stepKey === step.stepKey)?.label ?? step.stepKey,
                  stepNum: steps.findIndex((s) => s.stepKey === step.stepKey) + 1,
                  parsedOutputJson: step.parsedOutputJson,
                  validationErrorsJson: step.validationErrorsJson,
                  schemaValidationPassed: step.schemaValidationPassed,
                  verifiedByUser: step.verifiedByUser ?? false,
                  userPastedResponse: step.userPastedResponse,
                  verificationNotes: step.verificationNotes,
                }))}
              runId={run.id}
              schemaKeyByStepKey={Object.fromEntries(
                (workflowSteps[run.workflowKey] ?? []).map((s) => [s.stepKey, s.schemaKey])
              )}
              verifyStep={verifyStep}
              deleteStep={deleteStep}
              updateStep={updateStep}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

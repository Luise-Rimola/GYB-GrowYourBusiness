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
import { SchemaKey, supplierListSchema } from "@/types/schemas";
import { validateStrictJson } from "@/lib/validators";
import { getWorkflowName, getWorkflowSubtitle, getWorkflowExplanationLines } from "@/lib/workflows";
import { mergeRunStepsIntoContext, workflowSteps } from "@/lib/workflowSteps";
import { isRunProcessFullyComplete } from "@/lib/runProcessCompletion";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { AssistantRunEmbedBridge } from "@/components/AssistantRunEmbedBridge";
import { filterContextForStep } from "@/services/contextPack";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { getWorkflowStepStatus } from "@/lib/workflowStepStatus";
import { RunCompletionAdvanceButton } from "@/components/RunCompletionAdvanceButton";

function pickPreferredRunSteps<T extends { stepKey: string; createdAt: Date; schemaValidationPassed: boolean }>(steps: T[]): T[] {
  const byKey = new Map<string, T[]>();
  for (const step of steps) {
    const list = byKey.get(step.stepKey) ?? [];
    list.push(step);
    byKey.set(step.stepKey, list);
  }
  const preferred: T[] = [];
  for (const list of byKey.values()) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    preferred.push(list.find((step) => step.schemaValidationPassed) ?? list[0]);
  }
  return preferred;
}

function embedSuffix(formData: FormData): string {
  return String(formData.get("embed") || "") === "1" ? "&embed=1" : "";
}

function embedSuffixLeading(formData: FormData): string {
  return String(formData.get("embed") || "") === "1" ? "?embed=1" : "";
}

async function verifyStep(formData: FormData) {
  "use server";
  const stepId = String(formData.get("step_id"));
  const notes = String(formData.get("notes") || "");
  const runId = String(formData.get("run_id"));
  const step = formData.get("step");
  if (!stepId) return;
  await WorkflowService.verifyStep(stepId, notes || undefined);
  // Nach dem Verifizieren NICHT automatisch zum nächsten Schritt springen.
  // Nutzer sollen das Prüfprotokoll in Ruhe lesen können und selbst auf „Weiter →" klicken.
  const currentStep = Math.max(0, Number(step) || 0);
  redirect(`/runs/${runId}?step=${currentStep}${embedSuffix(formData)}`);
}

async function deleteStep(formData: FormData) {
  "use server";
  const stepId = String(formData.get("step_id"));
  const runId = String(formData.get("run_id"));
  const step = formData.get("step");
  if (!stepId) return;
  await WorkflowService.deleteStep(stepId);
  // Nach dem Löschen auf demselben Step bleiben, damit der Nutzer direkt eine neue Antwort eingeben kann.
  const q = step != null ? `?step=${step}${embedSuffix(formData)}` : embedSuffixLeading(formData);
  redirect(`/runs/${runId}${q}`);
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
  redirect(`/runs/${runId}${embedSuffixLeading(formData)}`);
}

async function updateStep(formData: FormData) {
  "use server";
  const stepId = String(formData.get("step_id"));
  const runId = String(formData.get("run_id"));
  const userResponse = String(formData.get("user_response"));
  const schemaKey = String(formData.get("schema_key")) as SchemaKey;
  const autoVerify = String(formData.get("from_llm_auto") || "") === "1";
  if (!stepId || !userResponse) return;
  await WorkflowService.updateStep({ stepId, schemaKey, userResponse, autoVerify });
  const step = formData.get("step");
  const q = step != null ? `?step=${step}${embedSuffix(formData)}` : embedSuffixLeading(formData);
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
    const embedTail = embedSuffix(formData);
    for (const key of WIZARD_WORKFLOW_ORDER) {
      const existing = inProgress.find((r) => r.workflowKey === key);
      if (existing) redirect(`/runs/${existing.id}?step=0${embedTail}`);
      if (!completedKeys.has(key)) {
        const contextPack = await ContextPackService.build(run.companyId, key);
        const newRun = await WorkflowService.createRun(run.companyId, key, contextPack);
        redirect(`/runs/${newRun.id}?step=0${embedTail}`);
      }
    }
    redirect("/dashboard");
  }
  const step = formData.get("step");
  const q = step != null ? `?step=${step}${embedSuffix(formData)}` : embedSuffixLeading(formData);
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
  const runStepsLatest = pickPreferredRunSteps(run.steps);
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

  const autoVerify = String(formData.get("from_llm_auto") || "") === "1";
  await WorkflowService.saveStep({
    runId,
    stepKey,
    schemaKey,
    promptRendered,
    userResponse: response,
    promptTemplateVersion: prompt.template.version,
    autoVerify,
  });
  const step = formData.get("step");
  const q = step != null ? `?step=${step}${embedSuffix(formData)}` : embedSuffixLeading(formData);
  redirect(`/runs/${runId}${q}`);
}

async function RunDetailPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ embed?: string; step?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const embedAssistant = String(sp.embed ?? "") === "1";
  const run = await prisma.run.findUnique({
    where: { id },
    include: { steps: true },
  });

  if (!run) {
    notFound();
  }

  let runStepsLatest = pickPreferredRunSteps(run.steps);

  // Auto-Heal: Wenn ein gespeicherter Schritt aktuell als ungültig markiert ist,
  // re-validieren wir mit dem *aktuellen* Schema. Schemas werden im Laufe der
  // Entwicklung toleranter (z. B. Alias-Maps, neue `.optional()`-Felder, Array-
  // Wrapper). Dadurch "heilen" alte Validierungsfehler automatisch, ohne dass
  // der Nutzer in jedem Tab "Korrigieren & erneut speichern" klicken muss.
  //
  // Zusätzlich rufen wir `WorkflowService.updateStep()` auf — das triggert die
  // vollen Side-Effects (Artifact erzeugen, Run.status = "complete" setzen,
  // strategy_indicators persistieren usw.), sodass das Dashboard anschließend
  // "Abgeschlossen" + "Lauf ansehen" zeigt und nicht weiter auf "Offen" hängt.
  // Idempotenz: wir triggern das nur, wenn `schemaValidationPassed === false`
  // — nach dem Heal ist das Flag true und der Zweig wird übersprungen.
  {
    const schemaKeyByStepKey = new Map<string, SchemaKey>();
    for (const s of workflowSteps[run.workflowKey] ?? []) {
      schemaKeyByStepKey.set(s.stepKey, s.schemaKey as SchemaKey);
    }
    const healPromises: Promise<unknown>[] = [];
    runStepsLatest = runStepsLatest.map((step) => {
      if (step.schemaValidationPassed) return step;
      const raw = step.userPastedResponse;
      if (!raw || typeof raw !== "string" || raw.trim().length === 0) return step;
      const schemaKey = schemaKeyByStepKey.get(step.stepKey);
      if (!schemaKey) return step;
      const validation = validateStrictJson(raw, schemaKey);
      if (!validation.ok) return step;
      healPromises.push(
        WorkflowService.updateStep({
          stepId: step.id,
          schemaKey,
          userResponse: raw,
          autoVerify: true,
        }).catch((err) => {
          console.warn("[runs/[id] auto-heal] updateStep failed:", err);
          return null;
        }),
      );
      return {
        ...step,
        parsedOutputJson: validation.data as object,
        schemaValidationPassed: true,
        validationErrorsJson: null,
        verifiedByUser: true,
      };
    });
    if (healPromises.length > 0) {
      await Promise.allSettled(healPromises);
    }
  }

  // Zweiter Heal-Durchlauf: Schritte sind validiert, aber `Run.status` ist
  // noch nicht "complete" und/oder das Artifact fehlt. Das passiert bei
  // historischen Läufen, in denen der Background-Worker den Step zwar
  // erfolgreich gespeichert hat, die Side-Effects (Artifact + run.status)
  // aber nie liefen. Wir triggern `updateStep` erneut – dank Dedup in den
  // Side-Effects entstehen keine doppelten Artifacts.
  {
    const steps = workflowSteps[run.workflowKey] ?? [];
    const requiredStepKeys = steps.map((s) => s.stepKey);
    const stepByKey = new Map(runStepsLatest.map((s) => [s.stepKey, s]));
    const allRequiredValidated = requiredStepKeys.length > 0
      && requiredStepKeys.every((k) => stepByKey.get(k)?.schemaValidationPassed === true);
    const runStatus = (run as unknown as { status?: string }).status;
    const needsRunComplete = allRequiredValidated && runStatus !== "complete" && runStatus !== "approved";
    if (needsRunComplete) {
      const schemaKeyByStepKey = new Map<string, SchemaKey>();
      for (const s of steps) schemaKeyByStepKey.set(s.stepKey, s.schemaKey as SchemaKey);
      // Re-run updateStep nur für den *letzten* Schritt — dessen Side-Effects
      // setzen in der Regel run.status = "complete" und legen das Artifact an.
      const lastKey = requiredStepKeys[requiredStepKeys.length - 1];
      const lastStep = stepByKey.get(lastKey);
      const lastSchemaKey = schemaKeyByStepKey.get(lastKey);
      if (lastStep && lastSchemaKey && typeof lastStep.userPastedResponse === "string" && lastStep.userPastedResponse.trim().length > 0) {
        try {
          await WorkflowService.updateStep({
            stepId: lastStep.id,
            schemaKey: lastSchemaKey,
            userResponse: lastStep.userPastedResponse,
            autoVerify: lastStep.verifiedByUser,
          });
        } catch (err) {
          console.warn("[runs/[id] run-level auto-heal] updateStep failed:", err);
        }
      }
    }
  }

  const runStepsDisplay = runStepsLatest.map((step) => {
    if (step.stepKey !== "supplier_list") return step;
    if (!step.parsedOutputJson) return step;
    const parsed = supplierListSchema.safeParse(step.parsedOutputJson);
    if (parsed.success) return step;
    return {
      ...step,
      schemaValidationPassed: false,
      verifiedByUser: false,
      validationErrorsJson: parsed.error.issues.map((issue) => {
        const path = issue.path.length ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      }),
    };
  });

  const steps = workflowSteps[run.workflowKey] ?? [];
  const stepParam = Math.max(0, Number(String(sp.step ?? "0")) || 0);
  const stepIndex = steps.length ? Math.min(stepParam, steps.length - 1) : 0;
  const nextStepHref = stepIndex < steps.length - 1
    ? `/runs/${run.id}?step=${stepIndex + 1}${embedAssistant ? "&embed=1" : ""}`
    : null;
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
  // Ein Schritt zählt nur dann als "abgeschlossen", wenn seine Schema-
  // Validierung erfolgreich war. Sonst würde der "✓ Abgeschlossen"-Chip auch
  // bei reinen Speicherungen mit Validierungsfehlern fälschlich erscheinen.
  const completedStepKeys = new Set(
    runStepsDisplay.filter((s) => s.schemaValidationPassed === true).map((s) => s.stepKey),
  );
  if (hasBusinessFormStep && businessFormStep?.isComplete) completedStepKeys.add("business_form");

  const kpiPlanStep = runStepsDisplay.find((s) => s.stepKey === "kpi_computation_plan");
  const kpiAnswersStep = runStepsDisplay.find((s) => s.stepKey === "kpi_questions_answer");
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
  const verifiedCount = runStepsDisplay.filter((s) => s.verifiedByUser).length;
  const allProcessStepsValid = isRunProcessFullyComplete(
    steps,
    runStepsDisplay.map((s) => ({ stepKey: s.stepKey, schemaValidationPassed: s.schemaValidationPassed })),
  );

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

  // Use fresh context with latest artifacts (real_estate, financial_planning, etc.) so ChatGPT gets the data.
  // If context building fails (e.g. malformed legacy artifact payload), keep the run page usable.
  let freshContextRecord: Record<string, unknown> = {};
  try {
    const freshContext = await ContextPackService.build(run.companyId, run.workflowKey);
    freshContextRecord = freshContext as unknown as Record<string, unknown>;
  } catch (err) {
    console.warn("[runs/[id]] context build failed, falling back to empty context:", err);
  }

  return (
    <div className="space-y-8">
      {embedAssistant ? (
        <AssistantRunEmbedBridge embed={embedAssistant} runId={run.id} allComplete={allProcessStepsValid} />
      ) : null}
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
                {steps.map((s, i) => {
                  const status = getWorkflowStepStatus(i, steps, runStepsDisplay, {
                    businessFormComplete: businessFormStep?.isComplete,
                    kpiQuestionsComplete: kpiQuestionsStep?.isComplete,
                  });
                  const isCurrent = i === stepIndex;
                  const chipClass = isCurrent
                    ? "rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-medium text-white ring-2 ring-teal-400"
                    : status === "verified"
                      ? "rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
                      : status === "saved"
                        ? "rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : status === "invalid"
                          ? "rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                          : "rounded-lg border border-[var(--card-border)] bg-slate-100/70 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400";
                  const stepQuery = embedAssistant ? `step=${i}&embed=1` : `step=${i}`;
                  return (
                    <Link
                      key={s.stepKey}
                      href={`/runs/${run.id}?${stepQuery}`}
                      prefetch={false}
                      aria-current={isCurrent ? "step" : undefined}
                      {...(embedAssistant ? ({ target: "_top", rel: "noopener noreferrer" } as const) : {})}
                      className={`${chipClass} inline-block cursor-pointer no-underline transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]`}
                    >
                      {i + 1}. {s.label}
                      {status === "verified" ? " ✓" : ""}
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        }
        descriptionCollapsible
        descriptionDefaultOpen={false}
        descriptionToggleLabel="Workflow-Details anzeigen"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {run.workflowKey !== "WF_BUSINESS_FORM" && (
              <>
                <span className="rounded-lg border border-[var(--card-border)] bg-slate-50 px-2.5 py-1 text-xs font-medium dark:bg-slate-900/50">
                  Schritte: {runStepsDisplay.length}/{steps.length}
                </span>
              </>
            )}
            {allStepsComplete ? (
              <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                ✓ Abgeschlossen
              </span>
            ) : runStepsDisplay.length === 0 && steps.length > 0 ? (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                {locale === "de" ? "Noch nicht ausgeführt" : "Not run yet"}
              </span>
            ) : runStepsDisplay.some((s) => s.schemaValidationPassed === false) ? (
              <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                {locale === "de" ? "⚠ Fehlerhaft – erneut ausführen" : "⚠ Failed – rerun"}
              </span>
            ) : null}
          </div>
        }
      >
        {null}
      </Section>

      <Section title="" compact>
        <Suspense fallback={<div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">Wizard wird geladen…</div>}>
          <RunWizard
            run={{
              id: run.id,
              userNotes: run.userNotes ?? "",
              ideaMode: run.ideaMode ?? null,
              ideaArtifactId: run.ideaArtifactId ?? null,
              steps: runStepsDisplay.map((s) => ({
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
                    ? mergeRunStepsIntoContext(freshContextRecord, runStepsDisplay, s.stepKey)
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
            hideNextButton
            embed={embedAssistant}
          />
        </Suspense>
      </Section>

      {steps.length > 0 && run.workflowKey !== "WF_BUSINESS_FORM" && (
        <div id="pruefprotokoll">
          <Section
            title={locale === "de" ? "Prüfprotokoll" : "Audit Trail"}
            description="Ergebnisse pro Schritt prüfen."
          >
            {(stepIndex > 0 || nextStepHref || allStepsComplete) ? (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  {stepIndex > 0 ? (
                    <Link
                      href={`/runs/${run.id}?step=${stepIndex - 1}${embedAssistant ? "&embed=1" : ""}`}
                      prefetch={false}
                      className="rounded-xl border border-[var(--card-border)] bg-slate-100 px-4 py-2 text-xs font-medium text-[var(--foreground)] transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      ← Zurück
                    </Link>
                  ) : null}
                </div>
                <div>
                  {nextStepHref ? (
                    <Link
                      href={nextStepHref}
                      prefetch={false}
                      className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
                    >
                      Weiter →
                    </Link>
                  ) : allStepsComplete ? (
                    <RunCompletionAdvanceButton
                      embed={embedAssistant}
                      runId={run.id}
                      phaseId={PLANNING_PHASES.find((p) => p.workflowKeys.includes(run.workflowKey))?.id ?? null}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
            <AuditTrailTabs
              steps={steps.map((cfg, idx) => {
                const step = runStepsDisplay.find((s) => s.stepKey === cfg.stepKey);
                return {
                  id: step?.id ?? `missing-${cfg.stepKey}`,
                  stepKey: cfg.stepKey,
                  stepLabel: cfg.label,
                  stepNum: idx + 1,
                  isSaved: Boolean(step),
                  parsedOutputJson: step?.parsedOutputJson ?? null,
                  validationErrorsJson: step?.validationErrorsJson ?? null,
                  schemaValidationPassed: step?.schemaValidationPassed ?? false,
                  verifiedByUser: step?.verifiedByUser ?? false,
                  userPastedResponse: step?.userPastedResponse ?? null,
                  verificationNotes: step?.verificationNotes ?? null,
                };
              })}
              runId={run.id}
              schemaKeyByStepKey={Object.fromEntries(
                (workflowSteps[run.workflowKey] ?? []).map((s) => [s.stepKey, s.schemaKey])
              )}
              verifyStep={verifyStep}
              deleteStep={deleteStep}
              updateStep={updateStep}
              embed={embedAssistant}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

export default async function RunDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ embed?: string; step?: string }>;
}) {
  try {
    return await RunDetailPageContent(props);
  } catch (err) {
    const errorId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let runId = "unknown";
    let sp: { embed?: string; step?: string } = {};
    try {
      runId = (await props.params)?.id ?? "unknown";
      sp = (await props.searchParams) ?? {};
    } catch {
      // ignore parameter parsing errors in telemetry path
    }
    console.error("[runs/[id]][fatal-render]", {
      errorId,
      runId,
      searchParams: sp,
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
    const backHref = String(sp.embed ?? "") === "1" ? "/dashboard?view=execution&embed=1" : "/dashboard?view=execution";
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="text-lg font-semibold">Prozesslauf konnte nicht vollständig geladen werden</h2>
        <p className="mt-2 text-sm">
          Der Lauf wurde serverseitig abgefangen, damit die Seite nutzbar bleibt. Bitte versuchen Sie den Lauf erneut
          oder öffnen Sie die Prozessseite neu.
        </p>
        <p className="mt-2 rounded-md bg-amber-100/80 px-3 py-2 font-mono text-xs dark:bg-amber-900/30">
          Fehler-ID: {errorId}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/runs/${encodeURIComponent(runId)}${String(sp.step ?? "").length > 0 ? `?step=${encodeURIComponent(String(sp.step))}` : ""}`} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Lauf neu laden
          </Link>
          <Link href={backHref} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
            Zur Prozessseite
          </Link>
        </div>
      </div>
    );
  }
}

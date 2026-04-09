"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { WIZARD_WORKFLOW_ORDER } from "@/lib/planningFramework";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { createArtifactEvaluation } from "@/lib/artifactEvaluations";
import { createFeatureEvaluation, type FeatureEvaluationKind } from "@/lib/featureEvaluations";
import { setPlanningPhaseArtifactRelease } from "@/lib/planningPhaseRelease";
import { isRedirectError } from "@/lib/isRedirectError";

function buildDashboardRunErrorUrl(formData: FormData, errorCode: string): string {
  const q = new URLSearchParams();
  const view = String(formData.get("return_view") ?? "").trim();
  if (view === "overview") q.set("view", "overview");
  else q.set("view", "execution");
  const phase = String(formData.get("return_phase") ?? "").trim();
  if (phase && /^[a-z0-9_]+$/i.test(phase)) q.set("phase", phase);
  const assistant = String(formData.get("return_assistant_phase") ?? "").trim();
  if (assistant && /^[a-z0-9_]+$/i.test(assistant)) q.set("assistant_phase", assistant);
  q.set("run_error", errorCode);
  return `/dashboard?${q.toString()}`;
}

export async function startWizardAction() {
  const company = await getOrCreateDemoCompany();

  const [inProgress, completed] = await Promise.all([
    prisma.run.findMany({
      where: {
        companyId: company.id,
        status: { in: ["draft", "running", "incomplete"] },
      },
    }),
    prisma.run.findMany({
      where: { companyId: company.id, status: "complete" },
      select: { workflowKey: true },
    }),
  ]);
  const completedKeys = new Set(completed.map((r) => r.workflowKey));

  // Go to the next workflow in sequence: first that's in-progress, else first not complete
  for (const key of WIZARD_WORKFLOW_ORDER) {
    const run = inProgress.find((r) => r.workflowKey === key);
    if (run) {
      redirect(`/runs/${run.id}?step=0`);
    }
    if (!completedKeys.has(key)) {
      const contextPack = await ContextPackService.build(company.id, key);
      const newRun = await WorkflowService.createRun(company.id, key, contextPack);
      redirect(`/runs/${newRun.id}?step=0`);
    }
  }

  // All workflows complete: go to Plans (dashboard)
  redirect("/dashboard");
}

// DSR Study assistant:
// FB1 -> (pro Bereich: Info, FB2, Workflows, Dokumente, FB3) -> FB4 -> DSR evaluation
export async function startStudyWizardAction() {
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);

  if (!participant.completedFb1) redirect("/study/fb1");

  // FB2 ist kategoriespezifisch (/study/fb2/[category]) — Studienübersicht zeigt den Ablauf.
  if (!participant.completedFb2BeforeRuns) redirect("/study");

  if (!participant.completedFb3AfterRuns) {
    const [inProgress, completed] = await Promise.all([
      prisma.run.findMany({
        where: {
          companyId: company.id,
          status: { in: ["draft", "running", "incomplete"] },
        },
        select: { id: true, workflowKey: true },
      }),
      prisma.run.findMany({
        where: { companyId: company.id, status: "complete" },
        select: { workflowKey: true },
      }),
    ]);
    // Support "approved" as completed too (some workflows are approved, not just complete).
    const approvedKeys = new Set(
      (await prisma.run.findMany({
        where: { companyId: company.id, status: "approved" },
        select: { workflowKey: true },
      })).map((r) => r.workflowKey)
    );

    const completedKeys = new Set([...completed.map((r) => r.workflowKey), ...Array.from(approvedKeys)]);

    for (const key of WIZARD_WORKFLOW_ORDER) {
      const run = inProgress.find((r) => r.workflowKey === key);
      if (run) {
        redirect(`/runs/${run.id}?step=0`);
      }
      if (!completedKeys.has(key)) {
        const contextPack = await ContextPackService.build(company.id, key);
        const newRun = await WorkflowService.createRun(company.id, key, contextPack);
        redirect(`/runs/${newRun.id}?step=0`);
      }
    }

    // Alle Workflows durch -> FB3 pro Kategorie auf /study wählen
    redirect("/study");
  }

  redirect("/evaluation?tab=scenario");
}

export async function createRunWorkflowAction(formData: FormData) {
  const workflowKey = String(formData.get("workflow_key"));
  const forceNew = formData.get("force_new") === "1";
  const returnTarget = String(formData.get("return_target") ?? "dashboard").trim();

  try {
    const company = await getOrCreateDemoCompany();

    if (!forceNew) {
      const existing = await prisma.run.findFirst({
        where: { companyId: company.id, workflowKey, status: { in: ["draft", "running", "incomplete"] } },
        include: { _count: { select: { steps: true } } },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        redirect(`/runs/${existing.id}`);
      }
    }

    const contextPack = await ContextPackService.build(company.id, workflowKey);
    const run = await WorkflowService.createRun(company.id, workflowKey, contextPack);
    redirect(`/runs/${run.id}`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("[createRunWorkflowAction]", workflowKey, e);
    if (returnTarget === "data") {
      redirect("/data?run_error=run_start_failed");
    }
    redirect(buildDashboardRunErrorUrl(formData, "run_start_failed"));
  }
}

export async function startPhaseRunsAction(formData: FormData) {
  const company = await getOrCreateDemoCompany();
  const phaseId = String(formData.get("phase_id") ?? "").trim();
  const workflowKeys = formData
    .getAll("workflow_keys")
    .map((v) => String(v))
    .filter(Boolean);

  const settings = await prisma.companySettings.findUnique({
    where: { companyId: company.id },
    select: { llmApiUrl: true, llmApiKey: true },
  });
  const hasLlmConfigured = Boolean(settings?.llmApiUrl?.trim()) || Boolean(settings?.llmApiKey?.trim());

  if (!hasLlmConfigured) {
    const hash = phaseId ? `#phase-${encodeURIComponent(phaseId)}` : "";
    redirect(`/dashboard?run_error=llm_missing${hash}`);
  }

  if (workflowKeys.length === 0) {
    const hash = phaseId ? `#phase-${encodeURIComponent(phaseId)}` : "";
    redirect(`/dashboard${hash}`);
  }

  const createdOrExistingRunIds: string[] = [];
  try {
    for (const workflowKey of workflowKeys) {
      const existing = await prisma.run.findFirst({
        where: {
          companyId: company.id,
          workflowKey,
          status: { in: ["draft", "running", "incomplete"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (existing?.id) {
        createdOrExistingRunIds.push(existing.id);
        continue;
      }

      const contextPack = await ContextPackService.build(company.id, workflowKey);
      const run = await WorkflowService.createRun(company.id, workflowKey, contextPack);
      createdOrExistingRunIds.push(run.id);
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("[startPhaseRunsAction]", phaseId, e);
    const hash = phaseId ? `#phase-${encodeURIComponent(phaseId)}` : "";
    redirect(`/dashboard?view=execution&run_error=run_start_failed${hash}`);
  }

  const hash = phaseId ? `#phase-${encodeURIComponent(phaseId)}` : "";
  if (createdOrExistingRunIds.length > 0) {
    redirect(`/dashboard?run_success=1${hash}`);
  }
  redirect(`/dashboard${hash}`);
}

export async function submitKpiAnswersAction(formData: FormData) {
  const runId = String(formData.get("run_id"));
  const mappingJson = String(formData.get("mapping_json") || "[]");
  const redirectTo = formData.get("redirect_to");
  const step = formData.get("step");
  let mapping: string[];
  try {
    mapping = JSON.parse(mappingJson) as string[];
  } catch {
    if (redirectTo && typeof redirectTo === "string") redirect(redirectTo);
    else redirect(step != null ? `/runs/${runId}?step=${step}` : `/runs/${runId}`);
    return;
  }
  const answers: string[] = [];
  for (let i = 0; ; i++) {
    const v = formData.get(`answer_${i}`);
    if (v == null) break;
    answers.push(String(v));
  }
  await WorkflowService.saveKpiAnswersStep({ runId, answers, mapping_to_kpi_keys: mapping });
  if (redirectTo && typeof redirectTo === "string") redirect(redirectTo);
  else redirect(step != null ? `/runs/${runId}?step=${step}` : `/runs/${runId}`);
}

export async function updateArtifactAction(formData: FormData) {
  const id = String(formData.get("id"));
  const raw = String(formData.get("content_json") || "{}");
  let contentJson: object;
  try {
    contentJson = JSON.parse(raw) as object;
  } catch {
    redirect(`/artifacts/${id}`);
    return;
  }
  await prisma.artifact.update({
    where: { id },
    data: { contentJson },
  });
  const redirectTo = formData.get("redirect_to");
  if (redirectTo && typeof redirectTo === "string") redirect(redirectTo);
  redirect(`/artifacts/${id}`);
}

function parseOptionalLikert5(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export async function submitArtifactEvaluationAction(formData: FormData) {
  const company = await getOrCreateDemoCompany();
  const artifactId = String(formData.get("artifact_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "").trim();
  if (!artifactId) {
    redirect("/artifacts");
  }

  const answerQuality = Number(formData.get("answer_quality") ?? 0);
  const sourceQuality = Number(formData.get("source_quality") ?? 0);
  const realism = Number(formData.get("realism") ?? 0);
  const clarity = Number(formData.get("clarity") ?? 0);
  const structure = Number(formData.get("structure") ?? 0);
  const hallucination = String(formData.get("hallucination_present") ?? "no") === "yes";
  const hallucinationNotes = String(formData.get("hallucination_notes") ?? "").trim();
  const strengths = String(formData.get("strengths") ?? "").trim();
  const weaknesses = String(formData.get("weaknesses") ?? "").trim();
  const improvementSuggestions = String(formData.get("improvement_suggestions") ?? "").trim();
  const ew_notes = String(formData.get("ew_notes") ?? "").trim();
  const ind_notes = String(formData.get("ind_notes") ?? "").trim();

  const clamp = (n: number) => Math.min(5, Math.max(1, Number.isFinite(n) ? n : 1));
  await createArtifactEvaluation({
    artifactId,
    companyId: company.id,
    answerQuality: clamp(answerQuality),
    sourceQuality: clamp(sourceQuality),
    realism: clamp(realism),
    clarity: clamp(clarity),
    structure: clamp(structure),
    hallucinationPresent: hallucination,
    hallucinationNotes,
    strengths,
    weaknesses,
    improvementSuggestions,
    ew_sensible: parseOptionalLikert5(formData.get("ew_sensible")),
    ew_clear: parseOptionalLikert5(formData.get("ew_clear")),
    ew_helpful: parseOptionalLikert5(formData.get("ew_helpful")),
    ew_notes: ew_notes || null,
    ind_relevant: parseOptionalLikert5(formData.get("ind_relevant")),
    ind_notes: ind_notes || null,
  });

  const q = new URLSearchParams({ saved: "1" });
  if (returnTo) q.set("return_to", returnTo);
  redirect(`/artifacts/${artifactId}/evaluate?${q.toString()}`);
}

const FEATURE_KINDS = new Set<FeatureEvaluationKind>(["decisions", "chat"]);

export async function submitFeatureEvaluationAction(formData: FormData) {
  const company = await getOrCreateDemoCompany();
  const kindRaw = String(formData.get("feature_kind") ?? "").trim();
  if (!FEATURE_KINDS.has(kindRaw as FeatureEvaluationKind)) {
    redirect("/dashboard");
  }
  const kind = kindRaw as FeatureEvaluationKind;

  const answerQuality = Number(formData.get("answer_quality") ?? 0);
  const sourceQuality = Number(formData.get("source_quality") ?? 0);
  const realism = Number(formData.get("realism") ?? 0);
  const clarity = Number(formData.get("clarity") ?? 0);
  const structure = Number(formData.get("structure") ?? 0);
  const hallucination = String(formData.get("hallucination_present") ?? "no") === "yes";
  const hallucinationNotes = String(formData.get("hallucination_notes") ?? "").trim();
  const strengths = String(formData.get("strengths") ?? "").trim();
  const weaknesses = String(formData.get("weaknesses") ?? "").trim();
  const improvementSuggestions = String(formData.get("improvement_suggestions") ?? "").trim();

  const clamp = (n: number) => Math.min(5, Math.max(1, Number.isFinite(n) ? n : 1));
  await createFeatureEvaluation({
    companyId: company.id,
    kind,
    answerQuality: clamp(answerQuality),
    sourceQuality: clamp(sourceQuality),
    realism: clamp(realism),
    clarity: clamp(clarity),
    structure: clamp(structure),
    hallucinationPresent: hallucination,
    hallucinationNotes,
    strengths,
    weaknesses,
    improvementSuggestions,
  });

  const back = kind === "decisions" ? "/decisions/evaluate?saved=1" : "/chat/evaluate?saved=1";
  redirect(back);
}

export async function setPlanningPhaseArtifactsReleasedAction(formData: FormData) {
  const phaseId = String(formData.get("phase_id") ?? "").trim();
  const release = String(formData.get("release") ?? "") === "1";
  if (!phaseId) {
    redirect("/dashboard");
  }
  const company = await getOrCreateDemoCompany();
  await setPlanningPhaseArtifactRelease(company.id, phaseId, release);
  redirect(`/dashboard#phase-${encodeURIComponent(phaseId)}`);
}

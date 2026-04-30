import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { getSessionFromCookies } from "@/lib/session";
import { findLatestJobForPhase } from "@/lib/phaseRunJobs";
import { PLANNING_PHASES } from "@/lib/planningFramework";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phaseId = url.searchParams.get("phaseId") ?? "";
  const jobId = url.searchParams.get("jobId");
  const allPhases = url.searchParams.get("all") === "1";
  try {
    const companyId = process.env.DEV_AUTH_BYPASS === "1"
      ? (await getCompanyForApi())?.company?.id ?? null
      : (await getSessionFromCookies())?.companyId ?? null;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const phaseRunJob = (prisma as unknown as { phaseRunJob?: any }).phaseRunJob;
    const hasPhaseRunDelegate = Boolean(phaseRunJob?.findFirst);

    if (jobId) {
      if (!phaseRunJob?.findUnique) {
        return NextResponse.json({ error: "Phase run jobs are not available" }, { status: 503 });
      }
      const job = await phaseRunJob.findUnique({ where: { id: jobId } });
      if (!job || job.companyId !== companyId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ job: serializeJob(job) });
    }

    if (!phaseId) {
      if (!allPhases) {
        return NextResponse.json({ error: "phaseId or jobId required" }, { status: 400 });
      }
      if (!hasPhaseRunDelegate) {
        return NextResponse.json({
          jobs: PLANNING_PHASES.map(() => null),
          phases: PLANNING_PHASES.map((p) => p.id),
          featureUnavailable: true,
        });
      }
      // Use a single query for all phases to avoid parallel DB reads on every poll cycle.
      const phaseIds = PLANNING_PHASES.map((p) => p.id);
      const rows = (await phaseRunJob.findMany({
        where: { companyId, phaseId: { in: phaseIds } },
        orderBy: [{ createdAt: "desc" }],
      })) as PhaseRunJobRow[];
      const latestByPhase = new Map<string, PhaseRunJobRow>();
      const activeByPhase = new Map<string, PhaseRunJobRow>();
      for (const row of rows) {
        if (!latestByPhase.has(row.phaseId)) latestByPhase.set(row.phaseId, row);
        if (!activeByPhase.has(row.phaseId) && (row.status === "queued" || row.status === "running")) {
          activeByPhase.set(row.phaseId, row);
        }
      }
      const jobs = phaseIds.map((id) => activeByPhase.get(id) ?? latestByPhase.get(id) ?? null);
      return NextResponse.json({
        jobs: jobs.map((job) => (job ? serializeJob(job) : null)),
        phases: PLANNING_PHASES.map((p) => p.id),
      });
    }

    if (!hasPhaseRunDelegate) {
      return NextResponse.json({ job: null, featureUnavailable: true });
    }
    const job = await findLatestJobForPhase({ companyId, phaseId });
    return NextResponse.json({ job: job ? serializeJob(job) : null });
  } catch (err) {
    const errorId = `prs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    console.error("[phase-runs/status] error:", {
      errorId,
      phaseId,
      jobId: jobId ?? null,
      allPhases,
      error:
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack, cause: err.cause }
          : err,
    });
    if (jobId) {
      return NextResponse.json({ job: null, transientError: true, errorId });
    }
    if (allPhases) {
      return NextResponse.json({
        jobs: PLANNING_PHASES.map(() => null),
        phases: PLANNING_PHASES.map((p) => p.id),
        transientError: true,
        errorId,
      });
    }
    return NextResponse.json({ job: null, transientError: true, errorId });
  }
}

type PhaseRunJobRow = {
  id: string;
  phaseId: string;
  mode: string;
  status: string;
  totalSteps: number;
  completedSteps: number;
  currentWorkflowKey: string | null;
  currentStepKey: string | null;
  currentLabel: string | null;
  lastMessage: string | null;
  errorMessage: string | null;
  cancelRequested: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

function serializeJob(job: NonNullable<PhaseRunJobRow>) {
  return {
    id: job.id,
    phaseId: job.phaseId,
    mode: job.mode,
    status: job.status,
    totalSteps: job.totalSteps,
    completedSteps: job.completedSteps,
    currentWorkflowKey: job.currentWorkflowKey,
    currentStepKey: job.currentStepKey,
    currentLabel: job.currentLabel,
    lastMessage: job.lastMessage,
    errorMessage: job.errorMessage,
    cancelRequested: job.cancelRequested,
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

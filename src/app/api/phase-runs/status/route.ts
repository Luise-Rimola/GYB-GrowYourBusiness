import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { findLatestJobForPhase } from "@/lib/phaseRunJobs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;

    const url = new URL(req.url);
    const phaseId = url.searchParams.get("phaseId") ?? "";
    const jobId = url.searchParams.get("jobId");
    const phaseRunJob = (prisma as unknown as { phaseRunJob?: any }).phaseRunJob;

    if (jobId) {
      if (!phaseRunJob?.findUnique) {
        return NextResponse.json({ error: "Phase run jobs are not available" }, { status: 503 });
      }
      const job = await phaseRunJob.findUnique({ where: { id: jobId } });
      if (!job || job.companyId !== company.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ job: serializeJob(job) });
    }

    if (!phaseId) {
      return NextResponse.json({ error: "phaseId or jobId required" }, { status: 400 });
    }

    const job = await findLatestJobForPhase({ companyId: company.id, phaseId });
    return NextResponse.json({ job: job ? serializeJob(job) : null });
  } catch (err) {
    console.error("[phase-runs/status] error:", err);
    return NextResponse.json({ error: "Failed to read status" }, { status: 500 });
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

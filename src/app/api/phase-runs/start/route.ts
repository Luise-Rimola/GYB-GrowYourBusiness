import { NextResponse } from "next/server";
import { getCompanyForApi } from "@/lib/companyContext";
import { getSessionFromCookies } from "@/lib/session";
import { startPhaseRunJob, type PhaseRunMode } from "@/lib/phaseRunJobs";
import { getServerLocale } from "@/lib/locale";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const companyId = process.env.DEV_AUTH_BYPASS === "1"
      ? (await getCompanyForApi())?.company?.id ?? null
      : (await getSessionFromCookies())?.companyId ?? null;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      phaseId?: unknown;
      workflowKeys?: unknown;
      mode?: unknown;
    };
    const phaseId = typeof body.phaseId === "string" && body.phaseId.length > 0 ? body.phaseId : "unknown";
    const workflowKeys = Array.isArray(body.workflowKeys)
      ? (body.workflowKeys.filter((v): v is string => typeof v === "string" && v.length > 0))
      : [];
    const mode: PhaseRunMode = body.mode === "run_all" ? "run_all" : "continue";

    if (workflowKeys.length === 0) {
      return NextResponse.json({ error: "workflowKeys required" }, { status: 400 });
    }

    const locale = await getServerLocale();
    const result = await startPhaseRunJob({
      companyId,
      phaseId,
      workflowKeys,
      mode,
      locale,
    });

    if (result.kind === "already_running") {
      return NextResponse.json({ jobId: result.jobId, alreadyRunning: true }, { status: 200 });
    }
    if (result.kind === "empty") {
      return NextResponse.json({ jobId: null, empty: true, mode });
    }
    return NextResponse.json(
      { jobId: result.jobId, totalSteps: result.totalSteps, mode },
      { status: 201 }
    );
  } catch (err) {
    console.error("[phase-runs/start] error:", err);
    if (err instanceof Error && /PhaseRunJob delegate unavailable/i.test(err.message)) {
      return NextResponse.json({ error: "Phase run jobs are not available" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to start phase run" }, { status: 500 });
  }
}

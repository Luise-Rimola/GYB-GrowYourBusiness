/**
 * Liefert die Queue aus `{ workflowKey, runId, stepKey, label }` für ausstehende KI-Schritte.
 * `RunAllButton` baut dieselbe Liste clientseitig aus `workflowSteps`; diese Route ist optional
 * für Tools/Integrationen und wird im `src`-Frontend nicht aufgerufen.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { getCompanyForApi } from "@/lib/companyContext";
import { workflowSteps, MANUAL_STEP_KEYS } from "@/lib/workflowSteps";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;
    const body = await req.json();
    const mode = String(body.mode ?? "continue") as "run_all" | "continue";
    const workflowKeys = Array.isArray(body.workflowKeys) ? body.workflowKeys as string[] : [];

    if (workflowKeys.length === 0) {
      return NextResponse.json({ steps: [] });
    }

    const steps: { workflowKey: string; runId: string; stepKey: string; label: string }[] = [];

    for (const wf of workflowKeys) {
      const wfSteps = workflowSteps[wf] ?? [];
      const stepsToConsider = wfSteps.filter((s) => !MANUAL_STEP_KEYS.has(s.stepKey));
      if (stepsToConsider.length === 0) continue;

      let run = await prisma.run.findFirst({
        where: { companyId: company.id, workflowKey: wf, status: { in: ["draft", "running", "incomplete"] } },
        include: { steps: true },
        orderBy: { createdAt: "desc" },
      });

      if (!run) {
        if (mode === "continue") {
          const completeRun = await prisma.run.findFirst({
            where: { companyId: company.id, workflowKey: wf, status: { in: ["complete", "approved"] } },
          });
          if (completeRun) continue;
        }
        const contextPack = await ContextPackService.build(company.id, wf);
        const newRun = await WorkflowService.createRun(company.id, wf, contextPack);
        const created = await prisma.run.findUnique({ where: { id: newRun.id }, include: { steps: true } });
        if (!created) continue;
        run = created;
      }

      if (!run) continue;

      const stepsList = (run.steps ?? []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestByKey = new Map<string, (typeof stepsList)[0]>();
      for (const s of stepsList) {
        if (!latestByKey.has(s.stepKey)) latestByKey.set(s.stepKey, s);
      }
      const completedKeys = new Set(
        [...latestByKey.values()].filter((s) => s.schemaValidationPassed).map((s) => s.stepKey)
      );

      for (const sc of stepsToConsider) {
        if (mode === "run_all" || !completedKeys.has(sc.stepKey)) {
          steps.push({ workflowKey: wf, runId: run.id, stepKey: sc.stepKey, label: sc.label });
        }
      }
    }

    return NextResponse.json({ steps });
  } catch (err) {
    console.error("[runs/run-steps] error:", err);
    return NextResponse.json({ error: "Failed to get run steps" }, { status: 500 });
  }
}

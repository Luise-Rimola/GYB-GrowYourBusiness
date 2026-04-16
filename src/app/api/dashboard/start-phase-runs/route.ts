/**
 * Programmatisches Pendant zu `startPhaseRunsAction` in `app/actions.ts` (legt offene Runs an).
 * Die Next.js-Oberfläche nutzt die Server Action oder `PhaseRunButtonForm` + `/api/runs/ensure`;
 * diese Route ist für externe/formularlose POST-Clients gedacht und wird im `src`-Frontend nicht aufgerufen.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { getCompanyForApi } from "@/lib/companyContext";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;

    const formData = await req.formData();
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
      return NextResponse.json({ error: "llm_missing" }, { status: 400 });
    }

    const requested = workflowKeys.length;
    if (requested === 0) {
      return NextResponse.json({ ok: true, created: 0, skipped: 0, requested: 0 });
    }

    let created = 0;
    let skipped = 0;
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
        skipped += 1;
        continue;
      }

      const contextPack = await ContextPackService.build(company.id, workflowKey);
      await WorkflowService.createRun(company.id, workflowKey, contextPack);
      created += 1;
    }

    return NextResponse.json({ ok: true, created, skipped, requested });
  } catch (err) {
    console.error("[dashboard/start-phase-runs] error:", err);
    return NextResponse.json({ error: "run_start_failed" }, { status: 500 });
  }
}

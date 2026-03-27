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
    const body = await req.json();
    const workflowKey = String(body.workflowKey ?? "");

    if (!workflowKey) {
      return NextResponse.json({ error: "workflowKey required" }, { status: 400 });
    }

    const existing = await prisma.run.findFirst({
      where: { companyId: company.id, workflowKey, status: { in: ["draft", "running", "incomplete"] } },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return NextResponse.json({ runId: existing.id });
    }

    const contextPack = await ContextPackService.build(company.id, workflowKey);
    const run = await WorkflowService.createRun(company.id, workflowKey, contextPack);
    return NextResponse.json({ runId: run.id });
  } catch (err) {
    console.error("[runs/ensure] error:", err);
    return NextResponse.json({ error: "Failed to ensure run" }, { status: 500 });
  }
}

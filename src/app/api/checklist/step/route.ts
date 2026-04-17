import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;

    const body = await req.json();

    if (body?.stageId && typeof body?.label === "string") {
      const stage = await prisma.launchStage.findFirst({
        where: { id: body.stageId, companyId: company.id },
      });
      if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const label = body.label.trim();
      if (!label) return NextResponse.json({ error: "Invalid label" }, { status: 400 });
      const existing = await prisma.launchStep.findMany({
        where: { stageId: stage.id },
        select: { sortOrder: true },
        orderBy: { sortOrder: "desc" },
        take: 1,
      });
      const nextSort = (existing[0]?.sortOrder ?? -1) + 1;
      await prisma.launchStep.create({
        data: {
          stageId: stage.id,
          label,
          done: false,
          sortOrder: nextSort,
        },
      });
      return NextResponse.json({ ok: true });
    }

    const { stepId, done } = body;
    if (!stepId || typeof done !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const step = await prisma.launchStep.findFirst({
      where: { id: stepId, stage: { companyId: company.id } },
    });
    if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.launchStep.update({
      where: { id: step.id },
      data: { done },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[checklist/step]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

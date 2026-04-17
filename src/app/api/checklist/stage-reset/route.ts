import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;

    const { stageId, done } = await req.json();
    if (!stageId || typeof done !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const stage = await prisma.launchStage.findFirst({
      where: { id: stageId, companyId: company.id },
    });
    if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.launchStep.updateMany({
      where: { stageId: stage.id },
      data: { done },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[checklist/stage-reset]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

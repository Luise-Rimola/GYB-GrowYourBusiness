import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body?.stageId && typeof body?.label === "string") {
      const label = body.label.trim();
      if (!label) return NextResponse.json({ error: "Invalid label" }, { status: 400 });
      const existing = await prisma.launchStep.findMany({
        where: { stageId: body.stageId },
        select: { sortOrder: true },
        orderBy: { sortOrder: "desc" },
        take: 1,
      });
      const nextSort = (existing[0]?.sortOrder ?? -1) + 1;
      await prisma.launchStep.create({
        data: {
          stageId: body.stageId,
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
    await prisma.launchStep.update({
      where: { id: stepId },
      data: { done },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

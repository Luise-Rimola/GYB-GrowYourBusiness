import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { companyId, name } = await req.json();
    const stageName = typeof name === "string" ? name.trim() : "";
    if (!companyId || !stageName) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.launchStage.findMany({
      where: { companyId },
      select: { sortOrder: true },
      orderBy: { sortOrder: "desc" },
      take: 1,
    });
    const nextSort = (existing[0]?.sortOrder ?? -1) + 1;

    await prisma.launchStage.create({
      data: {
        companyId,
        name: stageName,
        sortOrder: nextSort,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

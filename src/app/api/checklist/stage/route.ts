import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;

    const { name } = await req.json();
    const stageName = typeof name === "string" ? name.trim() : "";
    if (!stageName) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.launchStage.findMany({
      where: { companyId: company.id },
      select: { sortOrder: true },
      orderBy: { sortOrder: "desc" },
      take: 1,
    });
    const nextSort = (existing[0]?.sortOrder ?? -1) + 1;

    await prisma.launchStage.create({
      data: {
        companyId: company.id,
        name: stageName,
        sortOrder: nextSort,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[checklist/stage]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

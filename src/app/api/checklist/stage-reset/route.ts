import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { stageId, done } = await req.json();
    if (!stageId || typeof done !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    await prisma.launchStep.updateMany({
      where: { stageId },
      data: { done },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

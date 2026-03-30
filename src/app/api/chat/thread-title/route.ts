import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;

    const body = await req.json();
    const threadId = String(body.threadId ?? "").trim();
    const title = String(body.title ?? "").trim();
    if (!threadId || !title) {
      return NextResponse.json({ error: "threadId and title required" }, { status: 400 });
    }

    await prisma.chatThread.updateMany({
      where: { id: threadId, companyId: company.id },
      data: { title: title.slice(0, 120) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat/thread-title] error:", err);
    return NextResponse.json({ error: "Failed to update title" }, { status: 500 });
  }
}

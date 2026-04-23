import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;

    const body = (await req.json().catch(() => ({}))) as { jobId?: unknown };
    const jobId = typeof body.jobId === "string" ? body.jobId : "";
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const job = await prisma.phaseRunJob.findUnique({ where: { id: jobId } });
    if (!job || job.companyId !== company.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (job.status !== "queued" && job.status !== "running") {
      return NextResponse.json({ ok: true, alreadyDone: true });
    }

    await prisma.phaseRunJob.update({
      where: { id: jobId },
      data: { cancelRequested: true, lastMessage: "Abbruch angefordert …" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[phase-runs/cancel] error:", err);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}

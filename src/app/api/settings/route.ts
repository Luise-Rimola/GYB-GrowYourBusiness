import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { getOrCreateStudyParticipant, updateStudyParticipantById } from "@/lib/study";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { company } = auth;
    const body = await req.json();
    if (body.companyId !== company.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const updateData: { llmApiUrl?: string | null; llmApiKey?: string | null; llmModel?: string | null } = {
      llmApiUrl: body.llmApiUrl ?? null,
      llmModel: body.llmModel ?? "gpt-4o-mini",
    };
    if (body.llmApiKey !== undefined) {
      updateData.llmApiKey = body.llmApiKey ?? null;
    }
    await prisma.companySettings.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        llmApiUrl: body.llmApiUrl ?? null,
        llmApiKey: body.llmApiKey ?? null,
        llmModel: body.llmModel ?? "gpt-4o-mini",
      },
      update: updateData,
    });

    if (body.markLlmSetupComplete === true) {
      const url = typeof body.llmApiUrl === "string" ? body.llmApiUrl.trim() : "";
      if (!url) {
        return NextResponse.json({ error: "Bitte eine gültige API-URL angeben (z. B. OpenAI oder Ollama)." }, { status: 400 });
      }
      const participant = await getOrCreateStudyParticipant(company.id);
      await updateStudyParticipantById(participant.id, { completedLlmSetup: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings] POST error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

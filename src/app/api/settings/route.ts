import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { getOrCreateStudyParticipant, updateStudyParticipantById } from "@/lib/study";

function isValidApiUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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

    const llmApiUrl = typeof body.llmApiUrl === "string" ? body.llmApiUrl.trim() : "";
    const llmModel = typeof body.llmModel === "string" ? body.llmModel.trim() : "";

    if (llmApiUrl && !isValidApiUrl(llmApiUrl)) {
      return NextResponse.json(
        { error: "Ungültige API-URL. Bitte vollständige URL mit http:// oder https:// eingeben." },
        { status: 400 }
      );
    }

    const updateData: {
      llmApiUrl: string | null;
      llmModel: string | null;
      llmApiKey?: string | null;
    } = {
      llmApiUrl: llmApiUrl || null,
      llmModel: llmModel || null,
    };

    if (body.llmApiKey !== undefined && typeof body.llmApiKey === "string") {
      const key = body.llmApiKey.trim();
      if (key) {
        updateData.llmApiKey = key;
      }
    }

    await prisma.companySettings.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        llmApiUrl: updateData.llmApiUrl,
        llmModel: updateData.llmModel,
        llmApiKey: updateData.llmApiKey ?? null,
      },
      update: updateData,
    });

    if (body.markLlmSetupComplete === true) {
      if (!llmApiUrl) {
        return NextResponse.json(
          { error: "Bitte eine gültige API-URL angeben (z. B. OpenAI oder Ollama)." },
          { status: 400 }
        );
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

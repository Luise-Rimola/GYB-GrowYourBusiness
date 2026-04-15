import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { fetchChatCompletionWithTemperatureRetry } from "@/lib/llmTemperatureRetry";
import { extractAssistantTextFromChatCompletion } from "@/lib/openAiChatContent";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;
    const settings = await prisma.companySettings.findUnique({
      where: { companyId: company.id },
    });
    const url = settings?.llmApiUrl?.trim();
    const apiKey = settings?.llmApiKey?.trim();
    const model = settings?.llmModel?.trim() || "gpt-4o-mini";

    if (!url) {
      return NextResponse.json(
        { error: "LLM-API nicht konfiguriert. Bitte in Einstellungen URL und API-Key eintragen." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt fehlt" }, { status: 400 });
    }

    const baseUrl = url.replace(/\/$/, "");
    const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const payloadWithJsonMode: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" as const },
    };

    const payloadPlain: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    };

    /** Kimi/Moonshot and others often reject OpenAI-style json_object; always fall back without it. */
    let res = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadWithJsonMode);
    if (!res.ok) {
      const firstErr = await res.text();
      const status = res.status;
      if (status === 401 || status === 403) {
        return NextResponse.json(
          { error: `LLM-API Fehler (${status}): ${firstErr.slice(0, 300)}` },
          { status: 502 }
        );
      }
      res = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadPlain);
      if (!res.ok) {
        const secondErr = await res.text();
        const secondStatus = res.status;
        return NextResponse.json(
          {
            error: `LLM-API Fehler (${status}, erneuter Versuch ${secondStatus}): ${firstErr.slice(0, 160)} … ${secondErr.slice(0, 160)}`,
          },
          { status: 502 }
        );
      }
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | unknown } }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      return NextResponse.json({ error: data.error.message }, { status: 502 });
    }

    const content = extractAssistantTextFromChatCompletion(data);

    if (!content.trim()) {
      console.warn("[llm/complete] empty assistant text; raw snippet:", JSON.stringify(data).slice(0, 1200));
      return NextResponse.json(
        {
          error:
            "Leere Antwort vom Modell (kein Text in choices[0].message). Bitte Modell/Endpoint prüfen oder Prompt kürzen.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ content });
  } catch (err) {
    console.error("[llm/complete] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM-Anfrage fehlgeschlagen" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { fetchChatCompletionWithTemperatureRetry } from "@/lib/llmTemperatureRetry";
import { extractAssistantTextFromChatCompletion } from "@/lib/openAiChatContent";

export const maxDuration = 900;

function resolveTemperature(model: string): number {
  const m = model.toLowerCase();
  // Kimi/Moonshot models commonly require temperature=1.
  if (m.includes("kimi") || m.includes("moonshot")) return 1;
  return 0.3;
}

function supportsJsonMode(model: string): boolean {
  const m = model.toLowerCase();
  return !(m.includes("kimi") || m.includes("moonshot"));
}

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
    const temperature = resolveTemperature(model);

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
    if (prompt.length > 120_000) {
      return NextResponse.json(
        {
          error:
            "Prompt ist zu groß für eine stabile Live-Ausführung. Bitte Kontext reduzieren oder Schritt in Teilanfragen aufteilen.",
        },
        { status: 413 }
      );
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
      temperature,
      response_format: { type: "json_object" as const },
    };

    const payloadPlain: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
    };

    let res: Response;
    if (supportsJsonMode(model)) {
      // For OpenAI-like models we prefer strict JSON mode.
      res = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadWithJsonMode);
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
    } else {
      // Kimi/Moonshot: avoid json_object mode to reduce compatibility/timeouts.
      res = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadPlain);
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `LLM-API Fehler (${res.status}): ${errText.slice(0, 300)}` },
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
    const isHeadersTimeout =
      typeof err === "object" &&
      err !== null &&
      "cause" in err &&
      typeof (err as { cause?: unknown }).cause === "object" &&
      (err as { cause?: { code?: string } }).cause?.code === "UND_ERR_HEADERS_TIMEOUT";
    const isGenericTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || /aborted due to timeout/i.test(err.message));
    const errorText = isHeadersTimeout || isGenericTimeout
      ? "LLM-Provider Timeout beim Verbindungsaufbau (Header-Timeout). Bitte Prompt kürzen oder Modell/Provider wechseln."
      : err instanceof Error
        ? err.message
        : "LLM-Anfrage fehlgeschlagen";
    return NextResponse.json(
      { error: errorText },
      { status: 500 }
    );
  }
}

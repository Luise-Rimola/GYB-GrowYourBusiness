import { NextResponse } from "next/server";
import { getCompanyForApi } from "@/lib/companyContext";
import { runIntegratedInsightAnalysis } from "@/services/integratedInsight";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await getCompanyForApi();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let locale: "de" | "en" = "de";
  try {
    const body = (await req.json()) as { locale?: string };
    if (body.locale === "en") locale = "en";
  } catch {
    /* default */
  }

  try {
    const analysis = await runIntegratedInsightAnalysis(auth.company.id, locale);
    return NextResponse.json({ analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

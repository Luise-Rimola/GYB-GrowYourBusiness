import { NextResponse } from "next/server";
import { getCompanyForApi } from "@/lib/companyContext";
import { runCompanyEnrichment } from "@/lib/companyEnrichment";
import { getServerLocale } from "@/lib/locale";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      company_name?: string;
      website?: string;
      location?: string;
    };

    const locale = await getServerLocale();

    const result = await runCompanyEnrichment({
      companyId: auth.company.id,
      companyName: String(body.company_name ?? ""),
      website: String(body.website ?? ""),
      location: String(body.location ?? ""),
      locale,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[enrich-company]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Anreicherung fehlgeschlagen" },
      { status: 500 }
    );
  }
}

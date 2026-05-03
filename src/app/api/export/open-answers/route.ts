import { NextRequest, NextResponse } from "next/server";
import { getCompanyForApi } from "@/lib/companyContext";
import { getServerLocale } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";
import { buildOpenTextExcelExport, type OpenTextExportSection } from "@/lib/openTextExcelExport";

const SECTIONS = new Set<OpenTextExportSection>(["fb23", "fb4", "usecase", "documents", "advisor"]);

export async function GET(req: NextRequest) {
  const auth = await getCompanyForApi();
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const raw = req.nextUrl.searchParams.get("section")?.trim().toLowerCase();
  const section = raw as OpenTextExportSection | undefined;
  if (!section || !SECTIONS.has(section)) {
    return NextResponse.json(
      { error: "Invalid section. Use fb23, fb4, usecase, documents, or advisor." },
      { status: 400 },
    );
  }

  const anonymize = req.nextUrl.searchParams.get("anon") === "1";
  const langParam = req.nextUrl.searchParams.get("lang");
  const locale: Locale =
    langParam === "en" || langParam === "de" ? langParam : await getServerLocale();

  const { filename, html } = await buildOpenTextExcelExport({
    companyId: auth.company.id,
    section,
    locale,
    anonymize,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

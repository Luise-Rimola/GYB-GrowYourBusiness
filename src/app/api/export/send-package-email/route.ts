import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getCompanyForApi } from "@/lib/companyContext";

const FIXED_RECIPIENT =
  process.env.EVALUATION_MAIL_TO?.trim() ||
  "Luise-kassia.rimola@iubh-fernstudium.de";

export async function POST(req: NextRequest) {
  const auth = await getCompanyForApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();
  if (!resendApiKey || !emailFrom) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY or EMAIL_FROM in environment." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { locale?: "de" | "en" };
    const locale = body?.locale === "en" ? "en" : "de";
    const origin = req.nextUrl.origin;
    const cookie = req.headers.get("cookie") ?? "";

    const targets = [
      { path: `/api/export?scope=study&format=spss&lang=${locale}&anon=1`, filename: `questionnaires-${locale}.csv` },
      { path: `/api/export?scope=study&format=pdf&lang=${locale}&anon=1`, filename: `questionnaires-${locale}.pdf` },
      { path: `/api/export?scope=study&format=excel&lang=${locale}&anon=1`, filename: `questionnaires-${locale}.xls` },
      { path: `/api/export?scope=artifacts&format=spss&lang=${locale}&anon=1`, filename: `document-evaluation-${locale}.csv` },
      { path: `/api/export?scope=artifacts&format=pdf&lang=${locale}&anon=1`, filename: `document-evaluation-${locale}.pdf` },
      { path: `/api/export?scope=artifacts&format=excel&lang=${locale}&anon=1`, filename: `document-evaluation-${locale}.xls` },
      { path: `/api/export?scope=usecase&format=spss&lang=${locale}&anon=1`, filename: `usecase-evaluation-${locale}.csv` },
      { path: `/api/export?scope=usecase&format=pdf&lang=${locale}&anon=1`, filename: `usecase-evaluation-${locale}.pdf` },
      { path: `/api/export?scope=usecase&format=excel&lang=${locale}&anon=1`, filename: `usecase-evaluation-${locale}.xls` },
      { path: `/api/export?scope=advisor&format=spss&lang=${locale}&anon=1`, filename: `advisor-evaluation-${locale}.csv` },
      { path: `/api/export?scope=advisor&format=pdf&lang=${locale}&anon=1`, filename: `advisor-evaluation-${locale}.pdf` },
      { path: `/api/export?scope=advisor&format=excel&lang=${locale}&anon=1`, filename: `advisor-evaluation-${locale}.xls` },
      { path: `/api/export/documents-pdf-zip?lang=${locale}`, filename: `all-documents-pdf-${locale}.zip` },
      { path: `/api/export/documents-excel-zip?lang=${locale}`, filename: `all-documents-excel-${locale}.zip` },
    ];

    const downloaded = await Promise.all(
      targets.map(async (target) => {
        const res = await fetch(`${origin}${target.path}`, {
          headers: { cookie },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to generate ${target.filename}`);
        return {
          filename: target.filename,
          content: Buffer.from(await res.arrayBuffer()),
        };
      })
    );

    const resend = new Resend(resendApiKey);
    const subject =
      locale === "en"
        ? `Full anonymized export package (${new Date().toISOString().slice(0, 10)})`
        : `Vollstaendiges anonymisiertes Exportpaket (${new Date().toISOString().slice(0, 10)})`;
    const html =
      locale === "en"
        ? "<p>Hello,</p><p>Attached is the full anonymized package (questionnaires, document evaluation, use-case evaluation, advisor evaluation, and all generated documents as PDF ZIP and Excel ZIP).</p>"
        : "<p>Hallo,</p><p>anbei das vollstaendige anonymisierte Paket (Frageboegen, Dokumente-Evaluation, Use-Case-Evaluation, Berater-Evaluation und alle erstellten Dokumente als PDF-ZIP und Excel-ZIP).</p>";

    const result = await resend.emails.send({
      from: emailFrom,
      to: [FIXED_RECIPIENT],
      subject,
      html,
      attachments: downloaded,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, to: FIXED_RECIPIENT });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send package.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

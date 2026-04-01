import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getCompanyForApi } from "@/lib/companyContext";

const FIXED_RECIPIENT =
  process.env.EVALUATION_MAIL_TO?.trim() ||
  "Luise-kassia.rimole@iubh-fernstudium.de";

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

    const [spssRes, pdfRes, excelRes] = await Promise.all([
      fetch(`${origin}/api/export?scope=evaluation&format=spss&lang=${locale}&anon=1`, {
        headers: { cookie },
        cache: "no-store",
      }),
      fetch(`${origin}/api/export?scope=evaluation&format=pdf&lang=${locale}&anon=1`, {
        headers: { cookie },
        cache: "no-store",
      }),
      fetch(`${origin}/api/export?scope=evaluation&format=excel&lang=${locale}&anon=1`, {
        headers: { cookie },
        cache: "no-store",
      }),
    ]);

    if (!spssRes.ok || !pdfRes.ok || !excelRes.ok) {
      return NextResponse.json(
        { error: "Could not generate one or more export files." },
        { status: 500 }
      );
    }

    const [spssBuf, pdfBuf, excelBuf] = await Promise.all([
      spssRes.arrayBuffer(),
      pdfRes.arrayBuffer(),
      excelRes.arrayBuffer(),
    ]);

    const resend = new Resend(resendApiKey);
    const now = new Date();
    const subject =
      locale === "en"
        ? `Anonymized evaluation package (${now.toISOString().slice(0, 10)})`
        : `Anonymisiertes Evaluationspaket (${now.toISOString().slice(0, 10)})`;

    const html =
      locale === "en"
        ? `<p>Hello,</p><p>Attached is the anonymized evaluation package with SPSS, PDF, and Excel exports.</p>`
        : `<p>Hallo,</p><p>anbei das anonymisierte Evaluationspaket mit SPSS-, PDF- und Excel-Export.</p>`;

    const result = await resend.emails.send({
      from: emailFrom,
      to: [FIXED_RECIPIENT],
      subject,
      html,
      attachments: [
        {
          filename: `evaluation-anonymized-${locale}.csv`,
          content: Buffer.from(spssBuf),
        },
        {
          filename: `evaluation-anonymized-${locale}.pdf`,
          content: Buffer.from(pdfBuf),
        },
        {
          filename: `evaluation-anonymized-${locale}.xls`,
          content: Buffer.from(excelBuf),
        },
      ],
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, to: FIXED_RECIPIENT });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


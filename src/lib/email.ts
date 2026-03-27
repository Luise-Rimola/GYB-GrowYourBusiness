/**
 * Versand von Verifizierungs-E-Mails. In Produktion: RESEND_API_KEY + EMAIL_FROM setzen.
 * Ohne API-Key: in development wird der Code nur geloggt.
 */

const RESEND_API = "https://api.resend.com/emails";

export async function sendVerificationEmail(to: string, code: string, locale: "en" | "de" = "de") {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Growth DSS <onboarding@resend.dev>";

  const subject =
    locale === "en" ? "Your verification code" : "Ihr Bestätigungscode";
  const html =
    locale === "en"
      ? `<p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>Valid for 15 minutes. If you did not register, you can ignore this email.</p>`
      : `<p>Ihr Bestätigungscode lautet:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>Gültig für 15 Minuten. Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail.</p>`;

  if (key) {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Email send failed: ${res.status} ${text}`);
    }
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "E-Mail-Versand nicht konfiguriert: RESEND_API_KEY und EMAIL_FROM in .env setzen (siehe .env.example)."
    );
  }

  console.warn(`[email] RESEND_API_KEY fehlt — Bestätigungscode für ${to}: ${code}`);
}

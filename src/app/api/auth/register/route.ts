import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { sendVerificationEmail } from "@/lib/email";
import {
  generateSixDigitCode,
  hashVerificationCode,
  verificationExpiresAt,
} from "@/lib/emailVerification";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() || null : null;
    const locale = body.locale === "en" ? "en" : "de";

    if (!EMAIL_RE.test(emailRaw)) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Passwort mindestens 8 Zeichen." }, { status: 400 });
    }

    const email = emailRaw.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Diese E-Mail ist bereits registriert." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const displayName = name || emailRaw.split("@")[0] || "Workspace";

    const company = await prisma.company.create({
      data: {
        name: displayName,
        locale: "de-DE",
        currency: "EUR",
        inferredBusinessModelType: "mixed",
        inferredConfidence: 0.4,
        stageGuess: "early_revenue",
        stageConfidence: 0.4,
      },
    });

    const plain = generateSixDigitCode();
    const emailVerificationCodeHash = await hashVerificationCode(plain);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        companyId: company.id,
        emailVerified: false,
        emailVerificationCodeHash,
        emailVerificationExpiresAt: verificationExpiresAt(),
      },
    });

    await prisma.companySettings.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        llmModel: "gpt-4o-mini",
      },
      update: {},
    });

    await getOrCreateStudyParticipant(company.id);

    try {
      await sendVerificationEmail(user.email, plain, locale);
    } catch (e) {
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
      const msg = e instanceof Error ? e.message : "E-Mail konnte nicht gesendet werden.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      needsVerification: true,
      email: user.email,
    });
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json({ error: "Registrierung fehlgeschlagen." }, { status: 500 });
  }
}

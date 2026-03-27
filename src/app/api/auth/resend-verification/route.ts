import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import {
  generateSixDigitCode,
  hashVerificationCode,
  verificationExpiresAt,
} from "@/lib/emailVerification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const locale = body.locale === "en" ? "en" : "de";

    if (!emailRaw || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort erforderlich." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: emailRaw } });
    if (!user) {
      return NextResponse.json({ ok: true });
    }
    if (user.emailVerified) {
      return NextResponse.json({ error: "E-Mail ist bereits bestätigt." }, { status: 400 });
    }

    const pwOk = await bcrypt.compare(password, user.passwordHash);
    if (!pwOk) {
      return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 401 });
    }

    const plain = generateSixDigitCode();
    const emailVerificationCodeHash = await hashVerificationCode(plain);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCodeHash,
        emailVerificationExpiresAt: verificationExpiresAt(),
      },
    });

    await sendVerificationEmail(user.email, plain, locale);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/resend-verification]", err);
    const msg = err instanceof Error ? err.message : "Versand fehlgeschlagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

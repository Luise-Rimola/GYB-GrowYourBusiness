import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { verifyCodeAgainstHash } from "@/lib/emailVerification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";

    if (!emailRaw || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: emailRaw } });
    if (!user) {
      return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 400 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ error: "E-Mail ist bereits bestätigt." }, { status: 400 });
    }
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return NextResponse.json({ error: "Code abgelaufen. Bitte neuen Code anfordern." }, { status: 400 });
    }
    const ok = await verifyCodeAgainstHash(code, user.emailVerificationCodeHash);
    if (!ok) {
      return NextResponse.json({ error: "Falscher Code." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    const token = await createSessionToken({
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
    });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, redirect: "/home" });
  } catch (err) {
    console.error("[auth/verify-email]", err);
    return NextResponse.json({ error: "Bestätigung fehlgeschlagen." }, { status: 500 });
  }
}

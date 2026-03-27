import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort erforderlich." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 401 });
    }

    if (!user.emailVerified) {
      const pendingVerification = user.emailVerificationCodeHash != null;
      if (!pendingVerification) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true, emailVerificationCodeHash: null, emailVerificationExpiresAt: null },
        });
      } else {
        return NextResponse.json(
          {
            error: "E-Mail noch nicht bestätigt. Bitte Code eingeben oder neu anfordern.",
            code: "EMAIL_NOT_VERIFIED",
            email: user.email,
          },
          { status: 403 }
        );
      }
    }

    const token = await createSessionToken({
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
    });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, redirect: "/home" });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 500 });
  }
}

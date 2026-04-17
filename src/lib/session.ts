import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "gds_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 Tage

export type SessionPayload = {
  sub: string;
  companyId: string;
  email: string;
};

function getSecretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET muss gesetzt sein (mindestens 16 Zeichen).");
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    companyId: payload.companyId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const companyId = typeof payload.companyId === "string" ? payload.companyId : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!sub || !companyId || !email) return null;
    return { sub, companyId, email };
  } catch {
    return null;
  }
}

/** Ohne AUTH_SECRET oder bei ungültigem Token: null (kein Throw). */
export async function getSessionSafe(): Promise<SessionPayload | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    return verifySessionToken(raw);
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  return getSessionSafe();
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export { COOKIE_NAME, MAX_AGE_SEC };

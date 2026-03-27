import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const CODE_TTL_MS = 15 * 60 * 1000;

export function generateSixDigitCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export async function hashVerificationCode(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyCodeAgainstHash(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function verificationExpiresAt(): Date {
  return new Date(Date.now() + CODE_TTL_MS);
}

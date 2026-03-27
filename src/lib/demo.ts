import { prisma } from "@/lib/prisma";

/** Nur für lokale Entwicklung mit DEV_AUTH_BYPASS=1 — nicht in Produktion aktivieren. */
export async function getLegacyDemoCompany() {
  const existing = await prisma.company.findFirst({
    where: { name: "Demo Company" },
  });
  if (existing) return existing;
  return prisma.company.create({
    data: {
      name: "Demo Company",
      locale: "en-US",
      currency: "USD",
      inferredBusinessModelType: "mixed",
      inferredConfidence: 0.4,
      stageGuess: "early_revenue",
      stageConfidence: 0.4,
    },
  });
}

/** @deprecated Nutze requireCompany aus @/lib/companyContext — bleibt für bestehende Imports erhalten. */
export async function getOrCreateDemoCompany() {
  const { requireCompany } = await import("@/lib/companyContext");
  return requireCompany();
}

import { redirect } from "next/navigation";
import type { Company } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import { getLegacyDemoCompany } from "@/lib/demo";

/**
 * Server Components / Server Actions: eingeloggter Arbeitsbereich oder Demo-Bypass.
 */
export async function requireCompany(): Promise<Company> {
  if (process.env.DEV_AUTH_BYPASS === "1") {
    return getLegacyDemoCompany();
  }
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");
  const company = await prisma.company.findUnique({ where: { id: session.companyId } });
  if (!company) redirect("/login");
  return company;
}

/**
 * Route Handlers: kein Redirect, 401 bei fehlender Session.
 */
export async function getCompanyForApi(): Promise<{ company: Company; userId: string } | null> {
  if (process.env.DEV_AUTH_BYPASS === "1") {
    const company = await getLegacyDemoCompany();
    return { company, userId: "dev-bypass" };
  }
  const session = await getSessionFromCookies();
  if (!session) return null;
  const company = await prisma.company.findUnique({ where: { id: session.companyId } });
  if (!company) return null;
  return { company, userId: session.sub };
}

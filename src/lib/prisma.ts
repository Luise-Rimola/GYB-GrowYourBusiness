import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function normalizeDatasourceUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const isSupabasePooler = parsed.hostname.endsWith(".pooler.supabase.com");
    if (!isSupabasePooler) return url;

    if (!parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }
    const configuredLimit = Number(parsed.searchParams.get("connection_limit") ?? "0");
    if (!Number.isFinite(configuredLimit) || configuredLimit <= 0 || configuredLimit > 1) {
      parsed.searchParams.set("connection_limit", "1");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: normalizeDatasourceUrl(process.env.DATABASE_URL),
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

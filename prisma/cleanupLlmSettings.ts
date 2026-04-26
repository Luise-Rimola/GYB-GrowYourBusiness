import { prisma } from "../src/lib/prisma";
import { getEnvDefaultModel, sanitizeHttpUrl } from "../src/lib/llmEnvDefaults";

async function main() {
  const fallbackModel = getEnvDefaultModel();

  const all = await prisma.companySettings.findMany({
    select: {
      id: true,
      llmApiUrl: true,
      llmApiKey: true,
      llmModel: true,
    },
  });

  let urlFixed = 0;
  let modelFixed = 0;

  for (const row of all) {
    const updates: { llmApiUrl?: string | null; llmModel?: string | null } = {};

    const rawUrl = String(row.llmApiUrl ?? "").trim();
    if (rawUrl && !sanitizeHttpUrl(rawUrl)) {
      updates.llmApiUrl = null;
      urlFixed += 1;
    }

    const model = String(row.llmModel ?? "").trim().toLowerCase();
    const looksLikeLegacyDefault = model === "kimi-k2" || model === "kimi.k2";
    const hasCustomSetup = Boolean(sanitizeHttpUrl(row.llmApiUrl)) || String(row.llmApiKey ?? "").trim().length > 0;
    if (looksLikeLegacyDefault && !hasCustomSetup) {
      updates.llmModel = fallbackModel;
      modelFixed += 1;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.companySettings.update({
        where: { id: row.id },
        data: updates,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        totalRows: all.length,
        apiUrlSanitized: urlFixed,
        modelDefaultsUpdated: modelFixed,
        fallbackModel,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[cleanupLlmSettings] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

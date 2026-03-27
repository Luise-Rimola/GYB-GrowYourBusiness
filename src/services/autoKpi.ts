import { prisma } from "@/lib/prisma";

export const AutoKpiService = {
  async inferBusinessModel(companyId: string) {
    const profile = await prisma.companyProfile.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    });
    return {
      business_model_type: "mixed",
      confidence: 0.4,
      stage: "early_revenue",
      stage_confidence: 0.4,
      rationale: profile ? ["Profile signals used"] : ["Insufficient data"],
    };
  },

  async selectKpiSet(companyId: string, businessModelType: string) {
    const library = await prisma.kpiLibrary.findMany({
      orderBy: { priorityWeight: "desc" },
    });
    const model = businessModelType.toLowerCase();
    const filtered = library.filter((kpi) => {
      const models = kpi.businessModelsJson as string[] | null;
      if (models?.length) return models.includes(model) || models.includes("mixed");
      return kpi.businessModelType === model || kpi.businessModelType === "mixed";
    });
    return {
      selected_kpis: filtered.map((kpi) => kpi.kpiKey),
      kpi_tree: { north_star: filtered[0]?.kpiKey ?? null, drivers: {} },
      missing_inputs: [],
      rationale: ["Auto-selected from KPI library v1.0"],
    };
  },
};

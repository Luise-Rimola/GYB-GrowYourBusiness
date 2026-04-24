import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/** Intake-Antworten und Profil-JSON zusammenführen (Profil gewinnt bei Überschneidungen). */
export async function getMergedIntakeExisting(companyId: string): Promise<Record<string, unknown>> {
  const { existing } = await getIntakeFormState(companyId);
  return existing;
}

export async function getIntakeFormState(companyId: string): Promise<{
  existing: Record<string, unknown>;
  formKey: string;
}> {
  const [latestSession, latestProfile] = await Promise.all([
    prisma.intakeSession.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.companyProfile.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    }),
  ]);
  const sessionObj = (latestSession?.answersJson as Record<string, unknown>) ?? {};
  const profileObj = (latestProfile?.profileJson as Record<string, unknown>) ?? {};
  const existing = { ...sessionObj, ...profileObj };
  const formKey = `${latestProfile?.version ?? 0}-${latestSession?.id ?? "none"}`;
  return { existing, formKey };
}

export async function processIntakeForm(
  companyId: string,
  formData: FormData
): Promise<Record<string, unknown>> {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const rawOpeningMonth = String(formData.get("opening_month") || "").trim();
  const openingMonth = /^\d{4}-\d{2}$/.test(rawOpeningMonth) ? rawOpeningMonth : nowMonth;

  const productsJson = formData.get("products_json");
  const suppliersJson = formData.get("suppliers_json");
  const teamJson = formData.get("team_json");

  const goals = formData.getAll("goals") as string[];
  const aiRequests = formData.getAll("ai_request") as string[];
  const socialMediaChannels = formData.getAll("social_media_channels") as string[];

  const answers: Record<string, unknown> = {
    business_state: String(formData.get("business_state") || ""),
    goals,
    ai_requests: aiRequests,
    social_media_channels: socialMediaChannels,
    company_name: String(formData.get("company_name") || ""),
    location: String(formData.get("location") || ""),
    website: String(formData.get("website") || ""),
    offer: String(formData.get("offer") || ""),
    usp: String(formData.get("usp") || ""),
    customers: String(formData.get("customers") || ""),
    market_reach: String(formData.get("market_reach") || "national"),
    products: productsJson ? JSON.parse(String(productsJson)) : [],
    suppliers: suppliersJson ? JSON.parse(String(suppliersJson)) : [],
    production_steps: String(formData.get("production_steps") || ""),
    team: teamJson ? JSON.parse(String(teamJson)) : [],
    revenue_last_month: parseFloat(String(formData.get("revenue_last_month") || "0")) || 0,
    marketing_spend: parseFloat(String(formData.get("marketing_spend") || "0")) || 0,
    fixed_costs: parseFloat(String(formData.get("fixed_costs") || "0")) || 0,
    variable_costs: parseFloat(String(formData.get("variable_costs") || "0")) || 0,
    opening_month: openingMonth,
    team_size: parseInt(String(formData.get("team_size") || "0"), 10) || 0,
    stage: String(formData.get("stage") || "early_revenue"),
    competitors: String(formData.get("competitors") || ""),
    growth_challenge: String(formData.get("growth_challenge") || ""),
    differentiators: String(formData.get("differentiators") || ""),
    sales_channels: String(formData.get("sales_channels") || ""),
    lead_time: String(formData.get("lead_time") || ""),
    constraints: String(formData.get("constraints") || ""),
    funding_status: String(formData.get("funding_status") || ""),
    legal_structure: String(formData.get("legal_structure") || ""),
    years_in_business: parseFloat(String(formData.get("years_in_business") || "0")) || 0,
    target_market: String(formData.get("target_market") || ""),
    acquisition_channels: String(formData.get("acquisition_channels") || ""),
    aov: parseFloat(String(formData.get("aov") || "0")) || 0,
    retention_churn: String(formData.get("retention_churn") || ""),
    additional_notes: String(formData.get("additional_notes") || ""),
  };

  const file = formData.get("cost_excel") as File | null;
  if (file?.size && file?.name) {
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadsDir = path.join(process.cwd(), "uploads");
      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, `${Date.now()}-${file.name}`);
      await writeFile(filePath, buffer);
      await prisma.document.create({
        data: {
          companyId,
          filename: file.name,
          docType: "costs",
          storageUri: filePath,
        },
      });
      (answers as Record<string, unknown>).cost_excel_uploaded = file.name;
    } catch (e) {
      (answers as Record<string, unknown>).cost_excel_error = String(e);
    }
  }

  await prisma.intakeSession.create({
    data: {
      companyId,
      status: "complete",
      answersJson: answers as object,
    },
  });

  const latestProfile = await prisma.companyProfile.findFirst({
    where: { companyId },
    orderBy: { version: "desc" },
  });
  const profileJson = {
    ...(typeof latestProfile?.profileJson === "object" ? (latestProfile.profileJson as object) : {}),
    ...answers,
    updated_at: new Date().toISOString(),
  };
  const filled = [
    answers.company_name,
    answers.offer,
    answers.revenue_last_month,
    answers.location,
    answers.usp,
    answers.website,
  ].filter(Boolean).length;
  await prisma.companyProfile.create({
    data: {
      companyId,
      version: (latestProfile?.version ?? 0) + 1,
      profileJson,
      completenessScore: Math.min(1, filled / 6 + 0.2),
    },
  });

  // Supplier list and real estate are now created via WF_SUPPLIER_LIST and WF_REAL_ESTATE workflows.
  return answers;
}

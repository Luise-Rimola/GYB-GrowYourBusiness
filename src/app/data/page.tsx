import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { Badge } from "@/components/Badge";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { ReadableDataView } from "@/components/ReadableDataView";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { createRunWorkflowAction, updateArtifactAction } from "@/app/actions";
import { WIZARD_WORKFLOW_ORDER, DATA_TO_WORKFLOWS, WORKFLOW_NAMES } from "@/lib/planningFramework";
import { ArtifactEditor } from "@/components/ArtifactEditor";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { evaluateCompanyIndicatorRules } from "@/lib/indicatorMappingRulesEngine";

async function addSource(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const title = String(formData.get("title"));
  const url = String(formData.get("url") || "");
  const type = String(formData.get("type") || "web");
  const licenseNote = String(formData.get("license_note") || "");
  if (!title.trim()) return;

  await prisma.source.create({
    data: {
      companyId: company.id,
      type: type as "web" | "report" | "paper" | "internal" | "interview" | "estimate",
      title: title.trim(),
      url: url || null,
      licenseNote: licenseNote || null,
    },
  });
  redirect("/data");
}

async function addDocument(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const filename = String(formData.get("filename") || "document").trim();
  const docType = String(formData.get("doc_type") || "other");
  if (!filename) return;
  await prisma.document.create({
    data: {
      companyId: company.id,
      filename,
      docType: docType as "revenue" | "costs" | "ads" | "analytics" | "crm" | "other",
      storageUri: `local://${Date.now()}-${filename}`,
    },
  });
  redirect("/data");
}

async function addKpiValue(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const kpiKey = String(formData.get("kpi_key_custom") || formData.get("kpi_key") || "").trim();
  const value = parseFloat(String(formData.get("value") || "0"));
  const confidence = parseFloat(String(formData.get("confidence") || "0.5"));
  const periodStr = String(formData.get("period") || "").trim();
  if (!kpiKey) return;

  let periodEnd: Date = new Date();
  if (periodStr) {
    const d = new Date(periodStr);
    if (!isNaN(d.getTime())) periodEnd = d;
  }
  await prisma.kpiValue.create({
    data: {
      companyId: company.id,
      kpiKey: kpiKey.trim(),
      value,
      confidence: Math.min(1, Math.max(0, confidence)),
      periodEnd,
      qualityJson: { completeness: 1, freshness: 1, consistency: 1, traceability: "manual" },
      sourceRefJson: { type: "manual_input" },
    },
  });
  await evaluateCompanyIndicatorRules(company.id, "kpi_update");
  redirect("/data");
}

async function updateCompany(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: String(formData.get("name") || company.name).trim() || company.name,
      locale: String(formData.get("locale") || "").trim() || null,
      currency: String(formData.get("currency") || "").trim() || null,
    },
  });
  redirect("/data");
}

async function updateKpiValue(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const value = parseFloat(String(formData.get("value") || "0"));
  const confidence = parseFloat(String(formData.get("confidence") || "0.5"));
  const updated = await prisma.kpiValue.update({
    where: { id },
    data: { value, confidence: Math.min(1, Math.max(0, confidence)) },
  });
  await evaluateCompanyIndicatorRules(updated.companyId, "kpi_update");
  redirect("/data");
}

async function deleteKpiValue(formData: FormData) {
  "use server";
  await prisma.kpiValue.delete({ where: { id: String(formData.get("id")) } });
  redirect("/data");
}

async function updateDocument(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.document.update({
    where: { id },
    data: {
      filename: String(formData.get("filename") || "").trim(),
      docType: String(formData.get("doc_type") || "other") as "revenue" | "costs" | "ads" | "analytics" | "crm" | "other",
    },
  });
  redirect("/data");
}

async function deleteDocument(formData: FormData) {
  "use server";
  await prisma.document.delete({ where: { id: String(formData.get("id")) } });
  redirect("/data");
}

async function updateSource(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.source.update({
    where: { id },
    data: {
      title: String(formData.get("title") || "").trim(),
      url: String(formData.get("url") || "").trim() || null,
      type: String(formData.get("type") || "web") as "web" | "report" | "paper" | "internal" | "interview" | "estimate",
      licenseNote: String(formData.get("license_note") || "").trim() || null,
    },
  });
  redirect("/data");
}

async function deleteSource(formData: FormData) {
  "use server";
  await prisma.source.delete({ where: { id: String(formData.get("id")) } });
  redirect("/data");
}


async function updateProfile(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const raw = String(formData.get("profile_json") || "{}");
  let profileJson: object;
  try {
    profileJson = JSON.parse(raw) as object;
  } catch {
    redirect("/data");
    return;
  }
  const latest = await prisma.companyProfile.findFirst({
    where: { companyId: company.id },
    orderBy: { version: "desc" },
  });
  await prisma.companyProfile.create({
    data: {
      companyId: company.id,
      version: (latest?.version ?? 0) + 1,
      profileJson,
      completenessScore: 0.8,
    },
  });
  redirect("/data");
}

async function updateKpiSet(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const raw = String(formData.get("selected_kpis_json") || "[]");
  let selectedKpis: string[];
  try {
    selectedKpis = JSON.parse(raw) as string[];
  } catch {
    redirect("/data");
    return;
  }
  const latest = await prisma.companyKpiSet.findFirst({
    where: { companyId: company.id },
    orderBy: { version: "desc" },
  });
  await prisma.companyKpiSet.create({
    data: {
      companyId: company.id,
      version: (latest?.version ?? 0) + 1,
      selectedKpisJson: selectedKpis,
      kpiTreeJson: latest?.kpiTreeJson ?? {},
      rationaleJson: latest?.rationaleJson ?? {},
    },
  });
  redirect("/data");
}

function WorkflowsDependent({ dataType, restartLabel }: { dataType: string; restartLabel: string }) {
  const wfs = DATA_TO_WORKFLOWS[dataType] ?? [];
  const unique = [...new Set(wfs)];
  if (unique.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="text-xs text-[var(--muted)]">{restartLabel}</span>
      {unique.map((key) => (
        <form key={key} action={createRunWorkflowAction} className="inline">
          <input type="hidden" name="workflow_key" value={key} />
          <input type="hidden" name="force_new" value="1" />
          <input type="hidden" name="return_target" value="data" />
          <button type="submit" className="rounded-lg border border-teal-600 px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50">
            {WORKFLOW_NAMES[key] ?? key} →
          </button>
        </form>
      ))}
    </div>
  );
}

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ run_error?: string }>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const [
    documents,
    sources,
    extracts,
    inputFields,
    kpiLibrary,
    profile,
    kpiSet,
    intakeSession,
    kpiValues,
    artifacts,
    runsCount,
    decisionsCount,
    profilesCount,
    intakeSessionsCount,
    kpiValuesCount,
  ] = await Promise.all([
    prisma.document.findMany({ where: { companyId: company.id } }),
    prisma.source.findMany({ where: { companyId: company.id } }),
    prisma.documentExtract.findMany({
      where: { document: { companyId: company.id } },
      include: { document: true },
    }),
    prisma.kpiInputField.findMany({ orderBy: { key: "asc" } }),
    prisma.kpiLibrary.findMany({ orderBy: { priorityWeight: "desc" } }),
    prisma.companyProfile.findFirst({ where: { companyId: company.id }, orderBy: { version: "desc" } }),
    prisma.companyKpiSet.findFirst({ where: { companyId: company.id }, orderBy: { version: "desc" } }),
    prisma.intakeSession.findFirst({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
    prisma.kpiValue.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.artifact.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
    prisma.run.count({ where: { companyId: company.id } }),
    prisma.decision.count({ where: { companyId: company.id } }),
    prisma.companyProfile.count({ where: { companyId: company.id } }),
    prisma.intakeSession.count({ where: { companyId: company.id } }),
    prisma.kpiValue.count({ where: { companyId: company.id } }),
  ]);

  const hasProfile = !!profile && (profile.completenessScore ?? 0) >= 0.5;
  const hasIntake = intakeSession?.status === "complete";
  const selectedKpis = (kpiSet?.selectedKpisJson as string[] | undefined) ?? [];

  const dbOverview = [
    { table: "Company", label: t.data.dbOverviewCompany, count: 1, editHref: "/profile", data: { name: company.name, locale: company.locale, currency: company.currency } },
    { table: "CompanyProfile", label: t.data.dbOverviewProfileSnapshots, count: profilesCount, editHref: "/profile", data: profile?.profileJson },
    { table: "IntakeSession", label: t.data.dbOverviewIntakeAnswers, count: intakeSessionsCount, editHref: "/intake", data: intakeSession?.answersJson },
    { table: "CompanyKpiSet", label: t.data.dbOverviewKpiSet, count: kpiSet ? 1 : 0, editHref: null, data: { selectedKpis: selectedKpis } },
    { table: "KpiValue", label: t.data.dbOverviewKpiValues, count: kpiValuesCount, editHref: null, data: kpiValues.slice(0, 5).map((k) => ({ kpiKey: k.kpiKey, value: k.value })) },
    { table: "Document", label: t.data.dbOverviewDocuments, count: documents.length, editHref: null, data: documents.slice(0, 3).map((d) => ({ filename: d.filename, docType: d.docType })) },
    { table: "DocumentExtract", label: t.data.dbOverviewExtracts, count: extracts.length, editHref: null, data: null },
    { table: "Source", label: t.data.dbOverviewSources, count: sources.length, editHref: null, data: sources.slice(0, 3).map((s) => ({ title: s.title, type: s.type })) },
    { table: "Artifact", label: t.data.dbOverviewArtifacts, count: (artifacts ?? []).length, editHref: "/artifacts", data: (artifacts ?? []).slice(0, 5).map((a) => ({ type: a.type, title: a.title })) },
    { table: "Run", label: t.data.dbOverviewRuns, count: runsCount, editHref: "/runs", data: null },
    { table: "Decision", label: t.data.dbOverviewDecisions, count: decisionsCount, editHref: "/decisions", data: null },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{t.data.title}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {t.data.subtitle}
        </p>
      </header>

      {params.run_error === "run_start_failed" && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          {t.data.runStartFailed}
        </div>
      )}

      <Section
        title={t.data.dbMapping}
        description={t.data.dbMappingDesc}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dbOverview.map((row) => (
            <div
              key={row.table}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-teal-200 dark:hover:border-teal-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-[var(--muted)]">{row.table}</p>
                  <p className="font-semibold text-[var(--foreground)]">{row.label}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{row.count} {t.data.entries}</p>
                </div>
                {row.editHref && (
                  <Link
                    href={row.editHref}
                    className="rounded-lg border border-teal-600 px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
                  >
                    {t.data.edit} →
                  </Link>
                )}
              </div>
              {row.data && typeof row.data === "object" && Object.keys(row.data as object).length > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-2">
                  <ReadableDataView data={row.data} summary={t.data.preview} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t.data.workflowsOnChange}
        description={t.data.workflowsOnChangeDesc}
      >
        <div className="flex flex-wrap gap-2">
          {WIZARD_WORKFLOW_ORDER.map((key) => (
            <form key={key} action={createRunWorkflowAction} className="inline">
              <input type="hidden" name="workflow_key" value={key} />
              <input type="hidden" name="force_new" value="1" />
              <input type="hidden" name="return_target" value="data" />
              <button
                type="submit"
                className="rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-900/50"
              >
                {WORKFLOW_NAMES[key] ?? key} →
              </button>
            </form>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {t.data.clickToRestart}
        </p>
      </Section>

      <Section
        title={t.data.masterData}
        description={t.data.masterDataDesc}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="font-semibold text-[var(--foreground)]">{t.data.companyCard}</h3>
            <form action={updateCompany} className="mt-3 space-y-3">
              <input name="name" defaultValue={company.name} className="w-full rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" placeholder={t.data.name} />
              <input name="locale" defaultValue={company.locale ?? ""} className="w-full rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" placeholder={t.data.locale} />
              <input name="currency" defaultValue={company.currency ?? ""} className="w-full rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" placeholder={t.data.currency} />
              <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">{t.common.save}</button>
            </form>
            <WorkflowsDependent dataType="company_profile" restartLabel={t.data.workflowsRestart} />
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="font-semibold text-[var(--foreground)]">{t.data.businessInfo}</h3>
            <form action={updateProfile} className="mt-3 space-y-2">
              <textarea name="profile_json" defaultValue={JSON.stringify(profile?.profileJson ?? {}, null, 2)} rows={6} className="w-full rounded-lg border border-[var(--card-border)] p-2 font-mono text-xs dark:bg-[var(--background)]" placeholder="{}" />
              <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">{t.data.saveProfile}</button>
            </form>
            <Link href="/intake" className="mt-2 inline-block text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400">{t.data.intakeEdit}</Link>
            <div className="mt-2 flex gap-2">
              <Badge label={hasIntake ? t.data.intakeOk : t.data.intakeMissing} tone={hasIntake ? "success" : "warning"} />
              <Badge label={hasProfile ? t.data.profileOk : t.data.profileMissing} tone={hasProfile ? "success" : "warning"} />
            </div>
            <WorkflowsDependent dataType="company_profile" restartLabel={t.data.workflowsRestart} />
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="font-semibold text-[var(--foreground)]">{t.data.kpiSet}</h3>
            <form action={updateKpiSet} className="mt-3 space-y-2">
              <textarea name="selected_kpis_json" defaultValue={JSON.stringify(selectedKpis, null, 2)} rows={4} className="w-full rounded-lg border border-[var(--card-border)] p-2 font-mono text-xs dark:bg-[var(--background)]" placeholder='["revenue","mrr",...]' />
              <button type="submit" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">{t.data.saveKpiSet}</button>
            </form>
            <WorkflowsDependent dataType="kpi_set" restartLabel={t.data.workflowsRestart} />
          </div>
        </div>
      </Section>

      <Section title={t.data.kpiValuesSection} description={t.data.kpiValuesDesc}>
        <WorkflowsDependent dataType="baseline" restartLabel={t.data.workflowsRestart} />
        <div className="mb-4">
          {kpiValues.length > 0 && (
            <div className="space-y-2">
              {kpiValues.map((k) => (
                <div key={k.id} className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                  <span className="font-mono text-sm text-[var(--foreground)]">{k.kpiKey}</span>
                  <form action={updateKpiValue} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={k.id} />
                    <input name="value" type="number" step="any" defaultValue={k.value} className="w-24 rounded-lg border border-[var(--card-border)] px-2 py-1 text-sm dark:bg-[var(--background)]" />
                    <input name="confidence" type="number" min="0" max="1" step="0.1" defaultValue={k.confidence} className="w-16 rounded-lg border border-[var(--card-border)] px-2 py-1 text-sm dark:bg-[var(--background)]" placeholder="conf" />
                    <button type="submit" className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700">{t.common.save}</button>
                  </form>
                  <ConfirmDeleteForm action={deleteKpiValue} confirmMessage={t.data.deleteKpiValueConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                    <input type="hidden" name="id" value={k.id} />
                    <button type="submit" className="rounded-full border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/50">{t.common.delete}</button>
                  </ConfirmDeleteForm>
                </div>
              ))}
            </div>
          )}
        </div>
        <form action={addKpiValue} className="mt-4 flex flex-wrap gap-3">
          <select
            name="kpi_key"
            id="kpi_key_select"
            className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
          >
            <option value="">{t.data.selectOrType}</option>
            <optgroup label={t.data.inputFields}>
              {inputFields.map((f) => (
                <option key={f.key} value={f.key}>{f.labelSimple} ({f.key})</option>
              ))}
            </optgroup>
            <optgroup label={t.data.computedKpis}>
              {kpiLibrary.map((k) => (
                <option key={k.kpiKey} value={k.kpiKey}>{k.nameSimple} ({k.kpiKey})</option>
              ))}
            </optgroup>
          </select>
          <input
            name="kpi_key_custom"
            placeholder={t.data.customKeyPlaceholder}
            className="w-64 rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
          />
          <input
            name="value"
            type="number"
            step="any"
            placeholder={t.data.value}
            className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
          />
          <input
            name="confidence"
            type="number"
            min="0"
            max="1"
            step="0.1"
            placeholder={t.data.confidencePlaceholder}
            className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
          />
          <input
            name="period"
            type="date"
            placeholder="Datum"
            className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
            title="Datum (optional)"
          />
          <button type="submit" className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            {t.data.addKpiValue}
          </button>
        </form>
      </Section>

      <Section title={t.data.documents} description={t.data.documentsDesc}>
        <form action={addDocument} className="mb-4 flex flex-wrap gap-3">
          <input name="filename" placeholder={t.data.filename} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" required />
          <select name="doc_type" className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]">
            <option value="revenue">Revenue</option>
            <option value="costs">Costs</option>
            <option value="ads">Ads</option>
            <option value="analytics">Analytics</option>
            <option value="crm">CRM</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">{t.data.addDocument}</button>
        </form>
        <div className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t.data.noDocuments}</p>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <form action={updateDocument} className="flex flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={doc.id} />
                  <input name="filename" defaultValue={doc.filename} className="min-w-[120px] rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" />
                  <select name="doc_type" defaultValue={doc.docType} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]">
                    <option value="revenue">Revenue</option>
                    <option value="costs">Costs</option>
                    <option value="ads">Ads</option>
                    <option value="analytics">Analytics</option>
                    <option value="crm">CRM</option>
                    <option value="other">Other</option>
                  </select>
                  <button type="submit" className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700">{t.common.save}</button>
                </form>
                <ConfirmDeleteForm action={deleteDocument} confirmMessage={t.data.deleteDocumentConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                  <input type="hidden" name="id" value={doc.id} />
                  <button type="submit" className="rounded-full border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">{t.common.delete}</button>
                </ConfirmDeleteForm>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title={t.data.sourcesCatalog} description={t.data.sourcesDesc}>
        <form action={addSource} className="mb-4 flex flex-wrap gap-3">
          <input name="title" placeholder={t.data.sourceTitle} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" required />
          <input name="url" placeholder={t.data.url} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" />
          <input name="license_note" placeholder={t.data.licenseNote} className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" />
          <select name="type" className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]">
            <option value="web">Web</option>
            <option value="report">Report</option>
            <option value="paper">Paper</option>
            <option value="internal">Internal</option>
            <option value="interview">Interview</option>
            <option value="estimate">Estimate</option>
          </select>
          <button type="submit" className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">{t.data.addSource}</button>
        </form>
        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <form action={updateSource} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={source.id} />
                <input name="title" defaultValue={source.title} className="min-w-[140px] rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" />
                <input name="url" defaultValue={source.url ?? ""} className="min-w-[160px] rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" placeholder="URL" />
                <select name="type" defaultValue={source.type} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]">
                  <option value="web">Web</option>
                  <option value="report">Report</option>
                  <option value="paper">Paper</option>
                  <option value="internal">Internal</option>
                  <option value="interview">Interview</option>
                  <option value="estimate">Estimate</option>
                </select>
                <input name="license_note" defaultValue={source.licenseNote ?? ""} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]" placeholder="License" />
                <button type="submit" className="rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700">{t.common.save}</button>
              </form>
              <ConfirmDeleteForm action={deleteSource} confirmMessage={t.data.deleteSourceConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                <input type="hidden" name="id" value={source.id} />
                <button type="submit" className="rounded-full border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">{t.common.delete}</button>
              </ConfirmDeleteForm>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.data.artifactsOutputs} description={t.data.artifactsOutputsDesc}>
        <div className="space-y-6">
          {(artifacts ?? []).map((a) => (
            <div key={a.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[var(--foreground)]">{a.title}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">({a.type} · v{a.version})</span>
                </div>
                <Link href={`/artifacts/${a.id}`} className="rounded-lg border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50">
                  {t.data.viewArtifact}
                </Link>
              </div>
              <ArtifactEditor
                artifactType={a.type}
                content={(a.contentJson ?? {}) as Record<string, unknown>}
                submitAction={updateArtifactAction}
                artifactId={a.id}
                redirectTo="/data"
              />
              <div className="mt-4">
                <WorkflowsDependent dataType={a.type} restartLabel={t.data.workflowsRestart} />
              </div>
            </div>
          ))}
          {(artifacts ?? []).length === 0 && (
            <p className="text-sm text-[var(--muted)]">{t.data.noArtifacts}</p>
          )}
        </div>
      </Section>

      <Section title={t.data.documentExtracts} description={t.data.extractsDesc}>
        {extracts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t.data.noExtracts}</p>
        ) : (
          <div className="space-y-3">
            {extracts.map((ext) => (
              <div key={ext.id} className="rounded-2xl border border-[var(--card-border)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {ext.document.filename} · {ext.method}
                </p>
                <ReadableDataView data={ext.extractJson} summary={t.data.viewData} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

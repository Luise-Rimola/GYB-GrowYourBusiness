import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { KpiHistoryChart } from "@/components/KpiHistoryChart";
import { getTranslations } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale";
import { evaluateCompanyIndicatorRules } from "@/lib/indicatorMappingRulesEngine";

async function addKpiValueAction(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const kpiKey = String(formData.get("kpi_key") || "").trim();
  if (!kpiKey) return;
  const value = parseFloat(String(formData.get("value") || "0"));
  const confidence = parseFloat(String(formData.get("confidence") || "0.5"));
  const periodStr = String(formData.get("period") || "").trim();
  let periodEnd: Date = new Date();
  if (periodStr) {
    const d = new Date(periodStr);
    if (!isNaN(d.getTime())) periodEnd = d;
  }
  await prisma.kpiValue.create({
    data: {
      companyId: company.id,
      kpiKey: decodeURIComponent(kpiKey),
      value,
      confidence: Math.min(1, Math.max(0, confidence)),
      periodEnd,
      qualityJson: { completeness: 1, freshness: 1, consistency: 1, traceability: "manual" },
      sourceRefJson: { type: "manual_input" },
    },
  });
  await evaluateCompanyIndicatorRules(company.id, "kpi_update");
  redirect(`/insights/kpi/${encodeURIComponent(kpiKey.trim())}`);
}

export default async function KpiDetailPage({
  params,
}: {
  params: Promise<{ kpiKey: string }>;
}) {
  const { kpiKey } = await params;
  const company = await getOrCreateDemoCompany();
  const decodedKey = decodeURIComponent(kpiKey);
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  const [kpiValues, libraryEntry] = await Promise.all([
    prisma.kpiValue.findMany({
      where: { companyId: company.id, kpiKey: decodedKey },
      orderBy: [{ periodEnd: "asc" }, { createdAt: "asc" }],
    }),
    prisma.kpiLibrary.findFirst({ where: { kpiKey: decodedKey } }),
  ]);

  if (!libraryEntry) {
    notFound();
  }

  const chartData = kpiValues.map((v) => ({
    date: v.periodEnd ? new Date(v.periodEnd).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" }) : new Date(v.createdAt).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" }),
    value: v.value,
    confidence: v.confidence,
    rawDate: v.periodEnd ?? v.createdAt,
  })).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

  const name = libraryEntry?.nameSimple ?? decodedKey;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/insights"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Insights
        </Link>
      </div>
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{decodedKey}</p>
        {libraryEntry?.definition && (
          <p className="mt-2 text-sm text-[var(--muted)]">{libraryEntry.definition}</p>
        )}
      </div>
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Verlauf</h2>
        <KpiHistoryChart data={chartData} />
      </div>
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Statistik</h2>
        {kpiValues.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Noch keine Werte vorhanden.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="N" value={kpiValues.length} />
            <Stat label="Letzter Wert" value={fmtNum(last(kpiValues.map((v) => v.value)))} />
            <Stat label="Mittelwert" value={fmtNum(mean(kpiValues.map((v) => v.value)))} />
            <Stat label="Median" value={fmtNum(median(kpiValues.map((v) => v.value)))} />
            <Stat label="Min" value={fmtNum(Math.min(...kpiValues.map((v) => v.value)))} />
            <Stat label="Max" value={fmtNum(Math.max(...kpiValues.map((v) => v.value)))} />
            <Stat label="StdAbw" value={fmtNum(stddev(kpiValues.map((v) => v.value)))} />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Wert eintragen</h2>
        <form action={addKpiValueAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="kpi_key" value={kpiKey} />
          <div>
            <label htmlFor="period" className="mb-1 block text-xs font-medium text-[var(--muted)]">Datum</label>
            <input
              id="period"
              name="period"
              type="date"
              className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
            />
          </div>
          <div>
            <label htmlFor="value" className="mb-1 block text-xs font-medium text-[var(--muted)]">Wert</label>
            <input
              id="value"
              name="value"
              type="number"
              step="any"
              required
              placeholder="0"
              className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
            />
          </div>
          <div>
            <label htmlFor="confidence" className="mb-1 block text-xs font-medium text-[var(--muted)]">Konfidenz (0–1)</label>
            <input
              id="confidence"
              name="confidence"
              type="number"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.5"
              className="rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
            />
          </div>
          <button type="submit" className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            {t.data?.addKpiValue ?? "Wert hinzufügen"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Alle Werte</h2>
        {kpiValues.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Noch keine Werte. Tragen Sie oben einen Wert ein.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Datum</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Wert</th>
                  <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Konfidenz</th>
                </tr>
              </thead>
              <tbody>
                {kpiValues
                  .sort((a, b) => new Date(b.periodEnd ?? b.createdAt).getTime() - new Date(a.periodEnd ?? a.createdAt).getTime())
                  .map((v) => (
                    <tr key={v.id} className="border-b border-[var(--card-border)]/50">
                      <td className="px-3 py-2 text-[var(--muted)]">
                        {v.periodEnd ? new Date(v.periodEnd).toLocaleDateString("de-DE") : new Date(v.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-3 py-2 font-medium text-[var(--foreground)]">{v.value}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{Math.round(v.confidence * 100)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function mean(values: number[]) {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function stddev(values: number[]) {
  if (values.length <= 1) return 0;
  const mu = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - mu) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function last(values: number[]) {
  return values.length ? values[values.length - 1] : NaN;
}

function fmtNum(n: number) {
  return Number.isFinite(n) ? (Math.round(n * 100) / 100).toString() : "—";
}

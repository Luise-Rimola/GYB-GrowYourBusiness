"use client";

import type { ReactElement } from "react";
import { Badge } from "@/components/Badge";
import { Plan306090View } from "@/components/Plan306090View";

type GapRecord = Record<string, unknown>;

/** Extract clean absolute URL from LLM output (markdown, brackets, etc.) */
function extractRealEstateUrl(raw: string): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  // Markdown [text](url)
  const mdMatch = s.match(/\]\s*\(\s*(https?:\/\/[^\s)]+)\s*\)/);
  if (mdMatch) return mdMatch[1];
  // Angle brackets <url>
  const angleMatch = s.match(/<([^>]+)>/);
  if (angleMatch) {
    const u = angleMatch[1].trim();
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `https://${u}`;
  }
  // Parentheses (url) - anywhere in text
  const parenMatch = s.match(/\(\s*(https?:\/\/[^\s)]+)\s*\)/);
  if (parenMatch) return parenMatch[1];
  // Bare URL at start
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  // URL anywhere in text (e.g. in description)
  const urlInText = s.match(/(https?:\/\/[^\s\]\)]+)/);
  if (urlInText) return urlInText[1];
  if (s.includes(".") && !s.includes(" ")) return `https://${s}`;
  return null;
}

/** Deutsche Bezeichner für typische LLM-/JSON-Felder (Kleinbuchstaben-Key) */
const REPORT_FIELD_LABELS_DE: Record<string, string> = {
  name: "Name",
  description: "Beschreibung",
  attractiveness: "Attraktivität",
  rationale: "Begründung",
  type: "Typ",
  competitive_pressure: "Wettbewerbsdruck",
  behavior: "Verhalten",
  triggers: "Auslöser",
  segment_or_trait: "Segment / Merkmal",
  source_type: "Quellentyp",
  key_findings: "Kernerkenntnisse",
  gap_key: "Lücke",
  key: "Schlüssel",
  affected_kpis: "Betroffene KPIs",
  root_cause_tree: "Ursachenbaum",
  source_ref: "Quellen-Nr.",
  source_hint: "Quellenhinweis",
  blocks_kpis: "Blockierte KPIs",
  severity: "Schweregrad",
  recommended_collection_method: "Empfohlene Datenerhebung",
  minimum_data_to_fix: "Mindestdaten zur Behebung",
  revenue_description: "Umsatzbeschreibung",
  assumptions: "Annahmen",
  risks: "Risiken",
  enablers: "Treiber",
  confidence: "Konfidenz",
  competitor_impact_note: "Wettbewerbs-Einfluss",
  pricing_index: "Preisindex",
  buyer_behavior: "Kaufverhalten",
  supply_overview: "Angebotsüberblick",
  demand_overview: "Nachfrageüberblick",
  balance_assessment: "Einordnung",
  is_makeable: "Umsetzbar",
  recommendation: "Empfehlung",
  key_blockers: "Haupt-Hindernisse",
  preconditions: "Voraussetzungen",
  frequency: "Häufigkeit",
  mitigation: "Gegenmaßnahme",
  founder_simple_summary: "Kurzfassung",
  fit_score: "Eignung",
  jurisdiction: "Rechtsraum",
};

function formatLabel(key: string): string {
  const lower = key.toLowerCase();
  if (REPORT_FIELD_LABELS_DE[lower]) return REPORT_FIELD_LABELS_DE[lower];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function BaselineReportView({ content }: { content: Record<string, unknown> }) {
  const gaps = (content.top_gaps as GapRecord[] | undefined) ?? [];
  const alerts = (content.data_quality_alerts as string[] | undefined) ?? [];

  return (
    <div className="space-y-8">
      {/* Top KPI Gaps */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Top-KPI-Lücken
        </h3>
        <div className="space-y-4">
          {gaps.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Keine Lücken identifiziert.</p>
          ) : (
            gaps.map((gap, i) => {
              const gapKey = String(gap.gap_key ?? gap.key ?? `Lücke ${i + 1}`);
              const severity = String(gap.severity ?? "medium");
              const blocksKpis = (gap.blocks_kpis as string[] | undefined) ?? [];
              const recommended = String(gap.recommended_collection_method ?? gap.recommendation ?? "");
              const minimumData = gap.minimum_data_to_fix != null ? String(gap.minimum_data_to_fix) : null;

              return (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-[var(--foreground)]">
                      {formatLabel(gapKey)}
                    </h4>
                    <Badge
                      label={severity}
                      tone={
                        severity === "critical"
                          ? "danger"
                          : severity === "high"
                            ? "warning"
                            : "neutral"
                      }
                    />
                  </div>
                  {blocksKpis.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                        Blockierte KPIs
                      </p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {blocksKpis.map((k) => formatLabel(k)).join(", ")}
                      </p>
                    </div>
                  )}
                  {minimumData && (
                    <div className="mt-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                        Mindestdaten zur Behebung
                      </p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">{minimumData}</p>
                    </div>
                  )}
                  {recommended && (
                    <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-800 dark:bg-teal-950/20">
                      <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        Empfohlene Datenerhebung
                      </p>
                      <p className="mt-1 text-sm text-teal-800 dark:text-teal-200">
                        {recommended}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Data Quality Alerts */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Datenqualitäts-Hinweise
        </h3>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Keine Hinweise.</p>
          ) : (
            alerts.map((alert, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-800/50 dark:bg-amber-950/20"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                  !
                </span>
                <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                  {alert}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function IndustryResearchReportView({ content }: { content: Record<string, unknown> }) {
  const industry = String(content.industry ?? "—");
  const location = String(content.location ?? "—");
  const marketSize = content.market_size_estimate as string | undefined;
  const trends = (content.key_trends as string[]) ?? [];
  const competitors = (content.competitors as string[]) ?? [];
  const regulations = (content.regulations as string[]) ?? [];
  const facts = (content.key_facts as Array<{ fact?: string; source_hint?: string; source_ref?: number }>) ?? [];
  const typicalMetrics = content.typical_metrics as Record<string, unknown> | undefined;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Branche & Standort</h3>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-sm">
            <span className="font-medium text-[var(--muted)]">Branche:</span> {industry}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium text-[var(--muted)]">Standort:</span> {location}
          </p>
          {marketSize && (
            <p className="mt-1 text-sm">
              <span className="font-medium text-[var(--muted)]">Marktgröße:</span> {marketSize}
            </p>
          )}
        </div>
      </section>

      {trends.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Trends</h3>
          <ul className="space-y-2">
            {trends.map((t, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2">
                <span className="text-teal-600 dark:text-teal-400">•</span>
                <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {competitors.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Wettbewerber</h3>
          <ul className="space-y-2">
            {competitors.map((c, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2">
                <span className="text-teal-600 dark:text-teal-400">•</span>
                <span className="text-sm">{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {regulations.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Regulierung</h3>
          <ul className="space-y-2">
            {regulations.map((r, i) => (
              <li key={i} className="text-sm">{r}</li>
            ))}
          </ul>
        </section>
      )}

      {facts.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Kernfakten</h3>
          <div className="space-y-3">
            {facts.map((f, i) => (
              <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-sm">
                  {f.fact ?? ""}
                  {f.source_ref != null && (
                    <sup className="ml-0.5 text-[var(--muted)]">[{f.source_ref}]</sup>
                  )}
                </p>
                {f.source_hint && f.source_ref == null && (
                  <p className="mt-1 text-xs text-[var(--muted)]">Quelle: {f.source_hint}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {typicalMetrics && Object.keys(typicalMetrics).length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Typische Kennzahlen</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(typicalMetrics).map(([k, v]) =>
              v != null && v !== "" ? (
                <p key={k}>
                  <span className="font-medium text-[var(--muted)]">{formatLabel(k)}:</span>{" "}
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </p>
              ) : null
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function SteckbriefRecordTable({ record }: { record: GapRecord }) {
  const entries = Object.entries(record).filter(
    ([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
  );
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--muted)]">—</p>;
  }
  return (
    <table className="steckbrief-table w-full border-collapse text-sm">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b border-slate-100 last:border-0">
            <th className="px-3 py-2.5 text-left align-top">{formatLabel(k)}</th>
            <td className="px-3 py-2.5 align-top text-slate-800">
              {Array.isArray(v) ? v.join(", ") : String(v)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MarketSnapshotView({ content }: { content: Record<string, unknown> }) {
  const segments = (content.segments as GapRecord[] | undefined) ?? [];
  const competitors = (content.competitors as GapRecord[] | undefined) ?? [];
  const drivers = (content.demand_drivers as string[] | undefined) ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Segmente</h3>
        <div className="space-y-4">
          {segments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Keine Segmente.</p>
          ) : (
            segments.map((s, i) => (
              <div key={i} className="steckbrief-card shadow-sm">
                {typeof s === "object" && s !== null ? (
                  <SteckbriefRecordTable record={s as GapRecord} />
                ) : (
                  <div className="p-4">
                    <p className="text-sm">{String(s)}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Wettbewerber</h3>
        <div className="space-y-4">
          {competitors.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Keine Wettbewerber.</p>
          ) : (
            competitors.map((c, i) => (
              <div key={i} className="steckbrief-card shadow-sm">
                {typeof c === "object" && c !== null ? (
                  <SteckbriefRecordTable record={c as GapRecord} />
                ) : (
                  <div className="p-4">
                    <p className="text-sm">{String(c)}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {drivers.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Nachfrage-Treiber
          </h3>
          <ul className="space-y-2">
            {drivers.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2"
              >
                <span className="text-teal-600 dark:text-teal-400">•</span>
                <span className="text-sm">{d}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function MarketResearchView({ content }: { content: Record<string, unknown> }) {
  const buyer = (content.buyer_behavior as Array<{ segment_or_trait?: string; behavior?: string; triggers?: string[] }>) ?? [];
  const sd = content.supply_demand as { supply_overview?: string; demand_overview?: string; balance_assessment?: string } | undefined;
  const feas = content.feasibility_assessment as { is_makeable?: boolean; recommendation?: string; rationale?: string; key_blockers?: string[]; preconditions?: string[] } | undefined;
  const brd = (content.business_research_data as Array<{ source_type?: string; description?: string; key_findings?: string[] }>) ?? [];

  return (
    <div className="space-y-8">
      <MarketSnapshotView content={content} />
      {buyer.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Kaufverhalten</h3>
          <div className="space-y-4">
            {buyer.map((b, i) => (
              <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h4 className="font-semibold text-[var(--foreground)]">{b.segment_or_trait ?? "—"}</h4>
                <p className="mt-2 text-sm text-[var(--muted)]">{b.behavior ?? ""}</p>
                {b.triggers && b.triggers.length > 0 && (
                  <p className="mt-2 text-xs text-teal-600 dark:text-teal-400">Auslöser: {b.triggers.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {sd && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Angebot & Nachfrage</h3>
          <div className="space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p><span className="font-medium text-[var(--muted)]">Angebot:</span> {sd.supply_overview ?? "—"}</p>
            <p><span className="font-medium text-[var(--muted)]">Nachfrage:</span> {sd.demand_overview ?? "—"}</p>
            <p><span className="font-medium text-[var(--muted)]">Bilanz:</span> {sd.balance_assessment ?? "—"}</p>
          </div>
        </section>
      )}
      {feas && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Machbarkeit (vor Umsatz)</h3>
          <div className={`rounded-xl border p-5 ${feas.recommendation === "not_recommended" ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" : "border-[var(--card-border)] bg-[var(--card)]"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Umsetzbar:</span>
              <Badge label={feas.is_makeable ? "Ja" : "Nein"} tone={feas.is_makeable ? "success" : "danger"} />
              <Badge label={feas.recommendation ?? "—"} tone={feas.recommendation === "not_recommended" ? "danger" : feas.recommendation === "conditional" ? "warning" : "success"} />
            </div>
            <p className="mt-3 text-sm">{feas.rationale ?? ""}</p>
            {feas.key_blockers && feas.key_blockers.length > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Hindernisse: {feas.key_blockers.join(", ")}</p>
            )}
            {feas.preconditions && feas.preconditions.length > 0 && (
              <p className="mt-2 text-xs text-teal-600 dark:text-teal-400">Voraussetzungen: {feas.preconditions.join(", ")}</p>
            )}
          </div>
        </section>
      )}
      {brd.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Unternehmensrecherche</h3>
          <div className="space-y-4">
            {brd.map((b, i) => (
              <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h4 className="font-medium text-[var(--foreground)]">{b.source_type ?? "—"}</h4>
                <p className="mt-1 text-sm text-[var(--muted)]">{b.description ?? ""}</p>
                {(b.key_findings ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {(b.key_findings ?? []).map((f, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-teal-600 dark:text-teal-400">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type CostItem = { category: string; amount: number; cost_type?: "fixed" | "variable"; note?: string };

type MonthlyProjectionItem = {
  month: string;
  potential_customers?: number;
  potential_customers_note?: string;
  revenue: number;
  cost_items?: CostItem[];
  total_costs: number;
  taxes?: number;
  net_profit?: number;
  net?: number;
  competitor_impact_note?: string;
};

function getNetProfit(m: MonthlyProjectionItem): number {
  if (m.net_profit != null) return m.net_profit;
  if (m.net != null) return m.net - (m.taxes ?? 0);
  return m.revenue - m.total_costs - (m.taxes ?? 0);
}

export function BusinessPlanView({ content }: { content: Record<string, unknown> }) {
  const isMultiSection = "executive_summary" in content && content.executive_summary != null;
  const exec = content.executive_summary as { content?: string; key_points?: string[] } | undefined;
  const market = content.market_analysis as { content?: string; key_points?: string[] } | undefined;
  const marketing = content.marketing_plan as { content?: string; key_points?: string[] } | undefined;
  const fin = content.financial_scenarios as Record<string, unknown> | undefined;
  const risk = content.risk_analysis as { content?: string; key_points?: string[] } | undefined;
  const mgmt = content.management_team as { content?: string; key_points?: string[] } | undefined;
  const legal = content.legal_structure as { content?: string; key_points?: string[] } | undefined;
  const capital = content.capital_requirements_summary as string | undefined;
  const monthly = (content.monthly_projection ?? []) as MonthlyProjectionItem[];
  const w = (fin ?? content).worst_case as { revenue_min?: number; revenue_description?: string; assumptions?: string[]; risks?: string[] } | undefined;
  const b = (fin ?? content).best_case as { revenue_max?: number; revenue_description?: string; assumptions?: string[]; enablers?: string[] } | undefined;
  const r = (fin ?? content).realistic_case as { revenue_expected?: number; revenue_description?: string; assumptions?: string[]; confidence?: number } | undefined;
  const brd = ((fin ?? content).business_research_data ?? content.business_research_data ?? []) as Array<{ source_type?: string; description?: string; key_findings?: string[] }>;

  return (
    <div className="space-y-8">
      {isMultiSection && exec?.content && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Management-Zusammenfassung</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{exec.content}</p>
            {(exec.key_points ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {(exec.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-2"><span className="text-teal-600 dark:text-teal-400">•</span>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {isMultiSection && market?.content && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Marktanalyse</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{market.content}</p>
            {(market.key_points ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {(market.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-2"><span className="text-teal-600 dark:text-teal-400">•</span>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {isMultiSection && marketing?.content && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Marketingplan</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{marketing.content}</p>
            {(marketing.key_points ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {(marketing.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-2"><span className="text-teal-600 dark:text-teal-400">•</span>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Worst Case (min. Umsatz)</h3>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-800/50 dark:bg-amber-950/20">
          <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">{w?.revenue_min != null ? `€${w.revenue_min.toLocaleString()}` : "—"}</p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{w?.revenue_description ?? ""}</p>
          {(w?.assumptions ?? []).length > 0 && <p className="mt-2 text-xs">Annahmen: {(w?.assumptions ?? []).join("; ")}</p>}
          {(w?.risks ?? []).length > 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Risiken: {(w?.risks ?? []).join("; ")}</p>}
        </div>
      </section>
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Best Case (max. Umsatz)</h3>
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-800 dark:bg-teal-950/20">
          <p className="text-lg font-semibold text-teal-900 dark:text-teal-100">{b?.revenue_max != null ? `€${b.revenue_max.toLocaleString()}` : "—"}</p>
          <p className="mt-2 text-sm text-teal-800 dark:text-teal-200">{b?.revenue_description ?? ""}</p>
          {(b?.assumptions ?? []).length > 0 && <p className="mt-2 text-xs">Annahmen: {(b?.assumptions ?? []).join("; ")}</p>}
          {(b?.enablers ?? []).length > 0 && <p className="mt-1 text-xs text-teal-700 dark:text-teal-300">Treiber: {(b?.enablers ?? []).join("; ")}</p>}
        </div>
      </section>
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Realistisches Szenario</h3>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-lg font-semibold text-[var(--foreground)]">{r?.revenue_expected != null ? `€${r.revenue_expected.toLocaleString()}` : "—"}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{r?.revenue_description ?? ""}</p>
          {(r?.assumptions ?? []).length > 0 && <p className="mt-2 text-xs">Annahmen: {(r?.assumptions ?? []).join("; ")}</p>}
          {r?.confidence != null && <p className="mt-1 text-xs">Konfidenz: {Math.round((r.confidence ?? 0) * 100)}%</p>}
        </div>
      </section>
      {capital && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Kapitalbedarf</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm">{capital}</p>
          </div>
        </section>
      )}
      {mgmt?.content && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Management & Team</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm">{mgmt.content}</p>
            {(mgmt.key_points ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {(mgmt.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-2"><span className="text-teal-600 dark:text-teal-400">•</span>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {legal?.content && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Rechtsform</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm">{legal.content}</p>
            {(legal.key_points ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {(legal.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-2"><span className="text-teal-600 dark:text-teal-400">•</span>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {monthly.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Monatsprognose</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Monat</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Kunden</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Umsatz</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Kosten</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Steuerabzüge</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Netto-Gewinn</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const netProfit = getNetProfit(m);
                  return (
                    <tr key={i} className="border-b border-[var(--card-border)]/50">
                      <td className="px-3 py-2 font-medium">{m.month}</td>
                      <td className="px-3 py-2 text-right">{m.potential_customers != null ? m.potential_customers.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-right">{m.revenue.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                      <td className="px-3 py-2 text-right">{m.total_costs.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                      <td className="px-3 py-2 text-right text-[var(--muted)]">
                        {m.taxes != null ? m.taxes.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${netProfit >= 0 ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {netProfit.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <h4 className="mb-3 text-sm font-medium text-[var(--muted)]">Kostenaufschlüsselung (Miete, Strom, Wareneinsatz, Personal, Marketing …)</h4>
            {(() => {
              const categories = [...new Set(monthly.flatMap((m) => (m.cost_items ?? []).map((c) => c.category)))];
              const hasCostItems = categories.length > 0;
              if (!hasCostItems) {
                return <p className="text-xs text-[var(--muted)]">Keine Einzelkosten hinterlegt. Finanzplanung-Workflow erneut ausführen für vollständige Aufschlüsselung.</p>;
              }
              const getAmount = (month: MonthlyProjectionItem, category: string) =>
                month.cost_items?.find((c) => c.category === category)?.amount ?? null;
              return (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Kostenart</th>
                        {monthly.map((m) => (
                          <th key={m.month} className="px-3 py-2 text-right font-medium text-[var(--muted)]">{m.month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat} className="border-b border-[var(--card-border)]/50">
                          <td className="px-3 py-2 font-medium">{cat}</td>
                          {monthly.map((m) => {
                            const amt = getAmount(m, cat);
                            return (
                              <td key={m.month} className="px-3 py-2 text-right">
                                {amt != null ? amt.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </section>
      )}
      {isMultiSection && risk?.content && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Risikoanalyse</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{risk.content}</p>
            {(risk.key_points ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {(risk.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-2"><span className="text-teal-600 dark:text-teal-400">•</span>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {brd.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Unternehmensrecherche (Daten)</h3>
          <div className="space-y-4">
            {brd.map((x, i) => (
              <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h4 className="font-medium text-[var(--foreground)]">{x.source_type ?? "—"}</h4>
                <p className="mt-1 text-sm text-[var(--muted)]">{x.description ?? ""}</p>
                {(x.key_findings ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {(x.key_findings ?? []).map((f, j) => (
                      <li key={j} className="flex gap-2"><span className="text-teal-600 dark:text-teal-400">•</span>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function DiagnosticReportView({ content }: { content: Record<string, unknown> }) {
  const trees = (content.root_cause_trees as GapRecord[] | undefined) ?? [];

  function parseMaybeJson<T = unknown>(value: unknown): T | null {
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  function renderCauses(value: unknown): ReactElement {
    const parsed = parseMaybeJson<Array<{ cause?: string; evidence?: string; level_2?: Array<{ cause?: string; evidence?: string }> }>>(value);
    const causes = Array.isArray(parsed) ? parsed : [];
    if (causes.length === 0) {
      return <p className="text-sm text-[var(--muted)]">{typeof value === "string" ? value : "Keine Ursachen enthalten."}</p>;
    }
    return (
      <ul className="space-y-3">
        {causes.map((c, idx) => (
          <li key={idx} className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/40 p-3">
            <p className="text-sm font-medium text-[var(--foreground)]">{c.cause ?? `Ursache ${idx + 1}`}</p>
            {c.evidence && <p className="mt-1 text-xs text-[var(--muted)]">Evidenz: {c.evidence}</p>}
            {(c.level_2 ?? []).length > 0 && (
              <ul className="mt-2 space-y-1">
                {(c.level_2 ?? []).map((l2, l2Idx) => (
                  <li key={l2Idx} className="text-xs text-[var(--muted)]">
                    • {l2.cause}
                    {l2.evidence ? ` (${l2.evidence})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  }

  function renderAffectedKpis(value: unknown): string {
    if (Array.isArray(value)) return value.map((x) => String(x)).join(", ");
    const parsed = parseMaybeJson<string[]>(value);
    if (Array.isArray(parsed)) return parsed.join(", ");
    return value == null ? "—" : String(value);
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--foreground)]">Ursachenbäume</h3>
      {trees.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Keine Ursachenbäume.</p>
      ) : (
        trees.map((t, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5"
          >
            {typeof t === "object" && t !== null ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Lücke: {String(t.gap_key ?? t.key ?? `Lücke ${i + 1}`)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Betroffene KPIs
                  </p>
                  <p className="mt-1 text-sm text-[var(--foreground)]">{renderAffectedKpis(t.affected_kpis)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Ursachenbaum
                  </p>
                  <div className="mt-2">{renderCauses(t.root_cause_tree)}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm">{String(t)}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function DataCollectionPlanView({ content }: { content: Record<string, unknown> }) {
  const questions = (content.questions_simple as string[] | undefined) ?? [];
  const mapping = (content.mapping_to_kpi_keys as string[] | undefined) ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Fragen</h3>
        <ol className="space-y-2">
          {questions.map((q, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                {i + 1}
              </span>
              <span className="text-sm">{q}</span>
            </li>
          ))}
        </ol>
      </section>

      {mapping.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            KPI-Zuordnung
          </h3>
          <ul className="space-y-2">
            {mapping.map((m, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm"
              >
                <span className="text-teal-600 dark:text-teal-400">→</span>
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function BestPracticesView({ content }: { content: Record<string, unknown> }) {
  const practices = (content.practices as Array<{ name: string; description: string; rationale?: string }> | undefined) ?? [];
  const industry = (content.industry_specific as string[] | undefined) ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Bewährte Praktiken</h3>
        <div className="space-y-4">
          {practices.map((p, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5"
            >
              <h4 className="font-semibold text-[var(--foreground)]">{p.name}</h4>
              <p className="mt-2 text-sm text-[var(--muted)]">{p.description}</p>
              {p.rationale && (
                <p className="mt-2 text-xs text-teal-600 dark:text-teal-400 italic">{p.rationale}</p>
              )}
            </div>
          ))}
        </div>
      </section>
      {industry.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Branchenspezifisch</h3>
          <ul className="space-y-2">
            {industry.map((item, i) => (
              <li key={i} className="flex gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">
                <span className="text-teal-600 dark:text-teal-400">→</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function FailureAnalysisView({ content }: { content: Record<string, unknown> }) {
  const reasons = (content.failure_reasons as Array<{ reason: string; frequency?: string; mitigation?: string }> | undefined) ?? [];
  const risks = (content.industry_risks as string[] | undefined) ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Warum Unternehmen scheitern</h3>
        <div className="space-y-4">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-800/50 dark:bg-amber-950/20"
            >
              <h4 className="font-semibold text-amber-900 dark:text-amber-100">{r.reason}</h4>
              {r.frequency && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Häufigkeit: {r.frequency}</p>
              )}
              {r.mitigation && (
                <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-800 dark:bg-teal-950/20">
                  <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-300">Gegenmaßnahme</p>
                  <p className="mt-1 text-sm text-teal-800 dark:text-teal-200">{r.mitigation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      {risks.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Branchenrisiken</h3>
          <ul className="space-y-2">
            {risks.map((risk, i) => (
              <li key={i} className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-2 text-sm dark:border-amber-800/50 dark:bg-amber-950/20">
                <span className="text-amber-600 dark:text-amber-400">!</span>
                {risk}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function DecisionPackView({ content }: { content: Record<string, unknown> }) {
  const proposals = (content.decision_proposals as Record<string, unknown>[] | undefined) ?? [];
  const plan = (content.execution_plan_30_60_90 as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Top-Entscheidungen
        </h3>
        <div className="space-y-4">
          {proposals.map((p, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5"
            >
              <h4 className="font-semibold text-[var(--foreground)]">
                {String(p.title ?? `Entscheidung ${i + 1}`)}
              </h4>
              {p.founder_simple_summary != null && (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {String(p.founder_simple_summary)}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {Object.keys(plan).length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            30/60/90 Plan
          </h3>
          <Plan306090View plan={plan} />
        </section>
      )}
    </div>
  );
}

export function MenuCardView({ content }: { content: Record<string, unknown> }) {
  const items = (content.menu_full as { items?: Array<{ name: string; category?: string; description?: string; components?: Array<{ name: string; quantity?: string; unit?: string }>; price?: string }> })?.items ?? [];
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Vollständiges Angebot (mit Komponenten)</h3>
        <div className="space-y-4">
          {items.map((d, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-[var(--foreground)]">{d.name}</h4>
                {d.category && <span className="text-xs text-[var(--muted)]">{d.category}</span>}
              </div>
              {d.description && <p className="mt-1 text-sm text-[var(--muted)]">{d.description}</p>}
              {(d.components?.length ?? 0) > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-[var(--muted)]">Komponenten / Materialien:</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {d.components!.map((c, i) => (
                      <li key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                        {c.name}
                        {c.quantity && ` (${c.quantity}${c.unit ?? ""})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.price && <p className="mt-2 text-sm text-teal-600 dark:text-teal-400">{d.price}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SupplierListView({ content }: { content: Record<string, unknown> }) {
  const suppliers = (content.suppliers as Array<{ material: string; supplier?: string; price_per_unit?: number; unit?: string; notes?: string }>) ?? [];
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Lieferanten</h3>
        <div className="space-y-4">
          {suppliers.map((s, i) => (
            <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <h4 className="font-semibold text-[var(--foreground)]">{s.material}</h4>
              {s.supplier && <p className="mt-1 text-sm text-[var(--muted)]">{s.supplier}</p>}
              {(s.price_per_unit != null || s.unit) && (
                <p className="mt-1 text-sm">Price: {s.price_per_unit != null ? `${s.price_per_unit} ${s.unit ?? ""}` : s.unit}</p>
              )}
              {s.notes && <p className="mt-2 text-sm">{s.notes}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MenuCostView({ content }: { content: Record<string, unknown> }) {
  const items = (content.items as Array<{
    item_name: string;
    category?: string;
    components?: Array<{ component_name: string; quantity?: number | string; unit?: string; price_per_unit: number; cost: number }>;
    total_cost: number;
    selling_price?: number;
    margin_percent?: number;
    margin_note?: string;
  }>) ?? [];
  const summary = content.summary as { total_warenkosten?: number; total_items?: number; avg_cost_per_item?: number; recommendations?: string[] } | undefined;
  const recs = summary?.recommendations ?? [];
  return (
    <div className="space-y-8">
      {summary && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Zusammenfassung</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Gesamt Warenkosten</p>
                <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  {summary.total_warenkosten != null ? `${summary.total_warenkosten.toFixed(2)} €` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Positionen</p>
                <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{summary.total_items ?? items.length}</p>
              </div>
              {summary.avg_cost_per_item != null && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Ø pro Position</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{summary.avg_cost_per_item.toFixed(2)} €</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Kosten pro Position</h3>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-[var(--foreground)]">{item.item_name}</h4>
                {item.category && <span className="text-xs text-[var(--muted)]">{item.category}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span><strong>Kosten:</strong> {item.total_cost.toFixed(2)} €</span>
                {item.selling_price != null && (
                  <span><strong>Verkaufspreis:</strong> {item.selling_price.toFixed(2)} €</span>
                )}
                {item.margin_percent != null && (
                  <span className={item.margin_percent < 20 ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400"}>
                    <strong>Marge:</strong> {item.margin_percent.toFixed(1)}%
                  </span>
                )}
              </div>
              {(item.components?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-[var(--muted)]">Komponenten:</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {item.components!.map((c, j) => (
                      <li key={j} className="flex justify-between gap-2">
                        <span>{c.component_name} {c.quantity != null && c.unit && `(${c.quantity} ${c.unit})`}</span>
                        <span>{c.cost.toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {item.margin_note && <p className="mt-2 text-xs text-[var(--muted)]">{item.margin_note}</p>}
            </div>
          ))}
        </div>
      </section>
      {recs.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="flex gap-2 rounded-lg border border-teal-200 bg-teal-50/50 px-4 py-2 text-sm dark:border-teal-800 dark:bg-teal-950/20">
                <span className="text-teal-600 dark:text-teal-400">•</span>
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function MenuPreiskalkulationView({ content }: { content: Record<string, unknown> }) {
  const items = (content.items as Array<{
    item_name: string;
    category?: string;
    cost: number;
    recommended_price: number;
    target_margin_percent: number;
    price_notes?: string;
  }>) ?? [];
  const summary = content.summary as { pricing_strategy?: string; avg_margin_percent?: number; recommendations?: string[] } | undefined;
  const recs = summary?.recommendations ?? [];
  return (
    <div className="space-y-8">
      {summary?.pricing_strategy && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Preisstrategie</h3>
          <p className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-sm">{summary.pricing_strategy}</p>
        </section>
      )}
      {summary?.avg_margin_percent != null && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Durchschnittliche Marge</h3>
          <p className="text-xl font-semibold text-teal-600 dark:text-teal-400">{summary.avg_margin_percent.toFixed(1)}%</p>
        </section>
      )}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfohlene Verkaufspreise</h3>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-[var(--foreground)]">{item.item_name}</h4>
                {item.category && <span className="text-xs text-[var(--muted)]">{item.category}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span><strong>Kosten:</strong> {item.cost.toFixed(2)} €</span>
                <span className="text-teal-600 dark:text-teal-400"><strong>Empf. Preis:</strong> {item.recommended_price.toFixed(2)} €</span>
                <span><strong>Marge:</strong> {item.target_margin_percent.toFixed(1)}%</span>
              </div>
              {item.price_notes && <p className="mt-2 text-xs text-[var(--muted)]">{item.price_notes}</p>}
            </div>
          ))}
        </div>
      </section>
      {recs.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="flex gap-2 rounded-lg border border-teal-200 bg-teal-50/50 px-4 py-2 text-sm dark:border-teal-800 dark:bg-teal-950/20">
                <span className="text-teal-600 dark:text-teal-400">•</span>
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function RealEstateView({ content }: { content: Record<string, unknown> }) {
  const options = (content.options as Array<{ type: string; location?: string; description: string; price_range?: string; suitability?: string; url?: string; usage_permit?: string }>) ?? [];
  const avgPrices = (content.average_market_prices as Array<{ property_type: string; avg_price: string; region?: string; notes?: string }>) ?? [];
  const bestIdx = (content.best_option_index as number) ?? null;
  const bestDetails = content.best_option_details as { renovations?: string; usage_change_application?: string; other_applications?: string[] } | undefined;
  const recs = (content.recommendations as string[]) ?? [];
  return (
    <div className="space-y-8">
      {avgPrices.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Durchschnittspreise vergleichbarer Objekte (Referenz)</h3>
          <p className="mb-3 text-sm text-[var(--muted)]">Orientierung zur Einschätzung: fair, zu teuer oder lohnenswert.</p>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <ul className="space-y-2">
              {avgPrices.map((a, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2">
                  <strong className="text-[var(--foreground)]">{a.property_type}</strong>
                  <span>{a.avg_price}</span>
                  {a.region && <span className="text-xs text-[var(--muted)]">({a.region})</span>}
                  {a.notes && <span className="text-xs text-[var(--muted)]">— {a.notes}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">3 Immobilienoptionen</h3>
        <div className="space-y-4">
          {options.map((o, i) => (
            <div
              key={i}
              className={`rounded-xl border p-5 ${
                bestIdx === i
                  ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 dark:border-teal-500"
                  : "border-[var(--card-border)] bg-[var(--card)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-[var(--foreground)]">{o.type}</h4>
                {bestIdx === i && (
                  <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                    Beste Option
                  </span>
                )}
              </div>
              {o.location && <p className="mt-1 text-sm text-[var(--muted)]">{o.location}</p>}
              <p className="mt-2 text-sm">{o.description}</p>
              {o.price_range && <p className="mt-1 text-xs">Miete / Nebenkosten: {o.price_range}</p>}
              {o.usage_permit && (
                <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">Nutzungserlaubnis: {o.usage_permit}</p>
              )}
              {o.suitability && <p className="mt-1 text-xs text-[var(--muted)]">{o.suitability}</p>}
              {(() => {
                const href = (o.url && extractRealEstateUrl(o.url)) ?? (o.description && extractRealEstateUrl(o.description));
                if (!href) return null;
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
                  >
                    Anzeige öffnen →
                  </a>
                );
              })()}
            </div>
          ))}
        </div>
      </section>
      {bestDetails && (bestDetails.renovations || bestDetails.usage_change_application || (bestDetails.other_applications?.length ?? 0) > 0) && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Beste Option – Sanierungen & Anträge</h3>
          <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            {bestDetails.renovations && (
              <p><strong>Sanierungen:</strong> {bestDetails.renovations}</p>
            )}
            {bestDetails.usage_change_application && (
              <p><strong>Nutzungsänderungsantrag:</strong> {bestDetails.usage_change_application}</p>
            )}
            {(bestDetails.other_applications?.length ?? 0) > 0 && (
              <p><strong>Weitere Anträge:</strong> {bestDetails.other_applications!.join(", ")}</p>
            )}
          </div>
        </section>
      )}
      {recs.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function WorkProcessesView({ content }: { content: Record<string, unknown> }) {
  const chain = (content.process_chain ?? []) as Array<{ phase?: string; name?: string; description?: string; inputs?: string[]; outputs?: string[]; responsible_role?: string; duration_estimate?: string; dependencies?: string[] }>;
  const summary = content.summary as string | undefined;
  const recs = (content.recommendations ?? []) as string[];

  return (
    <div className="space-y-8">
      {summary && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Zusammenfassung</h3>
          <p className="text-sm text-[var(--foreground)]">{summary}</p>
        </section>
      )}
      {chain.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Wertschöpfungskette (Planung → Einkauf → Endkunde)</h3>
          <ol className="space-y-4">
            {chain.map((p, i) => (
              <li key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{p.phase ?? p.name ?? `Schritt ${i + 1}`}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{p.description ?? ""}</p>
                    {p.inputs?.length ? <p className="mt-2 text-xs"><strong>Inputs:</strong> {p.inputs.join(", ")}</p> : null}
                    {p.outputs?.length ? <p className="mt-1 text-xs"><strong>Outputs:</strong> {p.outputs.join(", ")}</p> : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-[var(--muted)]">
                    {p.responsible_role && <p><strong>Rolle:</strong> {p.responsible_role}</p>}
                    {p.duration_estimate && <p><strong>Dauer:</strong> {p.duration_estimate}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {recs.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type ShiftRow = { day?: string; shift?: string; role?: string; count?: number; time_from?: string; time_to?: string; notes?: string };

export function PersonnelPlanView({ content }: { content: Record<string, unknown> }) {
  const opening = content.opening_hours as { weekdays?: string; saturday?: string; sunday?: string; notes?: string } | undefined;
  const peakTimes = (content.peak_times ?? []) as Array<{ period?: string; days?: string; intensity?: string; staffing_impact?: string }>;
  const staffPlan = (content.staff_plan ?? []) as Array<{ role?: string; count?: number; hours_per_week?: number; hourly_rate_eur?: number; social_contributions_eur?: number; insurance_eur?: number; monthly_cost_eur?: number; start_month?: string; notes?: string }>;
  const monthly = (content.monthly_personnel_costs ?? []) as Array<{ month?: string; total_personnel_eur?: number; breakdown?: Array<{ role?: string; amount?: number }> }>;
  const shiftSchedule = (content.shift_schedule ?? []) as ShiftRow[];
  const recs = (content.recommendations ?? []) as string[];

  return (
    <div className="space-y-8">
      {opening && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Öffnungszeiten</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="text-sm"><strong>Wochentage:</strong> {opening.weekdays ?? "—"}</p>
            {opening.saturday && <p className="mt-1 text-sm"><strong>Samstag:</strong> {opening.saturday}</p>}
            {opening.sunday && <p className="mt-1 text-sm"><strong>Sonntag:</strong> {opening.sunday}</p>}
            {opening.notes && <p className="mt-2 text-xs text-[var(--muted)]">{opening.notes}</p>}
          </div>
        </section>
      )}
      {peakTimes.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Stoßzeiten</h3>
          <ul className="space-y-2">
            {peakTimes.map((p, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">
                <strong>{p.period}</strong>
                {p.days && <span className="ml-2 text-[var(--muted)]">({p.days})</span>}
                {p.intensity && <span className="ml-2">· {p.intensity}</span>}
                {p.staffing_impact && <p className="mt-1 text-xs text-[var(--muted)]">{p.staffing_impact}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {shiftSchedule.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Schichtenplan</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Tag</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Schicht</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Rolle</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Anz.</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Zeit</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Bemerkung</th>
                </tr>
              </thead>
              <tbody>
                {shiftSchedule.map((s, i) => (
                  <tr key={i} className="border-b border-[var(--card-border)]/50">
                    <td className="px-3 py-2 font-medium">{s.day ?? "—"}</td>
                    <td className="px-3 py-2">{s.shift ?? "—"}</td>
                    <td className="px-3 py-2">{s.role ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{s.count ?? "—"}</td>
                    <td className="px-3 py-2">
                      {s.time_from && s.time_to ? `${s.time_from}–${s.time_to}` : s.time_from ?? s.time_to ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--muted)]">{s.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {staffPlan.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Personalplan</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Rolle</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Anz.</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Std/Woche</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Stundenlohn</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Sozialabgaben</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Versicherung</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Monatskosten</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Einstieg</th>
                </tr>
              </thead>
              <tbody>
                {staffPlan.map((s, i) => (
                  <tr key={i} className="border-b border-[var(--card-border)]/50">
                    <td className="px-3 py-2 font-medium">{s.role}</td>
                    <td className="px-3 py-2 text-right">{s.count ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{s.hours_per_week ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{s.hourly_rate_eur != null ? s.hourly_rate_eur.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}</td>
                    <td className="px-3 py-2 text-right">{s.social_contributions_eur != null ? s.social_contributions_eur.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}</td>
                    <td className="px-3 py-2 text-right">{s.insurance_eur != null ? s.insurance_eur.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}</td>
                    <td className="px-3 py-2 text-right">{s.monthly_cost_eur != null ? s.monthly_cost_eur.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}</td>
                    <td className="px-3 py-2 text-left">{s.start_month ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {monthly.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Monatliche Personalkosten (Jahr 1)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Monat</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Personalkosten</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={i} className="border-b border-[var(--card-border)]/50">
                    <td className="px-3 py-2 font-medium">{m.month}</td>
                    <td className="px-3 py-2 text-right">{m.total_personnel_eur != null ? m.total_personnel_eur.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {recs.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function FinancialPlanningView({ content }: { content: Record<string, unknown> }) {
  const liquidity = content.liquidity_plan as { summary?: string; key_assumptions?: string[]; monthly_cash_flow_highlights?: string[] } | undefined;
  const profitability = content.profitability_plan as { summary?: string; margin_targets?: string[] } | undefined;
  const capital = content.capital_requirements as { total_required?: string; breakdown?: string[]; funding_gaps?: string[] } | undefined;
  const breakEven = content.break_even_analysis as { break_even_point?: string; key_drivers?: string[]; sensitivity_notes?: string } | undefined;
  const monthly = (content.monthly_projection ?? []) as MonthlyProjectionItem[];
  const recs = (content.recommendations ?? []) as string[];

  return (
    <div className="space-y-8">
      {monthly.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Monatsprognose</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Monat</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Kunden</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Umsatz</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Kosten gesamt</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Steuerabzüge</th>
                  <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Netto-Gewinn</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const netProfit = getNetProfit(m);
                  return (
                    <tr key={i} className="border-b border-[var(--card-border)]/50">
                      <td className="px-3 py-2 font-medium">{m.month}</td>
                      <td className="px-3 py-2 text-right">
                        {m.potential_customers != null ? m.potential_customers.toLocaleString() : "—"}
                        {m.potential_customers_note && (
                          <span className="ml-1 block text-xs text-[var(--muted)]" title={m.potential_customers_note}>ⓘ</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{m.revenue.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                      <td className="px-3 py-2 text-right">{m.total_costs.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                      <td className="px-3 py-2 text-right text-[var(--muted)]">
                        {m.taxes != null ? m.taxes.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${netProfit >= 0 ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {netProfit.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <h4 className="mb-3 text-sm font-medium text-[var(--muted)]">Kostenaufschlüsselung (Miete, Strom, Wareneinsatz, Personal, Marketing …)</h4>
            {(() => {
              const categories = [...new Set(monthly.flatMap((m) => (m.cost_items ?? []).map((c) => c.category)))];
              const hasCostItems = categories.length > 0;
              if (!hasCostItems) {
                return <p className="text-xs text-[var(--muted)]">Keine Einzelkosten hinterlegt.</p>;
              }
              const getAmount = (month: MonthlyProjectionItem, category: string) =>
                month.cost_items?.find((c) => c.category === category)?.amount ?? null;
              return (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Kostenart</th>
                        {monthly.map((m) => (
                          <th key={m.month} className="px-3 py-2 text-right font-medium text-[var(--muted)]">{m.month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat} className="border-b border-[var(--card-border)]/50">
                          <td className="px-3 py-2 font-medium">{cat}</td>
                          {monthly.map((m) => {
                            const amt = getAmount(m, cat);
                            return (
                              <td key={m.month} className="px-3 py-2 text-right">
                                {amt != null ? amt.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </section>
      )}
      {liquidity?.summary && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Liquiditätsplan</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="text-sm">{liquidity.summary}</p>
            {(liquidity.key_assumptions?.length ?? 0) > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                {liquidity.key_assumptions!.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {profitability?.summary && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Rentabilitätsplan</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="text-sm">{profitability.summary}</p>
            {(profitability.margin_targets?.length ?? 0) > 0 && (
              <ul className="mt-3 space-y-1 text-sm">{profitability.margin_targets!.map((m, i) => <li key={i}>• {m}</li>)}</ul>
            )}
          </div>
        </section>
      )}
      {capital && (capital.total_required || (capital.breakdown?.length ?? 0) > 0) && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Kapitalbedarf</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            {capital.total_required && <p className="font-medium">{capital.total_required}</p>}
            {(capital.breakdown?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-1 text-sm">{capital.breakdown!.map((b, i) => <li key={i}>• {b}</li>)}</ul>
            )}
            {(capital.funding_gaps?.length ?? 0) > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Lücken: {capital.funding_gaps!.join("; ")}</p>
            )}
          </div>
        </section>
      )}
      {breakEven?.break_even_point && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Break-Even Analyse</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="font-medium">{breakEven.break_even_point}</p>
            {(breakEven.key_drivers?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-1 text-sm">{breakEven.key_drivers!.map((d, i) => <li key={i}>• {d}</li>)}</ul>
            )}
            {breakEven.sensitivity_notes && <p className="mt-2 text-sm text-[var(--muted)]">{breakEven.sensitivity_notes}</p>}
          </div>
        </section>
      )}
      {recs.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="flex gap-2 rounded-lg border border-teal-200 bg-teal-50/50 px-4 py-2 text-sm dark:border-teal-800 dark:bg-teal-950/20">
                <span className="text-teal-600 dark:text-teal-400">•</span>
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function StartupConsultingGuideView({ content }: { content: Record<string, unknown> }) {
  const funding = (content.funding_recommendations as Array<{ model: string; rationale: string; fit_score?: number }>) ?? [];
  const incorp = (content.incorporation_recommendations as Array<{ option: string; jurisdiction?: string; rationale: string }>) ?? [];
  const considerations = (content.key_considerations as string[]) ?? [];
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Finanzierungsempfehlungen</h3>
        <div className="space-y-4">
          {funding.map((f, i) => (
            <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <h4 className="font-semibold text-[var(--foreground)]">{f.model}</h4>
              <p className="mt-2 text-sm text-[var(--muted)]">{f.rationale}</p>
              {f.fit_score != null && (
                <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">Passung: {Math.round(f.fit_score * 100)}%</p>
              )}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen Rechtsform / Gründung</h3>
        <div className="space-y-4">
          {incorp.map((i, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <h4 className="font-semibold text-[var(--foreground)]">{i.option}</h4>
              {i.jurisdiction && <p className="mt-1 text-sm text-[var(--muted)]">{i.jurisdiction}</p>}
              <p className="mt-2 text-sm">{i.rationale}</p>
            </div>
          ))}
        </div>
      </section>
      {considerations.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Wesentliche Punkte</h3>
          <ul className="space-y-2">
            {considerations.map((c, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SwotQuadrant({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "s" | "w" | "o" | "t";
  items: string[];
}) {
  return (
    <div className={`swot-cell swot-cell--${tone}`}>
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">—</p>
      ) : (
        <ul>
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Wertversprechen: deutschsprachige Überschriften, englischer Begriff in Klammern */
export function ValuePropositionReportView({ content }: { content: Record<string, unknown> }) {
  const problem = String(content.problem_statement ?? "");
  const customers = (content.target_customers as string[]) ?? [];
  const existing = (content.existing_solutions as string[]) ?? [];
  const uvp = String(content.unique_value_proposition ?? "");
  const diff = (content.key_differentiators as string[]) ?? [];
  const recs = (content.recommendations as string[]) ?? [];
  const score = content.problem_solution_fit_score;

  return (
    <div className="space-y-8">
      {typeof score === "number" && !Number.isNaN(score) ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold">Problem-Lösungs-Fit (Problem-Solution Score):</span>{" "}
          {score}
        </p>
      ) : null}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Problemstellung (Problem Statement)
        </h3>
        <p className="text-sm leading-relaxed text-slate-800">{problem || "—"}</p>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Zielkunden (Target Customers)
        </h3>
        {customers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">—</p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {customers.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </section>

      {existing.length > 0 ? (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
            Bestehende Lösungen (Existing Solutions)
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {existing.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
          Alleinstellungsmerkmal / Wertversprechen (Unique Value Proposition)
        </h3>
        <p className="text-sm leading-relaxed text-slate-800">{uvp || "—"}</p>
      </section>

      {diff.length > 0 ? (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
            Wesentliche Differenzierungsmerkmale (Key Differentiators)
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {diff.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {recs.length > 0 ? (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
            Empfehlungen (Recommendations)
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {recs.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** SWOT im 2×2-Raster (wie klassischer Steckbrief / Präsentationsfolie) */
export function SwotReportView({ content }: { content: Record<string, unknown> }) {
  const strengths = (content.strengths as string[]) ?? [];
  const weaknesses = (content.weaknesses as string[]) ?? [];
  const opportunities = (content.opportunities as string[]) ?? [];
  const threats = (content.threats as string[]) ?? [];
  const summary = content.swot_matrix_summary as string | undefined;
  const strategic = (content.strategic_implications as string[]) ?? [];
  const recommendations = (content.recommendations as string[]) ?? [];

  return (
    <div className="space-y-8">
      {summary ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-700">
          {summary}
        </p>
      ) : null}

      <div className="swot-grid">
        <SwotQuadrant title="Stärken" tone="s" items={strengths} />
        <SwotQuadrant title="Schwächen" tone="w" items={weaknesses} />
        <SwotQuadrant title="Chancen" tone="o" items={opportunities} />
        <SwotQuadrant title="Risiken / Bedrohungen" tone="t" items={threats} />
      </div>

      {strategic.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Strategische Implikationen</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {strategic.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {recommendations.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type MarketingInitiative = {
  name?: string;
  goal?: string;
  actions?: string;
  content?: string;
  hashtags?: string;
  keywords?: string;
  cta?: string;
  tracking?: string;
  expected_conversion?: string;
  budget_eur?: number | string;
  effort_h_week?: number | string;
  roi?: string;
};

export function MarketingStrategyView({ content }: { content: Record<string, unknown> }) {
  const constraints = content.constraints as string | undefined;
  const initiatives = (content.marketing_initiatives ?? []) as MarketingInitiative[];
  const roadmap = (content.roadmap_30_days ?? []) as { week?: string; tasks?: string[] }[];
  const kpiGoals = (content.kpi_goals_30_days ?? []) as { target?: string; metric?: string }[];
  const offlineVisibility = content.offline_visibility as string | undefined;
  const concludingOffer = content.concluding_offer as string | undefined;
  const recs = (content.recommendations ?? []) as string[];
  const channels = (content.channel_strategy ?? []) as { channel?: string; priority?: string; rationale?: string }[];
  const audiences = (content.target_audiences ?? []) as { segment?: string; approach?: string }[];

  const hasNewFormat = initiatives.length > 0 || roadmap.length > 0 || kpiGoals.length > 0;

  return (
    <div className="space-y-8">
      {constraints && (
        <section>
          <p className="rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-3 text-sm dark:border-teal-800 dark:bg-teal-950/20">
            {constraints}
          </p>
        </section>
      )}
      {initiatives.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Marketing-Maßnahmen (priorisiert)</h3>
          <div className="space-y-4">
            {initiatives.map((init, i) => (
              <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h4 className="font-semibold text-[var(--foreground)]">{init.name ?? `Maßnahme ${i + 1}`}</h4>
                {init.goal && <p className="mt-2 text-sm font-medium text-teal-600 dark:text-teal-400">{init.goal}</p>}
                {(init.actions || init.content) && (
                  <p className="mt-2 text-sm text-[var(--muted)]">{(init.actions ?? init.content) ?? ""}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {(init.hashtags || init.keywords) && (
                    <span><span className="font-medium">Hashtags/Keywords:</span> {init.hashtags ?? init.keywords}</span>
                  )}
                  {init.cta && <span><span className="font-medium">CTA:</span> {init.cta}</span>}
                  {init.tracking && <span><span className="font-medium">Tracking:</span> {init.tracking}</span>}
                  {(init.budget_eur != null || init.effort_h_week) && (
                    <span>
                      {init.budget_eur != null && `Budget: ${typeof init.budget_eur === "number" ? `${init.budget_eur}€` : init.budget_eur}`}
                      {init.effort_h_week != null && init.effort_h_week !== "" && ` · Aufwand: ${typeof init.effort_h_week === "number" ? `${init.effort_h_week}h` : init.effort_h_week}`}
                    </span>
                  )}
                  {init.roi && <span><span className="font-medium">ROI:</span> {init.roi}</span>}
                </div>
                {init.expected_conversion && (
                  <p className="mt-2 text-sm text-teal-600 dark:text-teal-400">{init.expected_conversion}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {roadmap.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">30-Tage-Roadmap (Start morgen)</h3>
          <div className="space-y-4">
            {roadmap.map((week, i) => (
              <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h4 className="font-semibold text-[var(--foreground)]">{week.week ?? `KW ${i + 1}`}</h4>
                <ul className="mt-2 space-y-1">
                  {(week.tasks ?? []).map((task, j) => (
                    <li key={j} className="flex gap-2 text-sm">
                      <span className="text-teal-600 dark:text-teal-400">•</span>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {kpiGoals.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">KPI-Ziele nach 30 Tagen</h3>
          <ul className="space-y-2">
            {kpiGoals.map((k, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">
                <span className="font-medium">{k.target}</span>
                {k.metric && <span className="ml-2 text-[var(--muted)]">({k.metric})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {offlineVisibility && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Offline-Sichtbarkeit (trotz Ghost-Kitchen)</h3>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <p className="whitespace-pre-wrap text-sm">{offlineVisibility}</p>
          </div>
        </section>
      )}
      {concludingOffer && (
        <section>
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-sm dark:border-teal-800 dark:bg-teal-950/20">
            {concludingOffer}
          </div>
        </section>
      )}
      {!hasNewFormat && channels.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Kanalstrategie</h3>
          <ul className="space-y-2">
            {channels.map((c, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">
                <strong>{c.channel}</strong>
                {c.priority && ` (${c.priority})`}
                {c.rationale && `: ${c.rationale}`}
              </li>
            ))}
          </ul>
        </section>
      )}
      {!hasNewFormat && audiences.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Zielgruppen</h3>
          <ul className="space-y-2">
            {audiences.map((a, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">
                <strong>{a.segment}</strong>
                {a.approach && `: ${a.approach}`}
              </li>
            ))}
          </ul>
        </section>
      )}
      {recs.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Empfehlungen</h3>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm">{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

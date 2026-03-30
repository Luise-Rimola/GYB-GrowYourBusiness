"use client";

/** Human-readable labels for common data keys */
const LABELS: Record<string, string> = {
  items: "Einträge",
  company_name: "Unternehmen",
  offer: "Angebot",
  customers: "Zielgruppe / Kunden",
  location: "Standort",
  website: "Website",
  usp: "USP",
  market_reach: "Marktreichweite",
  stage: "Phase",
  team_size: "Teamgröße",
  business_state: "Geschäftsstatus",
  goals: "Ziele",
  ai_requests: "KI-Anfragen",
  products: "Produkte",
  suppliers: "Lieferanten",
  team: "Team",
  production_steps: "Produktionsschritte",
  revenue_last_month: "Umsatz (letzter Monat)",
  marketing_spend: "Marketingausgaben",
  fixed_costs: "Fixkosten",
  variable_costs: "Variable Kosten",
  competitors: "Wettbewerber",
  market_position: "Marktposition",
  differentiation: "Differenzierung",
  strengths_summary: "Stärken (Zusammenfassung)",
  weaknesses_summary: "Schwächen (Zusammenfassung)",
  growth_challenge: "Wachstumsherausforderung",
  differentiators: "Differenzierung",
  sales_channels: "Vertriebskanäle",
  lead_time: "Durchlaufzeit",
  constraints: "Einschränkungen",
  funding_status: "Finanzierungsstatus",
  legal_structure: "Rechtsform",
  years_in_business: "Jahre im Geschäft",
  target_market: "Zielmarkt",
  acquisition_channels: "Akquisitionskanäle",
  aov: "Durchschnittlicher Bestellwert",
  retention_churn: "Retention / Churn",
  additional_notes: "Zusätzliche Notizen",
  founder_simple_summary: "Zusammenfassung",
  advanced_summary: "Detaillierte Zusammenfassung",
  title: "Titel",
  lever: "Hebel",
  kpi_impact_range: "KPI-Auswirkung",
  assumptions: "Annahmen",
  risks: "Risiken",
  mitigation: "Gegenmaßnahmen",
  evidence: "Evidenz",
  key_points: "Kernpunkte",
  content: "Inhalt",
  evidence_score: "Bewertung",
  industry: "Branche",
  key_trends: "Trends",
  key_facts: "Kernfakten",
  market_size_estimate: "Marktgröße",
  regulations: "Regulierung",
  typical_metrics: "Typische Kennzahlen",
  sources_used: "Verwendete Quellen",
  company_profile: "Unternehmensprofil",
  industry_research: "Branchenrecherche",
  business_model: "Geschäftsmodell",
  kpi_set: "KPI-Set",
  kpi_snapshot: "KPI-Snapshot",
  artifacts_summary: "Dokumente",
  startup_insights: "Startup-Insights",
  kpi_computation_plan: "KPI-Berechnungsplan",
  kpi_answers: "KPI-Antworten",
  kpi_gap_report: "KPI-Gap-Bericht",
  segments: "Segmente",
  demand_drivers: "Nachfrage-Treiber",
  practices: "Best Practices",
  failure_reasons: "Misserfolgsgründe",
  decision_proposals: "Entscheidungsvorschläge",
  strengths: "Stärken",
  weaknesses: "Schwächen",
  opportunities: "Chancen",
  threats: "Risiken",
  strategic_implications: "Strategische Auswirkungen",
  swot_matrix_summary: "SWOT-Zusammenfassung",
  recommendations: "Empfehlungen",
  competitive_landscape: "Wettbewerbslandschaft",
  differentiation_opportunities: "Differenzierungsmöglichkeiten",
  prompt: "Prompt",
  parsed_output: "Ergebnis",
  errors: "Fehler",
  /** Häufige englische Keys in LLM-JSON (Markt-Snapshot, Segmente, …) */
  name: "Name",
  description: "Beschreibung",
  attractiveness: "Attraktivität",
  rationale: "Begründung",
  pricing_index: "Preisindex",
  buyer_behavior: "Kaufverhalten",
  behavior: "Verhalten",
  triggers: "Auslöser",
  supply_demand: "Angebot & Nachfrage",
  supply_overview: "Angebotsüberblick",
  demand_overview: "Nachfrageüberblick",
  balance_assessment: "Einordnung Angebot/Nachfrage",
  feasibility_assessment: "Machbarkeit",
  is_makeable: "Umsetzbar",
  recommendation: "Empfehlung",
  key_blockers: "Haupt-Hindernisse",
  preconditions: "Voraussetzungen",
  business_research_data: "Unternehmensrecherche",
  source_type: "Quellentyp",
  key_findings: "Kernerkenntnisse",
  relevance: "Relevanz",
  segment_or_trait: "Segment / Merkmal",
  value: "Wert",
  confidence: "Konfidenz",
  segment: "Segment",
};

const SKIP_KEYS = new Set(["updated_at", "cost_excel_uploaded", "cost_excel_error"]);

function formatLabel(key: string): string {
  const fromMap = LABELS[key] ?? LABELS[key.toLowerCase()];
  if (fromMap) return fromMap;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "boolean") return val ? "Ja" : "Nein";
  if (typeof val === "number") return val.toLocaleString("de-DE");
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    if (val.every((v) => typeof v === "string")) {
      return (
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
          {val.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ul className="mt-1 space-y-2">
        {val.map((item, i) => (
          <li key={i} className="rounded-lg border border-[var(--card-border)] bg-slate-50/50 p-2 dark:bg-slate-900/30">
            {typeof item === "object" && item !== null ? (
              <ReadableDataContent data={item as Record<string, unknown>} />
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof val === "object") {
    return <ReadableDataContent data={val as Record<string, unknown>} />;
  }
  return String(val);
}

function ReadableDataContent({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([k, v]) =>
      !SKIP_KEYS.has(k) &&
      v !== null &&
      v !== undefined &&
      v !== "" &&
      !(Array.isArray(v) && v.length === 0) &&
      !(typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
  );
  if (entries.length === 0) return <span className="text-[var(--muted)]">—</span>;

  return (
    <dl className="space-y-3">
      {entries.map(([key, val]) => {
        const formatted = formatValue(val);
        if (formatted === null) return null;
        return (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {formatLabel(key)}
            </dt>
            <dd className="mt-0.5 text-sm text-[var(--foreground)]">{formatted}</dd>
          </div>
        );
      })}
    </dl>
  );
}

type ReadableDataViewProps = {
  data: unknown;
  collapsible?: boolean;
  summary?: string;
  /** When collapsible, start expanded. Default false. */
  defaultOpen?: boolean;
};

export function ReadableDataView({ data, collapsible = true, summary, defaultOpen }: ReadableDataViewProps) {
  const obj: Record<string, unknown> =
    data === null || data === undefined
      ? {}
      : Array.isArray(data)
        ? { items: data }
        : typeof data === "object"
          ? (data as Record<string, unknown>)
          : { value: data };

  const content = (
    <div className="rounded-lg bg-slate-50/50 p-4 text-sm text-[var(--foreground)] dark:bg-slate-900/30">
      <ReadableDataContent data={obj} />
    </div>
  );

  if (collapsible) {
    const itemCount = typeof obj === "object" ? Object.keys(obj).length : 1;
    const label = summary ?? `Daten anzeigen (${itemCount} Felder)`;
    return (
      <details className="group rounded-xl border border-[var(--card-border)]" open={defaultOpen}>
        <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50 dark:hover:bg-slate-900/30 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-[var(--muted)] transition group-open:rotate-90">▸</span>
            {label}
          </span>
        </summary>
        <div className="border-t border-[var(--card-border)] p-4 pt-3">{content}</div>
      </details>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)]">
      {content}
    </div>
  );
}

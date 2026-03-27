import type { Locale } from "@/lib/i18n";
import { KPI_LIBRARY_ITEMS } from "../../prisma/data/kpiLibrary";

/** Deutsche Kurzbeschreibungen (Entscheidungsnutzen) — entsprechen `whyForDecisions` auf Englisch. */
const KPI_WHY_DE: Record<string, string> = {
  north_star_revenue:
    "Legt das übergeordnete Wachstumsziel fest; unterstützt die Zerlegung des KPI-Baums in Akquise, Conversion, Monetarisierung und Retention.",
  gross_margin_pct:
    "Verhindert Wachstum, das die Stückkostenökonomie zerstört; steuert Preis-, Lieferanten- und Angebotsentscheidungen.",
  contribution_margin_pct:
    "Zentrale Freigabe-Metrik für skalierbare Akquise; verbindet Umsatz mit variablen Kosten.",
  mom_growth_rate_revenue:
    "Misst Dynamik und zeigt, ob Wachstumshebel wirken.",
  burn_rate_net:
    "Zentrales Risiko- und Überlebensmaß; begrenzt Experimente und Einstellungen.",
  runway_months:
    "Bestimmt Dringlichkeit und vertretbares Risiko; beeinflusst Strategie (Wachstum vs. Effizienz).",
  new_customers:
    "Wichtigster Frühindikator für Akquise-Wirksamkeit.",
  active_customers:
    "Zeigt echte Nachfrage/Nutzung; stabilisiert Prognosen.",
  aov:
    "Zentraler Hebel für Monetarisierung; wirkt auf CAC-Payback und Marge.",
  conversion_rate_primary:
    "Zeigt, ob der Engpass bei Conversion oder bei Akquise liegt.",
  cac:
    "Kerngo/No-go für skalierbare Akquise; verbindet Ausgaben mit Kundenwachstum.",
  blended_cac:
    "Verhindert Überoptimierung einzelner Kanäle; robust bei unscharfer Attribution.",
  mer:
    "Grober Effizienzwert, wenn ROAS unsicher ist.",
  roas:
    "Kampagnenökonomie; nur sinnvoll bei ausreichender Attribution.",
  ctr:
    "Frühindikator für Creative/Targeting-Qualität; Diagnose für bezahlte Akquise.",
  cpc:
    "Kostendruck-Signal; hilft zu entscheiden: Funnel verbessern oder Kanal wechseln.",
  mrr:
    "SaaS-North-Star; zerlegbar in Neu-, Expansion und Churn.",
  logo_churn_rate:
    "Direktes Signal für Retention; verhindert „undichter Eimer“-Wachstum.",
  revenue_churn_rate:
    "Ökonomisch oft aussagekräftiger als Logo-Churn bei SaaS-Expansion.",
  ndr:
    "Zeigt, ob das Geschäft mit Bestandskunden effizient wachsen kann.",
  arpu:
    "Monetarisierungshebel; verbessert Payback ohne höheres CAC.",
  ltv_simple:
    "Ermöglicht CAC-Obergrenzen und Budgetentscheidungen; Basis für sicheres Skalieren.",
  ltv_cac_ratio:
    "Zentrales Skalierungs-Signal; richtet Akquise am Langzeitwert aus.",
  cac_payback_months:
    "Liquiditäts-Effizienz; wichtig für Wachstumstempo und Finanzierungsfähigkeit.",
  lead_to_customer_cvr_b2b:
    "Zeigt Vertriebs-Trichter-Effizienz; mehr Leads vs. bessere Conversion.",
  win_rate:
    "Beeinflusst Pipeline-Bedarf und Akquise-Entscheidungen direkt.",
  sales_cycle_days:
    "Prägt Forecast, Hiring und Liquiditätsplanung.",
  pipeline_coverage:
    "Frühwarnung bei Umsatzlücken; steuert Outbound/Partner-Fokus.",
  activation_rate:
    "Hebel für product-led Growth; senkt CAC wirksam.",
  dau_mau:
    "Engagement-Proxy; unterstützt Retention- und Expansion-Entscheidungen.",
  refund_rate:
    "Qualitäts-/Erwartungsrisiko; mindert Nettoumsatz und Wachstum.",
  return_rate:
    "Operatives und Margenrisiko; Produkt- und Fulfillment-Strategie.",
  capacity_utilization:
    "Harte Engpass-Metrik: Nachfrage vs. Kapazität.",
  orders:
    "Primäre Nachfrage für transaktionale Geschäfte; hängt mit Conversion und AOV zusammen.",
};

type DbKpiRow = {
  kpiKey: string;
  nameSimple: string;
  nameAdvanced: string;
  definition: string;
};

/**
 * Titel und Kurzbeschreibung für UI je Locale.
 * EN: englischer Titel (`nameAdvanced`) + englischer Text aus Seed (`whyForDecisions` → DB `definition`).
 * DE: deutscher Titel (`nameSimple`) + deutscher Text aus `KPI_WHY_DE` (Fallback: DB-Definition).
 */
export function getKpiLibraryDisplay(
  kpiKey: string,
  locale: Locale,
  db: DbKpiRow
): { title: string; definition: string } {
  const item = KPI_LIBRARY_ITEMS.find((i) => i.kpiKey === kpiKey);
  const enDefinition = item?.whyForDecisions ?? db.definition;
  if (locale === "en") {
    return {
      title: item?.nameAdvanced ?? db.nameAdvanced,
      definition: enDefinition,
    };
  }
  return {
    title: item?.nameSimple ?? db.nameSimple,
    definition: KPI_WHY_DE[kpiKey] ?? enDefinition,
  };
}

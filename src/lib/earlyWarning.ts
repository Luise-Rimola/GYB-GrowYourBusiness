type ArtifactLike = {
  type: string;
  title?: string | null;
  contentJson?: unknown;
};

const EARLY_WARNING_TYPES = new Set([
  "failure_analysis",
  "diagnostic",
  "scenario_analysis",
  "strategic_options",
  "customer_validation",
]);

const EARLY_WARNING_KEYWORDS = [
  "fruehwarn",
  "frühwarn",
  "risiko",
  "risk",
  "nicht passt",
  "scheitern",
  "fail",
  "kritisch",
  "warnung",
  "blocker",
  "unsicher",
  "problem",
];

const GENERIC_RISK_WORDS = new Set(["risiko", "risk", "warnung", "frühwarn", "fruehwarn"]);

export function hasEarlyWarningSignal(artifact: ArtifactLike): boolean {
  const highRisk = extractHighRiskFactor(artifact.contentJson);
  if (highRisk) return true;
  const explicitRisk = extractRiskExplanation(artifact.contentJson);
  if (explicitRisk) return true;
  const riskMatrixSignal = extractRiskMatrixSignal(artifact.contentJson);
  if (riskMatrixSignal) return true;

  const text = `${artifact.title ?? ""} ${safeStringify(artifact.contentJson)}`.toLowerCase();
  return EARLY_WARNING_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function getEarlyWarningDetails(artifact: ArtifactLike): string[] {
  const reasons: string[] = [];
  const highRisk = extractHighRiskFactor(artifact.contentJson);
  if (highRisk) {
    reasons.push(`Risikofaktor hoch: ${highRisk.key} = ${highRisk.value} (Schwelle: ${highRisk.threshold}).`);
  }
  const riskMatrixSignal = extractRiskMatrixSignal(artifact.contentJson);
  if (riskMatrixSignal) {
    reasons.push(`Risikomatrix kritisch: ${riskMatrixSignal}.`);
  }
  const explicitRisk = extractRiskExplanation(artifact.contentJson);
  if (explicitRisk) {
    reasons.push(`Explizites Risiko: ${explicitRisk}`);
  }
  if (EARLY_WARNING_TYPES.has(artifact.type) && reasons.length > 0) {
    reasons.push(`Artefakt-Typ "${artifact.type}" ist als risikosensitiv markiert.`);
  }

  const text = `${artifact.title ?? ""} ${safeStringify(artifact.contentJson)}`.toLowerCase();
  const matchedKeywords = EARLY_WARNING_KEYWORDS.filter((keyword) => text.includes(keyword));
  const meaningfulKeywords = matchedKeywords.filter((k) => !GENERIC_RISK_WORDS.has(k));
  if (meaningfulKeywords.length > 0) {
    reasons.push(`Erkannte Warnbegriffe: ${meaningfulKeywords.slice(0, 6).join(", ")}${meaningfulKeywords.length > 6 ? ", ..." : ""}.`);
  }

  if (reasons.length === 0) {
    reasons.push("Kein strukturierter Risiko-Text vorhanden. Bitte den Workflow erneut ausführen, damit `risk_explanation` gefüllt wird.");
  }
  return reasons;
}

export function getEarlyWarningPrimaryRiskText(artifact: ArtifactLike): string | null {
  const explicit = extractRiskExplanation(artifact.contentJson);
  if (explicit) return explicit;

  const listRisk = extractRiskFromRisksArray(artifact.contentJson);
  if (listRisk) return listRisk;

  const matrix = extractRiskMatrixEntry(artifact.contentJson);
  if (matrix) {
    const parts = [
      matrix.risk && `Risiko: ${matrix.risk}`,
      matrix.impact && `Auswirkung: ${matrix.impact}`,
      matrix.mitigation && `Gegenmassnahme: ${matrix.mitigation}`,
    ].filter(Boolean);
    return parts.join(" | ") || null;
  }

  const highRisk = extractHighRiskFactor(artifact.contentJson);
  if (highRisk) {
    const labels: Record<string, string> = {
      risk_exposure_score: "Gesamtrisiko ist hoch",
      threat_score: "Externe Bedrohungslage ist hoch",
      weakness_score: "Interne Schwaechenlage ist hoch",
      competitive_intensity_index: "Wettbewerbsdruck ist hoch",
    };
    return `${labels[highRisk.key] ?? highRisk.key}: ${highRisk.value} (Schwelle ${highRisk.threshold}).`;
  }
  return null;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? "");
  } catch {
    return "";
  }
}

function extractRiskExplanation(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const risk = (value as Record<string, unknown>).risk_explanation;
  if (typeof risk !== "string") return null;
  const normalized = risk.trim();
  return normalized.length > 0 ? normalized : null;
}

function extractHighRiskFactor(
  value: unknown
): { key: string; value: number; threshold: number } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const indicatorsRaw = obj.strategy_indicators;
  if (!indicatorsRaw || typeof indicatorsRaw !== "object" || Array.isArray(indicatorsRaw)) return null;
  const indicators = indicatorsRaw as Record<string, unknown>;

  const candidates: Array<{ key: string; threshold: number }> = [
    { key: "risk_exposure_score", threshold: 70 },
    { key: "threat_score", threshold: 70 },
    { key: "weakness_score", threshold: 70 },
    { key: "competitive_intensity_index", threshold: 75 },
  ];

  for (const c of candidates) {
    const raw = indicators[c.key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const scoreRaw = (raw as Record<string, unknown>).value;
    const score =
      typeof scoreRaw === "number"
        ? scoreRaw
        : typeof scoreRaw === "string"
          ? Number(scoreRaw.replace(",", "."))
          : NaN;
    if (Number.isFinite(score) && score >= c.threshold) {
      return { key: c.key, value: score, threshold: c.threshold };
    }
  }
  return null;
}

function extractRiskMatrixSignal(value: unknown): string | null {
  const entry = extractRiskMatrixEntry(value);
  return entry?.risk ?? null;
}

function extractRiskMatrixEntry(value: unknown): { risk: string; impact?: string; mitigation?: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const riskMatrix = (value as Record<string, unknown>).risk_matrix;
  if (!Array.isArray(riskMatrix)) return null;
  for (const row of riskMatrix) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const likelihood = String(r.likelihood ?? "").toLowerCase();
    const impact = String(r.impact ?? "").toLowerCase();
    if ((likelihood.includes("high") || likelihood.includes("hoch")) && (impact.includes("high") || impact.includes("hoch"))) {
      return {
        risk: String(r.risk ?? "Unbenanntes Risiko"),
        impact: typeof r.impact === "string" ? r.impact : undefined,
        mitigation: typeof r.mitigation === "string" ? r.mitigation : undefined,
      };
    }
  }
  return null;
}

function extractRiskFromRisksArray(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const risks = (value as Record<string, unknown>).risks;
  if (!Array.isArray(risks)) return null;
  for (const entry of risks) {
    if (typeof entry === "string") {
      const text = entry.trim();
      if (text.length > 0) return text;
      continue;
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const obj = entry as Record<string, unknown>;
      const candidates = [
        obj.risk,
        obj.description,
        obj.summary,
        obj.title,
        obj.name,
        obj.text,
      ];
      for (const c of candidates) {
        if (typeof c === "string" && c.trim().length > 0) return c.trim();
      }
    }
  }
  return null;
}

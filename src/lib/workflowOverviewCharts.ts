import type { Locale } from "@/lib/i18n";

const PLATFORM_FLOW = {
  de: `
flowchart TB
    A0[Profil / Intake / Dokumente]
    A0k[Wissen: Quellen verarbeiten, Text, Chunks, Embeddings, pgvector]
    A1[Dashboard: Phasen + Prozesse]
    A2[Run starten]
    A3[Step bearbeiten]
    A3b[ContextPack: Profil, KPIs, Dokumente, optional RAG-Chunks]
    A4[LLM-Output + Schema-Validierung]
    A5[Artefakt speichern]
    A6[Freigabe / Evaluation]
    A7["Insights (Route /insights): KPIs, Indikatoren, KPI KI-Analyse"]
    A8[Frühwarnsignale + Regeln]
    A9[Study, Evaluation, Export]

    A0 --> A1
    A0 --> A0k --> A1
    A1 --> A2 --> A3 --> A3b --> A4 --> A5 --> A6 --> A7 --> A8 --> A9
`,
  en: `
flowchart TB
    A0[Profile / intake / documents]
    A0k[Knowledge: ingest, text, chunks, embeddings, pgvector]
    A1[Dashboard: phases + workflows]
    A2[Start run]
    A3[Edit step]
    A3b[ContextPack: profile, KPIs, artifacts, optional RAG chunks]
    A4[LLM output + schema validation]
    A5[Save artifact]
    A6[Release / evaluation]
    A7["Insights (route /insights): KPIs, indicators, integrated KPI AI"]
    A8[Early warning + rules]
    A9[Study, evaluation, export]

    A0 --> A1
    A0 --> A0k --> A1
    A1 --> A2 --> A3 --> A3b --> A4 --> A5 --> A6 --> A7 --> A8 --> A9
`,
};

const RUN_LIFECYCLE = {
  de: `
flowchart TB
    R0[Basisdaten: Profil, KPI-Snapshot, Artefakt-Liste]
    R0b[Optional RAG: Query-Embedding, Vektorsuche KnowledgeChunk]
    R1[ContextPack zusammenstellen]
    R2[Prompt-Vorlagen mit Daten füllen]
    R3[Output einfügen / User-Edit]
    R4[Schema validieren]
    R5{Valid?}
    R6[RunStep speichern]
    R7[Artefakt / Decision erzeugen]
    R8[Strategy Indicators extrahieren]
    R9[Indicator-Mapping-Regeln auswerten]
    R10[Run-Status aktualisieren]
    R11["Persistierte Werte & Indikatoren für Insights und Dokumente"]

    R0 --> R0b --> R1
    R1 --> R2 --> R3 --> R4 --> R5
    R5 -->|Nein| R3
    R5 -->|Ja| R6 --> R7 --> R8 --> R9 --> R10 --> R11
`,
  en: `
flowchart TB
    R0[Load base: profile, KPI snapshot, artifact list]
    R0b[Optional RAG: query embedding, vector search KnowledgeChunk]
    R1[Assemble ContextPack]
    R2[Fill prompt templates with data]
    R3[Insert output / user edit]
    R4[Validate schema]
    R5{Valid?}
    R6[Save RunStep]
    R7[Create artifact / decision]
    R8[Extract strategy indicators]
    R9[Evaluate indicator mapping rules]
    R10[Update run status]
    R11["Persisted values & indicators for Insights and artifacts"]

    R0 --> R0b --> R1
    R1 --> R2 --> R3 --> R4 --> R5
    R5 -->|No| R3
    R5 -->|Yes| R6 --> R7 --> R8 --> R9 --> R10 --> R11
`,
};

const DSR_STUDY_FLOW = {
  de: `
flowchart TB
    S1[FB1: Allgemein]
    S2[Profil vervollständigen]
    S3[LLM / API Einstellungen]
    S4[Dokumente & Quellen]
    S4b[Optional: Wissen verarbeiten, Chunks, Embeddings, Index]
    S5[Je Planungsbereich 5×: Info → FB2 → Prozess-Runs → Dokumente → FB3 → FB4 Direktvergleich]
    S6["Entscheidungen (Route /decisions)"]
    S7[Use-Case- / Szenario-Evaluation]
    S8[FB5: Integration, Phasen & Alltag]
    S9[Study: Tabellen, Export]

    S1 --> S2 --> S3 --> S4 --> S4b --> S5 --> S6 --> S7 --> S8 --> S9
`,
  en: `
flowchart TB
    S1[FB1: General]
    S2[Complete profile]
    S3[LLM / API settings]
    S4[Documents & sources]
    S4b[Optional: ingest, chunks, embeddings, index]
    S5[Per planning area 5×: info → FB2 → workflow runs → artifacts → FB3 → FB4 direct comparison]
    S6["Decisions (route /decisions)"]
    S7[Use-case / scenario evaluation]
    S8[FB5: integration, phases & everyday use]
    S9[Study: tables, export]

    S1 --> S2 --> S3 --> S4 --> S4b --> S5 --> S6 --> S7 --> S8 --> S9
`,
};

const KPI_MODEL_FLOW = {
  de: `
flowchart TB
    K2[KPI-Bibliothek]
    Kw[Wissensobjekte aus Dokumenten]
    K1[KPI-Werte: manuell, Extrakt, Text-Update, Prozess]
    K3["Deskriptive Statistik & Verlauf (Seite /insights)"]
    Kai["Integrierte KPI KI-Analyse (Seite /insights, API)"]
    K4[Strategy Indicators]
    K5[Indicator Mapping Rules]
    K6["Aktive Rule-Hinweise (Seite /insights)"]

    K2 --> K1
    Kw --> K1
    K1 --> K3
    K1 --> Kai
    K1 --> K4
    K4 --> K5 --> K6
`,
  en: `
flowchart TB
    K2[KPI library]
    Kw[Knowledge objects from documents]
    K1[KPI values: manual, extract, text update, workflow]
    K3["Descriptive stats & history (page /insights)"]
    Kai["Integrated KPI AI analysis (page /insights, API)"]
    K4[Strategy indicators]
    K5[Indicator mapping rules]
    K6["Active rule hints (page /insights)"]

    K2 --> K1
    Kw --> K1
    K1 --> K3
    K1 --> Kai
    K1 --> K4
    K4 --> K5 --> K6
`,
};

const EARLY_WARNING_FLOW = {
  de: `
flowchart TB
    E1[Artefakt-Inhalt]
    S1[Strukturiert: Indikatoren ≥ Schwelle, risk_explanation, Risikomatrix high/high]
    S2[Heuristik: Schlüsselwörter im JSON/Text, risikosensitive Artefakt-Typen]
    E4{Mind. ein Treffer?}
    E5[Frühwarnhinweis, Status Risiko, Details]
    E6[Kein Hinweis]

    E1 --> S1 --> E4
    E1 --> S2 --> E4
    E4 -->|Ja| E5
    E4 -->|Nein| E6
`,
  en: `
flowchart TB
    E1[Artifact content]
    S1[Structured: indicator thresholds, risk_explanation, risk matrix high/high]
    S2[Heuristic: keywords in JSON/text, risk-sensitive artifact types]
    E4{Any match?}
    E5[Early warning, risk status, details]
    E6[No hint]

    E1 --> S1 --> E4
    E1 --> S2 --> E4
    E4 -->|Yes| E5
    E4 -->|No| E6
`,
};

/** Vereinfachte Kern-Abhängigkeiten (weitere Prozesse im Dashboard gruppiert) */
const DEPENDENCIES = {
  de: `
flowchart LR
    B[Baseline]
    M[Market Snapshot]
    R[Research]
    SW[SWOT]
    CA[Wettbewerber]
    VP[Value Proposition]
    GTM[Go-to-Market]
    FP[Financial Planning]
    CV[Customer Validation]
    N[Next Best Actions]
    BP[Business Plan]

    B --> M --> R
    B --> SW
    B --> CA
    M --> VP --> GTM
    R --> CV
    R --> FP
    SW --> N
    CA --> N
    GTM --> N
    FP --> N
    CV --> N
`,
  en: `
flowchart LR
    B[WF_BASELINE]
    M[WF_MARKET]
    R[WF_RESEARCH]
    SW[WF_SWOT]
    CA[WF_COMPETITOR_ANALYSIS]
    VP[WF_VALUE_PROPOSITION]
    GTM[WF_GO_TO_MARKET]
    FP[WF_FINANCIAL_PLANNING]
    CV[WF_CUSTOMER_VALIDATION]
    N[WF_NEXT_BEST_ACTIONS]
    BP[WF_BUSINESS_PLAN]

    B --> M --> R
    B --> SW
    B --> CA
    M --> VP --> GTM
    R --> CV
    R --> FP
    SW --> N
    CA --> N
    GTM --> N
    FP --> N
    CV --> N
`,
};

const TOOL_FUNCTION_MAP = {
  de: `
flowchart TB
    Hub["Dashboard / Pläne"]
    R["Runs: Steps, ContextPack, Validierung"]
    A["Dokumente: Freigabe, Evaluation"]
    I["Insights (/insights): KPIs, KI-Analyse, Rules"]
    K["Wissen (/knowledge): Upload, RAG"]
    D["Daten (/data): Profil, KPI-Werte"]
    St["Study: FB1–FB5"]
    Ev[Evaluation]
    Dec["Entscheidungen (/decisions)"]
    Se["Einstellungen: LLM/API"]
    Wo[Prozess-Übersicht]
    C[Berater-Chat]

    Hub --> R --> A
    Hub --> K
    K --> A
    Hub --> D
    Hub --> Se
    A --> I
    A --> C
    Hub --> St --> Ev
    Hub --> Dec
    Wo --> Hub
`,
  en: `
flowchart TB
    Hub["Dashboard / plans"]
    R["Runs: steps, ContextPack, validation"]
    A["Artifacts: release, evaluation"]
    I["Insights (/insights): KPIs, AI analysis, rules"]
    K["Knowledge (/knowledge): upload, RAG"]
    D["Data (/data): profile, KPI values"]
    St["Study: FB1–FB5"]
    Ev[Evaluation]
    Dec["Decisions (/decisions)"]
    Se["Settings: LLM/API"]
    Wo[Workflow overview]
    C[Advisor chat]

    Hub --> R --> A
    Hub --> K
    K --> A
    Hub --> D
    Hub --> Se
    A --> I
    A --> C
    Hub --> St --> Ev
    Hub --> Dec
    Wo --> Hub
`,
};

const USER_MANUAL_STEPS = {
  de: `
flowchart LR
    U1[1. Profil + Intake]
    U2[2. Quellen & optional Wissen]
    U3[3. LLM/API & Phase / Prozess]
    U4[4. Runs: Prompts, Output, Validierung]
    U5[5. Dokumente freigeben & evaluieren]
    U6[6. Frühwarnhinweise]
    U7["7. Insights (/insights): KPIs & KPI KI-Analyse, Rules"]
    U8[8. Study FB1–FB5, Evaluation, Export]

    U1 --> U2 --> U3 --> U4 --> U5 --> U6 --> U7 --> U8
`,
  en: `
flowchart LR
    U1[1. Profile + intake]
    U2[2. Sources & optional knowledge]
    U3[3. LLM/API & phase / workflow]
    U4[4. Runs: prompts, output, validation]
    U5[5. Release & evaluate artifacts]
    U6[6. Early warnings]
    U7["7. Insights (/insights): KPIs & integrated KPI AI, rules"]
    U8[8. Study FB1–FB5, evaluation, export]

    U1 --> U2 --> U3 --> U4 --> U5 --> U6 --> U7 --> U8
`,
};

export function getWorkflowOverviewCharts(locale: Locale) {
  const L = locale === "de" ? "de" : "en";
  return {
    platform: PLATFORM_FLOW[L],
    runLifecycle: RUN_LIFECYCLE[L],
    dsrStudy: DSR_STUDY_FLOW[L],
    kpiModel: KPI_MODEL_FLOW[L],
    earlyWarning: EARLY_WARNING_FLOW[L],
    dependencies: DEPENDENCIES[L],
    toolMap: TOOL_FUNCTION_MAP[L],
    userManual: USER_MANUAL_STEPS[L],
  };
}

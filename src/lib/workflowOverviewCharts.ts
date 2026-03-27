import type { Locale } from "@/lib/i18n";

const PLATFORM_FLOW = {
  de: `
flowchart TB
    A0[Profil / Intake / Dokumente]
    A1[Dashboard: Phasen + Workflows]
    A2[Run starten]
    A3[Step bearbeiten]
    A4[LLM-Output + Validierung]
    A5[Artefakt speichern]
    A6[Freigabe / Evaluation]
    A7[KPIs + Indikatoren]
    A8[Frühwarnsignale + Regeln]
    A9[Study / Evaluation / Export]

    A0 --> A1 --> A2 --> A3 --> A4 --> A5 --> A6
    A5 --> A7
    A7 --> A8
    A6 --> A9
    A8 --> A9
`,
  en: `
flowchart TB
    A0[Profile / Intake / Documents]
    A1[Dashboard: phases + workflows]
    A2[Start run]
    A3[Edit step]
    A4[LLM output + validation]
    A5[Save artifact]
    A6[Release / evaluation]
    A7[KPIs + indicators]
    A8[Early warning + rules]
    A9[Study / evaluation / export]

    A0 --> A1 --> A2 --> A3 --> A4 --> A5 --> A6
    A5 --> A7
    A7 --> A8
    A6 --> A9
    A8 --> A9
`,
};

const RUN_LIFECYCLE = {
  de: `
flowchart TB
    R1[ContextPack bauen]
    R2[Prompt rendern]
    R3[Output einfügen]
    R4[Schema validieren]
    R5{Valid?}
    R6[RunStep speichern]
    R7[Artefakt/Decision erzeugen]
    R8[Indikatoren extrahieren]
    R9[Regeln auswerten]
    R10[Run-Status aktualisieren]

    R1 --> R2 --> R3 --> R4 --> R5
    R5 -->|Nein| R3
    R5 -->|Ja| R6 --> R7 --> R8 --> R9 --> R10
`,
  en: `
flowchart TB
    R1[Build ContextPack]
    R2[Render prompt]
    R3[Insert output]
    R4[Validate schema]
    R5{Valid?}
    R6[Save RunStep]
    R7[Create artifact/decision]
    R8[Extract indicators]
    R9[Evaluate rules]
    R10[Update run status]

    R1 --> R2 --> R3 --> R4 --> R5
    R5 -->|No| R3
    R5 -->|Yes| R6 --> R7 --> R8 --> R9 --> R10
`,
};

const DSR_STUDY_FLOW = {
  de: `
flowchart TB
    S1[FB1: Allgemein]
    S2[Profil vervollständigen]
    S3[Doks / Quellen hochladen]
    S4[FB2 pro Kategorie]
    S5[Workflow-Run pro Phase]
    S6[Artefakte prüfen]
    S7[FB3 pro Kategorie]
    S8[Use-Case-Evaluation]
    S9[FB4 Abschlussinterview]
    S10[Study-Export]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9 --> S10
`,
  en: `
flowchart TB
    S1[FB1: General]
    S2[Complete profile]
    S3[Upload docs / sources]
    S4[FB2 per category]
    S5[Workflow run per phase]
    S6[Review artifacts]
    S7[FB3 per category]
    S8[Use-case evaluation]
    S9[FB4 closing interview]
    S10[Study export]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9 --> S10
`,
};

const KPI_MODEL_FLOW = {
  de: `
flowchart LR
    K1[KPI-Werte: manuell / Dokument / Workflow]
    K2[KPI-Bibliothek]
    K3[Deskriptive Statistik je KPI]
    K4[Strategy Indicators]
    K5[Indicator Mapping Rules]
    K6[Aktive Rule-Hinweise]

    K1 --> K3
    K2 --> K1
    K1 --> K4
    K4 --> K5 --> K6
`,
  en: `
flowchart LR
    K1[KPI values: manual / document / workflow]
    K2[KPI library]
    K3[Descriptive stats per KPI]
    K4[Strategy indicators]
    K5[Indicator mapping rules]
    K6[Active rule hints]

    K1 --> K3
    K2 --> K1
    K1 --> K4
    K4 --> K5 --> K6
`,
};

const EARLY_WARNING_FLOW = {
  de: `
flowchart TB
    E1[Artifact-Output]
    E2{Risikofaktoren prüfen}
    F1[risk_exposure_score >= 70]
    F2[threat_score >= 70]
    F3[weakness_score >= 70]
    F4[competitive_intensity_index >= 75]
    F5[Risikomatrix high/high]
    F6[risk_explanation vorhanden]
    E3{Mind. ein Faktor erfüllt?}
    E4[Frühwarnhinweis anzeigen]
    E5[Status: Risiko]
    E6[Details im Hinweis-Popup]
    E7[Kein Hinweis]

    E1 --> E2
    E2 --> F1 --> E3
    E2 --> F2 --> E3
    E2 --> F3 --> E3
    E2 --> F4 --> E3
    E2 --> F5 --> E3
    E2 --> F6 --> E3
    E3 -->|Ja| E4 --> E5 --> E6
    E3 -->|Nein| E7
`,
  en: `
flowchart TB
    E1[Artifact output]
    E2{Check risk factors}
    F1[risk_exposure_score >= 70]
    F2[threat_score >= 70]
    F3[weakness_score >= 70]
    F4[competitive_intensity_index >= 75]
    F5[Risk matrix high/high]
    F6[risk_explanation present]
    E3{At least one factor met?}
    E4[Show early warning]
    E5[Status: risk]
    E6[Details in popover]
    E7[No hint]

    E1 --> E2
    E2 --> F1 --> E3
    E2 --> F2 --> E3
    E2 --> F3 --> E3
    E2 --> F4 --> E3
    E2 --> F5 --> E3
    E2 --> F6 --> E3
    E3 -->|Yes| E4 --> E5 --> E6
    E3 -->|No| E7
`,
};

const DEPENDENCIES = `
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
    N --> BP
`;

const TOOL_FUNCTION_MAP = {
  de: `
flowchart TB
    T1[Dashboard]
    T2[Runs]
    T3[Artifacts]
    T4[Study]
    T5[Evaluation]
    T6[KPIs]
    T7[Workflow-Übersicht]

    T1 --> T2 --> T3
    T1 --> T4
    T4 --> T5
    T3 --> T6
    T6 --> T3
    T7 --> T1
`,
  en: `
flowchart TB
    T1[Dashboard]
    T2[Runs]
    T3[Artifacts]
    T4[Study]
    T5[Evaluation]
    T6[KPIs]
    T7[Workflow overview]

    T1 --> T2 --> T3
    T1 --> T4
    T4 --> T5
    T3 --> T6
    T6 --> T3
    T7 --> T1
`,
};

const USER_MANUAL_STEPS = {
  de: `
flowchart LR
    U1[1. Profil + Intake]
    U2[2. Quellen hochladen]
    U3[3. Phase starten]
    U4[4. JSON prüfen/speichern]
    U5[5. Artefakt freigeben]
    U6[6. Frühwarnhinweise prüfen]
    U7[7. KPI/Indikator auswerten]
    U8[8. Study/Evaluation abschließen]

    U1 --> U2 --> U3 --> U4 --> U5 --> U6 --> U7 --> U8
`,
  en: `
flowchart LR
    U1[1. Profile + intake]
    U2[2. Upload sources]
    U3[3. Start phase]
    U4[4. Review/save JSON]
    U5[5. Release artifact]
    U6[6. Check early warnings]
    U7[7. Review KPIs/indicators]
    U8[8. Finish study/evaluation]

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
    dependencies: DEPENDENCIES,
    toolMap: TOOL_FUNCTION_MAP[L],
    userManual: USER_MANUAL_STEPS[L],
  };
}

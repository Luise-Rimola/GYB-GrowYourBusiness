# DSR-Studie: Implementierungsvorschlag

## Zielbild

**Flow:**
1. **FB1 (Baseline)** – einmal am Start
2. **FB2** – einmal **vor** allen Runs
3. **Runs** – alle Workflows durcharbeiten
4. **FB3** – einmal **nach** allen Runs und Validierungen
5. **Evaluation** – Use Cases pro Kategorie
6. **Pro Kategorie:**
   - **FB2** – **vor** der Kategorie (vor Start der Evaluation in dieser Kategorie)
   - Evaluation durchführen
   - **FB3** – **nach** allen abgeschlossenen Use-Cases in der Kategorie

**Ziel:** Alle Umfragedaten und Kontextdaten in der App erfassen, für Export und Auswertung (deskriptiv, Regression, Mixed Methods) bereitstellen.

---

## 1. Was bereits existiert

| Komponente | Status | Anpassung nötig |
|------------|--------|-----------------|
| Login/Auth | ❌ Fehlt | Teilnehmer-ID oder Login erforderlich |
| Company/Teilnehmer | 1 Demo-Company für alle | Multi-Teilnehmer pro Studie |
| Intake | ✅ Vorhanden | Kann als Kontext genutzt werden |
| Runs/Workflows | ✅ Vorhanden | Case-Typ (A/B) + Modus (mit/ohne Tool) tracken |
| Szenario-Evaluation | ✅ 8 Indikatoren (1–5) | Skala auf 1–7 umstellen, DSR-Fragebogen 2 integrieren |
| Use-Case-Evaluation | ✅ Basis vorhanden | Erweitern um DSR-Fragebogen 2 Items |
| Datenexport | ❌ Fehlt | CSV/JSON-Export für Auswertung |

---

## 2. Einheitliche Skala (1–7)

**Alle Likert-Items:** 1–7 (Zustimmung)

| Wert | Label |
|------|-------|
| 1 | stimme gar nicht zu |
| 2 | stimme überwiegend nicht zu |
| 3 | stimme eher nicht zu |
| 4 | teils/teils |
| 5 | stimme eher zu |
| 6 | stimme überwiegend zu |
| 7 | stimme voll zu |

**Reverse-Coding:** C5, CF3, CL1, CL3, US3, GOV1 – bei Speicherung oder Export invertieren.

---

## 3. Datenmodell-Erweiterungen (Prisma)

### 3.1 Neues Modell: `StudyParticipant`

```prisma
model StudyParticipant {
  id            String   @id @default(cuid())
  studyId       String   // z.B. "DSR-2025-01"
  externalId    String?  // Anonymisierte Teilnehmer-ID für Export
  companyId      String?  // Verknüpfung mit Company (optional)
  createdAt     DateTime @default(now())
  completedFb1  Boolean  @default(false)
  completedFb3  Boolean  @default(false)

  company       Company? @relation(fields: [companyId], references: [id])
  fb1Responses  QuestionnaireResponse[] @relation("Fb1")
  fb2Responses  QuestionnaireResponse[] @relation("Fb2")
  fb3Responses  QuestionnaireResponse[] @relation("Fb3")
}
```

### 3.2 Neues Modell: `QuestionnaireResponse`

```prisma
model QuestionnaireResponse {
  id                String   @id @default(cuid())
  participantId     String
  questionnaireType String   // "fb1" | "fb2" | "fb3"
  category          String?  // Für FB2/FB3 pro Kategorie: markt_geschaeftsmodell, produktstrategie, marketing, wachstum_expansion, investition_strategie
  responsesJson     Json
  createdAt         DateTime @default(now())

  participant       StudyParticipant @relation(fields: [participantId], references: [id])
}
```

- **FB1:** `category` = null (einmal pro Teilnehmer)
- **FB2/FB3 overall:** `category` = null (nach allen Runs)
- **FB2/FB3 pro Kategorie:** `category` = Kategorie-Key (bei Evaluation pro Use-Case-Kategorie)

### 3.3 Run erweitern

```prisma
// Run um folgende Felder erweitern:
caseType   String?  // "A" | "B"
modus      String?  // "ohne_tool" | "mit_tool"
startedAt  DateTime?
finishedAt DateTime?  // Für Bearbeitungszeit
```

---

## 4. Fragebogen 1 — Baseline (T0)

**Route:** `/study/fragebogen-1` oder `/study?step=fb1`

**Blöcke:**

| Block | Items | Speicherung |
|-------|-------|-------------|
| A: Demografie | A1–A6 | `responsesJson.a` |
| B: KI-Erfahrung | B1–B3 | `responsesJson.b` |
| C: Ausgangsniveau | C1–C6 | `responsesJson.c` |

**JSON-Struktur (Beispiel):**

```json
{
  "a": {
    "A1": "Founder",
    "A2": "Seed",
    "A3": "2-5",
    "A4": "Gastronomie",
    "A5": 5,
    "A6": "monatlich"
  },
  "b": {
    "B1": "wöchentlich",
    "B2": 5,
    "B3": 4
  },
  "c": {
    "C1": 4, "C2": 3, "C3": 4, "C4": 5, "C5": 3, "C6": 5
  }
}
```

**Validierung:** Alle Pflichtfelder ausgefüllt → `completedFb1 = true` → Weiter zu Tool/Workflows.

---

## 5. Fragebogen 2 — Post-Task (nach jedem Case)

**Route:** `/study/fragebogen-2?runId=xxx` oder nach Run-Abschluss als Modal/Seite

**Task-Metadaten (automatisch oder manuell):**

- T1: Case A oder B (aus Run-Kontext oder Auswahl)
- T2: ohne Tool / mit Tool (aus Run-Kontext)
- T3: Bearbeitungszeit (aus `Run.startedAt`/`finishedAt` oder manuell)

**Blöcke:**

| Kategorie | Items | Score |
|-----------|-------|-------|
| DQ | DQ1–DQ4 | Mittelwert |
| EV | EV1–EV4 | Mittelwert |
| TR | TR1–TR3 | Mittelwert |
| CF | CF1, CF2, CF3 (reverse) | Mittelwert |
| CL | CL1, CL3 (negativ), CL2 (reverse) | Mittelwert |
| US | US1, US2, US3 (reverse) | Mittelwert |

**Offene Fragen:** O1, O2, O3 (Text)

**Speicherung:** `QuestionnaireResponse` mit `questionnaireType: "fb2"`, `runId`, `caseType`, `modus`, `responsesJson`.

---

## 6. Fragebogen 3 — Abschluss (T_end)

**Route:** `/study/fragebogen-3`

**Blöcke:**

| Kategorie | Items |
|-----------|-------|
| COMP | COMP1–COMP5 |
| FIT | FIT1–FIT3 |
| GOV | GOV1–GOV3 |
| Offen | E1, E2, E3 (inkl. E3 Betriebsmodell) |

**Speicherung:** `QuestionnaireResponse` mit `questionnaireType: "fb3"` → `completedFb3 = true`.

---

## 7. Study Flow (gelenkter Ablauf)

**Option A: Linearer Flow**

```
/study → Prüfung: FB1 fertig? Nein → /study/fb1
        Ja → Weiter zu Dashboard/Workflows
        Nach Run → FB2 anzeigen (Modal oder /study/fb2?runId=…)
        Nach allen Runs + FB2 → FB3 freischalten
```

**Option B: Study-Dashboard**

```
/study
├── Status: FB1 [✓], FB2 (0/2), FB3 [ ]
├── Button "Fragebogen 1" (wenn nicht fertig)
├── Link zu Dashboard / Runs
├── Nach Run: "Fragebogen 2 ausfüllen" pro Run
└── Button "Fragebogen 3" (wenn FB2 für beide Cases)
```

**Implementierung:** `StudyGuard`-Komponente oder Middleware, die prüft, ob der Nutzer im richtigen Schritt ist.

---

## 8. Case-Typen und Modus

**Case A (Launch/Go-NoGo):** z.B. Szenarien 1, 4, 23, 41, 61  
**Case B (Scaling/Priorisierung):** z.B. Szenarien 24, 42, 67, 84  

**Modus:**

- **ohne Tool:** Nutzer entscheidet manuell (z.B. eigenes Dokument, keine KI) → Run mit `modus: "ohne_tool"` oder separates „Manueller Durchlauf“-Objekt
- **mit Tool:** Nutzer nutzt die App (Runs, Workflows) → Run mit `modus: "mit_tool"`

**Umsetzung:** Beim Start eines Runs Auswahl: Case A/B, Modus ohne/mit Tool. Diese Werte in `Run` und in `QuestionnaireResponse` speichern.

---

## 9. Datenexport für Auswertung

**Route:** `/study/export` oder `/api/study/export` (nur für Admins/Studienleiter)

**Exportformate:**

1. **CSV (pro Teilnehmer):**
   - `participant_id`, `external_id`, `created_at`
   - FB1: alle Items A1–A6, B1–B3, C1–C6
   - FB2: pro Response `run_id`, `case_type`, `modus`, `bearbeitungszeit_min`, DQ1–DQ4, EV1–EV4, TR1–TR3, CF1–CF3, CL1–CL3, US1–US3, O1–O3
   - FB3: COMP1–COMP5, FIT1–FIT3, GOV1–GOV3, E1–E3
   - Szenario-Evaluationen: `scenario_id`, `user_confidence`, `ai_confidence`, `user_prefers`, 8 Indikatoren
   - Use-Case-Evaluationen: `use_case_description`, `questionnaire_json`

2. **JSON (vollständig):** Alle Rohdaten für flexible Auswertung in R/Python.

**Scores berechnen:** Optional im Export oder in der Auswertung:
- DQ-Score = Mittelwert(DQ1–DQ4)
- EV-Score = Mittelwert(EV1–EV4)
- TR-Score = Mittelwert(TR1–TR3)
- CF-Score = Mittelwert(CF1, CF2, 8-CF3)
- CL-Score = Mittelwert(CL1, CL3, 8-CL2)
- US-Score = Mittelwert(US1, US2, 8-US3)

---

## 10. Implementierungsreihenfolge

### Phase 1: Basis (ohne Login)

1. **Prisma:** Modelle `StudyParticipant`, `QuestionnaireResponse`; `Run` um `caseType`, `modus`, `startedAt`, `finishedAt` erweitern.
2. **Fragebogen 1:** Seite `/study/fb1` mit allen Items (A, B, C), Skala 1–7, Speicherung in `QuestionnaireResponse`.
3. **Study-Start:** `/study` als Einstieg, prüft ob FB1 vorhanden, leitet ggf. zu FB1.

### Phase 2: Run-Kontext & Fragebogen 2

4. **Run-Wizard:** Beim Start Auswahl Case (A/B) und Modus (ohne/mit Tool), Speicherung in `Run`.
5. **Bearbeitungszeit:** `startedAt` beim Start, `finishedAt` beim Abschluss des Runs.
6. **Fragebogen 2:** Nach Run-Abschluss FB2 anzeigen (Modal oder eigene Seite), Verknüpfung mit `runId`, Speicherung aller DQ/EV/TR/CF/CL/US + O1–O3.

### Phase 3: Abschluss & Export

7. **Fragebogen 3:** Seite `/study/fb3`, COMP/FIT/GOV + E1–E3.
8. **Study Flow:** Logik „FB3 freischalten“, wenn FB2 für mind. 1 Run (oder 2 Runs bei A+B) ausgefüllt.
9. **Export:** API `/api/study/export` und/oder Seite `/study/export` mit CSV/JSON-Download.

### Phase 4: Login & Multi-Teilnehmer (optional)

10. **Auth:** NextAuth oder einfacher Token-basierter Login mit `StudyParticipant`-Zuordnung.
11. **Multi-Teilnehmer:** Pro Login eine `Company` + `StudyParticipant`, keine gemeinsame Demo-Company.

---

## 11. Skala 1–7: Bestehende Evaluationen anpassen

**Szenario-Evaluation:** Aktuell 1–5 → auf 1–7 umstellen.

**Use-Case-Evaluation:** `questionnaireJson` um DSR-Fragebogen-2-Items erweitern (DQ, EV, TR, CF, CL, US) oder als separates FB2-Objekt nach Use-Case-Run speichern.

**Empfehlung:** Szenario-Indikatoren auf 1–7 umstellen; Use-Case-Feedback getrennt lassen (helpful/fit) und zusätzlich FB2-Items anbieten, wenn der Use-Case als „Case“ im Studienablauf zählt.

---

## 12. Offene Punkte

1. **Login:** Soll ein vollwertiger Login (E-Mail/Passwort) oder nur eine Teilnehmer-ID (z.B. Code) genutzt werden?
2. **Case-Zuordnung:** Sollen die 100 Szenarien fest Case A/B zugeordnet werden, oder wählt der Nutzer pro Durchlauf?
3. **„Ohne Tool“:** Wie wird „ohne Tool“ umgesetzt? Eigenes Formular für manuelle Entscheidung ohne KI, oder nur FB2 nach „mit Tool“?
4. **Mindestanzahl Runs:** Muss FB2 für beide Cases (A und B) ausgefüllt sein, bevor FB3 freigeschaltet wird?

---

## 13. Nächste Schritte

Soll mit **Phase 1** (Prisma + Fragebogen 1 + Study-Start) begonnen werden? Dann können die konkreten Formulare und Komponenten implementiert werden.

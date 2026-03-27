# Intake-Formular – Feldtypen & Weiterverarbeitung

## 1. Feld-Spezifikation (Feldtyp, Validierung, Optionen)

### Sektion 0: Business state & goals

| Feldname | Feldtyp | HTML-Type | Validierung | Optionen / Werte | Output-Typ |
|----------|---------|-----------|-------------|------------------|------------|
| business_state | Select | select | — | idea, first_research, investor_search, launch, young_business, growing_business, scaling_business, established | string |
| goals | Checkbox (multi) | checkbox | — | validate_idea, market_research, secure_funding, launch_product, grow_customers, scale_operations, expand_markets, profitability, build_team, supplier_list, real_estate | string[] |

---

### Sektion 1: Company basics

| Feldname | Feldtyp | HTML-Type | Validierung | Placeholder | Output-Typ |
|----------|---------|-----------|-------------|-------------|------------|
| company_name | Text | text | — | Acme Inc | string |
| location | Text | text | — | Berlin, Germany | string |
| website | URL | url | — | https://example.com | string |
| offer | Textarea | textarea | rows: 3 | Product/service description | string |
| usp | Textarea | textarea | rows: 2 | What makes you different? | string |
| customers | Text | text | — | B2B SaaS, SMBs, etc. | string |
| market_reach | Select | select | — | local, national (default), international | string |
| ai_request | Checkbox (multi) | checkbox | — | find_real_estate, research_market_pricing, find_best_positioning, research_competitor_usps, find_best_usp, research_target_demographics | string[] |

---

### Sektion 2: Product catalogue ( dynamische Tabelle )

| Feldname | Feldtyp | Unterfelder | Validierung | Output-Typ |
|----------|---------|-------------|-------------|------------|
| products_json | Array (JSON) | siehe unten | JSON-Array | object[] |

**Produkt-Objekt:**

| Property | Feldtyp | HTML-Type | Pflicht |
|----------|---------|-----------|---------|
| name | Text | text | nein |
| sku | Text | text | nein |
| price | Zahl | number, step=any | nein |
| unit | Text | text | nein |
| notes | Text | text | nein |

**Filter:** Zeile wird nur übernommen, wenn `name` ODER `price` ausgefüllt.

---

### Sektion 3: Suppliers ( dynamische Tabelle )

| Feldname | Feldtyp | Unterfelder | Validierung | Output-Typ |
|----------|---------|-------------|-------------|------------|
| suppliers_json | Array (JSON) | siehe unten | JSON-Array | object[] |

**Supplier-Objekt:**

| Property | Feldtyp | HTML-Type | Optionen | Pflicht |
|----------|---------|-----------|----------|---------|
| material | Text | text | — | nein |
| supplier | Text | text | — | nein |
| pricePerUnit | Zahl | number, step=any | — | nein |
| unit | Select | select | g, kg, m, ft, ea, L | nein (default: kg) |
| notes | Text | text | — | nein |

**Filter:** Zeile nur wenn `material` ODER `pricePerUnit` ausgefüllt.

---

### Sektion 4: Production steps

| Feldname | Feldtyp | HTML-Type | Validierung | Output-Typ |
|----------|---------|-----------|-------------|------------|
| production_steps | Textarea | textarea | rows: 6 | string |
| ai_request | Checkbox | checkbox | suggest_production_workflow | string[] (append) |

---

### Sektion 5: Team ( dynamische Tabelle )

| Feldname | Feldtyp | Unterfelder | Output-Typ |
|----------|---------|-------------|------------|
| team_json | Array (JSON) | siehe unten | object[] |

**Team-Objekt:**

| Property | Feldtyp | HTML-Type | Pflicht |
|----------|---------|-----------|---------|
| name | Text | text | nein |
| role | Text | text | nein |
| skills | Text | text | nein |
| hoursPerWeek | Zahl | number | nein |
| salary | Zahl | number, step=any | nein |

**Filter:** Zeile nur wenn `name` ODER `role` ODER `skills` ODER `salary` ausgefüllt.

---

### Sektion 6: Financials

| Feldname | Feldtyp | HTML-Type | Validierung | Output-Typ |
|----------|---------|-----------|-------------|------------|
| revenue_last_month | Zahl | number, step=any | parseFloat, default 0 | number |
| marketing_spend | Zahl | number, step=any | parseFloat, default 0 | number |
| fixed_costs | Zahl | number, step=any | parseFloat, default 0 | number |
| variable_costs | Zahl | number, step=any | parseFloat, default 0 | number |
| cost_excel | Datei | file | accept: .xlsx, .xls, .csv | File (Backend) / Base64 (API) |
| ai_request | Checkbox | checkbox | benchmark_industry | string[] (append) |

---

### Sektion 7: Operations & growth

| Feldname | Feldtyp | HTML-Type | Validierung | Output-Typ |
|----------|---------|-----------|-------------|------------|
| team_size | Zahl | number | parseInt, default 0 | number |
| stage | Select | select | — | string |
| competitors | Textarea | textarea | rows: 2 | string |
| growth_challenge | Textarea | textarea | rows: 2 | string |
| differentiators | Textarea | textarea | rows: 2 | string |
| sales_channels | Text | text | — | string |
| lead_time | Text | text | — | string |
| constraints | Textarea | textarea | rows: 2 | string |
| ai_request | Checkbox | checkbox | find_main_competitors | string[] (append) |

**stage-Optionen:** pre_revenue, early_revenue (default), growth, scaling

---

### Sektion 8: Additional context

| Feldname | Feldtyp | HTML-Type | Validierung | Output-Typ |
|----------|---------|-----------|-------------|------------|
| funding_status | Text | text | — | string |
| legal_structure | Select | select | — | string |
| years_in_business | Zahl | number, step=0.5 | parseFloat, default 0 | number |
| target_market | Text | text | — | string |
| acquisition_channels | Text | text | — | string |
| aov | Zahl | number, step=any | parseFloat, default 0 | number |
| retention_churn | Text | text | — | string |
| additional_notes | Textarea | textarea | rows: 4 | string |
| ai_request | Checkbox | checkbox | research_tam_sam_som, find_best_acquisition_channels | string[] (append) |

**legal_structure-Optionen:** (leer), sole_proprietorship, partnership, llc, corporation, other

---

## 2. Vollständige ai_request-Werte (alle Sektionen)

| Wert | Sektion | Bedeutung |
|------|---------|-----------|
| find_real_estate | 1 | Artifact „Real estate“ anlegen |
| research_market_pricing | 1 | — |
| find_best_positioning | 1 | — |
| research_competitor_usps | 1 | — |
| find_best_usp | 1 | — |
| research_target_demographics | 1 | — |
| find_best_product_mix | 2 | — |
| research_product_pricing | 2 | — |
| find_supplier_whitelabel | 3 | Artifact „Supplier list“ (whitelabeling) |
| find_supplier_ingredients | 3 | Artifact „Supplier list“ (ingredients) |
| suggest_production_workflow | 4 | — |
| suggest_roles_salaries | 5 | — |
| benchmark_industry | 6 | — |
| find_main_competitors | 7 | — |
| research_tam_sam_som | 8 | — |
| find_best_acquisition_channels | 8 | — |

---

## 3. Weiterverarbeitung (processIntakeForm)

### 3.1 Ablauf

```
FormData (POST)
    ↓
1. Parsing: goals[], ai_requests[], products_json, suppliers_json, team_json
2. Numerische Felder: parseFloat/parseInt mit Default 0
3. cost_excel: Datei speichern → Document (docType: costs)
4. IntakeSession erstellen (status: complete, answersJson)
5. CompanyProfile erstellen/aktualisieren (profileJson, completenessScore)
6. Optional: Artifacts anlegen (real_estate, supplier_list)
```

### 3.2 completenessScore

```javascript
filled = [company_name, offer, revenue_last_month, location, usp, website].filter(Boolean).length;
completenessScore = Math.min(1, filled / 6 + 0.2);
```

### 3.3 Artifact-Logik

| Bedingung | Artifact |
|-----------|----------|
| ai_requests.includes("find_real_estate") ODER goals.includes("real_estate") | real_estate (status: pending) |
| ai_requests.includes("find_supplier_whitelabel") ODER find_supplier_ingredients ODER goals.includes("supplier_list") | supplier_list (status: pending, types: whitelabeling/ingredients) |

### 3.4 Datenbank-Entitäten

| Entität | Aktion |
|---------|--------|
| IntakeSession | CREATE (companyId, status: complete, answersJson) |
| CompanyProfile | CREATE (companyId, version++, profileJson, completenessScore) |
| Document | CREATE (wenn cost_excel) – filename, docType: costs, storageUri |
| Artifact | CREATE (wenn real_estate/supplier_list gewünscht) – type, contentJson, exportHtml |

---

## 4. JSON-Schema für n8n / API

```json
{
  "type": "object",
  "properties": {
    "business_state": { "type": "string", "enum": ["idea", "first_research", "investor_search", "launch", "young_business", "growing_business", "scaling_business", "established"] },
    "goals": { "type": "array", "items": { "type": "string" } },
    "ai_requests": { "type": "array", "items": { "type": "string" } },
    "company_name": { "type": "string" },
    "location": { "type": "string" },
    "website": { "type": "string", "format": "uri" },
    "offer": { "type": "string" },
    "usp": { "type": "string" },
    "customers": { "type": "string" },
    "market_reach": { "type": "string", "enum": ["local", "national", "international"] },
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "sku": { "type": "string" },
          "price": { "type": "string" },
          "unit": { "type": "string" },
          "notes": { "type": "string" }
        }
      }
    },
    "suppliers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "material": { "type": "string" },
          "supplier": { "type": "string" },
          "pricePerUnit": { "type": "string" },
          "unit": { "type": "string", "enum": ["g", "kg", "m", "ft", "ea", "L"] },
          "notes": { "type": "string" }
        }
      }
    },
    "production_steps": { "type": "string" },
    "team": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "role": { "type": "string" },
          "skills": { "type": "string" },
          "hoursPerWeek": { "type": "string" },
          "salary": { "type": "string" }
        }
      }
    },
    "revenue_last_month": { "type": "number" },
    "marketing_spend": { "type": "number" },
    "fixed_costs": { "type": "number" },
    "variable_costs": { "type": "number" },
    "team_size": { "type": "integer" },
    "stage": { "type": "string", "enum": ["pre_revenue", "early_revenue", "growth", "scaling"] },
    "competitors": { "type": "string" },
    "growth_challenge": { "type": "string" },
    "differentiators": { "type": "string" },
    "sales_channels": { "type": "string" },
    "lead_time": { "type": "string" },
    "constraints": { "type": "string" },
    "funding_status": { "type": "string" },
    "legal_structure": { "type": "string" },
    "years_in_business": { "type": "number" },
    "target_market": { "type": "string" },
    "acquisition_channels": { "type": "string" },
    "aov": { "type": "number" },
    "retention_churn": { "type": "string" },
    "additional_notes": { "type": "string" }
  }
}
```

---

## 5. n8n Weiterverarbeitung (Beispiel)

```
[Webhook] → empfängt JSON
    ↓
[Code] → Parse, Validierung, completenessScore berechnen
    ↓
[IF] → wantsRealEstate? → [Artifact anlegen]
[IF] → wantsSupplierList? → [Artifact anlegen]
    ↓
[HTTP Request] → POST zu Next.js API (IntakeSession, CompanyProfile)
    ODER
[SQLite] → Direkt in DB schreiben (wenn n8n DB-Zugriff hat)
```

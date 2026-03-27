# Intake-Formular in n8n anlegen

## Zwei Wege

| Weg | Vorteile | Nachteile |
|-----|----------|-----------|
| **A: Form Trigger** | Form direkt in n8n, keine externe HTML-Datei | Keine dynamischen Tabellen (Products/suppliers/team) |
| **B: Webhook + HTML** | Volles Formular, dynamische Tabellen | Externe HTML-Datei nötig |

---

## Weg A: Form Trigger (nativ in n8n)

### Schritt 1: Workflow erstellen

1. n8n öffnen → **New Workflow**
2. **Form Trigger**-Node hinzufügen („Form Trigger“ suchen)

### Schritt 2: Form konfigurieren

**Form Title:** `Business Intake – Company Profile`  
**Form Description:** `Füllen Sie das Formular aus.`

### Schritt 3: Form Elements hinzufügen

Für jedes Feld: **Add Form Element** → Element Type wählen → **Element Name** setzen (wichtig für Output).

#### Mapping: n8n Element Type ↔ Intake-Feld

| n8n Element Type | Intake-Feld | Element Name |
|------------------|-------------|---------------|
| Dropdown | business_state | business_state |
| Checkboxes | goals | goals |
| Text | company_name | company_name |
| Text | location | location |
| Email oder Text | website | website |
| Textarea | offer | offer |
| Textarea | usp | usp |
| Text | customers | customers |
| Dropdown | market_reach | market_reach |
| Checkboxes | ai_request | ai_request |
| Textarea | production_steps | production_steps |
| Number | revenue_last_month | revenue_last_month |
| Number | marketing_spend | marketing_spend |
| Number | fixed_costs | fixed_costs |
| Number | variable_costs | variable_costs |
| File | cost_excel | cost_excel |
| Number | team_size | team_size |
| Dropdown | stage | stage |
| Textarea | competitors | competitors |
| Textarea | growth_challenge | growth_challenge |
| Textarea | differentiators | differentiators |
| Text | sales_channels | sales_channels |
| Text | lead_time | lead_time |
| Textarea | constraints | constraints |
| Text | funding_status | funding_status |
| Dropdown | legal_structure | legal_structure |
| Number | years_in_business | years_in_business |
| Text | target_market | target_market |
| Text | acquisition_channels | acquisition_channels |
| Number | aov | aov |
| Text | retention_churn | retention_churn |
| Textarea | additional_notes | additional_notes |

### Schritt 4: Dropdown-Optionen

**business_state:**

| Label | Value |
|-------|-------|
| Idea | idea |
| First research | first_research |
| Investor search | investor_search |
| Launch / Startup | launch |
| Young business | young_business |
| Growing business | growing_business |
| Scaling business | scaling_business |
| Established | established |

**market_reach:** Local only (local), National (national), International (international)

**stage:** Pre-revenue (pre_revenue), Early revenue (early_revenue), Growth (growth), Scaling (scaling)

**legal_structure:** — (leer), Sole proprietorship (sole_proprietorship), Partnership (partnership), LLC (llc), Corporation (corporation), Other (other)

### Schritt 5: Checkbox-Optionen

**goals:** validate_idea, market_research, secure_funding, launch_product, grow_customers, scale_operations, expand_markets, profitability, build_team, supplier_list, real_estate

**ai_request:** find_real_estate, research_market_pricing, find_best_positioning, research_competitor_usps, find_best_usp, research_target_demographics, find_supplier_whitelabel, find_supplier_ingredients, suggest_production_workflow, suggest_roles_salaries, benchmark_industry, find_main_competitors, research_tam_sam_som, find_best_acquisition_channels

### Schritt 6: Products, Suppliers, Team – Workaround

**Option 1: Textarea für JSON**

- Ein Element: **Textarea**, Element Name: `products_json`
- Label: `Products (JSON: [{"name":"","sku":"","price":"","unit":"","notes":""}]`
- Nutzer fügt JSON-Array ein.

**Option 2: Mehrere Form-Nodes (Seiten)**

- Mehrere **Form**-Nodes (nicht Form Trigger) für weitere Seiten
- Pro Seite z.B. 3–5 feste Produkt-Zeilen (product_1_name, product_1_price, …)
- Im Code-Node: Einzelne Felder zu `products`-Array zusammenbauen

**Option 3: Custom HTML**

- Custom HTML mit festen 3–5 Zeilen (z.B. 5 Produkte)
- Element Name setzen, damit die Daten im Output landen (nicht empfohlen, komplex)

### Schritt 7: Mehrseitiges Formular (Form-Nodes)

1. **Form Trigger** → erste Seite (z.B. business_state, goals, company basics)
2. **Form**-Node („Form“ suchen) → zweite Seite (products, suppliers, production)
3. **Form**-Node → dritte Seite (team, financials)
4. **Form**-Node → vierte Seite (operations, additional)

Zwischen den Form-Nodes: Verbindung von „Form“ zu „Form“ (nächste Seite).

### Schritt 8: Daten zusammenführen

Nach dem letzten Form-Node: **Code**-Node, um Daten aus allen Seiten zu mergen:

```javascript
const formData = $input.all();
const merged = {};
for (const item of formData) {
  Object.assign(merged, item.json);
}
// products, suppliers, team aus JSON parsen oder aus Einzelfeldern bauen
return [{ json: merged }];
```

### Schritt 9: Weiterverarbeitung

- **Code**-Node: `completenessScore` berechnen, `answers`-Objekt bauen
- **IF**-Node: `wantsRealEstate` → Artifact-Logik
- **IF**-Node: `wantsSupplierList` → Artifact-Logik
- **HTTP Request** oder **SQLite**: an Next.js API oder DB senden

---

## Weg B: Webhook + HTML-Formular (empfohlen)

### Schritt 1: Webhook-Node

1. **Webhook**-Node hinzufügen
2. **Webhook URLs** → **Production URL** kopieren
3. **HTTP Method:** POST
4. **Response Mode:** „When Last Node Finishes“ oder „Immediately“ (mit Response-Node)

### Schritt 2: HTML-Formular bereitstellen

Die Datei `public/intake-form.html` nutzen:

1. Next.js starten: `npm run dev`
2. Formular öffnen: `http://localhost:3000/intake-form.html`
3. Oder: HTML-Datei auf einen Webserver legen (z.B. Netlify, Vercel)

### Schritt 3: Webhook-URL eintragen

Im Formular oben: Webhook-URL eingeben (z.B. `https://n8n.example.com/webhook/abc123`).

### Schritt 4: n8n-Workflow nach Webhook

```
[Webhook] → empfängt JSON
    ↓
[Code] → Parse, Validierung, completenessScore
    ↓
[IF] → real_estate? → [Artifact]
[IF] → supplier_list? → [Artifact]
    ↓
[HTTP Request] → Next.js API
```

### Schritt 5: Code-Node (Weiterverarbeitung)

```javascript
const body = $input.first().json.body || $input.first().json;

const answers = {
  business_state: body.business_state || '',
  goals: Array.isArray(body.goals) ? body.goals : [],
  ai_requests: Array.isArray(body.ai_requests) ? body.ai_requests : [],
  company_name: body.company_name || '',
  location: body.location || '',
  website: body.website || '',
  offer: body.offer || '',
  usp: body.usp || '',
  customers: body.customers || '',
  market_reach: body.market_reach || 'national',
  products: Array.isArray(body.products) ? body.products : [],
  suppliers: Array.isArray(body.suppliers) ? body.suppliers : [],
  production_steps: body.production_steps || '',
  team: Array.isArray(body.team) ? body.team : [],
  revenue_last_month: parseFloat(body.revenue_last_month) || 0,
  marketing_spend: parseFloat(body.marketing_spend) || 0,
  fixed_costs: parseFloat(body.fixed_costs) || 0,
  variable_costs: parseFloat(body.variable_costs) || 0,
  team_size: parseInt(body.team_size, 10) || 0,
  stage: body.stage || 'early_revenue',
  competitors: body.competitors || '',
  growth_challenge: body.growth_challenge || '',
  differentiators: body.differentiators || '',
  sales_channels: body.sales_channels || '',
  lead_time: body.lead_time || '',
  constraints: body.constraints || '',
  funding_status: body.funding_status || '',
  legal_structure: body.legal_structure || '',
  years_in_business: parseFloat(body.years_in_business) || 0,
  target_market: body.target_market || '',
  acquisition_channels: body.acquisition_channels || '',
  aov: parseFloat(body.aov) || 0,
  retention_churn: body.retention_churn || '',
  additional_notes: body.additional_notes || '',
};

const filled = [answers.company_name, answers.offer, answers.revenue_last_month, answers.location, answers.usp, answers.website].filter(Boolean).length;
answers.completenessScore = Math.min(1, filled / 6 + 0.2);

return [{ json: answers }];
```

---

## Checkliste Form Trigger

- [ ] Form Trigger-Node hinzugefügt
- [ ] Form Title & Description gesetzt
- [ ] Alle einfachen Felder (Text, Number, Textarea, Dropdown, Checkboxes) angelegt
- [ ] Element Names gesetzt (für Output)
- [ ] Products/Suppliers/Team: JSON-Textarea oder feste Zeilen
- [ ] Form-Nodes für weitere Seiten (optional)
- [ ] Code-Node für Merge & Weiterverarbeitung
- [ ] Workflow aktivieren, Production URL testen

---

## Checkliste Webhook

- [ ] Webhook-Node mit POST
- [ ] `intake-form.html` erreichbar
- [ ] Webhook-URL im Formular eingetragen
- [ ] Code-Node für Parse & completenessScore
- [ ] Weiterverarbeitung (API, DB, etc.)

export type PromptTemplate = {
  key: string;
  workflowKey: string;
  stepKey: string;
  version: number;
  outputSchemaKey: string;
  templateText: string;
};

/** Instruction for footnote-style source references – add to prompts that output sources_used */
const SOURCE_REFERENCE_INSTRUCTION = `
SOURCE REFERENCES (footnotes):
- In narrative text, facts, descriptions: use ONLY [1], [2], [3] etc. to reference sources. Do NOT put full URLs or source names inline.
- Put all sources in sources_used as array of strings. Each entry: "Title (URL)" if URL exists, else "Title". Order matches [1], [2], [3].
- For key_facts: use source_ref (number 1-based) instead of source_hint. Example: { "fact": "...", "source_ref": 1 }
`;

/** Instruction: use actual data from referenced artifacts – add to prompts that depend on prior workflows */
const ARTIFACT_INSTRUCTION = `
REFERENCED ARTIFACTS: CONTEXT_JSON contains the full outputs of previous workflows (real_estate, financial_planning, supplier_list, menu_card, menu_cost, market_snapshot, industry_research, best_practices, failure_analysis, etc.). When present, use their ACTUAL data – do not invent or estimate. The workflows ran before this step; use the results directly.`;

/** Strict JSON rules for LLM output – add to all prompts that return JSON */
const JSON_STRICT =
  `CRITICAL – Output MUST be valid, parseable JSON:
- Escape quotes inside strings: use \\\" (e.g. "als \\\"anders\\\" kann" – never raw " inside string values)
- No trailing commas after last array/object element
- No newlines inside string values (use \\n for line breaks)
- Use commas (,) between properties, never periods (.)
- No comments (no // or /* */)
- Every key must have a value (key: value)`;

export const promptTemplates: PromptTemplate[] = [
  {
    key: "P1",
    workflowKey: "WF_BASELINE",
    stepKey: "business_model_inference",
    version: 1,
    outputSchemaKey: "business_model_inference",
    templateText: `You are an expert business model classifier.
${ARTIFACT_INSTRUCTION}
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "business_model_type": "...", "confidence": 0.0, "stage": "...", "stage_confidence": 0.0, "rationale": ["..."] }`,
  },
  {
    key: "P2",
    workflowKey: "WF_BASELINE",
    stepKey: "kpi_set_selection",
    version: 1,
    outputSchemaKey: "kpi_set_selection",
    templateText: `You are a KPI architect. Select ALL KPIs that make sense for this business model – no arbitrary limit.
${ARTIFACT_INSTRUCTION}
Use kpi_library_summary from CONTEXT_JSON – it lists available KPIs with kpi_key, name_simple, category. You MUST use the EXACT kpi_key values from that list (e.g. north_star_revenue, gross_margin_pct, contribution_margin_pct, cac, burn_rate_net, runway_months, mom_growth_rate_revenue, new_customers, aov, conversion_rate_primary, mrr, logo_churn_rate, etc.).
MANDATORY: Select ALL KPIs from kpi_library_summary that are relevant for this business – north_star, margin, growth, finance, acquisition, retention, etc. Include every KPI that has business relevance. Do NOT invent keys – only use kpi_key from kpi_library_summary.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "selected_kpis": ["north_star_revenue", "gross_margin_pct", "contribution_margin_pct", "cac", "burn_rate_net", "runway_months", "mom_growth_rate_revenue", "new_customers", "active_customers", "aov", "conversion_rate_primary", "mrr", "logo_churn_rate", "..." ], "kpi_tree": {...}, "missing_inputs": ["..."], "rationale": ["..."] }`,
  },
  {
    key: "P3",
    workflowKey: "WF_BASELINE",
    stepKey: "kpi_computation_plan",
    version: 1,
    outputSchemaKey: "kpi_questions",
    templateText: `You are a founder-friendly KPI input wizard.
${ARTIFACT_INSTRUCTION}
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "questions_simple": ["..."], "mapping_to_kpi_keys": ["..."], "default_estimates_if_unknown": ["..."] }`,
  },
  {
    key: "P4",
    workflowKey: "WF_BASELINE",
    stepKey: "kpi_gap_scan",
    version: 1,
    outputSchemaKey: "kpi_gap_report",
    templateText: `You are a KPI gap analyst.
${ARTIFACT_INSTRUCTION}
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "kpi_table": [...], "top_gaps": [...], "data_quality_alerts": ["..."] }`,
  },
  {
    key: "P4b",
    workflowKey: "WF_BASELINE",
    stepKey: "industry_research",
    version: 1,
    outputSchemaKey: "industry_research",
    templateText: `You are a business data researcher.
${ARTIFACT_INSTRUCTION}
Use company_profile from CONTEXT_JSON (industry, offer, location, customers, market_reach) – use its actual data. Adapt all research to company_profile.industry – the business type determines market size, trends, competitors, regulations.
Use your knowledge to produce structured facts: market size estimates, trends, competitors, regulations, typical metrics, and key facts. This data will feed into later market research and decision prompts.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "industry": "...", "location": "...", "market_size_estimate": "...", "key_trends": ["..."], "competitors": ["..."], "regulations": ["..."], "typical_metrics": {...}, "key_facts": [ { "fact": "...", "source_ref": 1 } ], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P5",
    workflowKey: "WF_DIAGNOSTIC",
    stepKey: "root_cause_trees",
    version: 1,
    outputSchemaKey: "root_cause_trees",
    templateText: `You are a diagnostic analyst. Build root cause trees for the top KPI gaps. Adapt to company_profile.industry – root causes differ by sector.
${ARTIFACT_INSTRUCTION}
Use baseline from CONTEXT_JSON (kpi_table, top_gaps, data_quality_alerts). Also use kpi_set, kpi_snapshot, industry_research from CONTEXT_JSON – these contain actual workflow outputs.
Kontext Wachstumsphase: Prozesse standardisieren vor Skalierung.
MANDATORY: include "risk_explanation" with the most critical root risk and concrete KPI/business impact.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "root_cause_trees": [...], "risk_explanation": "..." }`,
  },
  {
    key: "P4c",
    workflowKey: "WF_KPI_ESTIMATION",
    stepKey: "kpi_estimation",
    version: 1,
    outputSchemaKey: "kpi_estimation",
    templateText: `You are a KPI prognosis expert. Adapt forecasts to company_profile.industry – benchmarks and typical values differ by sector.
${ARTIFACT_INSTRUCTION}
Use company_profile, industry_research, market_snapshot, market_research, baseline, business_plan, financial_planning, kpi_snapshot, kpi_set, kpis_to_estimate, kpi_library_summary from CONTEXT_JSON – use their actual data.

MANDATORY – Vollständige Prognosen: Provide exactly ONE kpi_estimates entry for EVERY kpi_key in kpis_to_estimate. Do not skip any – forecast for all.
- kpis_to_estimate is the list of KPI keys relevant for this business (from kpi_set or auto-selected by business model).
- Each KPI must have: kpi_key (exact key from kpis_to_estimate), value_month_1 (Monat 1), value_month_12 (Monat 12), unit, confidence (0–1), rationale.
- value_month_1 = Prognose für den ersten Monat des Jahres (Startphase).
- value_month_12 = Prognose für den letzten Monat des Jahres (nach 12 Monaten Entwicklung – Wachstum, Skalierung).
- Die Entwicklung soll realistisch sein: typische Wachstumskurven, Saisonalität, Branchenbenchmarks.

ESTIMATION – Branchenübliche Schätzungen: Use industry-standard estimates (branchenübliche Schätzungen) for the sector. Base values on: industry benchmarks, typical_metrics, market data, comparable businesses in company_profile.industry. If no company-specific data exists, use sector-typical values (Durchschnittswerte der Branche). Be explicit in rationale which industry benchmark or typical value was used.
Estimate based on: industry benchmarks, typical_metrics, market data, business plan scenarios, financial_planning (monthly_projection: revenue, costs, potential_customers, net; break_even_analysis; capital_requirements), existing kpi_snapshot.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema (use kpi_estimates as top-level array, NOT kpi_estimation as object):
{ "kpi_estimates": [ { "kpi_key": "...", "value_month_1": 0, "value_month_12": 0, "unit": "currency|percent|count|months|days|ratio|hours|...", "confidence": 0.5, "rationale": "..." } ], "sources_used": ["..."] }`,
  },
  {
    key: "P6",
    workflowKey: "WF_MARKET",
    stepKey: "market_snapshot",
    version: 1,
    outputSchemaKey: "market_snapshot",
    templateText: `You are a market researcher.
${ARTIFACT_INSTRUCTION}
Use company_profile and industry_research from CONTEXT_JSON – use their actual data. Adapt segments, competitors, pricing to company_profile.industry – the business type is in the profile.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "segments": [...], "competitors": [...], "pricing_index": [...], "demand_drivers": ["..."], "risks": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P8",
    workflowKey: "WF_RESEARCH",
    stepKey: "market_research",
    version: 1,
    outputSchemaKey: "market_research",
    templateText: `You are a market research analyst. Adapt to company_profile.industry from CONTEXT_JSON – the business type determines Kaufverhalten, supply/demand, feasibility.
${ARTIFACT_INSTRUCTION}
Use the ready market_snapshot from CONTEXT_JSON (segments, competitors, pricing_index, demand_drivers, risks) – use this data directly as foundation, do not reinvent.
Also use industry_research (industry, location, key_trends, competitors, regulations, key_facts, typical_metrics) from CONTEXT_JSON – use actual values.
Include: (1) Kaufverhalten (buying behavior) of the Zielgruppe (target group) per segment. (2) Angebot und Nachfrage (supply and demand) - assess market balance. (3) feasibility_assessment: ALWAYS include with is_makeable (true/false), recommendation ("recommended"|"conditional"|"not_recommended"), and rationale - especially for pre-revenue or idea-stage businesses. (4) Business research data like Northdata: company data, benchmarks, financials of comparable businesses in the sector.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "segments": [...], "competitors": [...], "pricing_index": [...], "demand_drivers": ["..."], "risks": ["..."], "sources_used": ["Title (URL)", "..."], "buyer_behavior": [ { "segment_or_trait": "...", "behavior": "...", "triggers": ["..."], "sources": ["..."] } ], "supply_demand": { "supply_overview": "...", "demand_overview": "...", "balance_assessment": "...", "sources": ["..."] }, "feasibility_assessment": { "is_makeable": true|false, "recommendation": "recommended"|"conditional"|"not_recommended", "rationale": "...", "key_blockers": ["..."], "preconditions": ["..."] }, "business_research_data": [ { "source_type": "...", "description": "...", "key_findings": ["..."], "relevance": "..." } ] }`,
  },
  {
    key: "P9",
    workflowKey: "WF_RESEARCH",
    stepKey: "best_practices",
    version: 1,
    outputSchemaKey: "best_practices",
    templateText: `You are an industry best-practices expert.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research from CONTEXT_JSON – use their actual data. Adapt practices to company_profile.industry and stage – the business type is in the profile.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "practices": [ { "name": "...", "description": "...", "rationale": "...", "sources": ["..."] } ], "industry_specific": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P10",
    workflowKey: "WF_RESEARCH",
    stepKey: "failure_reasons",
    version: 1,
    outputSchemaKey: "failure_reasons",
    templateText: `You are a business failure analyst.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research from CONTEXT_JSON – use their actual data. Adapt to company_profile.industry – list why businesses in this sector and stage fail, and how to mitigate.
MANDATORY: include "risk_explanation" as a concise explicit risk statement (what exactly is the risk, why now, and likely impact).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "failure_reasons": [ { "reason": "...", "frequency": "...", "mitigation": "...", "sources": ["..."] } ], "industry_risks": ["..."], "risk_explanation": "...", "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P3b",
    workflowKey: "WF_DATA_COLLECTION_PLAN",
    stepKey: "kpi_computation_plan",
    version: 1,
    outputSchemaKey: "kpi_questions",
    templateText: `You are a data collection planner. Adapt questions to company_profile.industry – relevant data differs by business type (Gastronomie: Tischumsatz; Retail: Footfall; B2B: Pipeline).
${ARTIFACT_INSTRUCTION}
Given missing KPIs and context, produce a plan for what data to collect. Use company_profile, kpi_set, kpi_snapshot from CONTEXT_JSON when available. Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "questions_simple": ["..."], "mapping_to_kpi_keys": ["..."], "default_estimates_if_unknown": ["..."] }`,
  },
  {
    key: "P11a",
    workflowKey: "WF_BUSINESS_PLAN",
    stepKey: "business_plan_executive",
    version: 1,
    outputSchemaKey: "business_plan_section",
    templateText: `You are a business plan writer. Write the Executive Summary for a BANK-READY business plan (wie bei der Bank einreichbar). Adapt to company_profile.industry.
${ARTIFACT_INSTRUCTION}
Use company_profile, industry_research, financial_planning (if available), artifacts_summary from CONTEXT_JSON – when financial_planning is present, use its actual figures (Kapitalbedarf, monthly_projection, break_even).
MUST include in content: (1) Mission, value proposition, target market, key differentiators. (2) Key figures: Kapitalbedarf, Break-Even, erwarteter Umsatz (Jahr 1) – use financial_planning data when available. (3) Strategic vision. Write 3-5 paragraphs suitable for a bank submission.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "content": "...", "key_points": ["..."] }`,
  },
  {
    key: "P11b",
    workflowKey: "WF_BUSINESS_PLAN",
    stepKey: "business_plan_market",
    version: 1,
    outputSchemaKey: "business_plan_section",
    templateText: `You are a market analyst. Write the Market Analysis section. Adapt to company_profile.industry – segments and competitors differ by business type.
${ARTIFACT_INSTRUCTION}
Use market_snapshot from CONTEXT_JSON when available (segments, competitors, pricing_index, demand_drivers, risks) – use its actual data, synthesize into narrative.
Also use industry_research, company_profile from CONTEXT_JSON. Cover: market size, segments, competitors, demand drivers, trends, positioning.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "content": "...", "key_points": ["..."] }`,
  },
  {
    key: "P11c-m",
    workflowKey: "WF_BUSINESS_PLAN",
    stepKey: "business_plan_marketing",
    version: 1,
    outputSchemaKey: "business_plan_section",
    templateText: `You are a marketing strategist. Write the Marketing Plan section. Adapt to company_profile.industry – channels and messaging differ (Gastronomie: Social/Location; B2B: LinkedIn; Retail: Omnichannel).
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research, best_practices from CONTEXT_JSON – use their actual data. Cover: target segments, positioning, channels, messaging, launch plan, key metrics. Achtung: Marketingbudget nicht unterschätzen.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "content": "...", "key_points": ["..."] }`,
  },
  {
    key: "P11c",
    workflowKey: "WF_BUSINESS_PLAN",
    stepKey: "business_plan_financial",
    version: 1,
    outputSchemaKey: "business_plan",
    templateText: `You are a business plan and finance analyst. Create BANK-READY Financial Scenarios (wie bei der Bank einreichbar). Adapt to company_profile.industry – cost structure differs (Gastronomie: Warenkosten; Retail: Einkauf; Services: Personalkosten).
${ARTIFACT_INSTRUCTION}
Use CONTEXT_JSON: supplier_list, menu_cost, real_estate, industry_research, financial_planning (if available) – use their ACTUAL data. Miete from real_estate.price_range; Warenkosten from menu_cost; Lieferanten from supplier_list.
MANDATORY – monthly_projection: Wenn financial_planning in context → KOPIERE dessen monthly_projection EXAKT 1:1, ändere NICHTS. Wenn NICHT vorhanden → erstelle wie Finanzplanung: Miete NIEMALS willkürlich. Miete aus real_estate (price_range parsen) ODER typisch für company_profile.location + industry.
MANDATORY outputs:
(1) worst_case, best_case, realistic_case – revenue scenarios with assumptions, risks, enablers.
(2) capital_requirements_summary: Kapitalbedarf, Liquiditätsreserve, Finanzierungsquellen – string, 2-4 sentences.
(3) management_team: { content, key_points } – Management, Team, Verantwortlichkeiten – wer führt das Unternehmen.
(4) legal_structure: { content, key_points } – Rechtsform (GmbH, UG, Einzelunternehmen etc.), Haftung, Steueraspekte.
(5) monthly_projection: Wenn financial_planning vorhanden → KOPIERE monthly_projection EXAKT (keine Änderung). Sonst: gleiche Logik wie Finanzplanung – Miete aus real_estate (price_range parsen) ODER typisch für Standort+Branche. NIEMALS willkürliche Werte erfinden.
(6) business_research_data: Northdata-like sources.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "worst_case": { "revenue_min": number, "revenue_description": "...", "assumptions": ["..."], "risks": ["..."] }, "best_case": { "revenue_max": number, "revenue_description": "...", "assumptions": ["..."], "enablers": ["..."] }, "realistic_case": { "revenue_expected": number, "revenue_description": "...", "assumptions": ["..."], "confidence": 0.0-1.0 }, "capital_requirements_summary": "...", "management_team": { "content": "...", "key_points": ["..."] }, "legal_structure": { "content": "...", "key_points": ["..."] }, "monthly_projection": [ { "month": "YYYY-MM", "potential_customers": 0, "revenue": 0, "cost_items": [ { "category": "Miete", "amount": 0, "cost_type": "fixed" }, { "category": "Strom", "amount": 0, "cost_type": "fixed" }, { "category": "Wareneinsatz", "amount": 0, "cost_type": "variable" }, { "category": "Personal", "amount": 0, "cost_type": "fixed" } ], "total_costs": 0, "taxes": 0, "net_profit": 0, "competitor_impact_note": "..." } ], "business_research_data": [ { "source_type": "...", "description": "...", "key_findings": ["..."], "relevance": "..." } ], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P11d",
    workflowKey: "WF_BUSINESS_PLAN",
    stepKey: "business_plan_risk",
    version: 1,
    outputSchemaKey: "business_plan_section",
    templateText: `You are a risk analyst. Write the Risk Analysis section. Adapt to company_profile.industry – risks differ by sector (Gastronomie: Saisonality; Retail: Lager; IT: Technologie).
${ARTIFACT_INSTRUCTION}
Use failure_analysis from CONTEXT_JSON when available (failure_reasons, industry_risks) – use its actual data, synthesize into the risk narrative.
Also use industry_research, company_profile from CONTEXT_JSON. Cover: key risks, mitigations, dependencies, contingency plans, why businesses in this sector fail.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "content": "...", "key_points": ["..."] }`,
  },
  {
    key: "P11b",
    workflowKey: "WF_MENU_CARD",
    stepKey: "menu_card",
    version: 1,
    outputSchemaKey: "menu_card",
    templateText: `You are an offer/catalog designer for ANY business type. Create a structured offer based on company_profile (industry, products, services, target customers) and market_snapshot from CONTEXT_JSON.
${ARTIFACT_INSTRUCTION}
CRITICAL: Adapt to company_profile.industry – the business type is in the profile. Use market_snapshot (segments, competitors, pricing_index) when present. Examples:
- Gastronomie/Food: items = Gerichte, components = Zutaten. Categories: Vorspeise, Hauptgericht, Dessert, Getränk, Cocktail. Min. 65 items for full restaurant menu.
- Fashion: items = Kleidungsstücke, components = Materialien (Stoff, Futter, Reißverschluss)
- IT/Services: items = Leistungen, components = Komponenten/Deliverables
- Retail: items = Produkte, components = Komponenten/Materialien
- Other: items = Angebote, components = Bestandteile für Einkauf

Requirements:
- menu_full: Full catalog with ALL items – each item exactly ONCE. Each item MUST have components array.
- category: Use categories appropriate for company_profile.industry (e.g. Gastronomie: Vorspeise/Hauptgericht/Dessert/Getränk/Cocktail; Retail: product groups).
- menu_intro: Optional – 3–6 highlights. If provided, use SAME items as first 3–6 in menu_full.
- components: name, optional quantity/unit.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "menu_intro": { "items": [ { "name": "...", "description": "...", "price": "..." } ] }, "menu_full": { "items": [ { "name": "...", "category": "...", "description": "...", "components": [ { "name": "...", "quantity": "...", "unit": "..." } ], "price": "..." } ] }, "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P12",
    workflowKey: "WF_SUPPLIER_LIST",
    stepKey: "supplier_list",
    version: 1,
    outputSchemaKey: "supplier_list",
    templateText: `You are a supplier research analyst. Based on menu_card (items with components) and company_profile from CONTEXT_JSON, research suppliers for EACH component/material individually.
${ARTIFACT_INSTRUCTION}
CRITICAL: Use menu_card from CONTEXT_JSON – it contains actual items and components from the prior workflow. List EVERY component from menu_card.menu_full.items[].components as a separate supplier entry. Adapt to company_profile.industry. If no menu_card, use company_profile products/materials.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "suppliers": [ { "material": "...", "supplier": "...", "price_per_unit": number, "unit": "...", "notes": "...", "sources": ["..."] } ], "whitelabel_options": [...], "ingredients_options": [...], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P12b",
    workflowKey: "WF_MENU_COST",
    stepKey: "menu_cost",
    version: 1,
    outputSchemaKey: "menu_cost",
    templateText: `You are a cost analyst for ANY business type. Calculate Warenkosten (cost of goods) per offer item. Adapt to company_profile.industry from CONTEXT_JSON.
${ARTIFACT_INSTRUCTION}
CRITICAL: Use menu_card and supplier_list from CONTEXT_JSON – use their actual data. Do not invent items or prices.
- menu_card.menu_full.items: each item has name, category, components (name, quantity, unit), price (Verkaufspreis).
- supplier_list.suppliers: each has material, price_per_unit, unit – match components to these.

For each offer item:
1. Match each component to a supplier entry (material name – fuzzy match OK).
2. Parse quantity: "200g" → 0.2 if unit is kg, "100g" → 0.1 if unit is kg, "1" → 1 for Stück.
3. cost = quantity × price_per_unit (convert units if needed).
4. total_cost = sum of component costs.
5. Parse selling_price from item.price if available (e.g. "12,50 €" → 12.50).
6. margin_percent = ((selling_price - total_cost) / selling_price) × 100 if selling_price exists.

Output summary: total_warenkosten (sum of all total_cost), total_items, avg_cost_per_item. Add recommendations if margins are low or items lack pricing.

Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "items": [ { "item_name": "...", "category": "...", "components": [ { "component_name": "...", "quantity": number|string, "unit": "...", "price_per_unit": number, "cost": number } ], "total_cost": number, "selling_price": number, "margin_percent": number, "margin_note": "..." } ], "summary": { "total_warenkosten": number, "total_items": number, "avg_cost_per_item": number, "recommendations": ["..."] }, "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P12c",
    workflowKey: "WF_MENU_PRICING",
    stepKey: "menu_card",
    version: 1,
    outputSchemaKey: "menu_card",
    templateText: `You are an offer/catalog designer for ANY business type. Create a structured offer based on company_profile (industry, products, services, target customers) and market_snapshot from CONTEXT_JSON.
${ARTIFACT_INSTRUCTION}
CRITICAL: Adapt to company_profile.industry. Use market_snapshot when present. Examples:
- Gastronomie/Food: items = Gerichte, components = Zutaten. Categories: Vorspeise, Hauptgericht, Dessert, Getränk, Cocktail. Min. 65 items for full restaurant menu.
- Fashion: items = Kleidungsstücke, components = Materialien (Stoff, Futter, Reißverschluss)
- IT/Services: items = Leistungen, components = Komponenten/Deliverables
- Retail: items = Produkte, components = Komponenten/Materialien
- Other: items = Angebote, components = Bestandteile für Einkauf

Requirements:
- menu_full: Full catalog with ALL items – each item exactly ONCE. Each item MUST have components array.
- category: Use categories appropriate for company_profile.industry (e.g. Gastronomie: Vorspeise/Hauptgericht/Dessert/Getränk/Cocktail; Retail: product groups).
- menu_intro: Optional – 3–6 highlights. If provided, use SAME items as first 3–6 in menu_full.
- components: name, optional quantity/unit.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "menu_intro": { "items": [ { "name": "...", "description": "...", "price": "..." } ] }, "menu_full": { "items": [ { "name": "...", "category": "...", "description": "...", "components": [ { "name": "...", "quantity": "...", "unit": "..." } ], "price": "..." } ] }, "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P12d",
    workflowKey: "WF_MENU_PRICING",
    stepKey: "supplier_list",
    version: 1,
    outputSchemaKey: "supplier_list",
    templateText: `You are a supplier research analyst. Based on menu_card (items with components) and company_profile from CONTEXT_JSON, research suppliers for EACH component/material individually.
${ARTIFACT_INSTRUCTION}
CRITICAL: Use menu_card from CONTEXT_JSON – it contains actual items and components. List EVERY component from menu_card.menu_full.items[].components as a separate supplier entry. Adapt to company_profile.industry. If no menu_card, use company_profile products/materials.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "suppliers": [ { "material": "...", "supplier": "...", "price_per_unit": number, "unit": "...", "notes": "...", "sources": ["..."] } ], "whitelabel_options": [...], "ingredients_options": [...], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P12e",
    workflowKey: "WF_MENU_PRICING",
    stepKey: "menu_cost",
    version: 1,
    outputSchemaKey: "menu_cost",
    templateText: `You are a cost analyst for ANY business type. Calculate Warenkosten (cost of goods) per offer item. Adapt to company_profile.industry from CONTEXT_JSON.
${ARTIFACT_INSTRUCTION}
CRITICAL: Use menu_card and supplier_list from CONTEXT_JSON – use their actual data. Do not invent items or prices.
- menu_card.menu_full.items: each item has name, category, components (name, quantity, unit), price (Verkaufspreis).
- supplier_list.suppliers: each has material, price_per_unit, unit – match components to these.

For each offer item:
1. Match each component to a supplier entry (material name – fuzzy match OK).
2. Parse quantity: "200g" → 0.2 if unit is kg, "100g" → 0.1 if unit is kg, "1" → 1 for Stück.
3. cost = quantity × price_per_unit (convert units if needed).
4. total_cost = sum of component costs.
5. Parse selling_price from item.price if available (e.g. "12,50 €" → 12.50).
6. margin_percent = ((selling_price - total_cost) / selling_price) × 100 if selling_price exists.

Output summary: total_warenkosten (sum of all total_cost), total_items, avg_cost_per_item. Add recommendations if margins are low or items lack pricing.

Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "items": [ { "item_name": "...", "category": "...", "components": [ { "component_name": "...", "quantity": number|string, "unit": "...", "price_per_unit": number, "cost": number } ], "total_cost": number, "selling_price": number, "margin_percent": number, "margin_note": "..." } ], "summary": { "total_warenkosten": number, "total_items": number, "avg_cost_per_item": number, "recommendations": ["..."] }, "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P12f",
    workflowKey: "WF_MENU_PRICING",
    stepKey: "menu_preiskalkulation",
    version: 1,
    outputSchemaKey: "menu_preiskalkulation",
    templateText: `You are a pricing expert for ANY business type. Based on menu_cost (Warenkosten pro Position) from CONTEXT_JSON, calculate recommended selling prices (Verkaufspreise). Adapt target_margin_percent to company_profile.industry.
${ARTIFACT_INSTRUCTION}
CRITICAL: Use menu_cost from CONTEXT_JSON – it contains actual Warenkosten per item from the prior workflow. Each item has item_name, total_cost, optionally selling_price and margin_percent. Do not invent costs.

For each item:
1. recommended_price = cost × (1 + target_margin_percent/100). Adapt target_margin_percent to company_profile.industry: Gastronomie 65–75%, Retail 40–60%, Services 50–80%, etc.
2. Round to psychologically appealing prices (e.g. 12.90, 14.50, 19.00).
3. target_margin_percent: Zielmarge in % (Deklaration: (Verkaufspreis - EK) / Verkaufspreis × 100).
4. price_notes: optional – e.g. "Premium-Position", "Lockvogel", "Standardmarge".

Output summary: pricing_strategy (kurze Beschreibung der Strategie), avg_margin_percent, recommendations (z.B. Preisanpassungen, Lockvogel-/Ankerpreise je nach Branche).

Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "items": [ { "item_name": "...", "category": "...", "cost": number, "recommended_price": number, "target_margin_percent": number, "price_notes": "..." } ], "summary": { "pricing_strategy": "...", "avg_margin_percent": number, "recommendations": ["..."] }, "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P13",
    workflowKey: "WF_REAL_ESTATE",
    stepKey: "real_estate",
    version: 1,
    outputSchemaKey: "real_estate",
    templateText: `You are a real estate analyst.
${ARTIFACT_INSTRUCTION}
Use company_profile (location, industry, offer, stage), market_snapshot, industry_research from CONTEXT_JSON – use their actual data. Adapt options to company_profile.industry – e.g. Gastronomie needs Küche/Gastraum, Retail needs Verkaufsfläche, IT needs Büro.
Requirements:
- Output exactly 3 options. Include at least one freistehendes Gewerbe (freestanding commercial property) with url (link to listing) and usage_permit (Nutzungserlaubnis: Gewerbe, Büro, Handel, etc.).
- Each option: type, location, description, price_range (Miete, Nebenkosten: Strom, Wasser), suitability, url (plain URL only, e.g. https://example.com – no markdown, no brackets), usage_permit.
- IMPORTANT: Include average_market_prices – Durchschnittspreise vergleichbarer Objekte in der Region (z.B. Büro 10–14 €/m², Gewerbe 8–12 €/m²). This gives a reference to assess whether options are fair, too expensive, or worth launching.
- If a good option is found: set best_option_index (0, 1 or 2) and best_option_details with: renovations (Sanierungen), usage_change_application (Nutzungsänderungsantrag), other_applications (weitere notwendige Anträge).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "options": [ { "type": "...", "location": "...", "description": "...", "price_range": "...", "suitability": "...", "url": "...", "usage_permit": "...", "sources": ["..."] } ], "average_market_prices": [ { "property_type": "Büro", "avg_price": "10–14 €/m² kalt", "region": "...", "notes": "..." } ], "best_option_index": 0, "best_option_details": { "renovations": "...", "usage_change_application": "...", "other_applications": ["..."] }, "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P14",
    workflowKey: "WF_STARTUP_CONSULTING",
    stepKey: "startup_consulting",
    version: 1,
    outputSchemaKey: "startup_consulting",
    templateText: `You are a startup consulting expert.
${ARTIFACT_INSTRUCTION}
Use company_profile (stage, industry, funding_status, legal_structure), startup_insights, industry_research from CONTEXT_JSON – use their actual data when available. Adapt recommendations to company_profile.industry – different industries have different funding and Rechtsform needs.
Planungselement: Rechtsform für Gründung.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "funding_recommendations": [ { "model": "...", "rationale": "...", "fit_score": 0.0-1.0 } ], "incorporation_recommendations": [ { "option": "...", "jurisdiction": "...", "rationale": "..." } ], "key_considerations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P14B",
    workflowKey: "WF_LEGAL_FOUNDATION",
    stepKey: "startup_consulting",
    version: 1,
    outputSchemaKey: "startup_consulting",
    templateText: `You are a legal and startup foundation advisor for Germany/EU.
${ARTIFACT_INSTRUCTION}
Use company_profile, industry_research and market_research from CONTEXT_JSON – use actual context.
Goal: Explain legal prerequisites to found and open this business, plus suitable legal forms (Unternehmensform) and required registrations/permits.
Include practical checklist points and common legal pitfalls for this business type.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "funding_recommendations": [ { "model": "...", "rationale": "...", "fit_score": 0.0-1.0 } ], "incorporation_recommendations": [ { "option": "...", "jurisdiction": "...", "rationale": "..." } ], "key_considerations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P15",
    workflowKey: "WF_CUSTOMER_VALIDATION",
    stepKey: "customer_validation",
    version: 1,
    outputSchemaKey: "customer_validation",
    templateText: `You are a validation expert. Help prove that customers would actually buy (Proof of Concept). Adapt to company_profile.industry – validation methods differ (Gastronomie: Testessen; Retail: Pop-up; B2B: Pilotprojekte).
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, market_research (feasibility, buyer_behavior) from CONTEXT_JSON – use their actual data.

Instrumente: MVP, Kundeninterviews, Landingpage-Tests, Pilotkunden, Prototypen.
Kennzahlen: Conversion Rate, Customer Feedback, Zahlungsbereitschaft, Early Adopters.
Worauf achten: Schnelle Tests statt Perfektion, Hypothesen testen, Kundenfeedback priorisieren.
Typische Fehler vermeiden: Zu viel Entwicklung vor Markttest, Freunde statt echte Zielkunden fragen.

IMPORTANT: Keep hypotheses_tested to 3–5 items max. Use short strings. Output MUST be complete, valid JSON. Do not truncate.
MANDATORY: include "risk_explanation" with the most critical risk and concrete consequence for this business.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "mvp_scope": "...", "hypotheses_tested": [ { "hypothesis": "...", "test_method": "...", "result": "...", "confidence": 0.0-1.0 } ], "customer_interviews_summary": "...", "landing_page_insights": "...", "pilot_customer_feedback": ["..."], "willingness_to_pay": "...", "key_metrics": { "conversion_rate": "...", "customer_feedback_summary": "...", "early_adopters_count": "..." }, "recommendation": "proceed"|"pivot"|"stop", "next_steps": ["..."], "risk_explanation": "...", "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P15A",
    workflowKey: "WF_IDEA_USP_VALIDATION",
    stepKey: "value_proposition",
    version: 1,
    outputSchemaKey: "value_proposition",
    templateText: `You are an expert for idea and USP validation before customer validation.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot and industry_research from CONTEXT_JSON.
Focus on: core problem, target customer pain, existing alternatives, USP clarity, and differentiation strength.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema (all fields required):
{ "problem_statement": "...", "target_customers": ["..."], "existing_solutions": ["..."], "unique_value_proposition": "...", "problem_solution_fit_score": 0.75, "key_differentiators": ["..."], "recommendations": ["..."] }`,
  },
  {
    key: "P15B",
    workflowKey: "WF_FEASIBILITY_VALIDATION",
    stepKey: "scenario_analysis",
    version: 1,
    outputSchemaKey: "scenario_analysis",
    templateText: `You are a feasibility validation analyst.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_research, industry_research and financial context from CONTEXT_JSON.
Assess operational, financial, market and execution feasibility for launching this business.
Provide concrete scenarios and risks for go/no-go in early stage.
MANDATORY: include "risk_explanation" as explicit top risk with trigger and expected downside impact.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "scenarios": [ { "name": "...", "description": "...", "probability": "...", "impact": "...", "key_drivers": ["..."] } ], "sensitivity_analysis": [ { "variable": "...", "impact_description": "..." } ], "risk_matrix": [ { "risk": "...", "likelihood": "...", "impact": "...", "mitigation": "..." } ], "recommendations": ["..."], "risk_explanation": "...", "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P15C",
    workflowKey: "WF_PATENT_CHECK",
    stepKey: "strategic_options",
    version: 1,
    outputSchemaKey: "strategic_options",
    templateText: `You are an IP and patent strategy analyst.
${ARTIFACT_INSTRUCTION}
Use company_profile, industry_research and market_research from CONTEXT_JSON.
Task: assess whether the idea (or parts of it) could be patentable, what may already be (partly) patented, and whether patenting is recommended.
MANDATORY: include source-backed reasoning and practical next steps (e.g., prior-art search, attorney consult, filing strategy).
MANDATORY: include "risk_explanation" with explicit legal/IP risk and business impact if ignored.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "strategic_options": [ { "option": "...", "type": "new_business_model|new_market|ma_acquisition|ma_sale|ipo|succession|transformation", "description": "...", "fit_score": 0.0-1.0, "key_considerations": ["..."] } ], "exit_readiness": { "readiness_score": 0.0-1.0, "gaps": ["..."], "recommendations": ["..."] }, "recommendations": ["..."], "risk_explanation": "...", "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P16",
    workflowKey: "WF_PROCESS_OPTIMIZATION",
    stepKey: "process_optimization",
    version: 1,
    outputSchemaKey: "process_optimization",
    templateText: `You are a process optimization expert. Analyze processes and costs for a mature business. Adapt to company_profile.industry – processes differ (Gastronomie: Küche/Service; Retail: Lager/Verkauf; IT: Entwicklung/Support).
${ARTIFACT_INSTRUCTION}
Use company_profile, kpi_snapshot, industry_research, baseline (top_gaps) from CONTEXT_JSON – use their actual data.
Fokus: Prozessoptimierung, Kostenmanagement, Markenstrategie, Internationalisierung.
Kennzahlen: EBITDA, Gewinnmarge, Marktanteil, Kundenbindung.
Typische Fehler vermeiden: Innovation stoppen, zu starke Bürokratie, neue Wettbewerber unterschätzen.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "process_analysis": [ { "process_name": "...", "current_state": "...", "bottlenecks": ["..."], "optimization_potential": "...", "priority": "..." } ], "cost_analysis": { "key_cost_drivers": ["..."], "savings_potential": "...", "recommendations": ["..."] }, "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P17",
    workflowKey: "WF_STRATEGIC_OPTIONS",
    stepKey: "strategic_options",
    version: 1,
    outputSchemaKey: "strategic_options",
    templateText: `You are a strategic advisor for corporate development. Assess options for renewal, exit, or transformation. Adapt to company_profile.industry – exit readiness and options differ by sector.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_research, industry_research, business_plan from CONTEXT_JSON – use their actual data.
Optionen: neue Geschäftsmodelle, neue Märkte, M&A (kaufen/verkaufen), Börsengang, Nachfolgeplanung.
Planungsschwerpunkte: Innovationsstrategie, Portfolioanpassung, Unternehmenswert steigern.
Kennzahlen: Unternehmensbewertung, Wachstumspotenzial, strategischer Fit.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "strategic_options": [ { "option": "...", "type": "new_business_model|new_market|ma_acquisition|ma_sale|ipo|succession|transformation", "description": "...", "fit_score": 0.0-1.0, "key_considerations": ["..."] } ], "exit_readiness": { "readiness_score": 0.0-1.0, "gaps": ["..."], "recommendations": ["..."] }, "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P19",
    workflowKey: "WF_VALUE_PROPOSITION",
    stepKey: "value_proposition",
    version: 1,
    outputSchemaKey: "value_proposition",
    templateText: `You are an expert in Problem-Solution-Fit and Value Proposition Design. Adapt to company_profile.industry – problem/solution fit differs by business type.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research from CONTEXT_JSON – use their actual data.
Focus on: Welches Problem wird gelöst? Wer hat dieses Problem? Gibt es bereits Lösungen? Was ist der USP?
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema (all fields required; problem_solution_fit_score between 0 and 1):
{ "problem_statement": "...", "target_customers": ["..."], "existing_solutions": ["..."], "unique_value_proposition": "...", "problem_solution_fit_score": 0.75, "key_differentiators": ["..."], "recommendations": ["..."] }`,
  },
  {
    key: "P20",
    workflowKey: "WF_GO_TO_MARKET",
    stepKey: "go_to_market",
    version: 1,
    outputSchemaKey: "go_to_market",
    templateText: `You are a Go-to-Market and pricing strategist. Adapt to company_profile.industry – pricing and channels differ (Gastronomie: Tischservice/To-go; B2B: Enterprise/SMB; Retail: RRP/Rabatte).
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, market_research, business_plan from CONTEXT_JSON – use their actual data.
Planungselemente: Pricing Strategie, Go-to-Market Strategie, Marketingstrategie, Vertriebskanäle.
Kritische Punkte: Cashflow Management, Kundengewinnungskosten, Vertriebssystem.
Typische Fehler vermeiden: Marketingbudget unterschätzen, falsche Preisstrategie.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "pricing_strategy": { "model": "...", "price_points": [...], "rationale": "..." }, "sales_channels": [ { "channel": "...", "priority": "...", "implementation": "..." } ], "go_to_market_plan": ["..."], "marketing_budget_recommendations": ["..."], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P21",
    workflowKey: "WF_SCALING_STRATEGY",
    stepKey: "scaling_strategy",
    version: 1,
    outputSchemaKey: "scaling_strategy",
    templateText: `You are a scaling expert. Create scaling strategy for growth phase. Adapt to company_profile.industry – scaling differs (Gastronomie: Filialen/Franchise; Retail: Standorte; IT: SaaS/Team).
${ARTIFACT_INSTRUCTION}
Use company_profile, kpi_snapshot, market_research, baseline from CONTEXT_JSON – use their actual data.
Planungsschwerpunkte: Skalierung des Geschäftsmodells, Automatisierung von Prozessen, Marketing-Skalierung, Vertriebssysteme.
Wichtige KPIs: CAC, LTV, Conversion Rate, Churn Rate, Umsatzwachstum.
Strategische Fragen: Wie skalierbar ist das Modell? Welche Prozesse müssen automatisiert werden? Welche Märkte können erschlossen werden?
Typische Fehler vermeiden: zu frühes Hiring, Skalieren ohne funktionierenden Vertrieb, Prozesse nicht standardisiert.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "scalability_assessment": "...", "automation_priorities": [ { "area": "...", "potential": "...", "priority": "..." } ], "marketing_scaling_plan": ["..."], "sales_system_recommendations": ["..."], "key_metrics": [ { "metric": "...", "target": "...", "current": "..." } ], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P21b",
    workflowKey: "WF_MARKETING_STRATEGY",
    stepKey: "marketing_strategy",
    version: 1,
    outputSchemaKey: "marketing_strategy",
    templateText: `You are a marketing strategy expert. Create an ACTIONABLE 30-day marketing plan. Output must be konkret, messbar, sofort umsetzbar.
${ARTIFACT_INSTRUCTION}
Use company_profile, kpi_snapshot, market_research, baseline, decision_pack from CONTEXT_JSON – use their actual data (Firmenname, Standort, Branche, Lieferando/Lieferdienste, etc.).
MANDATORY structure – produce ALL of these:
(1) constraints: "Priorisiert nach: Budget = 0€ (oder niedrig), Aufwand < 10h/Woche, messbar innerhalb 30 Tage"
(2) marketing_initiatives: 5–7 konkrete Maßnahmen. Jede mit: name, goal (quantifiziert: Views, Follower, Bestellungen, Umsatz), actions/content (genaue Schritte), hashtags oder keywords, cta (Call-to-Action mit Code), tracking (wie messen), expected_conversion (z.B. "1,5% der Views → 750€ Umsatz"), budget_eur (0 wenn kostenlos), effort_h_week, roi (wenn berechenbar).
(3) roadmap_30_days: [ { "week": "KW 1", "tasks": ["Google Business live", "5 Bewertungen sichern", "3 TikToks/Reels hochladen"] }, { "week": "KW 2", "tasks": [...] }, "KW 3", "KW 4" ]
(4) kpi_goals_30_days: [ { "target": "+150 neue Lieferando-Kunden", "metric": "Lieferando-Kunden" }, { "target": "+1000 Instagram/TikTok Follower (80% lokal)", "metric": "Follower" }, { "target": "Lieferando-Anteil < 35%", "metric": "Plattform-Mix" }, { "target": "Marketing-Ausgaben < 500€, ROI ≥ 2x", "metric": "ROI" } ]
(5) offline_visibility: Wenn Ghost-Kitchen/Lieferservice – Strategie für Offline-Sichtbarkeit (Sticker, Pop-up am Markt, etc.) mit Kosten und erwarteten Ergebnissen.
(6) concluding_offer: Optional – z.B. "Bei Bedarf stelle ich innerhalb 24h Vorlagen (Flyer, WhatsApp-Text, TikTok-Skripte) bereit."
Adapt to industry: Gastronomie → Lieferando, Google, TikTok/Reels, lokale Influencer; Retail → SEO, Paid; B2B → LinkedIn. Nutze company_profile.location für lokale Hashtags (#Rottweil, #SchwarzwaldFood, etc.).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "constraints": "...", "marketing_initiatives": [ { "name": "...", "goal": "...", "actions": "...", "hashtags": "...", "cta": "...", "tracking": "...", "expected_conversion": "...", "budget_eur": 0, "effort_h_week": "...", "roi": "..." } ], "roadmap_30_days": [ { "week": "KW 1", "tasks": ["...", "..."] }, { "week": "KW 2", "tasks": [...] }, { "week": "KW 3", "tasks": [...] }, { "week": "KW 4", "tasks": [...] } ], "kpi_goals_30_days": [ { "target": "...", "metric": "..." } ], "offline_visibility": "...", "concluding_offer": "...", "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P22",
    workflowKey: "WF_PORTFOLIO_MANAGEMENT",
    stepKey: "portfolio_management",
    version: 1,
    outputSchemaKey: "portfolio_management",
    templateText: `You are a portfolio and brand strategy expert. Adapt to company_profile.industry – portfolio can be products (Retail), services (IT), Gerichte (Gastronomie), or segments.
${ARTIFACT_INSTRUCTION}
Use company_profile, kpi_snapshot, industry_research from CONTEXT_JSON – use their actual data.
Fokus: Portfolio Management, Markenstrategie, Internationalisierung, strategische Partnerschaften.
Wichtige Maßnahmen: Produktportfolio optimieren, Marktsegmente erweitern, strategische Partnerschaften.
Kennzahlen: EBITDA, Gewinnmarge, Marktanteil, Kundenbindung.
Typische Fehler vermeiden: Innovation stoppen, neue Wettbewerber unterschätzen.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "portfolio_analysis": [ { "product_or_segment": "...", "performance": "...", "recommendation": "..." } ], "brand_strategy_recommendations": ["..."], "internationalization_options": ["..."], "strategic_partnerships": ["..."], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P23",
    workflowKey: "WF_SCENARIO_ANALYSIS",
    stepKey: "scenario_analysis",
    version: 1,
    outputSchemaKey: "scenario_analysis",
    templateText: `You are a risk and scenario planning expert. Create scenario analysis and risk matrix. Adapt to company_profile.industry – key risks and scenarios differ by sector.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_research, industry_research, baseline, business_plan from CONTEXT_JSON – use their actual data.
Planungsbereich: Risiko- und Szenarioplanung – Vorbereitung auf Unsicherheit.
Instrumente: Szenarioanalyse, Sensitivitätsanalyse, Risikomatrix.
MANDATORY: include "risk_explanation" with exact primary risk and what would happen if it materializes.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "scenarios": [ { "name": "...", "description": "...", "probability": "...", "impact": "...", "key_drivers": ["..."] } ], "sensitivity_analysis": [ { "variable": "...", "impact_description": "..." } ], "risk_matrix": [ { "risk": "...", "likelihood": "...", "impact": "...", "mitigation": "..." } ], "recommendations": ["..."], "risk_explanation": "...", "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P29",
    workflowKey: "WF_COMPETITOR_ANALYSIS",
    stepKey: "competitor_analysis",
    version: 1,
    outputSchemaKey: "competitor_analysis",
    templateText: `You are a competitive intelligence expert. Create a deep Wettbewerbsanalyse. Adapt to company_profile.industry – competitors and differentiation differ by sector.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research from CONTEXT_JSON – use their actual data.
Focus on: Stärken/Schwächen der Wettbewerber, Marktposition, Differenzierungsmöglichkeiten. Wichtige Fragen: Gibt es bereits Lösungen? Was ist der USP? Differenzierung vom Wettbewerb.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "competitors": [ { "name": "...", "strengths": ["..."], "weaknesses": ["..."], "market_position": "...", "differentiation": "..." } ], "competitive_landscape": "...", "differentiation_opportunities": ["..."], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P25",
    workflowKey: "WF_SWOT",
    stepKey: "swot_analysis",
    version: 1,
    outputSchemaKey: "swot_analysis",
    templateText: `You are a strategic analyst. Create a SWOT analysis. Adapt to company_profile.industry – strengths, weaknesses, opportunities, threats differ by business type.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research from CONTEXT_JSON – use their actual data.
Focus on: Strengths (Stärken), Weaknesses (Schwächen), Opportunities (Chancen), Threats (Bedrohungen).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "strengths": ["..."], "weaknesses": ["..."], "opportunities": ["..."], "threats": ["..."], "swot_matrix_summary": "...", "strategic_implications": ["..."], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P25b",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "work_processes",
    version: 1,
    outputSchemaKey: "work_processes",
    templateText: `You are an operations and process design expert. Map the full value chain from planning through procurement to the end customer.
${ARTIFACT_INSTRUCTION}
Use company_profile (industry, offer, products, location), industry_research, market_research, supplier_list, menu_card, business_plan from CONTEXT_JSON. Adapt to company_profile.industry – processes differ (Gastronomie: Einkauf → Lager → Zubereitung → Service → Gäste; Retail: Einkauf → Lager → Verkauf → Kunde; Services: Planung → Leistungserbringung → Kunde).

MANDATORY – process_chain: Array of process steps in order from start to end customer. Typical phases: Planung, Einkauf/Beschaffung, Lager/Logistik, Produktion/Leistungserstellung, Qualitätssicherung, Vertrieb/Verkauf, Auslieferung/Service, Kundenservice/Nachbetreuung. Adapt to industry.
Each step: phase (e.g. "Einkauf"), name, description, inputs (array), outputs (array), responsible_role (who does this), duration_estimate, dependencies (prior steps).
Include summary and recommendations for process optimization.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "process_chain": [ { "phase": "...", "name": "...", "description": "...", "inputs": ["..."], "outputs": ["..."], "responsible_role": "...", "duration_estimate": "...", "dependencies": ["..."] } ], "summary": "...", "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P26a",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "personnel_plan",
    version: 1,
    outputSchemaKey: "personnel_plan",
    templateText: `You are a personnel planning expert for the first year of operations. Create a staffing plan with personnel costs, considering Öffnungszeiten (opening hours) and Stoßzeiten (peak times).
${ARTIFACT_INSTRUCTION}
Use company_profile (industry, offer, location, stage), industry_research, market_research, work_processes from CONTEXT_JSON.
MANDATORY – work_processes: Der Personalplan wird aus den Arbeitsprozessen abgeleitet. work_processes.process_chain enthält die Wertschöpfungskette (Planung → Einkauf → … → Endkunde). Für jeden Schritt: responsible_role → wird zu einer Rolle im staff_plan. staff_plan MUSS alle Rollen aus process_chain.responsible_role abdecken. Adapt to company_profile.industry – staffing differs (Gastronomie: Küche/Service zu Stoßzeiten; Retail: Verkauf; Services: Kernzeiten).
MANDATORY outputs:
(1) opening_hours: weekdays, saturday, sunday, notes – typische Öffnungszeiten für die Branche
(2) peak_times: array of { period, days, intensity, staffing_impact } – Stoßzeiten (z.B. Mittag 12–14 Uhr, Abend 18–21 Uhr) und deren Auswirkung auf Personalbedarf
(3) staff_plan: array of { role, count, hours_per_week, hourly_rate_eur, social_contributions_eur, insurance_eur, monthly_cost_eur, start_month, notes } – alle Rollen für Jahr 1. MANDATORY: hourly_rate_eur (Stundenlohn), social_contributions_eur (Sozialabgaben/Arbeitgeberanteil pro Monat, ca. 18–21% vom Brutto), insurance_eur (Versicherung z.B. Berufsgenossenschaft pro Monat). monthly_cost_eur = Brutto + Sozialabgaben + Versicherung.
(4) monthly_personnel_costs: array of { month: "YYYY-MM", total_personnel_eur, breakdown } – für 12 Monate. breakdown MUSS ein Array sein: [ { "role": "Koch", "amount": 2500 }, { "role": "Service", "amount": 1500 } ] – NICHT ein Objekt. Berücksichtigung von Einstiegsmonaten (start_month), Stoßzeiten-Aufschläge.
(5) shift_schedule (Schichtenplan): array of { day, shift, role, count, time_from, time_to, notes } – wer arbeitet wann. day: "Mo", "Di", "Mo–Fr", "Sa" etc. shift: "Früh", "Mittag", "Spät" optional. role: Rolle. count: Anzahl. time_from/time_to: "08:00", "16:00". Für Gastronomie/Retail: typische Schichten pro Tag. Für Büro: Kernzeiten.
Personalkosten: Immer auflisten: Stundenlohn (hourly_rate_eur), Sozialabgaben (social_contributions_eur), Versicherung (insurance_eur). Bei Stoßzeiten: ggf. Teilzeit/Aushilfen mit höheren Stundensätzen.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "opening_hours": { "weekdays": "...", "saturday": "...", "sunday": "...", "notes": "..." }, "peak_times": [ { "period": "...", "days": "...", "intensity": "...", "staffing_impact": "..." } ], "staff_plan": [ { "role": "...", "count": 1, "hours_per_week": 0, "hourly_rate_eur": 0, "social_contributions_eur": 0, "insurance_eur": 0, "monthly_cost_eur": 0, "start_month": "YYYY-MM", "notes": "..." } ], "monthly_personnel_costs": [ { "month": "YYYY-MM", "total_personnel_eur": 0, "breakdown": [ { "role": "...", "amount": 0 } ] } ], "shift_schedule": [ { "day": "Mo", "shift": "Früh", "role": "Koch", "count": 1, "time_from": "08:00", "time_to": "16:00", "notes": "..." } ], "recommendations": ["..."] }`,
  },
  {
    key: "P26b",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "financial_liquidity",
    version: 1,
    outputSchemaKey: "financial_liquidity",
    templateText: `Liquidity plan for year 1. CONTEXT_JSON: stage, real_estate_price_ranges, monthly_personnel_costs, monthly_projection. Miete = Durchschnitt aus real_estate_price_ranges (nur monatliche Miete in €, NICHT €/m²) ODER typischen Mietpreis für location+industry schätzen wenn leer.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "liquidity_plan": { "summary": "...", "key_assumptions": ["..."], "monthly_cash_flow_highlights": ["..."] }, "sources_used": ["..."] }`,
  },
  {
    key: "P26c",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "financial_profitability",
    version: 1,
    outputSchemaKey: "financial_profitability",
    templateText: `Profitability plan with margin targets for year 1. CONTEXT_JSON: stage, real_estate_price_ranges, monthly_personnel_costs, monthly_projection. Miete = Durchschnitt aus real_estate_price_ranges (nur €, nicht €/m²) ODER typischen Mietpreis für location+industry.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "profitability_plan": { "summary": "...", "margin_targets": ["..."] }, "sources_used": ["..."] }`,
  },
  {
    key: "P26d",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "financial_capital",
    version: 1,
    outputSchemaKey: "financial_capital",
    templateText: `Capital requirements (Kapitalbedarf) for year 1. CONTEXT_JSON: stage, real_estate_price_ranges, monthly_personnel_costs, monthly_projection. Miete = Durchschnitt aus real_estate_price_ranges (nur €, nicht €/m²) ODER typischen Mietpreis für location+industry.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "capital_requirements": { "total_required": "...", "breakdown": ["..."], "funding_gaps": ["..."] }, "sources_used": ["..."] }`,
  },
  {
    key: "P26e",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "financial_break_even",
    version: 1,
    outputSchemaKey: "financial_break_even",
    templateText: `Break-even analysis for year 1. CONTEXT_JSON: stage, real_estate_price_ranges, monthly_personnel_costs, monthly_projection. Miete = Durchschnitt aus real_estate_price_ranges (nur €, nicht €/m²) ODER typischen Mietpreis für location+industry.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "break_even_analysis": { "break_even_point": "...", "key_drivers": ["..."], "sensitivity_notes": "..." }, "sources_used": ["..."] }`,
  },
  {
    key: "P26f",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "financial_monthly_h1",
    version: 1,
    outputSchemaKey: "financial_monthly_projection",
    templateText: `Monthly projection months 1–6. CONTEXT_JSON: stage, industry, location, real_estate_price_ranges, monthly_personnel_costs, value_month_1, menu_cost_summary. Miete = Durchschnitt aus real_estate_price_ranges (nur €, nicht €/m²) ODER typischen Mietpreis. Personal: EXACTLY from below.
{{PERSONNEL_COSTS}}
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "monthly_projection": [ { "month": "YYYY-MM", "potential_customers": 0, "potential_customers_note": "...", "revenue": 0, "cost_items": [ { "category": "Miete", "amount": 0, "cost_type": "fixed" }, { "category": "Strom", "amount": 0, "cost_type": "fixed" }, { "category": "Wareneinsatz", "amount": 0, "cost_type": "variable" }, { "category": "Personal", "amount": 0, "cost_type": "fixed" }, { "category": "Marketing", "amount": 0, "cost_type": "variable" }, { "category": "Sonstiges", "amount": 0, "cost_type": "fixed" } ], "total_costs": 0, "taxes": 0, "net_profit": 0, "competitor_impact_note": "..." } ], "sources_used": ["..."] }
MANDATORY: taxes = geschätzte Steuerabzüge (Gewerbesteuer, Körperschaft-/Einkommensteuer) pro Monat. net_profit = revenue - total_costs - taxes.`,
  },
  {
    key: "P26g",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "financial_monthly_h2",
    version: 1,
    outputSchemaKey: "financial_monthly_projection",
    templateText: `Monthly projection months 7–12. CONTEXT_JSON: stage, industry, location, real_estate_price_ranges, monthly_personnel_costs, value_month_12, menu_cost_summary. Miete = Durchschnitt aus real_estate_price_ranges (nur €, nicht €/m²) ODER typischen Mietpreis. Personal: EXACTLY from below. Show growth to month 12.
{{PERSONNEL_COSTS}}
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "monthly_projection": [ { "month": "YYYY-MM", "potential_customers": 0, "potential_customers_note": "...", "revenue": 0, "cost_items": [ { "category": "Miete", "amount": 0, "cost_type": "fixed" }, { "category": "Strom", "amount": 0, "cost_type": "fixed" }, { "category": "Wareneinsatz", "amount": 0, "cost_type": "variable" }, { "category": "Personal", "amount": 0, "cost_type": "fixed" }, { "category": "Marketing", "amount": 0, "cost_type": "variable" }, { "category": "Sonstiges", "amount": 0, "cost_type": "fixed" } ], "total_costs": 0, "taxes": 0, "net_profit": 0, "competitor_impact_note": "..." } ], "sources_used": ["..."] }
MANDATORY: taxes = geschätzte Steuerabzüge (Gewerbesteuer, Körperschaft-/Einkommensteuer) pro Monat. net_profit = revenue - total_costs - taxes.`,
  },
  {
    key: "P27",
    workflowKey: "WF_STRATEGIC_PLANNING",
    stepKey: "strategic_planning",
    version: 1,
    outputSchemaKey: "strategic_planning",
    templateText: `You are a strategic planning expert. Create long-term strategic positioning (3-10 years). Adapt to company_profile.industry – market position and innovation differ by sector.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, market_research, industry_research from CONTEXT_JSON – use their actual data.
Planungsbereich: Strategische Planung – langfristige Unternehmensausrichtung.
Beispiele: Marktposition, Wettbewerbsvorteile, Innovation.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "market_position": { "current_assessment": "...", "target_position": "...", "gap_analysis": "..." }, "competitive_advantages": [ { "advantage": "...", "sustainability": "..." } ], "innovation_priorities": ["..."], "strategic_initiatives": [ { "initiative": "...", "horizon": "...", "priority": "..." } ], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P28",
    workflowKey: "WF_TREND_ANALYSIS",
    stepKey: "trend_analysis",
    version: 1,
    outputSchemaKey: "trend_analysis",
    templateText: `You are a trend analyst. Create macro, industry and technology trend analysis. Adapt to company_profile.industry – relevant trends differ by sector.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research from CONTEXT_JSON – use their actual data.
Focus on: Makrotrends, Branchentrends, Technologietrends, Regulierung.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "macro_trends": [ { "trend": "...", "impact": "...", "time_horizon": "..." } ], "industry_trends": ["..."], "technology_trends": ["..."], "regulatory_trends": ["..."], "implications_for_business": ["..."], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P24",
    workflowKey: "WF_OPERATIVE_PLAN",
    stepKey: "operative_plan",
    version: 1,
    outputSchemaKey: "operative_plan",
    templateText: `You are an operative planning expert. Create annual plan. Adapt to company_profile.industry – milestones and budget focus differ (Gastronomie: Saison; Retail: Sortiment; IT: Releases).
${ARTIFACT_INSTRUCTION}
Use company_profile, kpi_snapshot, industry_research, market_research from CONTEXT_JSON – use their actual data.
Planungsbereich: Operative Planung – konkrete Umsetzung der Strategie.
Beispiele: Jahresplanung, Marketingplan, Vertriebsplanung, Budgetplanung.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "annual_plan_summary": "...", "marketing_plan_highlights": ["..."], "sales_plan_highlights": ["..."], "budget_planning_notes": ["..."], "key_milestones": [ { "milestone": "...", "timeline": "...", "owner": "..." } ], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P_TECH",
    workflowKey: "WF_TECH_DIGITALIZATION",
    stepKey: "tech_digitalization",
    version: 1,
    outputSchemaKey: "tech_digitalization",
    templateText: `You are a technology and digitalization consultant. Recommend tools for: Kassensystem (POS), Dokumentenarchivierung, Buchhaltung, CRM, and other relevant tools for the business.
${ARTIFACT_INSTRUCTION}
Use company_profile, industry_research from CONTEXT_JSON – adapt to industry and business size.
For each tool: name, category, description, typical_cost (range), roi_notes, recommendations.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "tools": [ { "name": "...", "category": "kassensystem|dokumentenarchivierung|buchhaltung|crm|...", "description": "...", "typical_cost": "...", "roi_notes": "...", "recommendations": ["..."] } ], "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P_AUTO",
    workflowKey: "WF_AUTOMATION_ROI",
    stepKey: "automation_roi",
    version: 1,
    outputSchemaKey: "automation_roi",
    templateText: `You are an automation consultant. Identify processes that can be automated with computer-based tools (RPA, workflows, scripts).
${ARTIFACT_INSTRUCTION}
Use company_profile, work_processes, industry_research from CONTEXT_JSON.
For each process: process_name, automation_potential, estimated_cost, roi_months, roi_notes, tools (e.g. Zapier, n8n, Power Automate).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "processes": [ { "process_name": "...", "automation_potential": "...", "estimated_cost": "...", "roi_months": 12, "roi_notes": "...", "tools": ["..."] } ], "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P_PHYS",
    workflowKey: "WF_PHYSICAL_AUTOMATION",
    stepKey: "physical_automation",
    version: 1,
    outputSchemaKey: "physical_automation",
    templateText: `You are a physical process automation consultant. Evaluate equipment: Teigmaschine, Thermomix, Laufbänder, and other physical automation for the business.
${ARTIFACT_INSTRUCTION}
Use company_profile, work_processes, industry_research from CONTEXT_JSON.
For each: name, category, description, estimated_cost, roi_months, makes_sense (boolean), rationale.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "equipment": [ { "name": "...", "category": "...", "description": "...", "estimated_cost": "...", "roi_months": 24, "makes_sense": true, "rationale": "..." } ], "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P_APP1",
    workflowKey: "WF_APP_DEVELOPMENT",
    stepKey: "app_ideas",
    version: 1,
    outputSchemaKey: "app_project_plan",
    templateText: `You are an app product consultant. Generate app ideas: automation, monitoring, visualizations, AR/VR, or other exciting features for customers.
${ARTIFACT_INSTRUCTION}
Use company_profile and industry_research from CONTEXT_JSON.
Output: project_overview, phases (phase, duration, deliverables), milestones.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "project_overview": "...", "phases": [ { "phase": "...", "duration": "...", "deliverables": ["..."] } ], "milestones": [ { "milestone": "...", "timeline": "..." } ], "recommendations": ["..."] }`,
  },
  {
    key: "P_APP2",
    workflowKey: "WF_APP_DEVELOPMENT",
    stepKey: "app_requirements",
    version: 1,
    outputSchemaKey: "app_requirements",
    templateText: `You are a requirements engineer. Create functional and non-functional requirements for the app.
${ARTIFACT_INSTRUCTION}
Use company_profile and app_project_plan (from prior step) from CONTEXT_JSON.
Output: functional_requirements (id, description, priority), non_functional_requirements, user_stories.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "functional_requirements": [ { "id": "FR1", "description": "...", "priority": "high" } ], "non_functional_requirements": [ { "id": "NFR1", "description": "..." } ], "user_stories": ["..."], "recommendations": ["..."] }`,
  },
  {
    key: "P_APP3",
    workflowKey: "WF_APP_DEVELOPMENT",
    stepKey: "app_tech_spec",
    version: 1,
    outputSchemaKey: "app_tech_spec",
    templateText: `You are a technical architect. Create technical specification: architecture, tech_stack, integrations, security_notes.
${ARTIFACT_INSTRUCTION}
Use company_profile, app_requirements, app_project_plan from CONTEXT_JSON.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "architecture": "...", "tech_stack": ["..."], "integrations": ["..."], "security_notes": ["..."], "recommendations": ["..."] }`,
  },
  {
    key: "P_APP4",
    workflowKey: "WF_APP_DEVELOPMENT",
    stepKey: "app_mvp_guide",
    version: 1,
    outputSchemaKey: "app_mvp_guide",
    templateText: `You are an MVP consultant. Create exact developer instructions for MVP: mvp_scope, developer_instructions (step-by-step), acceptance_criteria.
${ARTIFACT_INSTRUCTION}
Use company_profile, app_requirements, app_tech_spec, app_project_plan from CONTEXT_JSON.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "mvp_scope": "...", "developer_instructions": ["...", "..."], "acceptance_criteria": ["..."], "recommendations": ["..."] }`,
  },
  {
    key: "P_APP5",
    workflowKey: "WF_APP_DEVELOPMENT",
    stepKey: "app_page_specs",
    version: 1,
    outputSchemaKey: "app_page_specs",
    templateText: `You are a UX/UI spec writer. For each page: page_name, route, content, functions, components.
${ARTIFACT_INSTRUCTION}
Use company_profile, app_requirements, app_mvp_guide from CONTEXT_JSON.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "pages": [ { "page_name": "...", "route": "/...", "content": "...", "functions": ["..."], "components": ["..."] } ], "recommendations": ["..."] }`,
  },
  {
    key: "P_APP6",
    workflowKey: "WF_APP_DEVELOPMENT",
    stepKey: "app_db_schema",
    version: 1,
    outputSchemaKey: "app_db_schema",
    templateText: `You are a database architect. Create DB schema: tables (name, columns with name/type/constraints), relationships.
${ARTIFACT_INSTRUCTION}
Use company_profile, app_requirements, app_page_specs from CONTEXT_JSON.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "tables": [ { "name": "...", "columns": [ { "name": "...", "type": "...", "constraints": "..." } ], "description": "..." } ], "relationships": ["..."], "recommendations": ["..."] }`,
  },
  {
    key: "P7",
    workflowKey: "WF_NEXT_BEST_ACTIONS",
    stepKey: "decision_engine",
    version: 1,
    outputSchemaKey: "decision_pack",
    templateText: `You are a growth decision engine. Adapt decisions to company_profile.industry – next best actions differ by business type.
${ARTIFACT_INSTRUCTION}
Use the ready research data from CONTEXT_JSON – these contain actual workflow outputs:
- market_research: feasibility_assessment, supply_demand, buyer_behavior – for evidence-based decisions
- best_practices: proven practices for this stage
- failure_analysis: failure_reasons, industry_risks – to avoid common pitfalls
- industry_research: key_trends, competitors, key_facts
Kontext Wachstumsphase: Vertrieb muss funktionieren vor Skalierung. CAC, LTV, Conversion Rate beachten.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CRITICAL: Each item in decision_proposals MUST have a "title" field (short decision name). Use "name" from initiative_pool if mapping.
CRITICAL: execution_plan_30_60_90 MUST have keys days_0_30, days_31_60, days_61_90. Each value is an array of objects with "task", "owner", "deliverable", "deadline".
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "initiative_pool": [...], "decision_proposals": [ { "title": "Required", "founder_simple_summary": "...", ... }, ...5 items ], "execution_plan_30_60_90": { "days_0_30": [ { "task": "...", "owner": "...", "deliverable": "...", "deadline": "day N" } ], "days_31_60": [...], "days_61_90": [...] }, "guardrails": [...], "assumption_register": [...], "citations_json": {"kpi_keys":[], "artifact_ids":[], "source_ids":[], "knowledge_object_ids":[]} }`,
  },
];

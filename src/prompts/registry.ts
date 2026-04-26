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
- Put all sources in sources_used as array of strings. Each entry MUST include a working https URL in parentheses whenever the source is web-based: "Short title (https://example.com/path)". Order matches [1], [2], [3]. Omit URLs only for non-web sources (e.g. internal context); then use a clear label without fake links.
- For key_facts: use source_ref (number 1-based) instead of source_hint. Example: { "fact": "...", "source_ref": 1 }
`;

/** Value proposition / USP steps: German prose, English JSON keys, mandatory sourced URLs */
const VALUE_PROPOSITION_LANGUAGE_AND_SOURCES = `
OUTPUT LANGUAGE: Write all narrative string values in German (clear business German). Keep JSON property names exactly as in the schema (English snake_case).
SOURCES (mandatory): Include "sources_used" as a non-empty array. Every item that refers to a public/web source MUST be "Kurztitel oder Quelle (https://vollständige-url)" with a valid https URL. Use footnotes [1], [2] in text fields only — never paste raw URLs into problem_statement, bullets, or recommendations.
`;

/** Instruction: use actual data from referenced artifacts – add to prompts that depend on prior workflows */
const ARTIFACT_INSTRUCTION = `
REFERENCED ARTIFACTS: CONTEXT_JSON includes typed fields (e.g. market_snapshot, industry_research, business_plan) and may include "related_analysis_outputs": array of { artifact_type, title, content } with full JSON from other analyses. Use that data when present — do not invent. Ignore empty arrays/null fields.`;

/** Strict JSON rules for LLM output – add to all prompts that return JSON */
const JSON_STRICT =
  `CRITICAL – Output MUST be valid, parseable JSON:
- Escape quotes inside strings: use \\\" (e.g. "als \\\"anders\\\" kann" – never raw " inside string values)
- No trailing commas after last array/object element
- No newlines inside string values (use \\n for line breaks)
- Use commas (,) between properties, never periods (.)
- No comments (no // or /* */)
- Every key must have a value (key: value)
- If your JSON includes URLs (e.g. url, link, source, sources_used, reference): output ONLY valid absolute https URLs (https://...)
- Do NOT output placeholders or pseudo links (example.com without protocol, "N/A", "-", "coming soon", "www...")
- Do NOT append reference markers or punctuation to URLs (no [1], no trailing ")", ".", ",", ";")
- If no valid URL is available, leave that field empty or omit it according to schema — never fabricate URLs`;

export const promptTemplates: PromptTemplate[] = [
  {
    key: "P0",
    workflowKey: "WF_COMPANY_INTERNET_PROFILE",
    stepKey: "company_internet_enrichment",
    version: 1,
    outputSchemaKey: "company_internet_presence",
    templateText: `You analyze whether a company is publicly discoverable.
${ARTIFACT_INSTRUCTION}
Use CONTEXT_JSON (company_profile, constraints).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "company_exists": true, "status": "existing_enriched|pre_foundation|enrichment_failed", "message": "...", "company_snapshot": { "company_name": "...", "website": "...", "location": "...", "offer": "...", "usp": "...", "customers": "...", "competitors": "...", "sales_channels": "...", "stage": "...", "business_state": "..." }, "evidence": { "website_excerpt_found": true, "linkedIn_search_source": "brave|ddg|none", "public_finance_search_source": "brave|ddg|none" }, "notes": ["..."] }`,
  },
  {
    key: "P1",
    workflowKey: "WF_BASELINE",
    stepKey: "business_model_inference",
    version: 2,
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
Use company_profile, industry_research, financial_planning (if available), related_analysis_outputs from CONTEXT_JSON – when financial_planning is present, use its actual figures (Kapitalbedarf, monthly_projection, break_even).
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
HARD OUTPUT CONTRACT (must pass exactly):
1) Return ONLY valid JSON (no prose, no markdown).
2) Root must be an object with key "suppliers" (never a top-level array).
3) suppliers must contain at least 1 row (never empty).
4) Each supplier row must include: material, supplier, price_per_unit (>0 number), unit.
${ARTIFACT_INSTRUCTION}
CRITICAL: Use menu_card from CONTEXT_JSON – it contains actual items and components from the prior workflow. List EVERY component from menu_card.menu_full.items[].components as a separate supplier entry. Adapt to company_profile.industry. If no menu_card, use company_profile products/materials.
Return ONLY valid JSON, no prose.
IMPORTANT: Root must be a JSON object with a "suppliers" array — never a bare top-level array.
MANDATORY QUALITY RULES:
- suppliers must contain at least 1 row (never empty).
- For every supplier row, material, supplier, price_per_unit, unit are required.
- price_per_unit must be a numeric value > 0 (no strings like "n/a", "unknown", "-" ).
- If exact values are uncertain, provide realistic market estimates and note uncertainty in notes.
- NEVER return {"suppliers": []}. If context is sparse, infer likely core materials from company_profile/menu and still return usable estimate rows.
- Prefer at least one supplier row per distinct component/material from menu_card.
- Use plausible local/regional suppliers and realistic market prices so downstream cost calculation can run.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "suppliers": [ { "material": "...", "supplier": "...", "price_per_unit": number, "unit": "...", "notes": "...", "sources": ["..."] } ], "whitelabel_options": [...], "ingredients_options": [...], "sources_used": ["Title (URL)", "..."] }
FINAL SELF-CHECK BEFORE YOU ANSWER:
- Is the answer pure JSON only?
- Is suppliers present and non-empty?
- Does every row include material, supplier, price_per_unit (>0 number), unit?`,
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
IMPORTANT: Root must be a JSON object with a "suppliers" array — never a bare top-level array.
MANDATORY QUALITY RULES:
- suppliers must contain at least 1 row (never empty).
- For every supplier row, material, supplier, price_per_unit, unit are required.
- price_per_unit must be a numeric value > 0 (no strings like "n/a", "unknown", "-" ).
- If exact values are uncertain, provide realistic market estimates and note uncertainty in notes.
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
${VALUE_PROPOSITION_LANGUAGE_AND_SOURCES}
${SOURCE_REFERENCE_INSTRUCTION}
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema (all fields required):
{ "problem_statement": "...", "target_customers": ["..."], "existing_solutions": ["..."], "unique_value_proposition": "...", "problem_solution_fit_score": 0.75, "key_differentiators": ["..."], "recommendations": ["..."], "sources_used": ["Title (https://...)", "..."] }`,
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
MANDATORY coverage:
- company valuation estimate (range + method hint + key drivers)
- where to sell (channels/platform examples, e.g. M&A advisors, business marketplaces, sector-specific buyers)
- IPO suitability
- legal form change options (e.g., GmbH -> AG) with prerequisites
- expansion options (new regions/markets and entry model)
Optionen: new business models, new markets, expansion, M&A (buy/sell), IPO, succession, transformation, legal form change.
Planungsschwerpunkte: Innovationsstrategie, Portfolioanpassung, Unternehmenswert steigern.
Kennzahlen: Unternehmensbewertung, Wachstumspotenzial, strategischer Fit.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "strategic_options": [ { "option": "...", "type": "new_business_model|new_market|expansion|ma_acquisition|ma_sale|ipo|succession|transformation|legal_form_change", "description": "...", "fit_score": 0.0-1.0, "key_considerations": ["..."] } ], "company_valuation_estimate": { "valuation_range": "...", "method_hint": "...", "key_drivers": ["..."], "assumptions": ["..."] }, "exit_channels": [ { "channel": "...", "platform_examples": ["..."], "suitability": "...", "notes": "..." } ], "legal_form_change_options": [ { "from_form": "...", "to_form": "...", "when_useful": "...", "prerequisites": ["..."], "risks": ["..."] } ], "expansion_options": [ { "target_market_or_region": "...", "entry_model": "...", "rationale": "...", "prerequisites": ["..."], "risks": ["..."] } ], "exit_readiness": { "readiness_score": 0.0-1.0, "gaps": ["..."], "recommendations": ["..."] }, "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
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
${VALUE_PROPOSITION_LANGUAGE_AND_SOURCES}
${SOURCE_REFERENCE_INSTRUCTION}
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema (all fields required; problem_solution_fit_score between 0 and 1):
{ "problem_statement": "...", "target_customers": ["..."], "existing_solutions": ["..."], "unique_value_proposition": "...", "problem_solution_fit_score": 0.75, "key_differentiators": ["..."], "recommendations": ["..."], "sources_used": ["Title (https://...)", "..."] }`,
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
    key: "P21a",
    workflowKey: "WF_GROWTH_MARGIN_OPTIMIZATION",
    stepKey: "growth_margin_optimization",
    version: 1,
    outputSchemaKey: "growth_margin_optimization",
    templateText: `You are a growth-phase commercial optimizer: margins, offer packaging, marketing levers, and cost structure. Adapt to company_profile.industry – unit economics and cost drivers differ (Gastronomie: food cost, Lieferando; SaaS: CAC/LTV; Handwerk: Material + Stunden; Retail: COGS + Platz).
${ARTIFACT_INSTRUCTION}
PRIORITY: Use CONTEXT_JSON when present – company_profile, kpi_snapshot, baseline, market_research, business_plan, go_to_market, marketing_strategy, menu_cost, menu_preiskalkulation, supplier_list, financial_planning, personnel_plan, real_estate, related_analysis_outputs. Quote or infer numbers only from context; if a number is unknown, say "nicht in Kontext" and still give logic.

COMPLETENESS (MANDATORY, DO NOT SKIP):
- Your root JSON object MUST contain ALL of these top-level keys exactly as named: situation_analysis, margin_per_unit, packaging_positioning, marketing_promises_and_roi, cost_optimization, people_and_overhead, industry_checklist_if_sparse_data, recommendations.
- NEVER return only inner fields of people_and_overhead (like revenue_per_employee_current, benchmark_or_target, interpretation) at the ROOT. Those belong INSIDE the "people_and_overhead" object.
- If data is thin for a section, still return the key with a minimum of 1 array entry (for arrays) or a short "nicht in Kontext – Annahme: ..." note (for strings). Arrays MUST NOT be empty.
- Minimum counts: margin_per_unit ≥ 1, packaging_positioning ≥ 1, marketing_promises_and_roi ≥ 1, cost_optimization ≥ 1, industry_checklist_if_sparse_data ≥ 3, recommendations ≥ 3.
- If you cannot fulfil the minimum for a section, fall back to industry-typical hypothetical entries and flag them with "(Annahme, da keine Daten im Kontext)" inside the narrative values.

DELIVERABLES (all required JSON keys):
(1) situation_analysis: Short Lagebild – Umsatz/Kosten/Marge nur soweit aus Kontext ableitbar.
(2) margin_per_unit: For each main product/service line (or one aggregate if context is thin): offering, revenue_side, variable_and_direct_costs, contribution_per_unit (Deckungsbeitrag I pro Stück/Vertrag – klar trennen von Fixkosten), optional what_remains_after_fixed_allocation_note, improvable_how (Preis, Mix, Einkauf, Prozess).
(3) packaging_positioning: "Packaging" = wie Angebot/Dienstleistung gebündelt, benannt, garantiert, gestaffelt wird. Per element: scenario_without_offering, pain_or_cost_without (Nachteile/Kosten ohne euer Angebot), with_offering_benefit, ideas_to_increase_sales_or_price (Bundles, Garantien, Social Proof, Upsell).
(4) marketing_promises_and_roi: Concrete levers – e.g. 90-day outcome framing, risk reversal, ROI story, urgency without lying. Each: lever, concrete_angle, optional example_promise, measurement_90_days (what to measure in 90 days).
(5) cost_optimization: Categories (Personal, Einkauf/Verpackung, Energie, Miete, Software, Logistik, etc.): too_high_assessment, reduction_or_alternatives (Lieferantenvergleich, Tarifwechsel Strom/Gas, Verpackungswechsel, Personalproduktivität).
(6) people_and_overhead: If FTE or revenue hints exist – revenue_per_employee_current, benchmark_or_target (industry-typical order of magnitude if no data), interpretation, levers. If no data – state gaps and use levers as hypotheses.
(7) supply_packaging_energy: Optional rows – packaging suppliers, utilities comparison, insurance/telco, etc.
(8) industry_checklist_if_sparse_data: If context is rich, keep short (3–5 items) or focus on residual gaps. If context is thin or missing cost/margin data, MANDATORY: at least 8 entries with area, what_to_check, example_actions (konkrete Selbstprüfung / Umsetzung) typical for this industry (examples: Ziel-Deckungsbeitrag je Kategorie; Lieferanten-Anfrage parallel; Strom/Vergleichsportale; Personalstunden pro Umsatz€; Mindestbestellmengen; Retourenquote; Zahlungsziele).

OUTPUT LANGUAGE: All narrative string values in clear German business language. JSON keys exactly as schema (English snake_case).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "situation_analysis": "...", "margin_per_unit": [ { "offering": "...", "revenue_side": "...", "variable_and_direct_costs": "...", "contribution_per_unit": "...", "what_remains_after_fixed_allocation_note": "...", "improvable_how": "..." } ], "packaging_positioning": [ { "element": "...", "scenario_without_offering": "...", "pain_or_cost_without": "...", "with_offering_benefit": "...", "ideas_to_increase_sales_or_price": ["..."] } ], "marketing_promises_and_roi": [ { "lever": "...", "concrete_angle": "...", "example_promise": "...", "measurement_90_days": "..." } ], "cost_optimization": [ { "category": "...", "too_high_assessment": "...", "reduction_or_alternatives": ["..."] } ], "people_and_overhead": { "revenue_per_employee_current": "...", "benchmark_or_target": "...", "interpretation": "...", "levers": ["..."] }, "supply_packaging_energy": [ { "topic": "...", "comparison_or_switch_idea": "..." } ], "industry_checklist_if_sparse_data": [ { "area": "...", "what_to_check": "...", "example_actions": ["..."] } ], "recommendations": ["..."], "sources_used": ["Title (https://...)", "..."] }`,
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
(2) marketing_initiatives: 5–7 konkrete Maßnahmen. Jede mit: name, goal (quantifiziert: Views, Follower, Bestellungen, Umsatz), actions/content (genaue Schritte), hashtags oder keywords, cta (Call-to-Action mit Code), tracking (wie messen), expected_conversion (z.B. "1,5% der Views → 750€ Umsatz"), budget_eur (0 wenn kostenlos), effort_h_week (STRING mit Einheit, z.B. "4h" oder "2-3h" — NIEMALS nur eine nackte Zahl), roi (wenn berechenbar).
(3) roadmap_30_days: [ { "week": "KW 1", "tasks": ["Google Business live", "5 Bewertungen sichern", "3 TikToks/Reels hochladen"] }, { "week": "KW 2", "tasks": [...] }, "KW 3", "KW 4" ]
(4) kpi_goals_30_days: [ { "target": "+150 neue Lieferando-Kunden", "metric": "Lieferando-Kunden" }, { "target": "+1000 Instagram/TikTok Follower (80% lokal)", "metric": "Follower" }, { "target": "Lieferando-Anteil < 35%", "metric": "Plattform-Mix" }, { "target": "Marketing-Ausgaben < 500€, ROI ≥ 2x", "metric": "ROI" } ]
(5) offline_visibility: Wenn Ghost-Kitchen/Lieferservice – Strategie für Offline-Sichtbarkeit (Sticker, Pop-up am Markt, etc.) mit Kosten und erwarteten Ergebnissen.
(6) concluding_offer: Optional – z.B. "Bei Bedarf stelle ich innerhalb 24h Vorlagen (Flyer, WhatsApp-Text, TikTok-Skripte) bereit."
Adapt to industry: Gastronomie → Lieferando, Google, TikTok/Reels, lokale Influencer; Retail → SEO, Paid; B2B → LinkedIn. Nutze company_profile.location für lokale Hashtags (#Rottweil, #SchwarzwaldFood, etc.).
CRITICAL QUALITY RULES (DO NOT BREAK):
- marketing_initiatives MUST be an array of OBJECTS only.
- NEVER output primitive list items in marketing_initiatives (no numbers, no booleans, no plain strings, no null).
- Every marketing_initiatives item MUST include at least: name, goal.
- Reject placeholders/dummies like "1", "n/a", "...", "-", "tbd" for name/goal.
- If context is sparse, still output realistic initiatives with assumptions, marked as "(Annahme)" in narrative fields.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "constraints": "...", "marketing_initiatives": [ { "name": "...", "goal": "...", "actions": "...", "hashtags": "...", "cta": "...", "tracking": "...", "expected_conversion": "...", "budget_eur": 0, "effort_h_week": "4h", "roi": "..." } ], "roadmap_30_days": [ { "week": "KW 1", "tasks": ["...", "..."] }, { "week": "KW 2", "tasks": [...] }, { "week": "KW 3", "tasks": [...] }, { "week": "KW 4", "tasks": [...] } ], "kpi_goals_30_days": [ { "target": "...", "metric": "..." } ], "offline_visibility": "...", "concluding_offer": "...", "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
  },
  {
    key: "P21c",
    workflowKey: "WF_MARKETING_STRATEGY",
    stepKey: "conversion_funnel_analysis",
    version: 1,
    outputSchemaKey: "conversion_funnel_analysis",
    templateText: `You are a conversion funnel analyst.
${ARTIFACT_INSTRUCTION}
Use company_profile, marketing_strategy, market_research, kpi_snapshot from CONTEXT_JSON.
Identify funnel stages, conversion/drop-off values (best effort), key loss points, and concrete levers.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "funnel_stages": [ { "stage": "...", "conversion_rate": 0.0, "drop_off_rate": 0.0, "issue_hypotheses": ["..."] } ], "top_drop_off_points": ["..."], "optimization_levers": ["..."], "actions_next_30_days": ["..."], "metrics": { "target_conversion_rate": "...", "target_cpa": "..." }, "sources_used": ["..."] }`,
  },
  {
    key: "P21g",
    workflowKey: "WF_MARKETING_STRATEGY",
    stepKey: "social_media_content_plan",
    version: 1,
    outputSchemaKey: "social_media_content_plan",
    templateText: `You are a social media content strategist.
${ARTIFACT_INSTRUCTION}
Use company_profile.social_media_channels (selected in intake), company_profile, marketing_strategy, conversion_funnel_analysis and market_research from CONTEXT_JSON.
If social_media_channels is missing, infer 2-3 realistic channels from company profile.
Create a practical 4-week content plan per selected channel.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "selected_channels": ["instagram", "tiktok"], "content_pillars": [ { "pillar": "...", "goal": "...", "channel_fit": ["..."] } ], "weekly_plan": [ { "week": "KW 1", "channel_posts": [ { "channel": "instagram", "format": "reel|post|story", "topic": "...", "objective": "...", "cta": "..." } ] } ], "production_notes": ["..."], "kpi_tracking": [ { "channel": "...", "metric": "...", "target": "..." } ], "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P21d",
    workflowKey: "WF_SCALING_STRATEGY",
    stepKey: "customer_economics_ltv_cac",
    version: 1,
    outputSchemaKey: "customer_economics_ltv_cac",
    templateText: `You are a unit economics analyst.
${ARTIFACT_INSTRUCTION}
Use company_profile, kpi_snapshot, marketing_strategy, conversion_funnel_analysis, go_to_market, financial_planning from CONTEXT_JSON.
Provide LTV/CAC and payback perspective with transparent assumptions, risks and actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "ltv_cac_ratio": 0.0, "payback_period_months": 0, "cac_breakdown": [ { "channel": "...", "cac_estimate": 0, "rationale": "..." } ], "ltv_assumptions": ["..."], "risks": ["..."], "levers": ["..."], "actions": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P21e",
    workflowKey: "WF_SCALING_STRATEGY",
    stepKey: "pmf_assessment",
    version: 1,
    outputSchemaKey: "pmf_assessment",
    templateText: `You are a product-market-fit assessor.
${ARTIFACT_INSTRUCTION}
Use company_profile, customer_validation, conversion_funnel_analysis, kpi_snapshot, market_research from CONTEXT_JSON.
Evaluate PMF stage and score, signal quality, critical gaps and 90-day actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "pmf_stage": "not_ready|emerging|validated|scaling_ready", "pmf_score": 0.0, "signals_positive": ["..."], "signals_negative": ["..."], "key_gaps": ["..."], "actions_next_90_days": ["..."], "risks": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P21f",
    workflowKey: "WF_SCALING_STRATEGY",
    stepKey: "growth_loops",
    version: 1,
    outputSchemaKey: "growth_loops",
    templateText: `You are a decision support systems strategist.
${ARTIFACT_INSTRUCTION}
Use company_profile, pmf_assessment, customer_economics_ltv_cac, conversion_funnel_analysis, go_to_market from CONTEXT_JSON.
Design growth loops with bottlenecks, prioritization and concrete actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "loops": [ { "loop_name": "...", "trigger": "...", "action": "...", "output": "...", "measurable_kpi": "..." } ], "bottlenecks": ["..."], "prioritization": [ { "loop_name": "...", "impact": "...", "effort": "...", "priority": "..." } ], "actions": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P16b",
    workflowKey: "WF_PROCESS_OPTIMIZATION",
    stepKey: "customer_experience_cx",
    version: 1,
    outputSchemaKey: "customer_experience_cx",
    templateText: `You are a customer experience analyst.
${ARTIFACT_INSTRUCTION}
Use process_optimization, customer_validation, market_research, kpi_snapshot from CONTEXT_JSON.
Map customer journey stages, pain points, CX metrics and actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "journey_stages": [ { "stage": "...", "customer_goal": "...", "pain_points": ["..."], "improvement_levers": ["..."] } ], "cx_metrics": [ { "metric": "...", "current": "...", "target": "..." } ], "risks": ["..."], "actions": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P16c",
    workflowKey: "WF_PROCESS_OPTIMIZATION",
    stepKey: "organization_roles",
    version: 1,
    outputSchemaKey: "organization_roles",
    templateText: `You are an organization design advisor.
${ARTIFACT_INSTRUCTION}
Use process_optimization, work_processes, personnel_plan, company_profile from CONTEXT_JSON.
Define role map, decision scopes, critical gaps, governance notes and actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "role_map": [ { "role": "...", "responsibilities": ["..."], "decision_scope": "...", "current_coverage": "..." } ], "critical_gaps": ["..."], "governance_notes": ["..."], "actions": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P16d",
    workflowKey: "WF_PROCESS_OPTIMIZATION",
    stepKey: "hiring_talent_strategy",
    version: 1,
    outputSchemaKey: "hiring_talent_strategy",
    templateText: `You are a hiring and talent strategy advisor.
${ARTIFACT_INSTRUCTION}
Use organization_roles, personnel_plan, process_optimization, company_profile from CONTEXT_JSON.
Define hiring priorities, channels, capability gaps, risks and actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "hiring_priorities": [ { "role": "...", "urgency": "...", "impact": "...", "timeline": "..." } ], "talent_channels": ["..."], "capability_gaps": ["..."], "risks": ["..."], "actions": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P27b",
    workflowKey: "WF_STRATEGIC_PLANNING",
    stepKey: "barriers_to_entry",
    version: 1,
    outputSchemaKey: "barriers_to_entry",
    templateText: `You are a competitive strategy analyst.
${ARTIFACT_INSTRUCTION}
Use strategic_planning, competitor_analysis, market_research, industry_research from CONTEXT_JSON.
Assess market entry barriers, opportunities, risks and actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "barriers": [ { "barrier": "...", "strength": "...", "time_to_build": "...", "notes": "..." } ], "opportunities": ["..."], "risks": ["..."], "actions": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P27c",
    workflowKey: "WF_STRATEGIC_PLANNING",
    stepKey: "moat_assessment",
    version: 1,
    outputSchemaKey: "moat_assessment",
    templateText: `You are a moat assessment expert.
${ARTIFACT_INSTRUCTION}
Use strategic_planning, barriers_to_entry, competitor_analysis, value_proposition from CONTEXT_JSON.
Assess defendability and propose moat-strengthening actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "moat_score": 0.0, "moat_dimensions": [ { "dimension": "...", "current_state": "...", "evidence": ["..."], "strengthening_actions": ["..."] } ], "defendability_risks": ["..."], "actions_next_180_days": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P3c",
    workflowKey: "WF_DATA_COLLECTION_PLAN",
    stepKey: "data_strategy",
    version: 1,
    outputSchemaKey: "data_strategy",
    templateText: `You are a data strategy planner.
${ARTIFACT_INSTRUCTION}
Use kpi_set, baseline, kpi_snapshot, company_profile from CONTEXT_JSON.
Define decision areas, required data, collection methods, governance and 60-day actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "decision_areas": [ { "area": "...", "required_data": ["..."], "current_data_quality": "...", "collection_method": "..." } ], "instrumentation_priorities": ["..."], "governance_rules": ["..."], "risks": ["..."], "actions_next_60_days": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P14c",
    workflowKey: "WF_STARTUP_CONSULTING",
    stepKey: "capital_strategy",
    version: 1,
    outputSchemaKey: "capital_strategy",
    templateText: `You are a capital strategy advisor.
${ARTIFACT_INSTRUCTION}
Use startup_consulting, financial_planning, company_profile, industry_research from CONTEXT_JSON.
Recommend funding mix, roadmap triggers, runway target, risks and actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "capital_mix_options": [ { "source": "...", "suitability": "...", "dilution_or_cost": "...", "constraints": ["..."] } ], "funding_roadmap": [ { "phase": "...", "amount_target": "...", "trigger": "..." } ], "runway_target_months": 0, "risks": ["..."], "actions": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P26h",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "business_model_mechanics",
    version: 1,
    outputSchemaKey: "business_model_mechanics",
    templateText: `You are a business model economics expert.
${ARTIFACT_INSTRUCTION}
Use company_profile, financial_planning context, market_research and go_to_market from CONTEXT_JSON.
Describe monetization and margin mechanics with explicit risks, levers and actions.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "revenue_mechanics": [ { "stream": "...", "pricing_logic": "...", "margin_logic": "...", "key_assumptions": ["..."] } ], "cost_mechanics": [ { "cost_block": "...", "cost_behavior": "...", "optimization_levers": ["..."] } ], "risks": ["..."], "actions": ["..."], "metrics": { "gross_margin_target": "...", "contribution_margin_target": "...", "break_even_logic": "..." }, "sources_used": ["..."] }`,
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

MANDATORY – Investitionskosten Inventar & Equipment: Wenn CONTEXT_JSON "inventory_equipment_investment_inputs" enthält (aus dem Artefakt Inventar & Equipment / Markteintritt), MUSST du diese Daten in den Kapitalbedarf einbeziehen:
- Markteintritt: summiere/verdichte estimated_price_eur_band aus market_entry_must_have und nice_to_have zu einem konsistenten Markteintritts-Investitionsband (EUR).
- Skalierung/Effizienz: efficiency_upgrades → separates Band oder Reserve für spätere Anschaffungen (nach Launch), damit der Gesamt-Kapitalbedarf realistisch bleibt.
- breakdown: mind. eine Zeile pro großen Block (z. B. Miete/Standort, Personalstart, Inventar Markteintritt, Inventar Skalierung, Marketing, Liquiditätsreserve) — Inventar explizit benennen, nicht nur in "Sonstiges".
- capital_requirements.inventory_equipment_investment: setze market_entry_eur_band, scaling_reserve_eur_band, detail_lines (kurze Stichpunkte mit EUR-Bändern), included_in_total: true wenn diese Beträge in total_required eingerechnet sind.
Wenn inventory_equipment_investment_inputs fehlt oder leer ist, Inventar trotzdem kurz schätzen falls aus Branche/Angebot ersichtlich; sonst funding_gaps erwähnen.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "capital_requirements": { "total_required": "...", "breakdown": ["..."], "funding_gaps": ["..."], "inventory_equipment_investment": { "included_in_total": true, "market_entry_eur_band": "...", "scaling_reserve_eur_band": "...", "detail_lines": ["..."] } }, "sources_used": ["..."] }`,
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
    templateText: `Monthly projection months 1–6. CONTEXT_JSON: stage, industry, location, opening_month, real_estate_price_ranges, monthly_personnel_costs, value_month_1, menu_cost_summary. Miete = Durchschnitt aus real_estate_price_ranges (nur €, nicht €/m²) ODER typischen Mietpreis. Personal: EXACTLY from below.
{{PERSONNEL_COSTS}}
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "monthly_projection": [ { "month": "YYYY-MM", "potential_customers": 0, "potential_customers_note": "...", "revenue": 0, "cost_items": [ { "category": "Miete", "amount": 0, "cost_type": "fixed" }, { "category": "Strom", "amount": 0, "cost_type": "fixed" }, { "category": "Wareneinsatz", "amount": 0, "cost_type": "variable" }, { "category": "Personal", "amount": 0, "cost_type": "fixed" }, { "category": "Marketing", "amount": 0, "cost_type": "variable" }, { "category": "Sonstiges", "amount": 0, "cost_type": "fixed" } ], "total_costs": 0, "taxes": 0, "net_profit": 0, "competitor_impact_note": "..." } ], "sources_used": ["..."] }
MANDATORY: months 1–6 MUST start at opening_month (if opening_month=2026-04 then first row is 2026-04 and sixth row is 2026-09). NEVER use past years unless opening_month is in that year. taxes = geschätzte Steuerabzüge (Gewerbesteuer, Körperschaft-/Einkommensteuer) pro Monat. net_profit = revenue - total_costs - taxes.`,
  },
  {
    key: "P26g",
    workflowKey: "WF_FINANCIAL_PLANNING",
    stepKey: "financial_monthly_h2",
    version: 1,
    outputSchemaKey: "financial_monthly_projection",
    templateText: `Monthly projection months 7–12. CONTEXT_JSON: stage, industry, location, opening_month, real_estate_price_ranges, monthly_personnel_costs, value_month_12, menu_cost_summary. Miete = Durchschnitt aus real_estate_price_ranges (nur €, nicht €/m²) ODER typischen Mietpreis. Personal: EXACTLY from below. Show growth to month 12.
{{PERSONNEL_COSTS}}
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output: { "monthly_projection": [ { "month": "YYYY-MM", "potential_customers": 0, "potential_customers_note": "...", "revenue": 0, "cost_items": [ { "category": "Miete", "amount": 0, "cost_type": "fixed" }, { "category": "Strom", "amount": 0, "cost_type": "fixed" }, { "category": "Wareneinsatz", "amount": 0, "cost_type": "variable" }, { "category": "Personal", "amount": 0, "cost_type": "fixed" }, { "category": "Marketing", "amount": 0, "cost_type": "variable" }, { "category": "Sonstiges", "amount": 0, "cost_type": "fixed" } ], "total_costs": 0, "taxes": 0, "net_profit": 0, "competitor_impact_note": "..." } ], "sources_used": ["..."] }
MANDATORY: months 7–12 MUST continue directly after H1 using opening_month (if opening_month=2026-04 then first row here is 2026-10 and last row is 2027-03). NEVER use unrelated years. taxes = geschätzte Steuerabzüge (Gewerbesteuer, Körperschaft-/Einkommensteuer) pro Monat. net_profit = revenue - total_costs - taxes.`,
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
    key: "P28B",
    workflowKey: "WF_TREND_ANALYSIS",
    stepKey: "pestel_analysis",
    version: 1,
    outputSchemaKey: "pestel_analysis",
    templateText: `You are a strategic macro-environment analyst. Create a PESTEL analysis adapted to company_profile.industry and local market context.
${ARTIFACT_INSTRUCTION}
Use company_profile, market_snapshot, industry_research from CONTEXT_JSON – use their actual data.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "political": [ { "factor": "...", "impact": "...", "risk_level": "low|medium|high" } ], "economic": [ { "factor": "...", "impact": "...", "risk_level": "low|medium|high" } ], "social": [ { "factor": "...", "impact": "...", "risk_level": "low|medium|high" } ], "technological": [ { "factor": "...", "impact": "...", "risk_level": "low|medium|high" } ], "environmental": [ { "factor": "...", "impact": "...", "risk_level": "low|medium|high" } ], "legal": [ { "factor": "...", "impact": "...", "risk_level": "low|medium|high" } ], "key_implications": ["..."], "recommendations": ["..."], "sources_used": ["Title (URL)", "..."] }`,
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
    key: "P_INV1",
    workflowKey: "WF_INVENTORY_LAUNCH",
    stepKey: "inventory_baseline",
    version: 1,
    outputSchemaKey: "inventory_baseline",
    templateText: `You are an operations consultant for startups. Build a structured inventory list: equipment (machines, tools, IT hardware) AND materials/consumables (raw materials, packaging, supplies).
${ARTIFACT_INSTRUCTION}
Use company_profile (especially legal_structure, industry, offer, stage) from CONTEXT_JSON. Set legal_form to the company's legal form (e.g. GmbH, UG, Einzelunternehmen, GbR) — infer from company_profile if stated, else best-effort from context.
List equipment and materials as separate arrays. Be specific to the industry (e.g. fashion: fabrics, sewing; food: ingredients, labels; services: minimal physical stock).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "legal_form": "...", "inventory_context": "short narrative tying list to Unternehmensform and business", "equipment": [ { "name": "...", "category": "...", "quantity_or_unit": "...", "condition": "...", "notes": "..." } ], "materials": [ { "name": "...", "category": "...", "quantity_or_unit": "...", "notes": "..." } ], "sources_used": ["..."] }`,
  },
  {
    key: "P_INV2",
    workflowKey: "WF_INVENTORY_LAUNCH",
    stepKey: "inventory_process_analysis",
    version: 1,
    outputSchemaKey: "inventory_process_analysis",
    templateText: `You map business processes to the inventory from step 1. For each major process step (e.g. order intake, production, packaging, shipping), list which equipment and materials are used and where bottlenecks or gaps appear relative to the stated legal_form and liability/scale needs.
${ARTIFACT_INSTRUCTION}
CONTEXT_JSON includes inventory_baseline from the prior step when present.
STRICT RULES:
- Every entry in "process_inventory_links" MUST include ALL of: "process_step" (string), "equipment_used" (array of strings), "materials_used" (array of strings).
- If a process step has no equipment or no materials, return an EMPTY array ([]) — NEVER omit the key and NEVER use null.
- "bottleneck_or_gap" is optional but, if present, must be a string.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "process_inventory_links": [ { "process_step": "...", "equipment_used": ["..."], "materials_used": ["..."], "bottleneck_or_gap": "..." } ], "alignment_with_legal_form": "...", "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P_INV3",
    workflowKey: "WF_INVENTORY_LAUNCH",
    stepKey: "market_entry_equipment",
    version: 1,
    outputSchemaKey: "market_entry_equipment",
    templateText: `You identify MISSING equipment and materials needed for the FIRST SALES / market entry phase (minimal viable operations). For each gap: suggest indicative EU price band, and at least one REAL https link to a product page, shop, or manufacturer (use web knowledge; if uncertain, put a concrete search query in retailer_or_search_hint and a plausible example URL pattern). Distinguish must-have vs nice-to-have.
${ARTIFACT_INSTRUCTION}
Use inventory_baseline, inventory_process_analysis, company_profile, work_processes from CONTEXT_JSON.
Return ONLY valid JSON, no prose, no markdown, no code fences.
${JSON_STRICT}
STRICT RULES for this step:
- Every entry in "market_entry_must_have" MUST include ALL of: "item", "purpose", "priority", "estimated_price_eur_band", "example_product_url", "retailer_or_search_hint". "notes" is optional but if included must be a string.
- Every entry in "nice_to_have" MUST include ALL of: "item", "purpose", "estimated_price_eur_band", "example_product_url", "retailer_or_search_hint". "notes" is optional.
- "priority" MUST be exactly one of: "must", "should", "nice" (lowercase, no other values, no extra text).
- "estimated_price_eur_band" MUST be a single short string like "80-150" or "500-1200" (digits + hyphen only, NO currency symbol, NO words, NO quotes inside).
- "example_product_url" MUST be a single plain https URL (e.g. "https://example.com/product"). NO trailing text, NO spaces, NO parentheses, NO quotes inside the URL.
- "retailer_or_search_hint" and "notes" MUST be short single-line strings. NEVER include raw newlines (use \\n if absolutely needed) and ALWAYS escape inner double quotes as \\".
- Never output trailing commas. Never wrap the JSON in backticks or markdown. Output MUST start with { and end with }.
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "market_entry_must_have": [ { "item": "...", "purpose": "...", "priority": "must", "estimated_price_eur_band": "80-150", "example_product_url": "https://...", "retailer_or_search_hint": "...", "notes": "..." } ], "nice_to_have": [ { "item": "...", "purpose": "...", "estimated_price_eur_band": "...", "example_product_url": "https://...", "retailer_or_search_hint": "...", "notes": "..." } ], "total_budget_eur_band_hint": "...", "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P_INV4",
    workflowKey: "WF_INVENTORY_LAUNCH",
    stepKey: "equipment_scaling_roadmap",
    version: 1,
    outputSchemaKey: "equipment_scaling_roadmap",
    templateText: `You define the NEXT phase after first sales: efficiency upgrades and scaling — e.g. sewing machine instead of hand-sewing, heat press instead of household iron, small batch equipment vs manual work. For each upgrade: current manual/low method, proposed equipment, benefit, investment band, example https link, and when to buy after launch (e.g. after X units/month).
${ARTIFACT_INSTRUCTION}
Use inventory_baseline, inventory_process_analysis, market_entry_equipment from CONTEXT_JSON.
Return ONLY valid JSON, no prose, no markdown, no code fences.
${JSON_STRICT}
STRICT RULES for this step (all fields MUST contain concrete, substantive content derived from CONTEXT_JSON — NEVER echo the placeholders from the output schema):
- "phase_market_entry_recap" MUST be a concrete 1–3 sentence German summary (30–400 characters) describing the company's pre-revenue state and first-sales phase based on CONTEXT_JSON. NEVER output meta-descriptions like "String summarizing ..." or placeholders like "...".
- "efficiency_upgrades" MUST contain AT LEAST 2 entries. Each entry MUST include ALL keys: "current_method", "upgrade_equipment", "benefit", "estimated_investment_eur_band", "example_product_url", "typical_when_after_launch" — each as a non-empty, non-placeholder string.
- "current_method", "upgrade_equipment", "benefit", "typical_when_after_launch" MUST be real, single-line German strings (min. 10 characters, no "...", no "tbd", no schema descriptions).
- "estimated_investment_eur_band" MUST be a single short string like "80-150" or "500-1200" (digits + hyphen only, NO currency symbol, NO words, NO quotes inside).
- "example_product_url" MUST be a single plain https URL (e.g. "https://example.com/product"). NO trailing text, NO spaces, NO parentheses, NO quotes inside the URL.
- "scaling_phase_notes" MUST be concrete German prose (min. 30 characters) about scaling considerations — NEVER a placeholder or meta-description.
- "recommendations" MUST contain AT LEAST 2 actionable, concrete German sentences (each min. 20 characters). NEVER "..." or empty strings.
- "sources_used" is optional but if present must be an array of concrete references/URLs (no "...").
- Never output trailing commas. Never wrap the JSON in backticks or markdown. Output MUST start with { and end with }.
- Escape inner double quotes as \\" and use \\n only if a real newline is necessary inside a string.
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema (the "..." are placeholders — REPLACE them with real, context-derived content, do NOT return them literally):
{ "phase_market_entry_recap": "...", "efficiency_upgrades": [ { "current_method": "...", "upgrade_equipment": "...", "benefit": "...", "estimated_investment_eur_band": "...", "example_product_url": "https://...", "typical_when_after_launch": "..." } ], "scaling_phase_notes": "...", "recommendations": ["..."], "sources_used": ["..."] }`,
  },
  {
    key: "P_G1",
    workflowKey: "WF_GROWTH_BUSINESS_SUMMARY",
    stepKey: "growth_business_summary",
    version: 1,
    outputSchemaKey: "growth_business_summary",
    templateText: `You are a senior e-commerce and growth strategy analyst.
${ARTIFACT_INSTRUCTION}
Create a concise but structured business summary from CONTEXT_JSON (especially company_profile, baseline, market_research, related_analysis_outputs).
Use existing context data first. If data is missing, state assumptions clearly.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "company_summary": { "business_model": "", "core_offer": "", "target_market": "", "brand_positioning": "", "growth_stage": "", "primary_growth_levers": [], "main_constraints": [], "key_risks": [], "strategic_summary": "" }, "sources_used": ["..."] }`,
  },
  {
    key: "P_G2",
    workflowKey: "WF_GROWTH_OFFER_AUDIENCE_FUNNEL",
    stepKey: "growth_offer_audience_funnel",
    version: 1,
    outputSchemaKey: "growth_offer_audience_funnel",
    templateText: `You are a growth strategist for D2C execution.
${ARTIFACT_INSTRUCTION}
Build one integrated output with:
1) offer_positioning_analysis
2) audience_analysis
3) funnel_analysis
Use CONTEXT_JSON (company_profile, market_research, market_snapshot, marketing_strategy, conversion_funnel_analysis, related_analysis_outputs). Reuse existing findings, do not invent duplicate analyses.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "offer_positioning_analysis": { "offer_clarity_score": 0, "positioning_strength_score": 0, "usp_clarity": "", "differentiation_assessment": "", "pricing_fit_assessment": "", "trust_signal_assessment": "", "main_positioning_gaps": [], "improvement_recommendations": [], "recommended_angles": [] }, "audience_analysis": { "primary_personas": [ { "name": "", "description": "", "pain_points": [], "buying_triggers": [], "objections": [], "best_channels": [], "creative_angles": [] } ], "secondary_personas": [], "audience_prioritization": [], "messaging_recommendations": [] }, "funnel_analysis": { "awareness_stage": "", "consideration_stage": "", "conversion_stage": "", "retention_stage": "", "main_dropoff_points": [], "main_conversion_barriers": [], "priority_fixes": [], "recommended_tests": [] }, "sources_used": ["..."] }`,
  },
  {
    key: "P_G3",
    workflowKey: "WF_GROWTH_PAID_ADS",
    stepKey: "growth_paid_ads",
    version: 1,
    outputSchemaKey: "growth_paid_ads",
    templateText: `You are a paid media strategist for Google Ads and Meta Ads.
${ARTIFACT_INSTRUCTION}
Evaluate paid-media readiness and define campaign priorities/account structure.
Use CONTEXT_JSON (company_profile, go_to_market, marketing_strategy, conversion_funnel_analysis, related_analysis_outputs). Align recommendations to budget and tracking maturity.
MANDATORY: Add implementation-ready code snippets and a clear setup guide for non-technical clients.
MANDATORY: Add KPI explanations in simple language (what KPI means, why it matters, how often to check).
Code snippets must be copy-paste ready and wrapped as plain strings.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "paid_media_readiness": { "readiness_score": 0, "google_ads_recommendation": "", "meta_ads_recommendation": "", "budget_fit_assessment": "", "tracking_readiness": "", "creative_readiness": "", "campaign_priorities": [], "campaign_structure_recommendation": [], "key_risks": [], "next_steps": [] }, "kpi_framework_for_client": { "priority_kpis": [ { "kpi_key": "", "name": "", "what_it_is": "", "why_it_matters": "", "target_hint": "", "check_frequency": "" } ], "tracking_validation_checklist": [] }, "implementation_guide": { "setup_steps": [], "qa_steps": [], "rollout_plan_30_days": [], "common_pitfalls": [] }, "implementation_code": { "gtag_base_snippet": "", "gtag_conversion_event_snippet": "", "google_ads_conversion_snippet": "", "meta_pixel_base_snippet": "", "meta_pixel_purchase_event_snippet": "", "cta_event_tracking_snippet": "", "utm_naming_template": [] }, "sources_used": ["..."] }`,
  },
  {
    key: "P_G4",
    workflowKey: "WF_GROWTH_SEO",
    stepKey: "growth_seo",
    version: 1,
    outputSchemaKey: "growth_seo",
    templateText: `You are a technical and content SEO strategist for e-commerce.
${ARTIFACT_INSTRUCTION}
Assess SEO opportunities and likely weaknesses with practical priority actions.
Use CONTEXT_JSON (company_profile, market_research, related_analysis_outputs). If website-level data is missing, provide assumptions and highest-leverage first actions.
MANDATORY: Add implementation-ready SEO code snippets and a clear setup guide for non-technical clients.
MANDATORY: Add KPI explanations in simple language (what KPI means, why it matters, how often to check).
Code snippets must be copy-paste ready and wrapped as plain strings.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "seo_analysis": { "technical_seo_assessment": "", "onpage_seo_assessment": "", "content_seo_assessment": "", "collection_page_opportunities": [], "product_page_opportunities": [], "blog_content_opportunities": [], "keyword_cluster_suggestions": [], "main_seo_gaps": [], "priority_actions": [] }, "kpi_framework_for_client": { "priority_kpis": [ { "kpi_key": "", "name": "", "what_it_is": "", "why_it_matters": "", "target_hint": "", "check_frequency": "" } ], "tracking_validation_checklist": [] }, "implementation_guide": { "setup_steps": [], "qa_steps": [], "rollout_plan_30_days": [], "common_pitfalls": [] }, "implementation_code": { "title_template_examples": [], "meta_description_template_examples": [], "product_json_ld_snippet": "", "faq_json_ld_snippet": "", "robots_txt_example": "", "sitemap_guidance_snippet": "", "canonical_tag_snippet": "", "internal_linking_block_template": "" }, "sources_used": ["..."] }`,
  },
  {
    key: "P_G4b",
    workflowKey: "WF_GROWTH_AI_SEO",
    stepKey: "growth_ai_seo",
    version: 1,
    outputSchemaKey: "growth_ai_seo",
    templateText: `You are an AI Search / LLM visibility strategist. You cover GEO (Generative Engine Optimization for ChatGPT Search, Perplexity, Google AI Overviews, Bing Copilot, Gemini, You.com, Claude), AEO (Answer Engine Optimization: featured snippets, People Also Ask, zero-click) and LLMO (making content citable/crawlable by LLMs — llms.txt, robots, entity signals, E-E-A-T).
${ARTIFACT_INSTRUCTION}
Use CONTEXT_JSON (company_profile, market_research, related_analysis_outputs). If no website-level data is present, give industry-typical recommendations and flag them as "(Annahme)".

MANDATORY coverage:
(1) ai_search_landscape: which AI engines are most relevant for this company/industry/region, target user intents, current visibility assessment, top opportunities & risks.
(2) geo_strategy: how to position the brand as a primary source LLMs quote (quotable angles, topical authority plan, citation-worthy assets like original stats/quotes/case studies, priority actions).
(3) aeo_strategy: target questions with intent + recommended answer format (list/table/short-definition/step-by-step), FAQ candidates, zero-click opportunities, priority actions.
(4) llm_optimization: whether llms.txt is recommended, robots directives per AI bot (GPTBot, PerplexityBot, Google-Extended, CCBot, ClaudeBot, Bingbot), content licensing note, plan to build brand entity mentions on authoritative sources.
(5) structured_data_plan: recommended schema.org types (FAQPage, HowTo, Article, Product, Organization, LocalBusiness, Review) with priority actions.
(6) eeat_signals: concrete signals per Experience / Expertise / Authoritativeness / Trust, author-pages recommendation.
(7) content_blueprint: flagship articles, hub-and-spoke topic clusters, content freshness plan, multimodal assets (images/video/transcripts).
(8) kpi_framework_for_client: 5–8 priority KPIs (AI citations, AI referral traffic, share-of-voice in AI Overviews, brand mentions, featured snippet wins, etc.) with simple explanations, target hints, check frequency.
(9) implementation_guide: setup, QA, 30/60/90 rollout, common pitfalls.
(10) implementation_code: copy-paste-ready llms.txt example, robots.txt AI-bot block, FAQ/HowTo/Article/Organization JSON-LD snippets. Plain strings.

OUTPUT LANGUAGE: narrative values in clear German business language. JSON keys exactly as schema (English snake_case).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "ai_search_landscape": { "relevant_ai_engines": [], "target_user_intents": [], "current_visibility_assessment": "", "main_opportunities": [], "main_risks": [] }, "geo_strategy": { "positioning_as_source": "", "quotable_content_angles": [], "topical_authority_plan": [], "citation_assets": [], "priority_actions": [] }, "aeo_strategy": { "target_questions": [ { "question": "", "intent": "", "recommended_answer_format": "" } ], "faq_candidates": [], "zero_click_opportunities": [], "priority_actions": [] }, "llm_optimization": { "llms_txt_recommended": true, "robots_directives_for_ai": [], "content_licensing_note": "", "brand_entity_mentions_plan": [] }, "structured_data_plan": { "recommended_schemas": [], "priority_actions": [] }, "eeat_signals": { "experience_signals": [], "expertise_signals": [], "authoritativeness_signals": [], "trust_signals": [], "author_pages_recommendation": "" }, "content_blueprint": { "flagship_articles": [], "hub_and_spoke_topics": [], "content_freshness_plan": [], "multimodal_assets": [] }, "kpi_framework_for_client": { "priority_kpis": [ { "kpi_key": "", "name": "", "what_it_is": "", "why_it_matters": "", "target_hint": "", "check_frequency": "" } ], "tracking_validation_checklist": [] }, "implementation_guide": { "setup_steps": [], "qa_steps": [], "rollout_plan_30_60_90": [], "common_pitfalls": [] }, "implementation_code": { "llms_txt_example": "", "robots_txt_ai_bot_example": "", "faq_json_ld_snippet": "", "howto_json_ld_snippet": "", "article_json_ld_snippet": "", "organization_json_ld_snippet": "" }, "sources_used": ["Title (https://...)"] }`,
  },
  {
    key: "P_G5",
    workflowKey: "WF_GROWTH_RETENTION_CONTENT",
    stepKey: "growth_retention_content",
    version: 1,
    outputSchemaKey: "growth_retention_content",
    templateText: `You are an e-commerce retention and creative strategist.
${ARTIFACT_INSTRUCTION}
Create one integrated output with:
1) retention_analysis (email/SMS lifecycle)
2) content_strategy (acquisition, trust, retention)
3) creative_strategy (UGC/ad testing basis)
Use CONTEXT_JSON (company_profile, marketing_strategy, conversion_funnel_analysis, social_media_content_plan, related_analysis_outputs).
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "retention_analysis": { "maturity_score": 0, "existing_flow_gaps": [], "recommended_flows": [], "segmentation_opportunities": [], "sms_recommendation": "", "campaign_recommendation": "", "deliverability_risks": [], "priority_actions": [] }, "content_strategy": { "content_pillars": [], "channel_strategy": [], "hook_categories": [], "trust_building_content": [], "conversion_content": [], "retention_content": [], "plan_30_day_outline": [] }, "creative_strategy": { "creative_angles": [], "hook_frameworks": [], "ugc_brief_suggestions": [], "creator_requirements": [], "ad_concept_suggestions": [], "test_matrix": [] }, "sources_used": ["..."] }`,
  },
  {
    key: "P_G6",
    workflowKey: "WF_GROWTH_EXECUTION_PLAN",
    stepKey: "growth_execution_plan",
    version: 1,
    outputSchemaKey: "growth_execution_plan",
    templateText: `You are a growth operator and marketing analytics strategist.
${ARTIFACT_INSTRUCTION}
Build one integrated execution package with:
1) kpi_framework (north star, primary/secondary and channel KPIs)
2) strategy_30_60_90 (prioritized roadmap)
3) draft_artifacts (Meta ads, Google ads, email, SEO, content, UGC)
Use CONTEXT_JSON and reuse all available prior analyses from related_analysis_outputs.
Return ONLY valid JSON, no prose.
${JSON_STRICT}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "kpi_framework": { "north_star_metric": "", "primary_kpis": [], "secondary_kpis": [], "channel_kpis": { "meta_ads": [], "google_ads": [], "seo": [], "email_sms": [] }, "measurement_requirements": [], "dashboard_sections": [] }, "strategy_30_60_90": { "first_30_days": [], "days_31_60": [], "days_61_90": [], "dependencies": [], "quick_wins": [], "high_impact_projects": [], "critical_risks": [] }, "draft_artifacts": { "meta_ad_concepts": [], "google_ad_concepts": [], "email_flow_plan": [], "seo_plan": [], "content_calendar": [], "ugc_briefs": [] }, "sources_used": ["..."] }`,
  },
  {
    key: "P_SUB1",
    workflowKey: "WF_SUBSIDY_RESEARCH",
    stepKey: "subsidy_research",
    version: 1,
    outputSchemaKey: "subsidy_research",
    templateText: `You are a funding and grants research specialist for German companies.
${ARTIFACT_INSTRUCTION}
Task: list all realistic public subsidies/funding programs that fit this company (state, city/municipality, federal where applicable).
Use CONTEXT_JSON (company_profile, industry_research, financial_planning, startup_consulting/capital strategy via related_analysis_outputs).
For each program provide:
- name
- valid_in (where it is applicable)
- benefit_summary (what the company gets)
- prerequisites
- application_how_to (clear practical steps)
- official_link when available
Return ONLY valid JSON, no prose.
${JSON_STRICT}
${SOURCE_REFERENCE_INSTRUCTION}
CONTEXT_JSON:
{{CONTEXT_JSON}}
Output schema:
{ "subsidies": [ { "name": "", "valid_in": "", "benefit_summary": "", "prerequisites": [], "application_how_to": [], "official_link": "" } ], "recommendations": [], "sources_used": ["..."] }`,
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

import type { Locale } from "@/lib/i18n";

export type IntakeFormCopy = {
  businessStateGoals: string;
  companyBasics: string;
  productCatalog: string;
  suppliers: string;
  productionSteps: string;
  team: string;
  financials: string;
  operations: string;
  additional: string;
  whereBusiness: string;
  goalsLabel: string;
  selectPlaceholder: string;
  companyName: string;
  location: string;
  website: string;
  offer: string;
  usp: string;
  customers: string;
  marketReach: string;
  localNatIntl: { local: string; national: string; international: string };
  prodName: string;
  sku: string;
  price: string;
  unit: string;
  notes: string;
  remove: string;
  addProduct: string;
  material: string;
  supplier: string;
  pricePerUnit: string;
  unitCol: string;
  addSupplier: string;
  prodStepsPlaceholder: string;
  name: string;
  role: string;
  skills: string;
  hoursWeek: string;
  salary: string;
  addTeam: string;
  revenueLastMonth: string;
  marketingSpend: string;
  fixedCosts: string;
  variableCosts: string;
  uploadExcel: string;
  teamSize: string;
  stage: string;
  stageOpts: { pre: string; early: string; growth: string; scaling: string };
  competitors: string;
  growthChallenge: string;
  differentiators: string;
  salesChannels: string;
  leadTime: string;
  constraints: string;
  funding: string;
  legalStructure: string;
  yearsInBusiness: string;
  targetMarket: string;
  acquisition: string;
  socialMediaChannels: string;
  socialMediaChannelsHint: string;
  socialMediaChannelOptions: { value: string; label: string }[];
  aov: string;
  retention: string;
  anythingElse: string;
  save: string;
  enrichContinue: string;
  manualContinue: string;
  enrichLoading: string;
  optionalManualTitle: string;
  confirmRemoveProduct: string;
  confirmRemoveSupplier: string;
  confirmRemoveTeam: string;
  editRowTitle: string;
  saveRow: string;
  cancel: string;
  tapToEditRow: string;
  suppliersHint: string;
  findRealEstate: string;
  researchMarketPricing: string;
  findBestPositioning: string;
  researchCompetitorUsps: string;
  findBestUsp: string;
  researchTargetDemographics: string;
  findBestProductMix: string;
  researchProductPricing: string;
  findSupplierWhitelabel: string;
  findSupplierIngredients: string;
  suggestProductionWorkflow: string;
  suggestRolesSalaries: string;
  suggestRolesSalariesHint: string;
  benchmarkIndustry: string;
  findMainCompetitors: string;
  researchTamSamSom: string;
  findBestAcquisitionChannels: string;
  uploadExcelHelp: string;
  placeholderMonthly: string;
  legalSole: string;
  legalPartnership: string;
  legalLlc: string;
  legalCorp: string;
  legalOther: string;
  legalEmpty: string;
  competitorsPh: string;
  growthChallengePh: string;
  differentiatorsPh: string;
  salesChannelsPh: string;
  leadTimePh: string;
  constraintsPh: string;
  fundingPh: string;
  targetMarketPh: string;
  acquisitionPh: string;
  aovPh: string;
  retentionPh: string;
  additionalNotesPh: string;
  teamSkillsPh: string;
  BUSINESS_STATES: { value: string; label: string }[];
  GOALS: { value: string; label: string }[];
};

const EN: IntakeFormCopy = {
  businessStateGoals: "Business state & goals",
  companyBasics: "Offer, customers & market",
  productCatalog: "1. Product catalogue (all products with prices)",
  suppliers: "2. Supplier materials & price per unit",
  productionSteps: "3. Production steps",
  team: "4. Team members & skills",
  financials: "5. Financials & cost factors",
  operations: "6. Operations & growth",
  additional: "7. Additional context",
  whereBusiness: "Where is your business right now?",
  goalsLabel: "Goals (select all that apply)",
  selectPlaceholder: "— Select —",
  companyName: "Company name",
  location: "Location (city, country)",
  website: "Website URL",
  offer: "What do you offer?",
  usp: "Unique Selling Proposition (USP)",
  customers: "Who are your customers?",
  marketReach: "Market reach",
  localNatIntl: { local: "Local only", national: "National", international: "International" },
  prodName: "Product name",
  sku: "SKU / Code",
  price: "Price",
  unit: "Unit",
  notes: "Notes",
  remove: "Remove",
  addProduct: "+ Add product",
  material: "Material",
  supplier: "Supplier",
  pricePerUnit: "Price per unit",
  unitCol: "Unit (G/kg/m/ft)",
  addSupplier: "+ Add supplier/material",
  prodStepsPlaceholder:
    "List each production step, e.g.\n1. Sourcing raw materials\n2. Cutting & assembly\n3. Quality check\n4. Packaging",
  name: "Name",
  role: "Role",
  skills: "Skills",
  hoursWeek: "Hours/week",
  salary: "Salary (avg for location)",
  addTeam: "+ Add team member",
  revenueLastMonth: "Revenue last month",
  marketingSpend: "Marketing spend (monthly)",
  fixedCosts: "Fixed costs (rent, utilities, etc.)",
  variableCosts: "Variable costs (COGS, shipping, etc.)",
  uploadExcel: "Upload Excel: one month revenue & costs",
  teamSize: "Team size",
  stage: "Stage",
  stageOpts: {
    pre: "Pre-revenue",
    early: "Early revenue",
    growth: "Growth",
    scaling: "Scaling",
  },
  competitors: "Main competitors",
  growthChallenge: "Biggest growth challenge right now",
  differentiators: "Key differentiators vs competitors",
  salesChannels: "Sales channels (where do you sell?)",
  leadTime: "Lead time (order to delivery)",
  constraints: "Constraints (budget, capacity, etc.)",
  funding: "Funding / investment status",
  legalStructure: "Legal structure",
  yearsInBusiness: "Years in business",
  targetMarket: "Target market size (TAM/SAM/SOM if known)",
  acquisition: "Main customer acquisition channels",
  socialMediaChannels: "Which social media channels do you actively use?",
  socialMediaChannelsHint: "Select all channels you currently use for content or customer communication.",
  socialMediaChannelOptions: [
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "youtube", label: "YouTube" },
    { value: "pinterest", label: "Pinterest" },
    { value: "x", label: "X / Twitter" },
    { value: "snapchat", label: "Snapchat" },
  ],
  aov: "Average order value (AOV)",
  retention: "Customer retention / churn (if known)",
  anythingElse: "Anything else we should know?",
  save: "Save",
  enrichContinue: "Continue — fetch & merge public info",
  manualContinue: "Use manual data only — continue",
  enrichLoading: "Fetching…",
  optionalManualTitle: "Optional manual entry",
  confirmRemoveProduct: "Remove this product from the list?",
  confirmRemoveSupplier: "Remove this supplier from the list?",
  confirmRemoveTeam: "Remove this team member from the list?",
  editRowTitle: "Edit entry",
  saveRow: "Save",
  cancel: "Cancel",
  tapToEditRow: "Tap to edit",
  suppliersHint: "Material, supplier, price per unit (g/kg/m/ft)",
  findRealEstate: "Find real estate for the business",
  researchMarketPricing: "Research market pricing",
  findBestPositioning: "Find best product positioning",
  researchCompetitorUsps: "Research competitor USPs",
  findBestUsp: "Find best USP for market",
  researchTargetDemographics: "Research target demographics",
  findBestProductMix: "Find best product mix",
  researchProductPricing: "Research market pricing (products)",
  findSupplierWhitelabel: "Find supplier for whitelabeling",
  findSupplierIngredients: "Find supplier for ingredients",
  suggestProductionWorkflow: "Suggest production workflow",
  suggestRolesSalaries: "Suggest roles & salaries for location",
  suggestRolesSalariesHint: "Get suggested roles and average salaries for your location.",
  benchmarkIndustry: "Benchmark against industry",
  findMainCompetitors: "Find main competitors",
  researchTamSamSom: "Research TAM/SAM/SOM",
  findBestAcquisitionChannels: "Find best acquisition channels",
  uploadExcelHelp: "Upload a spreadsheet with revenue and cost breakdown for one representative month.",
  placeholderMonthly: "Monthly",
  legalSole: "Sole proprietorship",
  legalPartnership: "Partnership",
  legalLlc: "LLC",
  legalCorp: "Corporation",
  legalOther: "Other",
  legalEmpty: "—",
  competitorsPh: "Who are your main competitors?",
  growthChallengePh: "What is blocking growth?",
  differentiatorsPh: "Price, quality, service, etc.",
  salesChannelsPh: "e.g. Website, Amazon, retail, wholesale",
  leadTimePh: "e.g. 2 weeks, 24h",
  constraintsPh: "e.g. Limited budget, 2-person team",
  fundingPh: "Bootstrapped, seed, Series A, etc.",
  targetMarketPh: "e.g. €50M TAM, €5M SAM",
  acquisitionPh: "e.g. Organic, paid ads, referrals",
  aovPh: "e.g. 150",
  retentionPh: "e.g. 85% retention, 5% monthly churn",
  additionalNotesPh: "Other context that helps us understand your business",
  teamSkillsPh: "Skills (comma-separated)",
  BUSINESS_STATES: [
    { value: "idea", label: "Idea" },
    { value: "first_research", label: "First research" },
    { value: "investor_search", label: "Investor search" },
    { value: "launch", label: "Launch / Startup" },
    { value: "young_business", label: "Young business" },
    { value: "growing_business", label: "Growing business" },
    { value: "scaling_business", label: "Scaling business" },
    { value: "established", label: "Established" },
    { value: "ai_usage", label: "AI usage (focus on AI in the business)" },
  ],
  GOALS: [
    { value: "validate_idea", label: "Validate idea" },
    { value: "market_research", label: "Market research" },
    { value: "secure_funding", label: "Secure funding" },
    { value: "launch_product", label: "Launch product/service" },
    { value: "grow_customers", label: "Grow customer base" },
    { value: "scale_operations", label: "Scale operations" },
    { value: "expand_markets", label: "Expand to new markets" },
    { value: "profitability", label: "Increase profitability" },
    { value: "build_team", label: "Build team" },
    { value: "supplier_list", label: "Supplier list" },
    { value: "real_estate", label: "Real estate" },
  ],
};

const DE: IntakeFormCopy = {
  ...EN,
  businessStateGoals: "Unternehmensphase & Ziele",
  companyBasics: "Angebot, Kunden & Markt",
  productCatalog: "1. Produktkatalog (alle Produkte mit Preisen)",
  suppliers: "2. Materialien & Einkaufspreis pro Einheit",
  productionSteps: "3. Produktionsschritte",
  team: "4. Team & Kompetenzen",
  financials: "5. Finanzen & Kostenfaktoren",
  operations: "6. Operatives Geschäft & Wachstum",
  additional: "7. Weiterer Kontext",
  whereBusiness: "In welcher Phase ist Ihr Unternehmen?",
  goalsLabel: "Ziele (alle zutreffenden auswählen)",
  selectPlaceholder: "— Bitte wählen —",
  companyName: "Firmenname",
  location: "Standort (Stadt, Land)",
  website: "Website-URL",
  offer: "Was bieten Sie an?",
  usp: "Alleinstellungsmerkmal (USP)",
  customers: "Wer sind Ihre Kunden?",
  marketReach: "Marktreichweite",
  localNatIntl: { local: "Nur lokal", national: "National", international: "International" },
  prodName: "Produktname",
  sku: "SKU / Code",
  price: "Preis",
  unit: "Einheit",
  notes: "Hinweise",
  remove: "Entfernen",
  addProduct: "+ Produkt hinzufügen",
  material: "Material",
  supplier: "Lieferant",
  pricePerUnit: "Preis pro Einheit",
  unitCol: "Einheit (g/kg/m/Stk.)",
  addSupplier: "+ Material / Lieferant hinzufügen",
  prodStepsPlaceholder:
    "Produktionsschritte, z. B.\n1. Rohstoffe\n2. Zuschnitt & Montage\n3. Qualitätsprüfung\n4. Verpackung",
  name: "Name",
  role: "Rolle",
  skills: "Kompetenzen",
  hoursWeek: "Std./Woche",
  salary: "Gehalt (Ø für Region)",
  addTeam: "+ Teammitglied hinzufügen",
  revenueLastMonth: "Umsatz letzter Monat",
  marketingSpend: "Marketingausgaben (monatlich)",
  fixedCosts: "Fixkosten (Miete, Energie, …)",
  variableCosts: "Variable Kosten (COGS, Versand, …)",
  uploadExcel: "Excel hochladen: Umsatz & Kosten eines Monats",
  teamSize: "Teamgröße",
  stage: "Phase",
  stageOpts: {
    pre: "Vor Umsatz",
    early: "Erste Umsätze",
    growth: "Wachstum",
    scaling: "Skalierung",
  },
  competitors: "Wichtigste Wettbewerber",
  growthChallenge: "Größte Wachstumshemmnisse aktuell",
  differentiators: "Abgrenzung zu Wettbewerbern",
  salesChannels: "Vertriebskanäle",
  leadTime: "Durchlaufzeit (Bestellung bis Lieferung)",
  constraints: "Rahmenbedingungen (Budget, Kapazität, …)",
  funding: "Finanzierung / Investitionsstand",
  legalStructure: "Rechtsform",
  yearsInBusiness: "Jahre am Markt",
  targetMarket: "Zielmarkt (TAM/SAM/SOM, falls bekannt)",
  acquisition: "Wichtigste Akquisekanäle",
  socialMediaChannels: "Welche Social-Media-Kanäle nutzen Sie aktiv?",
  socialMediaChannelsHint: "Bitte alle Kanäle auswählen, die Sie für Inhalte oder Kundenkommunikation nutzen.",
  socialMediaChannelOptions: [
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "youtube", label: "YouTube" },
    { value: "pinterest", label: "Pinterest" },
    { value: "x", label: "X / Twitter" },
    { value: "snapchat", label: "Snapchat" },
  ],
  aov: "Durchschnittlicher Warenkorb (AOV)",
  retention: "Kundenbindung / Churn (falls bekannt)",
  anythingElse: "Was sollten wir noch wissen?",
  save: "Speichern",
  enrichContinue: "Weiter — Infos aus dem Web übernehmen",
  manualContinue: "Nur manuelle Daten verwenden — weiter",
  enrichLoading: "Wird geladen…",
  optionalManualTitle: "Optionale manuelle Infoeingabe",
  confirmRemoveProduct: "Dieses Produkt aus der Liste entfernen?",
  confirmRemoveSupplier: "Diesen Eintrag entfernen?",
  confirmRemoveTeam: "Dieses Teammitglied entfernen?",
  editRowTitle: "Eintrag bearbeiten",
  saveRow: "Speichern",
  cancel: "Abbrechen",
  tapToEditRow: "Tippen zum Bearbeiten",
  suppliersHint: "Material, Lieferant, Preis pro Einheit (g/kg/m/Stk.)",
  findRealEstate: "Immobilie für das Unternehmen finden",
  researchMarketPricing: "Marktpreise recherchieren",
  findBestPositioning: "Beste Produktpositionierung finden",
  researchCompetitorUsps: "USP der Wettbewerber recherchieren",
  findBestUsp: "Bestes USP für den Markt finden",
  researchTargetDemographics: "Zielgruppe recherchieren",
  findBestProductMix: "Optimales Produktportfolio finden",
  researchProductPricing: "Marktpreise (Produkte) recherchieren",
  findSupplierWhitelabel: "Lieferant für Whitelabel finden",
  findSupplierIngredients: "Lieferant für Rohstoffe finden",
  suggestProductionWorkflow: "Produktionsablauf vorschlagen",
  suggestRolesSalaries: "Rollen & Gehälter für Region vorschlagen",
  suggestRolesSalariesHint: "Vorschläge zu Rollen und marktüblichen Gehältern für Ihren Standort.",
  benchmarkIndustry: "Branchenvergleich",
  findMainCompetitors: "Hauptwettbewerber finden",
  researchTamSamSom: "TAM/SAM/SOM recherchieren",
  findBestAcquisitionChannels: "Beste Akquisekanäle finden",
  uploadExcelHelp: "Laden Sie eine Tabelle mit Umsatz und Kosten für einen repräsentativen Monat hoch.",
  placeholderMonthly: "Monatlich",
  legalSole: "Einzelunternehmen",
  legalPartnership: "Personengesellschaft",
  legalLlc: "GmbH / LLC",
  legalCorp: "Kapitalgesellschaft",
  legalOther: "Sonstiges",
  legalEmpty: "—",
  competitorsPh: "Wer sind Ihre Hauptwettbewerber?",
  growthChallengePh: "Was bremst das Wachstum?",
  differentiatorsPh: "Preis, Qualität, Service, …",
  salesChannelsPh: "z. B. Website, Amazon, Handel, Großhandel",
  leadTimePh: "z. B. 2 Wochen, 24 h",
  constraintsPh: "z. B. begrenztes Budget, 2-Personen-Team",
  fundingPh: "Bootstrapping, Seed, Series A, …",
  targetMarketPh: "z. B. 50 Mio. € TAM, 5 Mio. € SAM",
  acquisitionPh: "z. B. Organisch, Ads, Empfehlungen",
  aovPh: "z. B. 150",
  retentionPh: "z. B. 85 % Retention, 5 % monatlicher Churn",
  additionalNotesPh: "Weiterer Kontext zu Ihrem Unternehmen",
  teamSkillsPh: "Kompetenzen (komma-getrennt)",
  BUSINESS_STATES: [
    { value: "idea", label: "Idee" },
    { value: "first_research", label: "Erste Recherche" },
    { value: "investor_search", label: "Investorensuche" },
    { value: "launch", label: "Launch / Gründung" },
    { value: "young_business", label: "Junges Unternehmen" },
    { value: "growing_business", label: "Wachsendes Unternehmen" },
    { value: "scaling_business", label: "Skalierung" },
    { value: "established", label: "Etabliert" },
    { value: "ai_usage", label: "KI-Nutzung (Fokus auf KI im Unternehmen)" },
  ],
  GOALS: [
    { value: "validate_idea", label: "Idee validieren" },
    { value: "market_research", label: "Marktforschung" },
    { value: "secure_funding", label: "Finanzierung sichern" },
    { value: "launch_product", label: "Produkt/Dienst launch" },
    { value: "grow_customers", label: "Kundenbasis ausbauen" },
    { value: "scale_operations", label: "Operations skalieren" },
    { value: "expand_markets", label: "Neue Märkte" },
    { value: "profitability", label: "Profitabilität steigern" },
    { value: "build_team", label: "Team aufbauen" },
    { value: "supplier_list", label: "Lieferantenliste" },
    { value: "real_estate", label: "Immobilien" },
  ],
};

export function getIntakeFormCopy(locale: Locale): IntakeFormCopy {
  return locale === "de" ? DE : EN;
}

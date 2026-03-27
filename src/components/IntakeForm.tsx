"use client";

import { useState } from "react";

export type ProductRow = { name: string; sku?: string; price: string; unit?: string; notes?: string };
export type SupplierRow = { material: string; supplier?: string; pricePerUnit: string; unit: string; notes?: string };
export type TeamRow = { name: string; role: string; skills: string; hoursPerWeek?: string; salary?: string };

const inputClass =
  "w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";
const labelClass = "block text-sm font-semibold text-zinc-700 dark:text-zinc-200";
const dbColumnClass = "ml-2 text-xs font-mono font-normal text-zinc-500 dark:text-zinc-400";

const BUSINESS_STATES = [
  { value: "idea", label: "Idea" },
  { value: "first_research", label: "First research" },
  { value: "investor_search", label: "Investor search" },
  { value: "launch", label: "Launch / Startup" },
  { value: "young_business", label: "Young business" },
  { value: "growing_business", label: "Growing business" },
  { value: "scaling_business", label: "Scaling business" },
  { value: "established", label: "Established" },
] as const;

const GOALS = [
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
] as const;

function FieldCheckboxes({
  options,
  existing,
}: {
  options: { name: string; label: string }[];
  existing?: Record<string, unknown>;
}) {
  const checked = (existing?.ai_requests as string[] | undefined) ?? [];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2 text-xs dark:border-teal-800 dark:bg-teal-950/20">
      {options.map((opt) => (
        <label key={opt.name} className="flex items-center gap-2">
          <input
            type="checkbox"
            name="ai_request"
            value={opt.name}
            defaultChecked={checked.includes(opt.name)}
            className="rounded border-zinc-300"
          />
          <span className="text-teal-800 dark:text-teal-200">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export function IntakeForm({
  existing,
  submitAction,
  hiddenFields,
}: {
  existing: Record<string, unknown>;
  submitAction: (formData: FormData) => Promise<void>;
  hiddenFields?: Record<string, string>;
}) {
  const [products, setProducts] = useState<ProductRow[]>(
    (existing.products as ProductRow[] | undefined) ?? [{ name: "", price: "", unit: "" }]
  );
  const [suppliers, setSuppliers] = useState<SupplierRow[]>(
    (existing.suppliers as SupplierRow[] | undefined) ?? [{ material: "", pricePerUnit: "", unit: "kg" }]
  );
  const [team, setTeam] = useState<TeamRow[]>(
    (existing.team as TeamRow[] | undefined) ?? [{ name: "", role: "", skills: "" }]
  );
  const addTeam = () => setTeam((t) => [...t, { name: "", role: "", skills: "" }]);
  const [productionSteps, setProductionSteps] = useState<string>(
    (existing.production_steps as string) ?? ""
  );

  const addProduct = () => setProducts((p) => [...p, { name: "", price: "", unit: "" }]);
  const removeProduct = (i: number) => {
    if (!confirm("Remove this product from the list?")) return;
    setProducts((p) => p.filter((_, j) => j !== i));
  };
  const updateProduct = (i: number, f: keyof ProductRow, v: string) =>
    setProducts((p) => p.map((row, j) => (j === i ? { ...row, [f]: v } : row)));

  const addSupplier = () =>
    setSuppliers((s) => [...s, { material: "", pricePerUnit: "", unit: "kg" }]);
  const removeSupplier = (i: number) => {
    if (!confirm("Remove this supplier from the list?")) return;
    setSuppliers((s) => s.filter((_, j) => j !== i));
  };
  const updateSupplier = (i: number, f: keyof SupplierRow, v: string) =>
    setSuppliers((s) => s.map((row, j) => (j === i ? { ...row, [f]: v } : row)));

  const removeTeam = (i: number) => {
    if (!confirm("Remove this team member from the list?")) return;
    setTeam((t) => t.filter((_, j) => j !== i));
  };
  const updateTeam = (i: number, f: keyof TeamRow, v: string) =>
    setTeam((t) => t.map((row, j) => (j === i ? { ...row, [f]: v } : row)));

  return (
    <form
      action={async (fd) => {
        fd.set("products_json", JSON.stringify(products.filter((p) => p.name || p.price)));
        fd.set("suppliers_json", JSON.stringify(suppliers.filter((s) => s.material || s.pricePerUnit)));
        fd.set("team_json", JSON.stringify(team.filter((t) => t.name || t.role || t.skills || t.salary)));
        fd.set("production_steps", productionSteps);
        if (hiddenFields) {
          for (const [k, v] of Object.entries(hiddenFields)) fd.set(k, v);
        }
        await submitAction(fd);
      }}
      className="space-y-10"
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {/* Section 0: Business state & goals */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Business state & goals
          <span className={dbColumnClass}>answersJson: business_state, goals</span>
        </h2>
        <div>
          <label className={labelClass}>Where is your business right now?</label>
          <select name="business_state" defaultValue={String(existing.business_state ?? "")} className={`mt-2 ${inputClass}`}>
            <option value="">— Select —</option>
            {BUSINESS_STATES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Goals (select all that apply)</label>
          <div className="mt-2 flex flex-wrap gap-3">
            {GOALS.map((g) => {
              const goalsArr = Array.isArray(existing.goals) ? existing.goals : typeof existing.goals === "string" ? [existing.goals] : [];
              return (
                <label key={g.value} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                  <input type="checkbox" name="goals" value={g.value} defaultChecked={goalsArr.includes(g.value)} className="rounded" />
                  <span>{g.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 1: Basics */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          1. Company basics
          <span className={dbColumnClass}>answersJson: company_name, location, website, offer, usp, customers, market_reach, ai_requests</span>
        </h2>
        <div>
          <label className={labelClass}>Company name</label>
          <input name="company_name" defaultValue={String(existing.company_name ?? "")} className={`mt-2 ${inputClass}`} placeholder="Acme Inc" />
        </div>
        <div>
          <label className={labelClass}>Location (city, country)</label>
          <input name="location" defaultValue={String(existing.location ?? "")} className={`mt-2 ${inputClass}`} placeholder="Berlin, Germany" />
          <FieldCheckboxes options={[{ name: "find_real_estate", label: "Find real estate for the business" }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>Website URL</label>
          <input name="website" type="url" defaultValue={String(existing.website ?? "")} className={`mt-2 ${inputClass}`} placeholder="https://example.com" />
        </div>
        <div>
          <label className={labelClass}>What do you offer?</label>
          <textarea name="offer" rows={3} defaultValue={String(existing.offer ?? "")} className={`mt-2 ${inputClass}`} placeholder="Product/service description" />
          <FieldCheckboxes options={[{ name: "research_market_pricing", label: "Research market pricing" }, { name: "find_best_positioning", label: "Find best product positioning" }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>Unique Selling Proposition (USP)</label>
          <textarea name="usp" rows={2} defaultValue={String(existing.usp ?? "")} className={`mt-2 ${inputClass}`} placeholder="What makes you different from competitors?" />
          <FieldCheckboxes options={[{ name: "research_competitor_usps", label: "Research competitor USPs" }, { name: "find_best_usp", label: "Find best USP for market" }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>Who are your customers?</label>
          <input name="customers" defaultValue={String(existing.customers ?? "")} className={`mt-2 ${inputClass}`} placeholder="B2B SaaS, SMBs, etc." />
          <FieldCheckboxes options={[{ name: "research_target_demographics", label: "Research target demographics" }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>Market reach</label>
          <select name="market_reach" defaultValue={String(existing.market_reach ?? "national")} className={`mt-2 ${inputClass}`}>
            <option value="local">Local only</option>
            <option value="national">National</option>
            <option value="international">International</option>
          </select>
        </div>
      </section>

      {/* Section 2: Product catalogue */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          2. Product catalogue (all products with prices)
          <span className={dbColumnClass}>answersJson: products</span>
        </h2>
        <FieldCheckboxes options={[{ name: "find_best_product_mix", label: "Find best product mix" }, { name: "research_product_pricing", label: "Research market pricing" }]} existing={existing} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-2 text-left">Product name</th>
                <th className="p-2 text-left">SKU / Code</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-left">Notes</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-2">
                    <input value={p.name} onChange={(e) => updateProduct(i, "name", e.target.value)} className={inputClass} placeholder="Product name" />
                  </td>
                  <td className="p-2">
                    <input value={p.sku ?? ""} onChange={(e) => updateProduct(i, "sku", e.target.value)} className={inputClass} placeholder="SKU" />
                  </td>
                  <td className="p-2">
                    <input value={p.price} onChange={(e) => updateProduct(i, "price", e.target.value)} className={inputClass} placeholder="0.00" type="number" step="any" />
                  </td>
                  <td className="p-2">
                    <input value={p.unit ?? ""} onChange={(e) => updateProduct(i, "unit", e.target.value)} className={inputClass} placeholder="ea, kg, m" />
                  </td>
                  <td className="p-2">
                    <input value={p.notes ?? ""} onChange={(e) => updateProduct(i, "notes", e.target.value)} className={inputClass} placeholder="Notes" />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeProduct(i)} className="text-red-600 hover:underline text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addProduct} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          + Add product
        </button>
      </section>

      {/* Section 3: Suppliers & materials */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          3. Supplier materials & price per unit
          <span className={dbColumnClass}>answersJson: suppliers</span>
        </h2>
        <FieldCheckboxes options={[{ name: "find_supplier_whitelabel", label: "Find supplier for whitelabeling" }, { name: "find_supplier_ingredients", label: "Find supplier for ingredients" }]} existing={existing} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Material, supplier, price per unit (G/kg/m/ft)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-2 text-left">Material</th>
                <th className="p-2 text-left">Supplier</th>
                <th className="p-2 text-left">Price per unit</th>
                <th className="p-2 text-left">Unit (G/kg/m/ft)</th>
                <th className="p-2 text-left">Notes</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-2">
                    <input value={s.material} onChange={(e) => updateSupplier(i, "material", e.target.value)} className={inputClass} placeholder="Material" />
                  </td>
                  <td className="p-2">
                    <input value={s.supplier ?? ""} onChange={(e) => updateSupplier(i, "supplier", e.target.value)} className={inputClass} placeholder="Supplier" />
                  </td>
                  <td className="p-2">
                    <input value={s.pricePerUnit} onChange={(e) => updateSupplier(i, "pricePerUnit", e.target.value)} className={inputClass} placeholder="0.00" type="number" step="any" />
                  </td>
                  <td className="p-2">
                    <select value={s.unit} onChange={(e) => updateSupplier(i, "unit", e.target.value)} className={inputClass}>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="m">m</option>
                      <option value="ft">ft</option>
                      <option value="ea">ea</option>
                      <option value="L">L</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <input value={s.notes ?? ""} onChange={(e) => updateSupplier(i, "notes", e.target.value)} className={inputClass} placeholder="Notes" />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeSupplier(i)} className="text-red-600 hover:underline text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addSupplier} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          + Add supplier/material
        </button>
      </section>

      {/* Section 4: Production steps */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          4. Production steps
          <span className={dbColumnClass}>answersJson: production_steps</span>
        </h2>
        <FieldCheckboxes options={[{ name: "suggest_production_workflow", label: "Suggest production workflow" }]} existing={existing} />
        <textarea
          value={productionSteps}
          onChange={(e) => setProductionSteps(e.target.value)}
          name="production_steps_ui"
          rows={6}
          className={inputClass}
          placeholder="List each production step, e.g.&#10;1. Sourcing raw materials&#10;2. Cutting & assembly&#10;3. Quality check&#10;4. Packaging"
        />
      </section>

      {/* Section 5: Team & skills */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          5. Team members & skills
          <span className={dbColumnClass}>answersJson: team</span>
        </h2>
        <FieldCheckboxes options={[{ name: "suggest_roles_salaries", label: "Suggest roles & salaries for location" }]} existing={existing} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Get suggested roles and average salaries for your location.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Skills</th>
                <th className="p-2 text-left">Hours/week</th>
                <th className="p-2 text-left">Salary (avg for location)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {team.map((t, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-2">
                    <input value={t.name} onChange={(e) => updateTeam(i, "name", e.target.value)} className={inputClass} placeholder="Name" />
                  </td>
                  <td className="p-2">
                    <input value={t.role} onChange={(e) => updateTeam(i, "role", e.target.value)} className={inputClass} placeholder="Role" />
                  </td>
                  <td className="p-2">
                    <input value={t.skills} onChange={(e) => updateTeam(i, "skills", e.target.value)} className={inputClass} placeholder="Skills (comma-separated)" />
                  </td>
                  <td className="p-2">
                    <input value={t.hoursPerWeek ?? ""} onChange={(e) => updateTeam(i, "hoursPerWeek", e.target.value)} className={inputClass} placeholder="40" type="number" />
                  </td>
                  <td className="p-2">
                    <input value={t.salary ?? ""} onChange={(e) => updateTeam(i, "salary", e.target.value)} className={inputClass} placeholder="e.g. 45000" type="number" step="any" />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeTeam(i)} className="text-red-600 hover:underline text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addTeam} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          + Add team member
        </button>
      </section>

      {/* Section 6: Financials & cost factors */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          6. Financials & cost factors
          <span className={dbColumnClass}>answersJson: revenue_last_month, marketing_spend, fixed_costs, variable_costs, cost_excel → Document</span>
        </h2>
        <FieldCheckboxes options={[{ name: "benchmark_industry", label: "Benchmark against industry" }]} existing={existing} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Revenue last month</label>
            <input name="revenue_last_month" type="number" step="any" defaultValue={existing.revenue_last_month != null ? String(existing.revenue_last_month) : ""} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Marketing spend (monthly)</label>
            <input name="marketing_spend" type="number" step="any" defaultValue={existing.marketing_spend != null ? String(existing.marketing_spend) : ""} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Fixed costs (rent, utilities, etc.)</label>
            <input name="fixed_costs" type="number" step="any" defaultValue={existing.fixed_costs != null ? String(existing.fixed_costs) : ""} className={`mt-2 ${inputClass}`} placeholder="Monthly" />
          </div>
          <div>
            <label className={labelClass}>Variable costs (COGS, shipping, etc.)</label>
            <input name="variable_costs" type="number" step="any" defaultValue={existing.variable_costs != null ? String(existing.variable_costs) : ""} className={`mt-2 ${inputClass}`} placeholder="Monthly" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Upload Excel: one month revenue & costs</label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Upload a spreadsheet with revenue and cost breakdown for one representative month.</p>
          <input name="cost_excel" type="file" accept=".xlsx,.xls,.csv" className={`mt-2 ${inputClass}`} />
        </div>
      </section>

      {/* Section 7: Operations & more */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          7. Operations & growth
          <span className={dbColumnClass}>answersJson: team_size, stage, competitors, growth_challenge, differentiators, sales_channels, lead_time, constraints</span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Team size</label>
            <input name="team_size" type="number" defaultValue={existing.team_size != null ? String(existing.team_size) : ""} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Stage</label>
            <select name="stage" defaultValue={String(existing.stage ?? "early_revenue")} className={`mt-2 ${inputClass}`}>
              <option value="pre_revenue">Pre-revenue</option>
              <option value="early_revenue">Early revenue</option>
              <option value="growth">Growth</option>
              <option value="scaling">Scaling</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Main competitors</label>
          <textarea name="competitors" rows={2} defaultValue={String(existing.competitors ?? "")} className={`mt-2 ${inputClass}`} placeholder="Who are your main competitors?" />
          <FieldCheckboxes options={[{ name: "find_main_competitors", label: "Find main competitors" }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>Biggest growth challenge right now</label>
          <textarea name="growth_challenge" rows={2} defaultValue={String(existing.growth_challenge ?? "")} className={`mt-2 ${inputClass}`} placeholder="What is blocking growth?" />
        </div>
        <div>
          <label className={labelClass}>Key differentiators vs competitors</label>
          <textarea name="differentiators" rows={2} defaultValue={String(existing.differentiators ?? "")} className={`mt-2 ${inputClass}`} placeholder="Price, quality, service, etc." />
        </div>
        <div>
          <label className={labelClass}>Sales channels (where do you sell?)</label>
          <input name="sales_channels" defaultValue={String(existing.sales_channels ?? "")} className={`mt-2 ${inputClass}`} placeholder="e.g. Website, Amazon, retail, wholesale" />
        </div>
        <div>
          <label className={labelClass}>Lead time (order to delivery)</label>
          <input name="lead_time" defaultValue={String(existing.lead_time ?? "")} className={`mt-2 ${inputClass}`} placeholder="e.g. 2 weeks, 24h" />
        </div>
        <div>
          <label className={labelClass}>Constraints (budget, capacity, etc.)</label>
          <textarea name="constraints" rows={2} defaultValue={String(existing.constraints ?? "")} className={`mt-2 ${inputClass}`} placeholder="e.g. Limited budget, 2-person team" />
        </div>
      </section>

      {/* Section 8: Additional context */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          8. Additional context
          <span className={dbColumnClass}>answersJson: funding_status, legal_structure, years_in_business, target_market, acquisition_channels, aov, retention_churn, additional_notes</span>
        </h2>
        <div>
          <label className={labelClass}>Funding / investment status</label>
          <input name="funding_status" defaultValue={String(existing.funding_status ?? "")} className={`mt-2 ${inputClass}`} placeholder="Bootstrapped, seed, Series A, etc." />
        </div>
        <div>
          <label className={labelClass}>Legal structure</label>
          <select name="legal_structure" defaultValue={String(existing.legal_structure ?? "")} className={`mt-2 ${inputClass}`}>
            <option value="">—</option>
            <option value="sole_proprietorship">Sole proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="llc">LLC</option>
            <option value="corporation">Corporation</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Years in business</label>
          <input name="years_in_business" type="number" step="0.5" defaultValue={existing.years_in_business != null ? String(existing.years_in_business) : ""} className={`mt-2 ${inputClass}`} placeholder="2.5" />
        </div>
        <div>
          <label className={labelClass}>Target market size (TAM/SAM/SOM if known)</label>
          <input name="target_market" defaultValue={String(existing.target_market ?? "")} className={`mt-2 ${inputClass}`} placeholder="e.g. €50M TAM, €5M SAM" />
          <FieldCheckboxes options={[{ name: "research_tam_sam_som", label: "Research TAM/SAM/SOM" }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>Main customer acquisition channels</label>
          <input name="acquisition_channels" defaultValue={String(existing.acquisition_channels ?? "")} className={`mt-2 ${inputClass}`} placeholder="e.g. Organic, paid ads, referrals" />
          <FieldCheckboxes options={[{ name: "find_best_acquisition_channels", label: "Find best acquisition channels" }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>Average order value (AOV)</label>
          <input name="aov" type="number" step="any" defaultValue={existing.aov != null ? String(existing.aov) : ""} className={`mt-2 ${inputClass}`} placeholder="e.g. 150" />
        </div>
        <div>
          <label className={labelClass}>Customer retention / churn (if known)</label>
          <input name="retention_churn" defaultValue={String(existing.retention_churn ?? "")} className={`mt-2 ${inputClass}`} placeholder="e.g. 85% retention, 5% monthly churn" />
        </div>
        <div>
          <label className={labelClass}>Anything else we should know?</label>
          <textarea name="additional_notes" rows={4} defaultValue={String(existing.additional_notes ?? "")} className={`mt-2 ${inputClass}`} placeholder="Other context that helps us understand your business" />
        </div>
      </section>

      <button type="submit" className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
        Speichern
      </button>
    </form>
  );
}

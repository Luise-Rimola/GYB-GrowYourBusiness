"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getIntakeFormCopy } from "@/lib/intakeFormLocale";

export type ProductRow = { name: string; sku?: string; price: string; unit?: string; notes?: string };
export type SupplierRow = { material: string; supplier?: string; pricePerUnit: string; unit: string; notes?: string };
export type TeamRow = { name: string; role: string; skills: string; hoursPerWeek?: string; salary?: string };

const inputClass =
  "w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";
const labelClass = "block text-sm font-semibold text-zinc-700 dark:text-zinc-200";

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
  assistantEmbed,
}: {
  existing: Record<string, unknown>;
  submitAction: (formData: FormData) => Promise<void>;
  hiddenFields?: Record<string, string>;
  assistantEmbed?: boolean;
}) {
  const { locale } = useLanguage();
  const c = getIntakeFormCopy(locale);
  const [mobileEdit, setMobileEdit] = useState<
    null | { kind: "product" | "supplier" | "team"; index: number }
  >(null);

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
    if (!confirm(c.confirmRemoveProduct)) return false;
    setProducts((p) => p.filter((_, j) => j !== i));
    return true;
  };
  const updateProduct = (i: number, f: keyof ProductRow, v: string) =>
    setProducts((p) => p.map((row, j) => (j === i ? { ...row, [f]: v } : row)));

  const addSupplier = () =>
    setSuppliers((s) => [...s, { material: "", pricePerUnit: "", unit: "kg" }]);
  const removeSupplier = (i: number) => {
    if (!confirm(c.confirmRemoveSupplier)) return false;
    setSuppliers((s) => s.filter((_, j) => j !== i));
    return true;
  };
  const updateSupplier = (i: number, f: keyof SupplierRow, v: string) =>
    setSuppliers((s) => s.map((row, j) => (j === i ? { ...row, [f]: v } : row)));

  const removeTeam = (i: number) => {
    if (!confirm(c.confirmRemoveTeam)) return false;
    setTeam((t) => t.filter((_, j) => j !== i));
    return true;
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
      {assistantEmbed ? <input type="hidden" name="assistant_embed" value="1" /> : null}
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {/* Section 0: Business state & goals */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.businessStateGoals}</h2>
        <div>
          <label className={labelClass}>{c.whereBusiness}</label>
          <select name="business_state" defaultValue={String(existing.business_state ?? "")} className={`mt-2 ${inputClass}`}>
            <option value="">{c.selectPlaceholder}</option>
            {c.BUSINESS_STATES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{c.goalsLabel}</label>
          <div className="mt-2 flex flex-wrap gap-3">
            {c.GOALS.map((g) => {
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
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.companyBasics}</h2>
        <div>
          <label className={labelClass}>{c.companyName}</label>
          <input name="company_name" defaultValue={String(existing.company_name ?? "")} className={`mt-2 ${inputClass}`} placeholder="Acme Inc" />
        </div>
        <div>
          <label className={labelClass}>{c.location}</label>
          <input name="location" defaultValue={String(existing.location ?? "")} className={`mt-2 ${inputClass}`} placeholder="Berlin, Germany" />
          <FieldCheckboxes options={[{ name: "find_real_estate", label: c.findRealEstate }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>{c.website}</label>
          <input name="website" type="url" defaultValue={String(existing.website ?? "")} className={`mt-2 ${inputClass}`} placeholder="https://example.com" />
        </div>
        <div>
          <label className={labelClass}>{c.offer}</label>
          <textarea name="offer" rows={3} defaultValue={String(existing.offer ?? "")} className={`mt-2 ${inputClass}`} placeholder="Product/service description" />
          <FieldCheckboxes
            options={[
              { name: "research_market_pricing", label: c.researchMarketPricing },
              { name: "find_best_positioning", label: c.findBestPositioning },
            ]}
            existing={existing}
          />
        </div>
        <div>
          <label className={labelClass}>{c.usp}</label>
          <textarea name="usp" rows={2} defaultValue={String(existing.usp ?? "")} className={`mt-2 ${inputClass}`} placeholder="What makes you different from competitors?" />
          <FieldCheckboxes
            options={[
              { name: "research_competitor_usps", label: c.researchCompetitorUsps },
              { name: "find_best_usp", label: c.findBestUsp },
            ]}
            existing={existing}
          />
        </div>
        <div>
          <label className={labelClass}>{c.customers}</label>
          <input name="customers" defaultValue={String(existing.customers ?? "")} className={`mt-2 ${inputClass}`} placeholder="B2B SaaS, SMBs, etc." />
          <FieldCheckboxes options={[{ name: "research_target_demographics", label: c.researchTargetDemographics }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>{c.marketReach}</label>
          <select name="market_reach" defaultValue={String(existing.market_reach ?? "national")} className={`mt-2 ${inputClass}`}>
            <option value="local">{c.localNatIntl.local}</option>
            <option value="national">{c.localNatIntl.national}</option>
            <option value="international">{c.localNatIntl.international}</option>
          </select>
        </div>
      </section>

      {/* Section 2: Product catalogue */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.productCatalog}</h2>
        <FieldCheckboxes
          options={[
            { name: "find_best_product_mix", label: c.findBestProductMix },
            { name: "research_product_pricing", label: c.researchProductPricing },
          ]}
          existing={existing}
        />
        <div className="space-y-2 md:hidden">
          {products.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMobileEdit({ kind: "product", index: i })}
              className="w-full rounded-xl border border-zinc-200 p-3 text-left text-sm dark:border-zinc-700"
            >
              <div className="font-medium text-zinc-900 dark:text-zinc-50">{p.name || c.tapToEditRow}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {c.price}: {p.price || "—"} · {c.unit}: {p.unit || "—"}
              </div>
            </button>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-2 text-left">{c.prodName}</th>
                <th className="p-2 text-left">{c.sku}</th>
                <th className="p-2 text-left">{c.price}</th>
                <th className="p-2 text-left">{c.unit}</th>
                <th className="p-2 text-left">{c.notes}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-2">
                    <input value={p.name} onChange={(e) => updateProduct(i, "name", e.target.value)} className={inputClass} placeholder={c.prodName} />
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
                    <input value={p.notes ?? ""} onChange={(e) => updateProduct(i, "notes", e.target.value)} className={inputClass} placeholder={c.notes} />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeProduct(i)} className="text-xs text-red-600 hover:underline">
                      {c.remove}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addProduct} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          {c.addProduct}
        </button>
      </section>

      {/* Section 3: Suppliers & materials */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.suppliers}</h2>
        <FieldCheckboxes
          options={[
            { name: "find_supplier_whitelabel", label: c.findSupplierWhitelabel },
            { name: "find_supplier_ingredients", label: c.findSupplierIngredients },
          ]}
          existing={existing}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.suppliersHint}</p>
        <div className="space-y-2 md:hidden">
          {suppliers.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMobileEdit({ kind: "supplier", index: i })}
              className="w-full rounded-xl border border-zinc-200 p-3 text-left text-sm dark:border-zinc-700"
            >
              <div className="font-medium text-zinc-900 dark:text-zinc-50">{s.material || c.tapToEditRow}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {s.supplier || "—"} · {s.pricePerUnit} / {s.unit}
              </div>
            </button>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-2 text-left">{c.material}</th>
                <th className="p-2 text-left">{c.supplier}</th>
                <th className="p-2 text-left">{c.pricePerUnit}</th>
                <th className="p-2 text-left">{c.unitCol}</th>
                <th className="p-2 text-left">{c.notes}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-2">
                    <input value={s.material} onChange={(e) => updateSupplier(i, "material", e.target.value)} className={inputClass} placeholder={c.material} />
                  </td>
                  <td className="p-2">
                    <input value={s.supplier ?? ""} onChange={(e) => updateSupplier(i, "supplier", e.target.value)} className={inputClass} placeholder={c.supplier} />
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
                    <input value={s.notes ?? ""} onChange={(e) => updateSupplier(i, "notes", e.target.value)} className={inputClass} placeholder={c.notes} />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeSupplier(i)} className="text-xs text-red-600 hover:underline">
                      {c.remove}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addSupplier} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          {c.addSupplier}
        </button>
      </section>

      {/* Section 4: Production steps */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.productionSteps}</h2>
        <FieldCheckboxes options={[{ name: "suggest_production_workflow", label: c.suggestProductionWorkflow }]} existing={existing} />
        <textarea
          value={productionSteps}
          onChange={(e) => setProductionSteps(e.target.value)}
          name="production_steps_ui"
          rows={6}
          className={inputClass}
          placeholder={c.prodStepsPlaceholder}
        />
      </section>

      {/* Section 5: Team & skills */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.team}</h2>
        <FieldCheckboxes options={[{ name: "suggest_roles_salaries", label: c.suggestRolesSalaries }]} existing={existing} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.suggestRolesSalariesHint}</p>
        <div className="space-y-2 md:hidden">
          {team.map((tm, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMobileEdit({ kind: "team", index: i })}
              className="w-full rounded-xl border border-zinc-200 p-3 text-left text-sm dark:border-zinc-700"
            >
              <div className="font-medium text-zinc-900 dark:text-zinc-50">{tm.name || tm.role || c.tapToEditRow}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{tm.role || "—"}</div>
            </button>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-2 text-left">{c.name}</th>
                <th className="p-2 text-left">{c.role}</th>
                <th className="p-2 text-left">{c.skills}</th>
                <th className="p-2 text-left">{c.hoursWeek}</th>
                <th className="p-2 text-left">{c.salary}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {team.map((tm, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-2">
                    <input value={tm.name} onChange={(e) => updateTeam(i, "name", e.target.value)} className={inputClass} placeholder={c.name} />
                  </td>
                  <td className="p-2">
                    <input value={tm.role} onChange={(e) => updateTeam(i, "role", e.target.value)} className={inputClass} placeholder={c.role} />
                  </td>
                  <td className="p-2">
                    <input value={tm.skills} onChange={(e) => updateTeam(i, "skills", e.target.value)} className={inputClass} placeholder={c.teamSkillsPh} />
                  </td>
                  <td className="p-2">
                    <input value={tm.hoursPerWeek ?? ""} onChange={(e) => updateTeam(i, "hoursPerWeek", e.target.value)} className={inputClass} placeholder="40" type="number" />
                  </td>
                  <td className="p-2">
                    <input value={tm.salary ?? ""} onChange={(e) => updateTeam(i, "salary", e.target.value)} className={inputClass} placeholder="45000" type="number" step="any" />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeTeam(i)} className="text-xs text-red-600 hover:underline">
                      {c.remove}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addTeam} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          {c.addTeam}
        </button>
      </section>

      {/* Section 6: Financials & cost factors */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.financials}</h2>
        <FieldCheckboxes options={[{ name: "benchmark_industry", label: c.benchmarkIndustry }]} existing={existing} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>{c.revenueLastMonth}</label>
            <input name="revenue_last_month" type="number" step="any" defaultValue={existing.revenue_last_month != null ? String(existing.revenue_last_month) : ""} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>{c.marketingSpend}</label>
            <input name="marketing_spend" type="number" step="any" defaultValue={existing.marketing_spend != null ? String(existing.marketing_spend) : ""} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>{c.fixedCosts}</label>
            <input name="fixed_costs" type="number" step="any" defaultValue={existing.fixed_costs != null ? String(existing.fixed_costs) : ""} className={`mt-2 ${inputClass}`} placeholder={c.placeholderMonthly} />
          </div>
          <div>
            <label className={labelClass}>{c.variableCosts}</label>
            <input name="variable_costs" type="number" step="any" defaultValue={existing.variable_costs != null ? String(existing.variable_costs) : ""} className={`mt-2 ${inputClass}`} placeholder={c.placeholderMonthly} />
          </div>
        </div>
        <div>
          <label className={labelClass}>{c.uploadExcel}</label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{c.uploadExcelHelp}</p>
          <input name="cost_excel" type="file" accept=".xlsx,.xls,.csv" className={`mt-2 ${inputClass}`} />
        </div>
      </section>

      {/* Section 7: Operations & more */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.operations}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>{c.teamSize}</label>
            <input name="team_size" type="number" defaultValue={existing.team_size != null ? String(existing.team_size) : ""} className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>{c.stage}</label>
            <select name="stage" defaultValue={String(existing.stage ?? "early_revenue")} className={`mt-2 ${inputClass}`}>
              <option value="pre_revenue">{c.stageOpts.pre}</option>
              <option value="early_revenue">{c.stageOpts.early}</option>
              <option value="growth">{c.stageOpts.growth}</option>
              <option value="scaling">{c.stageOpts.scaling}</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>{c.competitors}</label>
          <textarea name="competitors" rows={2} defaultValue={String(existing.competitors ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.competitorsPh} />
          <FieldCheckboxes options={[{ name: "find_main_competitors", label: c.findMainCompetitors }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>{c.growthChallenge}</label>
          <textarea name="growth_challenge" rows={2} defaultValue={String(existing.growth_challenge ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.growthChallengePh} />
        </div>
        <div>
          <label className={labelClass}>{c.differentiators}</label>
          <textarea name="differentiators" rows={2} defaultValue={String(existing.differentiators ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.differentiatorsPh} />
        </div>
        <div>
          <label className={labelClass}>{c.salesChannels}</label>
          <input name="sales_channels" defaultValue={String(existing.sales_channels ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.salesChannelsPh} />
        </div>
        <div>
          <label className={labelClass}>{c.leadTime}</label>
          <input name="lead_time" defaultValue={String(existing.lead_time ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.leadTimePh} />
        </div>
        <div>
          <label className={labelClass}>{c.constraints}</label>
          <textarea name="constraints" rows={2} defaultValue={String(existing.constraints ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.constraintsPh} />
        </div>
      </section>

      {/* Section 8: Additional context */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.additional}</h2>
        <div>
          <label className={labelClass}>{c.funding}</label>
          <input name="funding_status" defaultValue={String(existing.funding_status ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.fundingPh} />
        </div>
        <div>
          <label className={labelClass}>{c.legalStructure}</label>
          <select name="legal_structure" defaultValue={String(existing.legal_structure ?? "")} className={`mt-2 ${inputClass}`}>
            <option value="">{c.legalEmpty}</option>
            <option value="sole_proprietorship">{c.legalSole}</option>
            <option value="partnership">{c.legalPartnership}</option>
            <option value="llc">{c.legalLlc}</option>
            <option value="corporation">{c.legalCorp}</option>
            <option value="other">{c.legalOther}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{c.yearsInBusiness}</label>
          <input name="years_in_business" type="number" step="0.5" defaultValue={existing.years_in_business != null ? String(existing.years_in_business) : ""} className={`mt-2 ${inputClass}`} placeholder="2.5" />
        </div>
        <div>
          <label className={labelClass}>{c.targetMarket}</label>
          <input name="target_market" defaultValue={String(existing.target_market ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.targetMarketPh} />
          <FieldCheckboxes options={[{ name: "research_tam_sam_som", label: c.researchTamSamSom }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>{c.acquisition}</label>
          <input name="acquisition_channels" defaultValue={String(existing.acquisition_channels ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.acquisitionPh} />
          <FieldCheckboxes options={[{ name: "find_best_acquisition_channels", label: c.findBestAcquisitionChannels }]} existing={existing} />
        </div>
        <div>
          <label className={labelClass}>{c.socialMediaChannels}</label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{c.socialMediaChannelsHint}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {c.socialMediaChannelOptions.map((opt) => {
              const existingChannels = Array.isArray(existing.social_media_channels)
                ? (existing.social_media_channels as string[])
                : [];
              return (
                <label key={opt.value} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                  <input type="checkbox" name="social_media_channels" value={opt.value} defaultChecked={existingChannels.includes(opt.value)} className="rounded" />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelClass}>{c.aov}</label>
          <input name="aov" type="number" step="any" defaultValue={existing.aov != null ? String(existing.aov) : ""} className={`mt-2 ${inputClass}`} placeholder={c.aovPh} />
        </div>
        <div>
          <label className={labelClass}>{c.retention}</label>
          <input name="retention_churn" defaultValue={String(existing.retention_churn ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.retentionPh} />
        </div>
        <div>
          <label className={labelClass}>{c.anythingElse}</label>
          <textarea name="additional_notes" rows={4} defaultValue={String(existing.additional_notes ?? "")} className={`mt-2 ${inputClass}`} placeholder={c.additionalNotesPh} />
        </div>
      </section>

      {mobileEdit ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal aria-labelledby="intake-mobile-edit-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={c.cancel}
            onClick={() => setMobileEdit(null)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-4 pb-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 id="intake-mobile-edit-title" className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {c.editRowTitle}
            </h3>
            {mobileEdit.kind === "product" && products[mobileEdit.index] != null ? (
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>{c.prodName}</label>
                  <input
                    value={products[mobileEdit.index]!.name}
                    onChange={(e) => updateProduct(mobileEdit.index, "name", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.sku}</label>
                  <input
                    value={products[mobileEdit.index]!.sku ?? ""}
                    onChange={(e) => updateProduct(mobileEdit.index, "sku", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.price}</label>
                  <input
                    value={products[mobileEdit.index]!.price}
                    onChange={(e) => updateProduct(mobileEdit.index, "price", e.target.value)}
                    type="number"
                    step="any"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.unit}</label>
                  <input
                    value={products[mobileEdit.index]!.unit ?? ""}
                    onChange={(e) => updateProduct(mobileEdit.index, "unit", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.notes}</label>
                  <input
                    value={products[mobileEdit.index]!.notes ?? ""}
                    onChange={(e) => updateProduct(mobileEdit.index, "notes", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 text-sm text-red-600 hover:underline"
                  onClick={() => {
                    if (removeProduct(mobileEdit.index)) setMobileEdit(null);
                  }}
                >
                  {c.remove}
                </button>
              </div>
            ) : null}
            {mobileEdit.kind === "supplier" && suppliers[mobileEdit.index] != null ? (
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>{c.material}</label>
                  <input
                    value={suppliers[mobileEdit.index]!.material}
                    onChange={(e) => updateSupplier(mobileEdit.index, "material", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.supplier}</label>
                  <input
                    value={suppliers[mobileEdit.index]!.supplier ?? ""}
                    onChange={(e) => updateSupplier(mobileEdit.index, "supplier", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.pricePerUnit}</label>
                  <input
                    value={suppliers[mobileEdit.index]!.pricePerUnit}
                    onChange={(e) => updateSupplier(mobileEdit.index, "pricePerUnit", e.target.value)}
                    type="number"
                    step="any"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.unitCol}</label>
                  <select
                    value={suppliers[mobileEdit.index]!.unit}
                    onChange={(e) => updateSupplier(mobileEdit.index, "unit", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                    <option value="ea">ea</option>
                    <option value="L">L</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{c.notes}</label>
                  <input
                    value={suppliers[mobileEdit.index]!.notes ?? ""}
                    onChange={(e) => updateSupplier(mobileEdit.index, "notes", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 text-sm text-red-600 hover:underline"
                  onClick={() => {
                    if (removeSupplier(mobileEdit.index)) setMobileEdit(null);
                  }}
                >
                  {c.remove}
                </button>
              </div>
            ) : null}
            {mobileEdit.kind === "team" && team[mobileEdit.index] != null ? (
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>{c.name}</label>
                  <input
                    value={team[mobileEdit.index]!.name}
                    onChange={(e) => updateTeam(mobileEdit.index, "name", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.role}</label>
                  <input
                    value={team[mobileEdit.index]!.role}
                    onChange={(e) => updateTeam(mobileEdit.index, "role", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.skills}</label>
                  <input
                    value={team[mobileEdit.index]!.skills}
                    onChange={(e) => updateTeam(mobileEdit.index, "skills", e.target.value)}
                    className={`mt-2 ${inputClass}`}
                    placeholder={c.teamSkillsPh}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.hoursWeek}</label>
                  <input
                    value={team[mobileEdit.index]!.hoursPerWeek ?? ""}
                    onChange={(e) => updateTeam(mobileEdit.index, "hoursPerWeek", e.target.value)}
                    type="number"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{c.salary}</label>
                  <input
                    value={team[mobileEdit.index]!.salary ?? ""}
                    onChange={(e) => updateTeam(mobileEdit.index, "salary", e.target.value)}
                    type="number"
                    step="any"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 text-sm text-red-600 hover:underline"
                  onClick={() => {
                    if (removeTeam(mobileEdit.index)) setMobileEdit(null);
                  }}
                >
                  {c.remove}
                </button>
              </div>
            ) : null}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                onClick={() => setMobileEdit(null)}
              >
                {c.saveRow}
              </button>
              <button type="button" className="rounded-xl border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-600" onClick={() => setMobileEdit(null)}>
                {c.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button type="submit" className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
        {c.save}
      </button>
    </form>
  );
}

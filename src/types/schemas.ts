import { z } from "zod";

const strategyIndicatorsSchema = z
  .record(
    z.string(),
    z
      .object({
        value: z.number(),
        confidence: z.number().min(0).max(1).optional(),
        rationale: z.string().optional(),
        evidence_grade: z.string().optional(),
      })
      .strict()
  )
  .optional();

export const businessModelInferenceSchema = z
  .object({
    business_model_type: z.string(),
    confidence: z.number().min(0).max(1),
    stage: z.string(),
    stage_confidence: z.number().min(0).max(1),
    rationale: z.array(z.string()),
  })
  .strict();

export const kpiSetSelectionSchema = z
  .object({
    selected_kpis: z.array(z.string()),
    kpi_tree: z.record(z.unknown()),
    missing_inputs: z.array(z.string()),
    rationale: z.array(z.string()),
  })
  .strict();

export const kpiQuestionsSchema = z
  .object({
    questions_simple: z.array(z.string()),
    mapping_to_kpi_keys: z.array(z.string()),
    default_estimates_if_unknown: z.array(z.string()),
  })
  .strict();

export const kpiAnswersSchema = z
  .object({
    answers: z.array(z.string()),
    mapping_to_kpi_keys: z.array(z.string()),
  })
  .strict();

export const kpiGapReportSchema = z
  .object({
    kpi_table: z.array(z.record(z.unknown())),
    top_gaps: z.array(z.record(z.unknown())),
    data_quality_alerts: z.array(z.string()),
  })
  .strict();

/** Scraped/researched business data for industry and location */
export const industryResearchSchema = z
  .object({
    industry: z.string(),
    location: z.string(),
    market_size_estimate: z.string().optional(),
    key_trends: z.array(z.string()),
    competitors: z.array(z.string()),
    regulations: z.array(z.string()).optional(),
    typical_metrics: z.record(z.unknown()).optional(),
    key_facts: z.array(z.object({
      fact: z.string(),
      source_hint: z.string().optional(),
    })),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const rootCauseTreesSchema = z
  .object({
    root_cause_trees: z.array(z.record(z.unknown())),
    risk_explanation: z.string().optional(),
  })
  .strict();

export const marketSnapshotSchema = z
  .object({
    segments: z.array(z.record(z.unknown())),
    competitors: z.array(z.record(z.unknown())),
    pricing_index: z.array(z.record(z.unknown())),
    demand_drivers: z.array(z.string()),
    risks: z.array(z.string()),
    sources_used: z.array(z.string()),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

/** Extended market research: Kaufverhalten, Angebot/Nachfrage, feasibility for pre-revenue */
export const marketResearchSchema = z
  .object({
    segments: z.array(z.record(z.unknown())),
    competitors: z.array(z.record(z.unknown())),
    pricing_index: z.array(z.record(z.unknown())),
    demand_drivers: z.array(z.string()),
    risks: z.array(z.string()),
    sources_used: z.array(z.string()),
    buyer_behavior: z.array(z.object({
      segment_or_trait: z.string(),
      behavior: z.string(),
      triggers: z.array(z.string()).optional(),
      sources: z.array(z.string()).optional(),
    })).optional(),
    supply_demand: z.object({
      supply_overview: z.string(),
      demand_overview: z.string(),
      balance_assessment: z.string(),
      sources: z.array(z.string()).optional(),
    }).optional(),
    feasibility_assessment: z.object({
      is_makeable: z.boolean().optional(),
      recommendation: z.enum(["recommended", "conditional", "not_recommended"]).optional(),
      rationale: z.string().optional(),
      key_blockers: z.array(z.string()).optional(),
      preconditions: z.array(z.string()).optional(),
    }).optional(),
    business_research_data: z.array(z.object({
      source_type: z.string(),
      description: z.string(),
      key_findings: z.array(z.string()),
      relevance: z.string().optional(),
    })).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

/** Single section of business plan (for multi-step workflow) */
const businessPlanSectionBase = z.object({
  content: z.string(),
  key_points: z.array(z.string()).optional(),
});

/** Accepts both flat { content, key_points } and wrapped { executive_summary: { content, ... } } from LLM */
export const businessPlanSectionSchema = z.union([
  businessPlanSectionBase.strict(),
  z
    .object({
      executive_summary: z.object({
        content: z.string(),
        company_name: z.string().optional(),
        key_points: z.array(z.string()).optional(),
      }),
    })
    .strict(),
]).transform((val) => {
  if ("executive_summary" in val) {
    return { content: val.executive_summary.content, key_points: val.executive_summary.key_points };
  }
  return val;
});

/** Single month in the financial projection – industry-agnostic cost categories */
export const monthlyProjectionItemSchema = z.object({
  month: z.string(),
  potential_customers: z.number().optional(),
  potential_customers_note: z.string().optional(),
  revenue: z.number(),
  cost_items: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    cost_type: z.enum(["fixed", "variable"]).optional(),
    note: z.string().optional(),
  })),
  total_costs: z.number(),
  /** Steuerabzüge (Gewerbesteuer, Körperschaft-/Einkommensteuer) */
  taxes: z.number().optional(),
  /** Netto-Gewinn nach Steuern = revenue - total_costs - taxes */
  net_profit: z.number().optional(),
  /** Brutto-Gewinn (revenue - total_costs) oder Netto bei alten Daten. */
  net: z.number().optional(),
  competitor_impact_note: z.string().optional(),
});

/** Business plan with 3 revenue scenarios + bank-ready sections */
export const businessPlanSchema = z
  .object({
    worst_case: z.object({
      revenue_min: z.number(),
      revenue_description: z.string(),
      assumptions: z.array(z.string()),
      risks: z.array(z.string()),
    }),
    best_case: z.object({
      revenue_max: z.number(),
      revenue_description: z.string(),
      assumptions: z.array(z.string()),
      enablers: z.array(z.string()),
    }),
    realistic_case: z.object({
      revenue_expected: z.number(),
      revenue_description: z.string(),
      assumptions: z.array(z.string()),
      confidence: z.number().min(0).max(1).optional(),
    }),
    business_research_data: z.array(z.object({
      source_type: z.string(),
      description: z.string(),
      key_findings: z.array(z.string()),
      relevance: z.string().optional(),
    })).optional(),
    /** Bank-ready: Kapitalbedarf, Liquiditätsreserve, Finanzierungsquellen */
    capital_requirements_summary: z.string().optional(),
    /** Bank-ready: Management, Team, Verantwortlichkeiten */
    management_team: z.object({
      content: z.string(),
      key_points: z.array(z.string()).optional(),
    }).optional(),
    /** Bank-ready: Rechtsform, Haftung, Steuern */
    legal_structure: z.object({
      content: z.string(),
      key_points: z.array(z.string()).optional(),
    }).optional(),
    /** Bank-ready: Monatsprognose – Umsatz, Kosten (Miete, Strom, Wareneinsatz, Personal), Netto. Nutze financial_planning aus Context falls vorhanden. */
    monthly_projection: z.array(monthlyProjectionItemSchema).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const bestPracticesSchema = z
  .object({
    practices: z.array(z.object({
      name: z.string(),
      description: z.string(),
      rationale: z.string().optional(),
      sources: z.array(z.string()).optional(),
    })),
    industry_specific: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const failureReasonsSchema = z
  .object({
    failure_reasons: z.array(z.object({
      reason: z.string(),
      frequency: z.string().optional(),
      mitigation: z.string().optional(),
      sources: z.array(z.string()).optional(),
    })),
    industry_risks: z.array(z.string()).optional(),
    risk_explanation: z.string().optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

const decisionProposalSchema = z
  .object({
    decision_key: z.string().optional(),
    title: z.string().optional(),
    lever: z.string().optional(),
    founder_simple_summary: z.string().optional(),
    advanced_summary: z.string().optional(),
    kpi_impact_range: z.record(z.unknown()).optional(),
    leading_indicators: z.array(z.string()).optional(),
    lagging_kpis: z.array(z.string()).optional(),
    experiment_plan: z.record(z.unknown()).optional(),
    resources: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    mitigation: z.array(z.string()).optional(),
    guardrails: z.array(z.record(z.unknown())).optional(),
    assumptions: z.array(z.record(z.unknown())).optional(),
    evidence: z.record(z.array(z.string())).optional(),
  })
  .passthrough()
  .transform((d) => ({
    ...d,
    title: d.title?.trim() || (d as Record<string, unknown>).name as string || (d as Record<string, unknown>).decision_key as string || "Untitled Proposal",
  }));

const stringOrObject = z.union([
  z.string(),
  z.record(z.unknown()),
]).transform((v) => (typeof v === "string" ? { text: v } : v));

export const decisionPackSchema = z
  .object({
    initiative_pool: z.array(z.record(z.unknown())).optional(),
    decision_proposals: z.array(decisionProposalSchema).min(1).max(10),
    execution_plan_30_60_90: z.record(z.unknown()).optional(),
    guardrails: z.array(stringOrObject).optional(),
    assumption_register: z.array(stringOrObject).optional(),
    citations_json: z.record(z.array(z.string())).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .passthrough();

export const menuCardSchema = z
  .object({
    menu_intro: z.object({
      items: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.string().optional(),
      })),
    }).optional(),
    menu_full: z.object({
      items: z.array(z.object({
        name: z.string(),
        category: z.string().optional(),
        description: z.string().optional(),
        components: z.array(z.object({
          name: z.string(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
        })),
        price: z.string().optional(),
      })),
    }),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const supplierListSchema = z
  .object({
    suppliers: z.array(z.object({
      material: z.string(),
      supplier: z.string().optional(),
      price_per_unit: z.number().optional(),
      unit: z.string().optional(),
      notes: z.string().optional(),
      sources: z.array(z.string()).optional(),
    })),
    whitelabel_options: z.array(z.record(z.unknown())).optional(),
    ingredients_options: z.array(z.record(z.unknown())).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

/** Warenkosten: Menu items with cost per component from supplier list */
export const menuCostSchema = z
  .object({
    items: z.array(z.object({
      item_name: z.string(),
      category: z.string().optional(),
      components: z.array(z.object({
        component_name: z.string(),
        quantity: z.union([z.number(), z.string()]),
        unit: z.string().optional(),
        price_per_unit: z.number(),
        cost: z.number(),
      })),
      total_cost: z.number(),
      selling_price: z.number().optional(),
      margin_percent: z.number().optional(),
      margin_note: z.string().optional(),
    })),
    summary: z.object({
      total_warenkosten: z.number(),
      total_items: z.number(),
      avg_cost_per_item: z.number().optional(),
      recommendations: z.array(z.string()).optional(),
    }),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

/** Preiskalkulation: empfohlene Verkaufspreise basierend auf Warenkosten + Marge */
export const menuPreiskalkulationSchema = z
  .object({
    items: z.array(z.object({
      item_name: z.string(),
      category: z.string().optional(),
      cost: z.number(),
      recommended_price: z.number(),
      target_margin_percent: z.number(),
      price_notes: z.string().optional(),
    })),
    summary: z.object({
      pricing_strategy: z.string(),
      avg_margin_percent: z.number().optional(),
      recommendations: z.array(z.string()).optional(),
    }),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const realEstateSchema = z
  .object({
    options: z.array(z.object({
      type: z.string(),
      location: z.string().optional(),
      description: z.string(),
      price_range: z.string().optional(),
      suitability: z.string().optional(),
      url: z.string().optional(),
      usage_permit: z.string().optional(),
      sources: z.array(z.string()).optional(),
    })).min(3).max(3),
    average_market_prices: z.array(z.object({
      property_type: z.string(),
      avg_price: z.string(),
      region: z.string().optional(),
      notes: z.string().optional(),
    })).optional(),
    best_option_index: z.number().min(0).max(2).optional(),
    best_option_details: z.object({
      renovations: z.string().optional(),
      usage_change_application: z.string().optional(),
      other_applications: z.array(z.string()).optional(),
    }).optional(),
    recommendations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const startupConsultingSchema = z
  .object({
    funding_recommendations: z.array(z.object({
      model: z.string(),
      rationale: z.string(),
      fit_score: z.number().min(0).max(1).optional(),
    })),
    incorporation_recommendations: z.array(z.object({
      option: z.string(),
      jurisdiction: z.string().optional(),
      rationale: z.string(),
    })),
    key_considerations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const customerValidationSchema = z
  .object({
    mvp_scope: z.string().optional(),
    hypotheses_tested: z.array(z.object({
      hypothesis: z.string(),
      test_method: z.string(),
      result: z.string(),
      confidence: z.number().min(0).max(1).optional(),
    })).optional().default([]),
    customer_interviews_summary: z.string().optional(),
    landing_page_insights: z.string().optional(),
    pilot_customer_feedback: z.array(z.string()).optional(),
    willingness_to_pay: z.string().optional(),
    key_metrics: z.object({
      conversion_rate: z.string().optional(),
      customer_feedback_summary: z.string().optional(),
      early_adopters_count: z.string().optional(),
    }).optional(),
    recommendation: z.enum(["proceed", "pivot", "stop"]).default("proceed"),
    next_steps: z.array(z.string()).optional(),
    risk_explanation: z.string().optional(),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

export const processOptimizationSchema = z
  .object({
    process_analysis: z.array(z.object({
      process_name: z.string(),
      current_state: z.string(),
      bottlenecks: z.array(z.string()).optional(),
      optimization_potential: z.string(),
      priority: z.string().optional(),
    })),
    cost_analysis: z.object({
      key_cost_drivers: z.array(z.string()),
      savings_potential: z.string().optional(),
      recommendations: z.array(z.string()).optional(),
    }).optional(),
    recommendations: z.array(z.string()),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const strategicOptionsSchema = z
  .object({
    strategic_options: z.array(z.object({
      option: z.string(),
      type: z.string(),
      description: z.string(),
      fit_score: z.number().min(0).max(1).optional(),
      key_considerations: z.array(z.string()).optional(),
    })),
    exit_readiness: z.object({
      readiness_score: z.number().min(0).max(1).optional(),
      gaps: z.array(z.string()).optional(),
      recommendations: z.array(z.string()).optional(),
    }).optional(),
    recommendations: z.array(z.string()),
    risk_explanation: z.string().optional(),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

export const hrPlanningSchema = z
  .object({
    hiring_plan: z.array(z.object({
      role: z.string(),
      priority: z.string(),
      timeline: z.string().optional(),
      key_competencies: z.array(z.string()).optional(),
    })),
    org_structure_recommendation: z.string().optional(),
    competency_gaps: z.array(z.string()).optional(),
    development_priorities: z.array(z.string()).optional(),
    recommendations: z.array(z.string()),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const valuePropositionSchema = z
  .object({
    problem_statement: z.string(),
    target_customers: z.array(z.string()),
    existing_solutions: z.array(z.string()),
    unique_value_proposition: z.string(),
    problem_solution_fit_score: z.number().min(0).max(1).optional(),
    key_differentiators: z.array(z.string()),
    recommendations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

export const goToMarketSchema = z
  .object({
    pricing_strategy: z.object({
      model: z.string(),
      price_points: z.array(z.record(z.unknown())).optional(),
      rationale: z.string(),
    }),
    sales_channels: z.array(z.object({
      channel: z.string(),
      priority: z.string(),
      implementation: z.string().optional(),
    })),
    go_to_market_plan: z.array(z.string()).optional(),
    marketing_budget_recommendations: z.array(z.string()).optional(),
    recommendations: z.array(z.string()),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

const marketingInitiativeSchema = z.object({
  name: z.string(),
  goal: z.string(),
  actions: z.string().optional(),
  content: z.string().optional(),
  hashtags: z.string().optional(),
  keywords: z.string().optional(),
  cta: z.string().optional(),
  tracking: z.string().optional(),
  expected_conversion: z.string().optional(),
  budget_eur: z.union([z.number(), z.string()]).optional(),
  effort_h_week: z.string().optional(),
  roi: z.string().optional(),
});

const roadmapWeekSchema = z.object({
  week: z.string(),
  tasks: z.array(z.string()),
});

export const marketingStrategySchema = z
  .object({
    constraints: z.string().optional(),
    marketing_initiatives: z.array(marketingInitiativeSchema).optional(),
    roadmap_30_days: z.array(roadmapWeekSchema).optional(),
    kpi_goals_30_days: z.array(z.object({
      target: z.string(),
      metric: z.string().optional(),
    })).optional(),
    offline_visibility: z.string().optional(),
    concluding_offer: z.string().optional(),
    channel_strategy: z.array(z.object({
      channel: z.string(),
      priority: z.string().optional(),
      rationale: z.string().optional(),
    })).optional(),
    target_audiences: z.array(z.object({
      segment: z.string(),
      approach: z.string().optional(),
    })).optional(),
    budget_allocation: z.array(z.object({
      area: z.string(),
      share: z.string().optional(),
      rationale: z.string().optional(),
    })).optional(),
    campaign_priorities: z.array(z.string()).optional(),
    key_metrics: z.array(z.object({
      metric: z.string(),
      target: z.string().optional(),
      current: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.string()).default([]),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .passthrough();

export const socialMediaContentPlanSchema = z
  .object({
    selected_channels: z.array(z.string()),
    content_pillars: z.array(z.object({
      pillar: z.string(),
      goal: z.string().optional(),
      channel_fit: z.array(z.string()).optional(),
    })).optional(),
    weekly_plan: z.array(z.object({
      week: z.string(),
      channel_posts: z.array(z.object({
        channel: z.string(),
        format: z.string().optional(),
        topic: z.string(),
        objective: z.string().optional(),
        cta: z.string().optional(),
      })),
    })),
    production_notes: z.array(z.string()).optional(),
    kpi_tracking: z.array(z.object({
      channel: z.string(),
      metric: z.string(),
      target: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const scalingStrategySchema = z
  .object({
    scalability_assessment: z.string(),
    automation_priorities: z.array(z.object({
      area: z.string(),
      potential: z.string(),
      priority: z.string().optional(),
    })),
    marketing_scaling_plan: z.array(z.string()).optional(),
    sales_system_recommendations: z.array(z.string()).optional(),
    key_metrics: z.array(z.object({
      metric: z.string(),
      target: z.string().optional(),
      current: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.string()),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const businessModelMechanicsSchema = z
  .object({
    revenue_mechanics: z.array(z.object({
      stream: z.string(),
      pricing_logic: z.string(),
      margin_logic: z.string(),
      key_assumptions: z.array(z.string()).optional(),
    })),
    cost_mechanics: z.array(z.object({
      cost_block: z.string(),
      cost_behavior: z.string(),
      optimization_levers: z.array(z.string()).optional(),
    })).optional(),
    risks: z.array(z.string()).optional(),
    actions: z.array(z.string()).optional(),
    metrics: z.object({
      gross_margin_target: z.string().optional(),
      contribution_margin_target: z.string().optional(),
      break_even_logic: z.string().optional(),
    }).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const customerEconomicsLtvCacSchema = z
  .object({
    ltv_cac_ratio: z.number().optional(),
    payback_period_months: z.number().optional(),
    cac_breakdown: z.array(z.object({
      channel: z.string(),
      cac_estimate: z.number().optional(),
      rationale: z.string().optional(),
    })).optional(),
    ltv_assumptions: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    levers: z.array(z.string()).optional(),
    actions: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const pmfAssessmentSchema = z
  .object({
    pmf_stage: z.enum(["not_ready", "emerging", "validated", "scaling_ready"]),
    pmf_score: z.number().min(0).max(1).optional(),
    signals_positive: z.array(z.string()),
    signals_negative: z.array(z.string()).optional(),
    key_gaps: z.array(z.string()).optional(),
    actions_next_90_days: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const growthLoopsSchema = z
  .object({
    loops: z.array(z.object({
      loop_name: z.string(),
      trigger: z.string(),
      action: z.string(),
      output: z.string(),
      measurable_kpi: z.string().optional(),
    })),
    bottlenecks: z.array(z.string()).optional(),
    prioritization: z.array(z.object({
      loop_name: z.string(),
      impact: z.string().optional(),
      effort: z.string().optional(),
      priority: z.string().optional(),
    })).optional(),
    actions: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const conversionFunnelAnalysisSchema = z
  .object({
    funnel_stages: z.array(z.object({
      stage: z.string(),
      conversion_rate: z.number().optional(),
      drop_off_rate: z.number().optional(),
      issue_hypotheses: z.array(z.string()).optional(),
    })),
    top_drop_off_points: z.array(z.string()).optional(),
    optimization_levers: z.array(z.string()).optional(),
    actions_next_30_days: z.array(z.string()).optional(),
    metrics: z.object({
      target_conversion_rate: z.string().optional(),
      target_cpa: z.string().optional(),
    }).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const barriersToEntrySchema = z
  .object({
    barriers: z.array(z.object({
      barrier: z.string(),
      strength: z.string().optional(),
      time_to_build: z.string().optional(),
      notes: z.string().optional(),
    })),
    opportunities: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    actions: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const moatAssessmentSchema = z
  .object({
    moat_score: z.number().min(0).max(1).optional(),
    moat_dimensions: z.array(z.object({
      dimension: z.string(),
      current_state: z.string(),
      evidence: z.array(z.string()).optional(),
      strengthening_actions: z.array(z.string()).optional(),
    })),
    defendability_risks: z.array(z.string()).optional(),
    actions_next_180_days: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const customerExperienceCxSchema = z
  .object({
    journey_stages: z.array(z.object({
      stage: z.string(),
      customer_goal: z.string().optional(),
      pain_points: z.array(z.string()).optional(),
      improvement_levers: z.array(z.string()).optional(),
    })),
    cx_metrics: z.array(z.object({
      metric: z.string(),
      current: z.string().optional(),
      target: z.string().optional(),
    })).optional(),
    risks: z.array(z.string()).optional(),
    actions: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const organizationRolesSchema = z
  .object({
    role_map: z.array(z.object({
      role: z.string(),
      responsibilities: z.array(z.string()),
      decision_scope: z.string().optional(),
      current_coverage: z.string().optional(),
    })),
    critical_gaps: z.array(z.string()).optional(),
    governance_notes: z.array(z.string()).optional(),
    actions: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const hiringTalentStrategySchema = z
  .object({
    hiring_priorities: z.array(z.object({
      role: z.string(),
      urgency: z.string().optional(),
      impact: z.string().optional(),
      timeline: z.string().optional(),
    })),
    talent_channels: z.array(z.string()).optional(),
    capability_gaps: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    actions: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const dataStrategySchema = z
  .object({
    decision_areas: z.array(z.object({
      area: z.string(),
      required_data: z.array(z.string()),
      current_data_quality: z.string().optional(),
      collection_method: z.string().optional(),
    })),
    instrumentation_priorities: z.array(z.string()).optional(),
    governance_rules: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    actions_next_60_days: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const capitalStrategySchema = z
  .object({
    capital_mix_options: z.array(z.object({
      source: z.string(),
      suitability: z.string(),
      dilution_or_cost: z.string().optional(),
      constraints: z.array(z.string()).optional(),
    })),
    funding_roadmap: z.array(z.object({
      phase: z.string(),
      amount_target: z.string().optional(),
      trigger: z.string().optional(),
    })).optional(),
    runway_target_months: z.number().optional(),
    risks: z.array(z.string()).optional(),
    actions: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

/** Wachstum: Marge, Angebots-/Packaging-Logik, Marketing-Hebel, Kosten & Personal – mit Branchen-Fallback bei dünnem Kontext */
export const growthMarginOptimizationSchema = z
  .object({
    situation_analysis: z.string(),
    margin_per_unit: z.array(z.object({
      offering: z.string(),
      revenue_side: z.string(),
      variable_and_direct_costs: z.string(),
      contribution_per_unit: z.string(),
      what_remains_after_fixed_allocation_note: z.string().optional(),
      improvable_how: z.string(),
    })).min(1),
    packaging_positioning: z.array(z.object({
      element: z.string(),
      scenario_without_offering: z.string(),
      pain_or_cost_without: z.string(),
      with_offering_benefit: z.string(),
      ideas_to_increase_sales_or_price: z.array(z.string()),
    })).min(1),
    marketing_promises_and_roi: z.array(z.object({
      lever: z.string(),
      concrete_angle: z.string(),
      example_promise: z.string().optional(),
      measurement_90_days: z.string().optional(),
    })).min(1),
    cost_optimization: z.array(z.object({
      category: z.string(),
      too_high_assessment: z.string(),
      reduction_or_alternatives: z.array(z.string()),
    })).min(1),
    people_and_overhead: z
      .object({
        revenue_per_employee_current: z.string().optional(),
        benchmark_or_target: z.string().optional(),
        interpretation: z.string().optional(),
        levers: z.array(z.string()).optional(),
      })
      .optional(),
    supply_packaging_energy: z
      .array(
        z.object({
          topic: z.string(),
          comparison_or_switch_idea: z.string(),
        }),
      )
      .optional(),
    industry_checklist_if_sparse_data: z.array(z.object({
      area: z.string(),
      what_to_check: z.string(),
      example_actions: z.array(z.string()),
    })).min(1),
    recommendations: z.array(z.string()).min(1),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const portfolioManagementSchema = z
  .object({
    portfolio_analysis: z.array(z.object({
      product_or_segment: z.string(),
      performance: z.string(),
      recommendation: z.string(),
    })),
    brand_strategy_recommendations: z.array(z.string()).optional(),
    internationalization_options: z.array(z.string()).optional(),
    strategic_partnerships: z.array(z.string()).optional(),
    recommendations: z.array(z.string()),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const scenarioAnalysisSchema = z
  .object({
    scenarios: z.array(z.object({
      name: z.string(),
      description: z.string(),
      probability: z.string().optional(),
      impact: z.string().optional(),
      key_drivers: z.array(z.string()).optional(),
    })),
    sensitivity_analysis: z.array(z.object({
      variable: z.string(),
      impact_description: z.string(),
    })).optional(),
    risk_matrix: z.array(z.object({
      risk: z.string(),
      likelihood: z.string(),
      impact: z.string(),
      mitigation: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.string()).optional(),
    risk_explanation: z.string().optional(),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

export const swotAnalysisSchema = z
  .object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
    swot_matrix_summary: z.string().optional(),
    strategic_implications: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

/** Arbeitsprozesse: Wertschöpfungskette von Planung über Einkauf bis Endkunde */
export const workProcessesSchema = z
  .object({
    process_chain: z.array(z.object({
      phase: z.string(),
      name: z.string(),
      description: z.string(),
      inputs: z.array(z.string()).optional(),
      outputs: z.array(z.string()).optional(),
      responsible_role: z.string().optional(),
      duration_estimate: z.string().optional(),
      dependencies: z.array(z.string()).optional(),
    })),
    summary: z
      .union([
        z.string(),
        z.object({
          company: z.string().optional(),
          industry: z.string().optional(),
          location: z.string().optional(),
          value_chain_scope: z.string().optional(),
          operating_model: z.string().optional(),
        }),
      ])
      .optional()
      .transform((val) => {
        if (val == null) return undefined;
        if (typeof val === "string") return val;
        const parts = [
          val.value_chain_scope,
          val.operating_model,
          val.company && `Company: ${val.company}`,
          val.industry && `Industry: ${val.industry}`,
          val.location && `Location: ${val.location}`,
        ].filter(Boolean);
        return parts.join(". ") || undefined;
      }),
    recommendations: z.array(z.string()).optional(),
    process_optimization_recommendations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict()
  .transform((val) => {
    const recs = [...(val.recommendations ?? []), ...(val.process_optimization_recommendations ?? [])];
    const { process_optimization_recommendations: _, ...rest } = val;
    return { ...rest, recommendations: recs.length > 0 ? recs : undefined };
  });

/** Personalplan für Jahr 1: Öffnungszeiten, Stoßzeiten, Personalbedarf, monatliche Personalkosten */
export const personnelPlanSchema = z
  .object({
    opening_hours: z.object({
      weekdays: z.string(),
      saturday: z.string().optional(),
      sunday: z.string().optional(),
      notes: z.string().optional(),
    }),
    peak_times: z.array(z.object({
      period: z.string(),
      days: z.string().optional(),
      intensity: z.string().optional(),
      staffing_impact: z.string().optional(),
    })).optional(),
    staff_plan: z.array(z.object({
      role: z.string(),
      count: z.number(),
      hours_per_week: z.number(),
      hourly_rate_eur: z.number().optional(),
      social_contributions_eur: z.number().optional(),
      insurance_eur: z.number().optional(),
      monthly_cost_eur: z.number(),
      start_month: z.string().optional(),
      notes: z.string().optional(),
    })),
    monthly_personnel_costs: z.array(z.object({
      month: z.string(),
      total_personnel_eur: z.number(),
      breakdown: z
        .union([
          z.array(z.object({ role: z.string(), amount: z.number() })),
          z.record(z.string(), z.number()).transform((obj) =>
            Object.entries(obj).map(([role, amount]) => ({ role, amount }))
          ),
        ])
        .optional(),
    })),
    /** Schichtenplan: wer arbeitet wann (z.B. Mo 08:00–16:00 Koch 1x Frühschicht) */
    shift_schedule: z.array(z.object({
      day: z.string(),
      shift: z.string().optional(),
      role: z.string(),
      count: z.number(),
      time_from: z.string().optional(),
      time_to: z.string().optional(),
      notes: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.string()).optional(),
  })
  .strict();

/** Normalize LLM output keys (profitability_analysis→profitability_plan, capital_plan→capital_requirements) and fill missing required fields */
function preprocessFinancialPlanning(raw: unknown): unknown {
  const o = typeof raw === "object" && raw != null ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...o };
  if (o.profitability_analysis != null && o.profitability_plan == null) {
    out.profitability_plan = o.profitability_analysis;
    delete out.profitability_analysis;
  }
  const prof = out.profitability_plan as Record<string, unknown> | undefined;
  if (prof && typeof prof === "object" && (!prof.summary || typeof prof.summary !== "string")) {
    out.profitability_plan = { ...prof, summary: String(prof.summary ?? prof.description ?? "—") };
  }
  if (o.capital_plan != null && o.capital_requirements == null) {
    out.capital_requirements = o.capital_plan;
    delete out.capital_plan;
  }
  const cap = out.capital_requirements as Record<string, unknown> | undefined;
  if (cap && typeof cap === "object" && (!cap.total_required || typeof cap.total_required !== "string")) {
    out.capital_requirements = { ...cap, total_required: String(cap.total_required ?? cap.total ?? cap.summary ?? "—") };
  }
  const lp = out.liquidity_plan as Record<string, unknown> | undefined;
  if (lp && typeof lp === "object" && (!lp.summary || typeof lp.summary !== "string")) {
    out.liquidity_plan = {
      summary: String(lp.notes ?? `Startkapital ${lp.starting_cash_eur ?? "—"} €, Reserve ${lp.liquidity_reserve_months ?? "—"} Monate.`),
      key_assumptions: lp.key_assumptions,
      monthly_cash_flow_highlights: lp.monthly_cash_flow_highlights,
    };
  }
  const be = out.break_even_analysis as Record<string, unknown> | undefined;
  if (be && typeof be === "object" && (!be.break_even_point || typeof be.break_even_point !== "string")) {
    let point = be.break_even_point;
    if (point != null && typeof point === "object") {
      const o = point as Record<string, unknown>;
      point = o.note ?? o.text ?? (o.months != null ? `ca. ${o.months} Monate` : o.month != null ? `ca. ${o.month} Monate` : null);
    }
    out.break_even_analysis = {
      break_even_point: String(point ?? be.notes ?? (be.break_even_months != null ? `ca. ${be.break_even_months} Monate` : "—")),
      key_drivers: be.key_drivers,
      sensitivity_notes: be.sensitivity_notes,
    };
  }
  if (!Array.isArray(out.recommendations)) {
    out.recommendations = [];
  }
  return out;
}

export const financialPlanningSchema = z
  .preprocess(preprocessFinancialPlanning, z
    .object({
      liquidity_plan: z.object({
        summary: z.string(),
        key_assumptions: z.array(z.string()).optional(),
        monthly_cash_flow_highlights: z.array(z.string()).optional(),
      }).optional(),
      profitability_plan: z.object({
        summary: z.string(),
        margin_targets: z.array(z.string()).optional(),
      }).optional(),
      capital_requirements: z.object({
        total_required: z.string().optional(),
        breakdown: z.array(z.string()).optional(),
        funding_gaps: z.array(z.string()).optional(),
      }).optional(),
      break_even_analysis: z.object({
        break_even_point: z.string(),
        key_drivers: z.array(z.string()).optional(),
        sensitivity_notes: z.string().optional(),
      }).optional(),
      monthly_projection: z.array(monthlyProjectionItemSchema).optional(),
      recommendations: z.array(z.string()),
      sources_used: z.array(z.string()).optional(),
      strategy_indicators: strategyIndicatorsSchema,
    })
    .strict());

/** Sub-step schemas for financial planning (smaller API requests) */
export const financialLiquiditySchema = z.object({
  liquidity_plan: z.object({
    summary: z.string(),
    key_assumptions: z.array(z.string()).optional(),
    monthly_cash_flow_highlights: z.array(z.string()).optional(),
  }),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const financialProfitabilitySchema = z.object({
  profitability_plan: z.object({
    summary: z.string(),
    margin_targets: z.array(z.string()).optional(),
  }),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const financialCapitalSchema = z.object({
  capital_requirements: z.object({
    total_required: z.string().optional(),
    breakdown: z.array(z.string()).optional(),
    funding_gaps: z.array(z.string()).optional(),
    /** Aus Inventar & Equipment (Markteintritt): Investitionskosten explizit im Kapitalbedarf */
    inventory_equipment_investment: z
      .object({
        included_in_total: z.boolean().optional(),
        market_entry_eur_band: z.string().optional(),
        scaling_reserve_eur_band: z.string().optional(),
        detail_lines: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const financialBreakEvenSchema = z.object({
  break_even_analysis: z.object({
    break_even_point: z.string(),
    key_drivers: z.array(z.string()).optional(),
    sensitivity_notes: z.string().optional(),
  }),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const financialMonthlyProjectionSchema = z.object({
  monthly_projection: z.array(monthlyProjectionItemSchema),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const strategicPlanningSchema = z
  .object({
    market_position: z.object({
      current_assessment: z.string(),
      target_position: z.string().optional(),
      gap_analysis: z.string().optional(),
    }).optional(),
    competitive_advantages: z.array(z.object({
      advantage: z.string(),
      sustainability: z.string().optional(),
    })),
    innovation_priorities: z.array(z.string()).optional(),
    strategic_initiatives: z.array(z.object({
      initiative: z.string(),
      horizon: z.string().optional(),
      priority: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.string()),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const competitorAnalysisSchema = z
  .object({
    competitors: z.array(z.object({
      name: z.string(),
      strengths: z.array(z.string()).optional(),
      weaknesses: z.array(z.string()).optional(),
      market_position: z.string().optional(),
      differentiation: z.string().optional(),
    })),
    competitive_landscape: z.string().optional(),
    differentiation_opportunities: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
    strategy_indicators: strategyIndicatorsSchema,
  })
  .strict();

export const trendAnalysisSchema = z
  .object({
    macro_trends: z.array(z.object({
      trend: z.string(),
      impact: z.string(),
      time_horizon: z.string().optional(),
    })),
    industry_trends: z.array(z.string()),
    technology_trends: z.array(z.string()).optional(),
    regulatory_trends: z.array(z.string()).optional(),
    implications_for_business: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

/** Normalize LLM output: kpi_estimation (object) → kpi_estimates (array); legacy value → value_month_1/value_month_12 */
function preprocessKpiEstimation(raw: unknown): unknown {
  const o = typeof raw === "object" && raw != null ? (raw as Record<string, unknown>) : {};
  if (o.kpi_estimates && Array.isArray(o.kpi_estimates)) {
    const normalized = (o.kpi_estimates as Array<Record<string, unknown>>).map((e) => {
      const v1 = e.value_month_1 ?? e.value ?? 0;
      const v12 = e.value_month_12 ?? e.value ?? v1;
      return {
        kpi_key: e.kpi_key,
        value: e.value ?? v1,
        value_month_1: v1,
        value_month_12: v12,
        unit: e.unit,
        confidence: e.confidence,
        rationale: e.rationale,
      };
    });
    return { ...o, kpi_estimates: normalized };
  }
  const inner = o.kpi_estimation as Record<string, unknown> | undefined;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    const estimates = Object.entries(inner).map(([kpi_key, v]) => {
      const obj = typeof v === "object" && v != null ? (v as Record<string, unknown>) : {};
      const val = obj.value ?? 0;
      return {
        kpi_key,
        value: val,
        value_month_1: obj.value_month_1 ?? val,
        value_month_12: obj.value_month_12 ?? val,
        unit: obj.unit,
        confidence: obj.confidence,
        rationale: obj.rationale,
      };
    });
    const { kpi_estimation: _, ...rest } = o;
    return { ...rest, kpi_estimates: estimates };
  }
  return o;
}

export const kpiEstimationSchema = z
  .preprocess(preprocessKpiEstimation, z
    .object({
      kpi_estimates: z.array(z.object({
        kpi_key: z.string(),
        value: z.union([z.number(), z.string()]).optional(),
        value_month_1: z.union([z.number(), z.string()]),
        value_month_12: z.union([z.number(), z.string()]),
        unit: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
        rationale: z.string().optional(),
      })),
      sources_used: z.array(z.string()).optional(),
    })
    .passthrough());

export const operativePlanSchema = z
  .object({
    annual_plan_summary: z.string().optional(),
    marketing_plan_highlights: z.array(z.string()).optional(),
    sales_plan_highlights: z.array(z.string()).optional(),
    budget_planning_notes: z.array(z.string()).optional(),
    key_milestones: z.array(z.object({
      milestone: z.string(),
      timeline: z.string(),
      owner: z.string().optional(),
    })).optional(),
    recommendations: z.array(z.string()),
    sources_used: z.array(z.string()).optional(),
  })
  .strict();

export const techDigitalizationSchema = z.object({
  tools: z.array(z.object({
    name: z.string(),
    category: z.string(),
    description: z.string(),
    typical_cost: z.string().optional(),
    roi_notes: z.string().optional(),
    recommendations: z.array(z.string()).optional(),
  })),
  recommendations: z.array(z.string()),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const automationRoiSchema = z.object({
  processes: z.array(z.object({
    process_name: z.string(),
    automation_potential: z.string(),
    estimated_cost: z.string().optional(),
    roi_months: z.number().optional(),
    roi_notes: z.string().optional(),
    tools: z.array(z.string()).optional(),
  })),
  recommendations: z.array(z.string()),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const physicalAutomationSchema = z.object({
  equipment: z.array(z.object({
    name: z.string(),
    category: z.string(),
    description: z.string(),
    estimated_cost: z.string().optional(),
    roi_months: z.number().optional(),
    makes_sense: z.boolean(),
    rationale: z.string().optional(),
  })),
  recommendations: z.array(z.string()),
  sources_used: z.array(z.string()).optional(),
}).strict();

/** Schritt 1: Bestandsliste Geräte & Material + Bezug zur Unternehmensform */
export const inventoryBaselineSchema = z.object({
  legal_form: z.string(),
  inventory_context: z.string(),
  equipment: z.array(z.object({
    name: z.string(),
    category: z.string(),
    quantity_or_unit: z.string().optional(),
    condition: z.string().optional(),
    notes: z.string().optional(),
  })),
  materials: z.array(z.object({
    name: z.string(),
    category: z.string(),
    quantity_or_unit: z.string().optional(),
    notes: z.string().optional(),
  })),
  sources_used: z.array(z.string()).optional(),
}).strict();

/** Schritt 2: Prozesse vs. Inventar */
export const inventoryProcessAnalysisSchema = z.object({
  process_inventory_links: z.array(z.object({
    process_step: z.string(),
    equipment_used: z.array(z.string()),
    materials_used: z.array(z.string()),
    bottleneck_or_gap: z.string().optional(),
  })),
  alignment_with_legal_form: z.string(),
  recommendations: z.array(z.string()),
  sources_used: z.array(z.string()).optional(),
}).strict();

/** Schritt 3: Markteintritt – fehlendes Inventar mit Preisband & konkreten Web-Links */
export const marketEntryEquipmentSchema = z.object({
  market_entry_must_have: z.array(z.object({
    item: z.string(),
    purpose: z.string(),
    priority: z.string(),
    estimated_price_eur_band: z.string(),
    example_product_url: z.string(),
    retailer_or_search_hint: z.string(),
    notes: z.string().optional(),
  })),
  nice_to_have: z.array(z.object({
    item: z.string(),
    purpose: z.string(),
    estimated_price_eur_band: z.string(),
    example_product_url: z.string(),
    retailer_or_search_hint: z.string(),
    notes: z.string().optional(),
  })),
  total_budget_eur_band_hint: z.string().optional(),
  recommendations: z.array(z.string()),
  sources_used: z.array(z.string()).optional(),
}).strict();

/** Schritt 4: Skalierung / Effizienz – Upgrades (z. B. Nähmaschine statt Handarbeit) */
export const equipmentScalingRoadmapSchema = z.object({
  phase_market_entry_recap: z.string(),
  efficiency_upgrades: z.array(z.object({
    current_method: z.string(),
    upgrade_equipment: z.string(),
    benefit: z.string(),
    estimated_investment_eur_band: z.string(),
    example_product_url: z.string(),
    typical_when_after_launch: z.string(),
  })),
  scaling_phase_notes: z.string(),
  recommendations: z.array(z.string()),
  sources_used: z.array(z.string()).optional(),
}).strict();

export const appProjectPlanSchema = z.object({
  project_overview: z.string(),
  phases: z.array(z.object({
    phase: z.string(),
    duration: z.string().optional(),
    deliverables: z.array(z.string()),
  })),
  milestones: z.array(z.object({
    milestone: z.string(),
    timeline: z.string().optional(),
  })),
  recommendations: z.array(z.string()).optional(),
}).strict();

export const appRequirementsSchema = z.object({
  functional_requirements: z.array(z.object({
    id: z.string(),
    description: z.string(),
    priority: z.string().optional(),
  })),
  non_functional_requirements: z.array(z.object({
    id: z.string(),
    description: z.string(),
  })).optional(),
  user_stories: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
}).strict();

export const appTechSpecSchema = z.object({
  architecture: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  integrations: z.array(z.string()).optional(),
  security_notes: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
}).strict();

export const appMvpGuideSchema = z.object({
  mvp_scope: z.string(),
  developer_instructions: z.array(z.string()),
  acceptance_criteria: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
}).strict();

export const appPageSpecsSchema = z.object({
  pages: z.array(z.object({
    page_name: z.string(),
    route: z.string().optional(),
    content: z.string(),
    functions: z.array(z.string()),
    components: z.array(z.string()).optional(),
  })),
  recommendations: z.array(z.string()).optional(),
}).strict();

export const appDbSchemaSchema = z.object({
  tables: z.array(z.object({
    name: z.string(),
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
      constraints: z.string().optional(),
    })),
    description: z.string().optional(),
  })),
  relationships: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
}).strict();

export const schemaRegistry = {
  business_model_inference: businessModelInferenceSchema,
  kpi_set_selection: kpiSetSelectionSchema,
  kpi_questions: kpiQuestionsSchema,
  kpi_answers: kpiAnswersSchema,
  kpi_gap_report: kpiGapReportSchema,
  industry_research: industryResearchSchema,
  root_cause_trees: rootCauseTreesSchema,
  market_snapshot: marketSnapshotSchema,
  market_research: marketResearchSchema,
  business_plan: businessPlanSchema,
  best_practices: bestPracticesSchema,
  failure_reasons: failureReasonsSchema,
  decision_pack: decisionPackSchema,
  business_plan_section: businessPlanSectionSchema,
  supplier_list: supplierListSchema,
  menu_card: menuCardSchema,
  menu_cost: menuCostSchema,
  menu_preiskalkulation: menuPreiskalkulationSchema,
  real_estate: realEstateSchema,
  startup_consulting: startupConsultingSchema,
  customer_validation: customerValidationSchema,
  process_optimization: processOptimizationSchema,
  strategic_options: strategicOptionsSchema,
  hr_planning: hrPlanningSchema,
  value_proposition: valuePropositionSchema,
  go_to_market: goToMarketSchema,
  scaling_strategy: scalingStrategySchema,
  business_model_mechanics: businessModelMechanicsSchema,
  customer_economics_ltv_cac: customerEconomicsLtvCacSchema,
  conversion_funnel_analysis: conversionFunnelAnalysisSchema,
  barriers_to_entry: barriersToEntrySchema,
  moat_assessment: moatAssessmentSchema,
  organization_roles: organizationRolesSchema,
  hiring_talent_strategy: hiringTalentStrategySchema,
  data_strategy: dataStrategySchema,
  customer_experience_cx: customerExperienceCxSchema,
  pmf_assessment: pmfAssessmentSchema,
  growth_loops: growthLoopsSchema,
  capital_strategy: capitalStrategySchema,
  growth_margin_optimization: growthMarginOptimizationSchema,
  marketing_strategy: marketingStrategySchema,
  social_media_content_plan: socialMediaContentPlanSchema,
  portfolio_management: portfolioManagementSchema,
  scenario_analysis: scenarioAnalysisSchema,
  operative_plan: operativePlanSchema,
  swot_analysis: swotAnalysisSchema,
  competitor_analysis: competitorAnalysisSchema,
  financial_planning: financialPlanningSchema,
  financial_liquidity: financialLiquiditySchema,
  financial_profitability: financialProfitabilitySchema,
  financial_capital: financialCapitalSchema,
  financial_break_even: financialBreakEvenSchema,
  financial_monthly_projection: financialMonthlyProjectionSchema,
  personnel_plan: personnelPlanSchema,
  work_processes: workProcessesSchema,
  strategic_planning: strategicPlanningSchema,
  trend_analysis: trendAnalysisSchema,
  kpi_estimation: kpiEstimationSchema,
  tech_digitalization: techDigitalizationSchema,
  automation_roi: automationRoiSchema,
  physical_automation: physicalAutomationSchema,
  inventory_baseline: inventoryBaselineSchema,
  inventory_process_analysis: inventoryProcessAnalysisSchema,
  market_entry_equipment: marketEntryEquipmentSchema,
  equipment_scaling_roadmap: equipmentScalingRoadmapSchema,
  app_project_plan: appProjectPlanSchema,
  app_requirements: appRequirementsSchema,
  app_tech_spec: appTechSpecSchema,
  app_mvp_guide: appMvpGuideSchema,
  app_page_specs: appPageSpecsSchema,
  app_db_schema: appDbSchemaSchema,
} as const;

export type SchemaKey = keyof typeof schemaRegistry;

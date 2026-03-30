import type { PromptTemplate } from "@/prompts/registry";
import { promptTemplatesDe } from "@/prompts/de/registry";
import { promptTemplatesEn } from "@/prompts/en/registry";

export function getPromptTemplatesForLocale(locale: "de" | "en"): PromptTemplate[] {
  return locale === "en" ? promptTemplatesEn : promptTemplatesDe;
}

import { cookies } from "next/headers";
import type { Locale } from "./i18n";

const COOKIE_NAME = "locale";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (value === "en" || value === "de") return value;
  return "de";
}

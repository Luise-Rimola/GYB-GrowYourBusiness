import { redirect } from "next/navigation";

/** Fragebogen 4 ist pro Themenbereich unter /study/fb4/[category]. */
export default function Fragebogen4IndexPage() {
  redirect("/study");
}

import { redirect } from "next/navigation";

/** Alte URL: auf die Standard-Studyseite zurückführen. */
export default async function StudyEvaluationRedirectPage() {
  redirect("/study");
}

/** Next.js `redirect()` wirft ein spezielles Error-Objekt — darf in catch nicht verschluckt werden. */
export function isRedirectError(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

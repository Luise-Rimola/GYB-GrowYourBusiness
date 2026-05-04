/** SPSS/PDF/Excel (+ optional Freitext-Excel) für Berater-/Advisor-Export (`scope=advisor`). */
export function AdvisorEvaluationExportLinks({
  quant,
  openTextExcelHref,
  openTextExcelLabel,
  variant = "default",
}: {
  quant?: { spss: string; pdf: string; excel: string; isEn: boolean };
  openTextExcelHref?: string;
  openTextExcelLabel?: string;
  variant?: "default" | "compact";
}) {
  const downloadIsEn = quant?.isEn ?? false;
  const btn =
    variant === "compact"
      ? "inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]"
      : "inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--background)]";

  if (!quant && !openTextExcelHref) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {quant ? (
        <>
          <a href={quant.spss} download="advisor-evaluation.csv" className={btn}>
            SPSS
          </a>
          <a
            href={quant.pdf}
            download={downloadIsEn ? "advisor-evaluation-en.pdf" : "advisor-evaluation-de.pdf"}
            className={btn}
          >
            PDF
          </a>
          <a href={quant.excel} download="advisor-evaluation.xls" className={btn}>
            Excel
          </a>
        </>
      ) : null}
      {openTextExcelHref && openTextExcelLabel ? (
        <a href={openTextExcelHref} download className={btn}>
          {openTextExcelLabel}
        </a>
      ) : null}
    </div>
  );
}

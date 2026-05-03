import type { jsPDF } from "jspdf";

const NO_SELECT_STYLE_ID = "business-dss-pdf-capture-no-select";

function doubleRaf(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Drop selection + focus so the engine never applies stale Range endpoints while the subtree is painted. */
function clearSelectionAndFocus(): void {
  try {
    const sel = window.getSelection();
    sel?.removeAllRanges();
  } catch {
    /* ignore */
  }
  try {
    const ae = document.activeElement;
    if (ae instanceof HTMLElement) {
      ae.blur();
    }
  } catch {
    /* ignore */
  }
}

function isRangeOrSelectionCaptureError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const n = err.name;
  const m = err.message.toLowerCase();
  return (
    n === "IndexSizeError" ||
    m.includes("indexsize") ||
    m.includes("setend") ||
    m.includes("setstart") ||
    (m.includes("range") && m.includes("offset"))
  );
}

/** During html2canvas, block text selection so no live Range is updated mid-clone. */
function installCaptureNoSelect(): () => void {
  if (document.getElementById(NO_SELECT_STYLE_ID)) {
    return () => undefined;
  }
  const style = document.createElement("style");
  style.id = NO_SELECT_STYLE_ID;
  style.textContent =
    "html,html *{-webkit-user-select:none!important;user-select:none!important;}";
  document.head.appendChild(style);
  return () => {
    style.remove();
  };
}

/**
 * Client-only: renders a DOM subtree to JPEG slices and lays them onto A4 pages.
 * Bypasses html2pdf.js → require("html2canvas"), which bundles to an empty stub under Next/Webpack.
 */
export async function downloadElementAsPdf(options: {
  element: HTMLElement;
  filename: string;
  /** Millimetres; html2pdf default was ~10 mm on each side */
  marginMm?: number;
  scale?: number;
  jpegQuality?: number;
}): Promise<void> {
  const marginMm = options.marginMm ?? 10;
  const scale = options.scale ?? 2;
  const jpegQuality = options.jpegQuality ?? 0.92;

  clearSelectionAndFocus();
  await doubleRaf();

  const [h2cMod, jsMod] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const html2canvas =
    typeof h2cMod.default === "function"
      ? h2cMod.default
      : h2cMod.html2canvas;
  if (typeof html2canvas !== "function") {
    throw new Error("[downloadReportPdf] html2canvas-pro did not expose a callable");
  }

  const { jsPDF } = jsMod;

  const canvasOpts = {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  };

  const removeNoSelect = installCaptureNoSelect();
  let canvas: HTMLCanvasElement;
  try {
    clearSelectionAndFocus();
    await doubleRaf();

    try {
      canvas = await html2canvas(options.element, canvasOpts);
    } catch (first) {
      if (!isRangeOrSelectionCaptureError(first)) {
        throw first;
      }
      clearSelectionAndFocus();
      await doubleRaf();
      canvas = await html2canvas(options.element, canvasOpts);
    }
  } finally {
    removeNoSelect();
    clearSelectionAndFocus();
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  addCanvasToPdfPages(pdf, canvas, marginMm, jpegQuality);
  pdf.save(options.filename);
}

function addCanvasToPdfPages(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  marginMm: number,
  jpegQuality: number
): void {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const usableW = pageW - 2 * marginMm;
  const usableH = pageH - 2 * marginMm;

  const totalScaledH = (canvas.height * usableW) / canvas.width;
  let offsetMm = 0;

  while (offsetMm < totalScaledH - 1e-4) {
    if (offsetMm > 0) {
      pdf.addPage();
    }

    const sliceH = Math.min(usableH, totalScaledH - offsetMm);
    const srcY = (offsetMm / totalScaledH) * canvas.height;
    const srcH = (sliceH / totalScaledH) * canvas.height;

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.max(1, Math.ceil(srcH));
    const ctx = slice.getContext("2d");
    if (!ctx) {
      throw new Error("[downloadReportPdf] could not get 2d context");
    }
    ctx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      srcH,
      0,
      0,
      canvas.width,
      srcH
    );

    const data = slice.toDataURL("image/jpeg", jpegQuality);
    pdf.addImage(data, "JPEG", marginMm, marginMm, usableW, sliceH, undefined, "FAST");
    offsetMm += sliceH;
  }
}

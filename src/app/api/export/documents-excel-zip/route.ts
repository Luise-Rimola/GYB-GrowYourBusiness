import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";

function toSafeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 80) || "document";
}

function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDocumentExcelHtml(opts: {
  docTitle: string;
  createdAtIso: string;
  content: string;
  sheetTitle: string;
  colField: string;
  colValue: string;
}): string {
  const table: { headers: string[]; rows: string[][] } = {
    headers: [opts.colField, opts.colValue],
    rows: [
      [opts.colField === "Field" ? "Title" : "Titel", opts.docTitle],
      [opts.colField === "Field" ? "Created" : "Erstellt", opts.createdAtIso],
      [opts.colField === "Field" ? "Content" : "Inhalt", opts.content],
    ],
  };
  const head = `<tr>${table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  const rows = table.rows
    .map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`)
    .join("");
  const block = `<h2>${escapeHtml(opts.sheetTitle)}</h2><table>${head}${rows}</table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(opts.docTitle)}</title><style>body{font-family:Arial,sans-serif;font-size:12px}table{border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top}th{background:#f5f5f5}</style></head><body>${block}</body></html>`;
}

export async function GET(req: NextRequest) {
  const auth = await getCompanyForApi();
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "de";
  const isEn = lang === "en";
  const colField = isEn ? "Field" : "Feld";
  const colValue = isEn ? "Value" : "Wert";

  const artifacts = await prisma.artifact.findMany({
    where: { companyId: auth.company.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, createdAt: true, contentJson: true, exportHtml: true },
  });

  const zip = new JSZip();
  for (const artifact of artifacts) {
    const content = artifact.exportHtml?.trim()
      ? artifact.exportHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : toText(artifact.contentJson);
    const html = buildDocumentExcelHtml({
      docTitle: artifact.title,
      createdAtIso: artifact.createdAt.toISOString(),
      content,
      sheetTitle: artifact.title,
      colField,
      colValue,
    });
    const buf = Buffer.from(html, "utf-8");
    zip.file(`${toSafeName(artifact.title)}-${artifact.id}.xls`, buf);
  }

  if (artifacts.length === 0) {
    const html = buildDocumentExcelHtml({
      docTitle: isEn ? "No documents yet" : "Noch keine Dokumente",
      createdAtIso: new Date().toISOString(),
      content: isEn
        ? "No generated documents are available for export."
        : "Es sind noch keine generierten Dokumente fuer den Export verfuegbar.",
      sheetTitle: isEn ? "Readme" : "Hinweis",
      colField,
      colValue,
    });
    zip.file("README.xls", Buffer.from(html, "utf-8"));
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  const body = new Uint8Array(out.length);
  body.set(out);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="all-documents-excel-${lang}.zip"`,
    },
  });
}

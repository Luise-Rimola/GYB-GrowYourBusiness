import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

/** Helvetica (StandardFonts) uses WinAnsi; many Unicode symbols (→, bullets, emoji) fail at drawText. */
function sanitizeForStandardPdfFont(text: string): string {
  const s = text
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\u202F|\u2007/g, " ")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\u2026/g, "...")
    .replace(/\u2212|\u2010|\u2011|\u2012|\u2013|\u2014|\u2015/g, "-")
    .replace(/\u2190/g, "<-")
    .replace(/\u2192|\u2794|\u279C/g, "->")
    .replace(/\u2194|\u27F7/g, "<->")
    .replace(/\u21D2/g, "=>")
    .replace(/\u2248/g, "~")
    .replace(/\u2713|\u2714|\u2717|\u2718/g, "[x]")
    .replace(/\u2022|\u2023|\u25AA|\u25CF|\u25E6|\u2043/g, "*")
    .replace(/\u20AC/g, "EUR")
    .replace(/\u0131/g, "i")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2032\u2033]/g, "'")
    .replace(/[\u00AB\u00BB]/g, '"')
    .replace(/\u00AD/g, "");
  return s.replace(/[^\t\n\r\x20-\x7E\xa1-\xff]/gu, "?");
}

async function buildArtifactPdf(title: string, createdAt: Date, content: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 842;
  const height = 595;
  const margin = 32;
  const maxWidth = width - margin * 2;
  let page = doc.addPage([width, height]);
  let y = height - margin;

  const safeTitle = sanitizeForStandardPdfFont(title);
  const safeContent = sanitizeForStandardPdfFont(content);

  const wrapText = (text: string, size: number): string[] => {
    if (!text) return [""];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const writeLine = (text: string, size = 10, isBold = false) => {
    if (y < margin + 20) {
      page = doc.addPage([width, height]);
      y = height - margin;
    }
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.1, 0.12, 0.14),
    });
    y -= size + 4;
  };

  writeLine(safeTitle, 16, true);
  writeLine(createdAt.toISOString(), 9, false);
  y -= 6;
  for (const line of wrapText(safeContent, 9)) writeLine(line, 9, false);

  return doc.save();
}

export async function GET(req: NextRequest) {
  const auth = await getCompanyForApi();
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "de";
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
    const pdf = await buildArtifactPdf(artifact.title, artifact.createdAt, content);
    zip.file(`${toSafeName(artifact.title)}-${artifact.id}.pdf`, pdf);
  }

  if (artifacts.length === 0) {
    const emptyPdf = await buildArtifactPdf(
      lang === "en" ? "No documents yet" : "Noch keine Dokumente",
      new Date(),
      lang === "en"
        ? "No generated documents are available for export."
        : "Es sind noch keine generierten Dokumente fuer den Export verfuegbar."
    );
    zip.file("README.pdf", emptyPdf);
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  const body = new Uint8Array(out.length);
  body.set(out);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="all-documents-pdf-${lang}.zip"`,
    },
  });
}

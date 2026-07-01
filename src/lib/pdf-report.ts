import type { jsPDF } from "jspdf";

// Shared brand kit for every PDF Harvest Hub generates — receipts already
// used this palette (see order-utils.ts); this pulls the same colors out so
// the financial report, market report, and admin report can match instead
// of each looking like a different, less-finished product.

export const BRAND_GREEN: [number, number, number] = [13, 59, 46];
export const BRAND_GOLD: [number, number, number] = [201, 168, 76];
export const TEXT_DARK: [number, number, number] = [30, 41, 35];
export const TEXT_MUTED: [number, number, number] = [110, 120, 115];
export const BORDER: [number, number, number] = [225, 228, 224];
export const BG_SOFT: [number, number, number] = [248, 250, 247];
export const SUCCESS: [number, number, number] = [22, 128, 71];
export const WARN: [number, number, number] = [217, 119, 6];
export const DANGER: [number, number, number] = [185, 28, 28];

export function rgb(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
export function strokeColor(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
export function textColor(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

export function roundedCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: [number, number, number] = [255, 255, 255],
  border: [number, number, number] = BORDER,
) {
  rgb(doc, fill);
  strokeColor(doc, border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 8, 8, "FD");
}

/**
 * Branded header band — dark green, gold vector mark (no external image
 * needed, drawn with jsPDF primitives), report title + generated date on
 * the right. Returns the y-position content should start at.
 */
export function drawReportHeader(doc: jsPDF, opts: { title: string; subtitle?: string }): number {
  const W = doc.internal.pageSize.getWidth();
  const M = 36;
  const HEADER_H = 74;

  rgb(doc, BRAND_GREEN);
  doc.rect(0, 0, W, HEADER_H, "F");

  // Vector mark — gold circle, no PNG dependency
  const markCx = M + 16;
  const markCy = HEADER_H / 2;
  rgb(doc, BRAND_GOLD);
  doc.circle(markCx, markCy, 15, "F");
  textColor(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("H", markCx, markCy + 5, { align: "center" });

  textColor(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("HARVEST HUB", markCx + 28, markCy - 3);
  textColor(doc, BRAND_GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(opts.subtitle ?? "Connect. Trade. Grow.", markCx + 28, markCy + 12);

  textColor(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.title, W - M, markCy - 3, { align: "right" });
  textColor(doc, [210, 220, 210]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
    W - M,
    markCy + 12,
    { align: "right" },
  );

  return HEADER_H + 22;
}

/** Branded footer band — matches the header band, goes at the bottom of every page. */
export function drawReportFooter(doc: jsPDF, tagline = "Stronger Farmers. Stronger Zimbabwe.") {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const footerH = 40;

  rgb(doc, BRAND_GREEN);
  doc.rect(0, H - footerH, W, footerH, "F");
  textColor(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("HARVEST HUB", M, H - footerH / 2 - 2);
  textColor(doc, [210, 220, 210]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(tagline, M, H - footerH / 2 + 10);
  textColor(doc, BRAND_GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("harvesthub.workers.dev", W - M, H - footerH / 2 + 4, { align: "right" });
}

/** A small uppercase section label used above tables/cards inside a report body. */
export function sectionLabel(doc: jsPDF, label: string, x: number, y: number) {
  textColor(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label.toUpperCase(), x, y);
}

/** Shared jspdf-autotable header/body styling so every table in every report matches. */
export const TABLE_STYLE = {
  headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" as const, fontSize: 9 },
  alternateRowStyles: { fillColor: BG_SOFT },
  styles: { fontSize: 9, textColor: TEXT_DARK },
};

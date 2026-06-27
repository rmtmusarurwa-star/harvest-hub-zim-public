import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import logoUrl from "@/assets/harvest-hub-logo-transparent.png";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

// Fulfillment (added via migration — not yet in generated types)
export type FulfillmentStatus =
  | "pending"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type ExtendedOrderRow = OrderRow & {
  fulfillment_status: FulfillmentStatus;
  fulfillment_notes?: string | null;
};

export const FULFILLMENT_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const FULFILLMENT_STATUS_COLOR: Record<FulfillmentStatus, string> = {
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  confirmed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  dispatched: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  delivered: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  cancelled: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

export const FULFILLMENT_STEPS: FulfillmentStatus[] = [
  "pending",
  "confirmed",
  "dispatched",
  "delivered",
];

export const PAYMENT_METHOD_LABEL: Record<
  Database["public"]["Enums"]["payment_method"],
  string
> = {
  ecocash: "EcoCash",
  onemoney: "OneMoney",
  zipit: "ZIPIT / Bank Transfer",
  cash_on_delivery: "Cash on Delivery",
  card: "Visa / Mastercard",
};

export const PAYMENT_STATUS_LABEL: Record<
  Database["public"]["Enums"]["payment_status"],
  string
> = {
  pending: "Pending",
  awaiting_confirmation: "Awaiting Confirmation",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function generateOrderCode() {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `HHZ-${ts}${rand}`;
}

// Brand colors
const BRAND_GREEN: [number, number, number] = [13, 59, 46];
const BRAND_GOLD: [number, number, number] = [201, 168, 76];
const TEXT_DARK: [number, number, number] = [30, 41, 35];
const TEXT_MUTED: [number, number, number] = [110, 120, 115];
const BORDER: [number, number, number] = [225, 228, 224];
const BG_SOFT: [number, number, number] = [248, 250, 247];
const SUCCESS: [number, number, number] = [22, 128, 71];
const WARN: [number, number, number] = [217, 119, 6];

function rgb(doc: jsPDF, fill: [number, number, number]) {
  doc.setFillColor(fill[0], fill[1], fill[2]);
}
function stroke(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function text(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function roundedCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: [number, number, number] = [255, 255, 255],
  border: [number, number, number] = BORDER,
) {
  rgb(doc, fill);
  stroke(doc, border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 8, 8, "FD");
}

async function fetchProfile(id: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function fetchListingImage(listingId: string | null): Promise<string | null> {
  if (!listingId) return null;
  const { data } = await supabase
    .from("listings" as never)
    .select("image_url, images")
    .eq("id", listingId)
    .maybeSingle();
  if (!data) return null;
  const d = data as { image_url?: string | null; images?: string[] | null };
  return d.image_url || (d.images && d.images[0]) || null;
}

async function urlToDataURL(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadReceiptPDF(orders: OrderRow[], buyerName: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const order = orders[0];

  const [seller, buyer, qrDataUrl, productImg] = await Promise.all([
    fetchProfile(order.farmer_id),
    fetchProfile(order.buyer_id),
    QRCode.toDataURL(`https://harvesthub.co.zw/verify/${order.order_code}`, {
      margin: 1,
      width: 320,
    }),
    fetchListingImage(order.listing_id).then(urlToDataURL),
  ]);
  const sellerAvatar = await urlToDataURL(seller?.avatar_url ?? null);
  const buyerAvatar = await urlToDataURL(buyer?.avatar_url ?? null);
  const brandLogo = await urlToDataURL(logoUrl);

  // ============ HEADER (130pt dark green band) ============
  const HEADER_H = 130;
  rgb(doc, BRAND_GREEN);
  doc.rect(0, 0, W, HEADER_H, "F");

  // Logo — 60pt, white backing card, 16pt left padding
  const LOGO = 60;
  const LOGO_X = M;
  const LOGO_Y = (HEADER_H - LOGO) / 2;
  if (brandLogo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(LOGO_X, LOGO_Y, LOGO, LOGO, 10, 10, "F");
    doc.addImage(brandLogo, "PNG", LOGO_X + 6, LOGO_Y + 6, LOGO - 12, LOGO - 12);
  } else {
    rgb(doc, BRAND_GOLD);
    doc.circle(LOGO_X + LOGO / 2, LOGO_Y + LOGO / 2, LOGO / 2, "F");
  }

  // Wordmark — 16pt right of logo, no overlap
  const WORD_X = LOGO_X + LOGO + 16;
  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("HARVEST HUB", WORD_X, LOGO_Y + 28);
  text(doc, BRAND_GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Connect  •  Trade  •  Grow", WORD_X, LOGO_Y + 46);

  // PAID badge — top-right, 90x44
  const isPaid = order.payment_status === "paid";
  const badgeW = 90;
  const badgeH = 44;
  const badgeX = W - M - badgeW;
  const badgeY = M;
  rgb(doc, isPaid ? [232, 247, 237] : [255, 247, 230]);
  stroke(doc, isPaid ? SUCCESS : WARN);
  doc.setLineWidth(1.2);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8, 8, "FD");
  text(doc, isPaid ? SUCCESS : WARN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(isPaid ? "PAID" : "PENDING", badgeX + badgeW / 2, badgeY + 22, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    isPaid ? "Thank you for your order" : "Awaiting confirmation",
    badgeX + badgeW / 2,
    badgeY + 35,
    { align: "center" },
  );

  // Receipt # + date — below badge, right-aligned, 14pt gap
  const infoY = badgeY + badgeH + 14;
  text(doc, BRAND_GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("RECEIPT", W - M, infoY, { align: "right" });
  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`# ${order.order_code}`, W - M, infoY + 14, { align: "right" });
  text(doc, [210, 220, 210]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const d = new Date(order.created_at);
  doc.text(
    `${d.toLocaleDateString("en-GB")}  ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
    W - M,
    infoY + 26,
    { align: "right" },
  );

  let y = HEADER_H + 16;

  // ============ TRUST BADGES ============
  const TB_H = 48;
  const tbs = [
    ["Secure Payment", "100% Protected"],
    ["Verified Platform", "Trusted by Farmers"],
    ["Quality Assured", "Fresh & Reliable"],
    ["Support 24/7", "Here for you"],
  ];
  roundedCard(doc, M, y, W - 2 * M, TB_H, BG_SOFT);
  const bw = (W - 2 * M) / 4;
  tbs.forEach(([title, sub], i) => {
    const bx = M + i * bw + 14;
    rgb(doc, SUCCESS);
    doc.circle(bx + 6, y + TB_H / 2, 5, "F");
    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, bx + 18, y + TB_H / 2 - 2);
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(sub, bx + 18, y + TB_H / 2 + 10);
  });
  y += TB_H + 16;

  // ============ SELLER / BUYER CARDS ============
  const cardGap = 16;
  const cardW = (W - 2 * M - cardGap) / 2;
  const cardH = 100;
  drawPartyCard(doc, M, y, cardW, cardH, "SELLER",
    seller?.full_name || "Verified Farmer", sellerAvatar);
  drawPartyCard(doc, M + cardW + cardGap, y, cardW, cardH, "BUYER",
    buyer?.full_name || buyerName, buyerAvatar);
  y += cardH + 16;

  // ============ PRODUCT TABLE ============
  const HDR_H = 28;
  rgb(doc, BRAND_GREEN);
  doc.roundedRect(M, y, W - 2 * M, HDR_H, 6, 6, "F");
  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  const tableW = W - 2 * M;
  // 30 / 35 / 10 / 12 / 13
  const cw = {
    product: tableW * 0.30,
    desc:    tableW * 0.35,
    qty:     tableW * 0.10,
    price:   tableW * 0.12,
    total:   tableW * 0.13,
  };
  const cx = {
    product: M,
    desc:    M + cw.product,
    qty:     M + cw.product + cw.desc,
    price:   M + cw.product + cw.desc + cw.qty,
    total:   M + cw.product + cw.desc + cw.qty + cw.price,
  };
  doc.text("PRODUCT",     cx.product + 14,             y + 18);
  doc.text("DESCRIPTION", cx.desc + 12,                y + 18);
  doc.text("QTY",         cx.qty + cw.qty / 2,         y + 18, { align: "center" });
  doc.text("PRICE",       cx.price + cw.price / 2,     y + 18, { align: "center" });
  doc.text("TOTAL",       cx.total + cw.total - 14,    y + 18, { align: "right" });
  y += HDR_H;

  // Rows — 140pt to fit 120x120 image with 8pt padding
  for (const o of orders) {
    const ROW_H = 140;
    const IMG = 120;
    rgb(doc, [255, 255, 255]);
    stroke(doc, BORDER);
    doc.setLineWidth(0.5);
    doc.rect(M, y, tableW, ROW_H, "S");

    const imgX = cx.product + 8;
    const imgY = y + (ROW_H - IMG) / 2;
    rgb(doc, BG_SOFT);
    stroke(doc, BORDER);
    doc.setLineWidth(0.8);
    doc.roundedRect(imgX, imgY, IMG, IMG, 6, 6, "FD");
    if (productImg && o === order) {
      try {
        doc.addImage(productImg, "JPEG", imgX + 2, imgY + 2, IMG - 4, IMG - 4);
      } catch {
        text(doc, TEXT_MUTED);
        doc.setFontSize(8);
        doc.text("Image", imgX + IMG / 2, imgY + IMG / 2, { align: "center" });
      }
    } else {
      text(doc, TEXT_MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("No image", imgX + IMG / 2, imgY + IMG / 2, { align: "center" });
    }

    // Description column
    const dx = cx.desc + 12;
    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const title = doc.splitTextToSize(o.listing_title, cw.desc - 24);
    doc.text(title.slice(0, 2), dx, y + 28);
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const descLines = doc.splitTextToSize(
      "Premium quality produce, sourced direct from a verified Harvest Hub seller.",
      cw.desc - 24,
    );
    doc.text(descLines.slice(0, 3), dx, y + 62);
    text(doc, TEXT_MUTED);
    doc.setFontSize(8);
    doc.text(`Unit: ${o.unit}`, dx, y + ROW_H - 18);

    // QTY / PRICE / TOTAL — vertically centered
    const midY = y + ROW_H / 2 + 4;
    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${o.quantity}`, cx.qty + cw.qty / 2, midY, { align: "center" });
    doc.text(`$${Number(o.unit_price).toFixed(2)}`, cx.price + cw.price / 2, midY, { align: "center" });
    text(doc, SUCCESS);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`$${Number(o.total_amount).toFixed(2)}`, cx.total + cw.total - 14, midY, { align: "right" });

    y += ROW_H;
  }
  y += 16;

  // ============ ORDER DETAILS + PAYMENT SUMMARY ============
  const detailsW = (W - 2 * M - 16) * 0.55;
  const summaryW = W - 2 * M - 16 - detailsW;
  const detailsH = 200;

  roundedCard(doc, M, y, detailsW, detailsH);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ORDER DETAILS", M + 16, y + 22);

  const rows: [string, string][] = [
    ["Order ID", order.id.slice(0, 14).toUpperCase()],
    ["Date", new Date(order.created_at).toLocaleDateString("en-GB")],
    ["Time", new Date(order.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })],
    ["Payment", PAYMENT_METHOD_LABEL[order.payment_method]],
    ["Status", PAYMENT_STATUS_LABEL[order.payment_status]],
    ["Delivery", "Seller (2-5 days)"],
    ["Location", "Zimbabwe"],
  ];
  let dy = y + 44;
  rows.forEach(([k, v]) => {
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(k, M + 16, dy);
    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "bold");
    const val = doc.splitTextToSize(v, detailsW * 0.55);
    doc.text(val[0], M + detailsW - 16, dy, { align: "right" });
    dy += 20;
  });

  // Payment summary — light green card
  const sx = M + detailsW + 16;
  rgb(doc, [240, 248, 246]);
  stroke(doc, [200, 220, 210]);
  doc.setLineWidth(0.8);
  doc.roundedRect(sx, y, summaryW, detailsH, 8, 8, "FD");
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAYMENT SUMMARY", sx + 16, y + 22);

  const subtotal = orders.reduce((s, o) => s + Number(o.unit_price) * Number(o.quantity), 0);
  const grand = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const delivery = 0;
  const fee = Math.max(0, grand - subtotal - delivery);

  const lines: [string, string][] = [
    ["Subtotal", `$${subtotal.toFixed(2)}`],
    ["Delivery", `$${delivery.toFixed(2)}`],
    ["Service Fee", `$${fee.toFixed(2)}`],
  ];
  let py = y + 48;
  lines.forEach(([k, v]) => {
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(k, sx + 16, py);
    text(doc, TEXT_DARK);
    doc.text(v, sx + summaryW - 16, py, { align: "right" });
    py += 20;
  });
  stroke(doc, [200, 220, 210]);
  doc.setLineWidth(0.6);
  doc.line(sx + 14, py, sx + summaryW - 14, py);
  py += 18;
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total (USD)", sx + 16, py);
  text(doc, BRAND_GREEN);
  doc.setFontSize(18);
  doc.text(`$${grand.toFixed(2)}`, sx + summaryW - 16, py, { align: "right" });
  py += 22;

  rgb(doc, isPaid ? [220, 240, 228] : [255, 240, 215]);
  doc.roundedRect(sx + 12, py, summaryW - 24, 28, 6, 6, "F");
  text(doc, isPaid ? SUCCESS : WARN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Amount Paid", sx + 20, py + 18);
  doc.text(`$${(isPaid ? grand : 0).toFixed(2)}`, sx + summaryW - 20, py + 18, { align: "right" });

  y += detailsH + 16;

  // ============ TIMELINE ============
  const TL_H = 80;
  roundedCard(doc, M, y, W - 2 * M, TL_H);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ORDER PROGRESS", M + 16, y + 20);

  const steps = ["Placed", "Paid", "Preparing", "In Transit", "Delivered", "Completed"];
  const activeIdx = isPaid ? 1 : 0;
  const tlStart = M + 40;
  const tlEnd = W - M - 40;
  const sw = (tlEnd - tlStart) / (steps.length - 1);
  const ty = y + 50;
  stroke(doc, BORDER);
  doc.setLineWidth(2);
  doc.line(tlStart, ty, tlEnd, ty);
  steps.forEach((s, i) => {
    const cxp = tlStart + sw * i;
    if (i <= activeIdx) rgb(doc, BRAND_GOLD);
    else rgb(doc, [240, 240, 240]);
    stroke(doc, i <= activeIdx ? BRAND_GOLD : BORDER);
    doc.setLineWidth(1);
    doc.circle(cxp, ty, 7, "FD");
    text(doc, i <= activeIdx ? BRAND_GREEN : TEXT_MUTED);
    doc.setFont("helvetica", i <= activeIdx ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.text(s, cxp, ty + 20, { align: "center" });
  });
  y += TL_H + 16;

  // ============ 3-COLUMN FOOTER SECTIONS ============
  const colGap = 16;
  const totalW = W - 2 * M - 2 * colGap;
  const w1 = totalW * 0.30;
  const w2 = totalW * 0.35;
  const w3 = totalW * 0.35;
  const triH = 130;

  roundedCard(doc, M, y, w1, triH, BG_SOFT);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MARKET INSIGHT", M + 14, y + 20);
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const insight = doc.splitTextToSize(
    `Demand for ${order.listing_title} is trending upward in your region. A great time to keep trading on Harvest Hub.`,
    w1 - 28,
  );
  doc.text(insight, M + 14, y + 40);

  const qx = M + w1 + colGap;
  roundedCard(doc, qx, y, w2, triH);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VERIFY RECEIPT", qx + 14, y + 20);
  const QR = 80;
  try {
    doc.addImage(qrDataUrl, "PNG", qx + (w2 - QR) / 2, y + 30, QR, QR);
  } catch {
    /* ignore */
  }
  text(doc, TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Scan to verify authenticity", qx + w2 / 2, y + triH - 10, { align: "center" });

  const supX = qx + w2 + colGap;
  roundedCard(doc, supX, y, w3, triH);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("NEED HELP?", supX + 14, y + 20);
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Our team is here 24/7.", supX + 14, y + 38);
  text(doc, TEXT_MUTED);
  doc.setFontSize(8);
  doc.text("+263 78 123 4567", supX + 14, y + 58);
  doc.text("support@harvesthub.co.zw", supX + 14, y + 74);
  doc.text("Live Chat in the app", supX + 14, y + 90);

  // ============ FOOTER BAR ============
  const footerH = 56;
  rgb(doc, BRAND_GREEN);
  doc.rect(0, H - footerH, W, footerH, "F");
  const fLogo = 32;
  const fLogoY = H - footerH + (footerH - fLogo) / 2;
  if (brandLogo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M, fLogoY, fLogo, fLogo, 5, 5, "F");
    doc.addImage(brandLogo, "PNG", M + 4, fLogoY + 4, fLogo - 8, fLogo - 8);
  }
  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HARVEST HUB", M + fLogo + 12, fLogoY + 14);
  text(doc, [210, 220, 210]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("The Agricultural Commerce Engine of Zimbabwe", M + fLogo + 12, fLogoY + 26);

  text(doc, BRAND_GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Grow with us.", W - M, fLogoY + 14, { align: "right" });
  text(doc, [210, 220, 210]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Stronger Farmers. Stronger Zimbabwe.", W - M, fLogoY + 26, { align: "right" });

  doc.save(`harvest-hub-receipt-${order.order_code}.pdf`);
}

function drawPartyCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  name: string,
  avatar: string | null,
) {
  // Light gray card, 8pt radius
  rgb(doc, [245, 245, 245]);
  stroke(doc, BORDER);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 8, 8, "FD");

  const PAD = 16;
  const AVATAR = 40;

  // Avatar — top-left
  if (avatar) {
    try {
      doc.addImage(avatar, "JPEG", x + PAD, y + PAD, AVATAR, AVATAR);
    } catch {
      rgb(doc, BRAND_GREEN);
      doc.circle(x + PAD + AVATAR / 2, y + PAD + AVATAR / 2, AVATAR / 2, "F");
    }
  } else {
    rgb(doc, BRAND_GREEN);
    doc.circle(x + PAD + AVATAR / 2, y + PAD + AVATAR / 2, AVATAR / 2, "F");
    text(doc, [255, 255, 255]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(label[0], x + PAD + AVATAR / 2, y + PAD + AVATAR / 2 + 5, { align: "center" });
  }

  // Verified badge — top-right (24pt)
  const VB = 22;
  rgb(doc, [232, 247, 237]);
  stroke(doc, SUCCESS);
  doc.setLineWidth(0.6);
  doc.circle(x + w - PAD - VB / 2, y + PAD + VB / 2, VB / 2, "FD");
  text(doc, SUCCESS);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("✓", x + w - PAD - VB / 2, y + PAD + VB / 2 + 4, { align: "center" });

  // Label + name — to right of avatar, doesn't overlap badge
  const tx = x + PAD + AVATAR + 12;
  const maxText = w - (tx - x) - PAD - VB - 8;
  text(doc, TEXT_MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, tx, y + PAD + 8);
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const nameStr = doc.splitTextToSize(name, maxText)[0];
  doc.text(nameStr, tx, y + PAD + 26);
  text(doc, TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Verified member", tx, y + PAD + 42);

  // Bottom row — contact details
  text(doc, TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Harare, Zimbabwe  •  Trusted Harvest Hub member", x + PAD, y + h - PAD + 4);
}

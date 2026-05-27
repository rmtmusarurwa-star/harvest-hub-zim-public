import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import logoUrl from "@/assets/harvest-hub-logo-transparent.png";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

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
const BRAND_GREEN_LIGHT: [number, number, number] = [24, 92, 70];
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
  const M = 28; // outer margin
  const order = orders[0];

  // Fetch related data in parallel
  const [seller, buyer, qrDataUrl, productImg] = await Promise.all([
    fetchProfile(order.farmer_id),
    fetchProfile(order.buyer_id),
    QRCode.toDataURL(
      `https://harvesthub.co.zw/verify/${order.order_code}`,
      { margin: 1, width: 240 },
    ),
    fetchListingImage(order.listing_id).then(urlToDataURL),
  ]);
  const sellerAvatar = await urlToDataURL(seller?.avatar_url ?? null);
  const buyerAvatar = await urlToDataURL(buyer?.avatar_url ?? null);
  const brandLogo = await urlToDataURL(logoUrl);


  // ============ HEADER (dark green band) ============
  rgb(doc, BRAND_GREEN);
  doc.rect(0, 0, W, 110, "F");

  // Logo
  if (brandLogo) {
    // Draw light backing for visibility on dark band
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M, 22, 60, 60, 8, 8, "F");
    doc.addImage(brandLogo, "PNG", M + 4, 26, 52, 52);
  } else {
    rgb(doc, BRAND_GOLD);
    doc.circle(M + 22, 52, 22, "F");
    text(doc, BRAND_GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("HH", M + 22, 56, { align: "center" });
  }


  // Wordmark
  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("HARVEST HUB", M + 56, 50);
  text(doc, BRAND_GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Connect  •  Trade  •  Grow", M + 58, 66);

  // Receipt info (right)
  text(doc, BRAND_GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("RECEIPT", W - M - 150, 38);
  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`# ${order.order_code}`, W - M - 150, 56);
  text(doc, [220, 225, 220]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const d = new Date(order.created_at);
  doc.text(
    `Date: ${d.toLocaleDateString("en-GB")}   Time: ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
    W - M - 150,
    72,
  );

  // PAID badge
  const isPaid = order.payment_status === "paid";
  const badgeW = 88,
    badgeH = 56,
    badgeX = W - M - badgeW,
    badgeY = 22;
  rgb(doc, isPaid ? [232, 247, 237] : [255, 247, 230]);
  stroke(doc, isPaid ? SUCCESS : WARN);
  doc.setLineWidth(1.2);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8, 8, "FD");
  text(doc, isPaid ? SUCCESS : WARN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(isPaid ? "PAID" : "PENDING", badgeX + badgeW / 2, badgeY + 26, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    isPaid ? "Thank you for your order!" : "Awaiting confirmation",
    badgeX + badgeW / 2,
    badgeY + 44,
    { align: "center" },
  );

  let y = 128;

  // ============ TRUST BADGES ============
  const badges = [
    ["Secure Payment", "100% Protected"],
    ["Verified Platform", "Trusted by Farmers"],
    ["Quality Assured", "Fresh & Reliable"],
    ["Support 24/7", "We're here for you"],
  ];
  roundedCard(doc, M, y, W - 2 * M, 44, BG_SOFT);
  const bw = (W - 2 * M) / 4;
  badges.forEach(([title, sub], i) => {
    const bx = M + i * bw + 12;
    // tiny green circle icon
    rgb(doc, SUCCESS);
    doc.circle(bx + 6, y + 22, 5, "F");
    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, bx + 18, y + 20);
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(sub, bx + 18, y + 31);
  });
  y += 56;

  // ============ SELLER / BUYER CARDS ============
  const cardW = (W - 2 * M - 12) / 2;
  const cardH = 110;
  drawPartyCard(
    doc,
    M,
    y,
    cardW,
    cardH,
    "SELLER",
    seller?.full_name || "Verified Farmer",
    "Verified Seller",
    sellerAvatar,
  );
  drawPartyCard(
    doc,
    M + cardW + 12,
    y,
    cardW,
    cardH,
    "BUYER",
    buyer?.full_name || buyerName,
    "Verified Buyer",
    buyerAvatar,
  );
  y += cardH + 14;

  // ============ PRODUCT TABLE ============
  rgb(doc, BRAND_GREEN);
  doc.roundedRect(M, y, W - 2 * M, 24, 4, 4, "F");
  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const tableW = W - 2 * M;
  const cols = [
    { label: "PRODUCT", x: M + 14 },
    { label: "DESCRIPTION", x: M + tableW * 0.28 },
    { label: "QTY", x: M + tableW * 0.55 },
    { label: "UNIT PRICE", x: M + tableW * 0.7 },
    { label: "TOTAL", x: M + tableW - 14 },
  ];
  cols.forEach((c, i) =>
    doc.text(c.label, c.x, y + 16, {
      align: i === cols.length - 1 ? "right" : "left",
    }),
  );
  y += 24;

  // Rows
  for (const o of orders) {
    const rowH = 70;
    rgb(doc, [255, 255, 255]);
    stroke(doc, BORDER);
    doc.setLineWidth(0.4);
    doc.rect(M, y, tableW, rowH, "S");

    // product image
    if (productImg && o === order) {
      try {
        doc.addImage(productImg, "JPEG", M + 10, y + 8, 54, 54);
      } catch {
        rgb(doc, BG_SOFT);
        doc.roundedRect(M + 10, y + 8, 54, 54, 4, 4, "F");
      }
    } else {
      rgb(doc, BG_SOFT);
      doc.roundedRect(M + 10, y + 8, 54, 54, 4, 4, "F");
    }

    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(o.listing_title.slice(0, 24), M + tableW * 0.28, y + 22);
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Premium quality, verified seller.", M + tableW * 0.28, y + 36);
    text(doc, TEXT_MUTED);
    doc.setFontSize(8);
    doc.text("Category: Marketplace", M + tableW * 0.28, y + 54);

    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${o.quantity} ${o.unit}`, M + tableW * 0.55, y + 38);
    doc.text(`$${Number(o.unit_price).toFixed(2)}`, M + tableW * 0.7, y + 38);
    text(doc, SUCCESS);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`$${Number(o.total_amount).toFixed(2)}`, M + tableW - 14, y + 38, {
      align: "right",
    });

    y += rowH;
  }
  y += 14;

  // ============ ORDER DETAILS + PAYMENT SUMMARY ============
  const detailsW = (W - 2 * M - 12) * 0.58;
  const summaryW = W - 2 * M - 12 - detailsW;
  const detailsH = 180;

  roundedCard(doc, M, y, detailsW, detailsH);
  const rows: [string, string][] = [
    ["Order ID", order.id.slice(0, 18).toUpperCase()],
    ["Order Date", new Date(order.created_at).toLocaleString("en-GB")],
    ["Payment Method", PAYMENT_METHOD_LABEL[order.payment_method]],
    ["Payment Status", PAYMENT_STATUS_LABEL[order.payment_status]],
    ["Order Status", isPaid ? "Confirmed" : "Pending"],
    ["Delivery Method", "Seller Delivery"],
    ["Estimated Delivery", "Within 2-5 business days"],
    ["Delivery Location", "Zimbabwe"],
  ];
  let dy = y + 22;
  rows.forEach(([k, v]) => {
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(k, M + 16, dy);
    text(doc, TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.text(v, M + detailsW - 16, dy, { align: "right" });
    dy += 19;
    stroke(doc, BORDER);
    doc.setLineWidth(0.3);
    doc.line(M + 12, dy - 12, M + detailsW - 12, dy - 12);
  });

  // Payment summary
  const sx = M + detailsW + 12;
  roundedCard(doc, sx, y, summaryW, detailsH);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAYMENT SUMMARY", sx + 14, y + 22);

  const subtotal = orders.reduce(
    (s, o) => s + Number(o.unit_price) * Number(o.quantity),
    0,
  );
  const grand = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const delivery = 0;
  const fee = Math.max(0, grand - subtotal - delivery);

  const lines: [string, string][] = [
    ["Subtotal", `$${subtotal.toFixed(2)}`],
    ["Delivery Fee", `$${delivery.toFixed(2)}`],
    ["Platform Service Fee", `$${fee.toFixed(2)}`],
  ];
  let py = y + 46;
  lines.forEach(([k, v]) => {
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(k, sx + 14, py);
    text(doc, TEXT_DARK);
    doc.text(v, sx + summaryW - 14, py, { align: "right" });
    py += 18;
  });
  stroke(doc, BORDER);
  doc.line(sx + 14, py, sx + summaryW - 14, py);
  py += 18;
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total (USD)", sx + 14, py);
  text(doc, BRAND_GREEN);
  doc.setFontSize(15);
  doc.text(`$${grand.toFixed(2)}`, sx + summaryW - 14, py, { align: "right" });
  py += 18;

  rgb(doc, [232, 247, 237]);
  doc.roundedRect(sx + 10, py, summaryW - 20, 26, 4, 4, "F");
  text(doc, SUCCESS);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Amount Paid", sx + 18, py + 17);
  doc.text(`$${(isPaid ? grand : 0).toFixed(2)}`, sx + summaryW - 18, py + 17, {
    align: "right",
  });

  y += detailsH + 14;

  // ============ ORDER PROGRESS TIMELINE ============
  roundedCard(doc, M, y, W - 2 * M, 78);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ORDER PROGRESS", M + 14, y + 18);

  const steps = [
    "Order Placed",
    "Payment Confirmed",
    "Preparing",
    "In Transit",
    "Delivered",
    "Completed",
  ];
  const activeIdx = isPaid ? 1 : 0;
  const sw = (W - 2 * M - 40) / (steps.length - 1);
  const ty = y + 46;
  // line
  stroke(doc, BORDER);
  doc.setLineWidth(1);
  doc.line(M + 30, ty, M + 30 + sw * (steps.length - 1), ty);
  steps.forEach((s, i) => {
    const cx = M + 30 + sw * i;
    if (i <= activeIdx) rgb(doc, BRAND_GOLD);
    else rgb(doc, BG_SOFT);
    stroke(doc, i <= activeIdx ? BRAND_GOLD : BORDER);
    doc.circle(cx, ty, 7, "FD");
    text(doc, i <= activeIdx ? BRAND_GREEN : TEXT_MUTED);
    doc.setFont("helvetica", i <= activeIdx ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.text(s, cx, ty + 18, { align: "center" });
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(i <= activeIdx ? "Done" : "Pending", cx, ty + 28, {
      align: "center",
    });
  });
  y += 92;

  // ============ INSIGHT / QR / SUPPORT ============
  const triW = (W - 2 * M - 24) / 3;
  const triH = 110;

  // Market insight
  roundedCard(doc, M, y, triW, triH, BG_SOFT);
  rgb(doc, BRAND_GREEN);
  doc.roundedRect(M + 12, y + 14, 28, 28, 6, 6, "F");
  text(doc, BRAND_GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Ai", M + 26, y + 32, { align: "center" });
  text(doc, BRAND_GREEN);
  doc.setFontSize(9);
  doc.text("MARKET INSIGHT", M + 48, y + 24);
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const insight = doc.splitTextToSize(
    `Demand for ${order.listing_title} is trending upward in your region. Great time to trade.`,
    triW - 24,
  );
  doc.text(insight, M + 12, y + 60);

  // QR code
  const qx = M + triW + 12;
  roundedCard(doc, qx, y, triW, triH);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VERIFY RECEIPT", qx + 12, y + 18);
  text(doc, TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Scan QR or visit harvesthub.co.zw/verify", qx + 12, y + 32);
  try {
    doc.addImage(qrDataUrl, "PNG", qx + triW - 70, y + 22, 60, 60);
  } catch {
    // ignore
  }
  rgb(doc, BG_SOFT);
  doc.roundedRect(qx + 12, y + triH - 30, triW - 90, 22, 4, 4, "F");
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(order.order_code, qx + 22, y + triH - 14);

  // Support
  const supX = qx + triW + 12;
  roundedCard(doc, supX, y, triW, triH);
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("NEED HELP?", supX + 12, y + 18);
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Our support team is here 24/7.", supX + 12, y + 34);
  text(doc, TEXT_MUTED);
  doc.setFontSize(8);
  doc.text("+263 78 123 4567", supX + 12, y + 52);
  doc.text("support@harvesthub.co.zw", supX + 12, y + 66);
  doc.text("Live Chat on the app", supX + 12, y + 80);

  y += triH + 22;

  // ============ SIGNATURES ============
  const sigW = (W - 2 * M - 30) / 3;
  ["Seller Signature", "Buyer Signature", "Received By"].forEach((lab, i) => {
    const x = M + i * (sigW + 15);
    stroke(doc, TEXT_DARK);
    doc.setLineWidth(0.5);
    doc.line(x, y + 18, x + sigW, y + 18);
    text(doc, TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(lab, x, y + 30);
  });

  // ============ FOOTER ============
  const footerH = 60;
  rgb(doc, BRAND_GREEN);
  doc.rect(0, H - footerH, W, footerH, "F");
  rgb(doc, BRAND_GOLD);
  doc.circle(M + 16, H - footerH / 2, 12, "F");
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("HH", M + 16, H - footerH / 2 + 3, { align: "center" });

  text(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HARVEST HUB", M + 36, H - footerH + 24);
  text(doc, [210, 220, 210]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "The Agricultural Commerce Engine of Zimbabwe",
    M + 36,
    H - footerH + 36,
  );

  text(doc, BRAND_GOLD);
  doc.setFontSize(8);
  doc.text("Grow with us.", W - M - 110, H - footerH + 24);
  text(doc, [210, 220, 210]);
  doc.setFontSize(7);
  doc.text(
    "Stronger Farmers. Stronger Zimbabwe.",
    W - M - 110,
    H - footerH + 36,
  );

  text(doc, [180, 195, 185]);
  doc.setFontSize(7);
  doc.text(
    "Thank you for choosing Harvest Hub. Together, we connect. We trade. We grow.",
    W / 2,
    H - 10,
    { align: "center" },
  );

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
  verifiedLabel: string,
  avatar: string | null,
) {
  roundedCard(doc, x, y, w, h);
  // icon circle
  rgb(doc, BG_SOFT);
  doc.circle(x + 22, y + 22, 14, "F");
  text(doc, BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label[0], x + 22, y + 26, { align: "center" });

  text(doc, TEXT_MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, x + 42, y + 18);
  text(doc, TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(name.slice(0, 22), x + 42, y + 34);

  // Verified pill
  const pillW = 78;
  rgb(doc, [232, 247, 237]);
  stroke(doc, SUCCESS);
  doc.setLineWidth(0.4);
  doc.roundedRect(x + 42, y + 40, pillW, 14, 7, 7, "FD");
  text(doc, SUCCESS);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`✓ ${verifiedLabel}`, x + 42 + pillW / 2, y + 49, { align: "center" });

  // Info lines
  text(doc, TEXT_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Harare, Zimbabwe", x + 16, y + 72);
  doc.text("+263 77 000 0000", x + 16, y + 86);
  doc.text("Trusted member", x + 16, y + 100);

  // Avatar
  if (avatar) {
    try {
      // Draw circular avatar approximated as a clipped image
      doc.addImage(avatar, "JPEG", x + w - 56, y + 22, 44, 44);
    } catch {
      rgb(doc, BG_SOFT);
      doc.circle(x + w - 34, y + 44, 22, "F");
    }
  } else {
    rgb(doc, BG_SOFT);
    doc.circle(x + w - 34, y + 44, 22, "F");
  }
}

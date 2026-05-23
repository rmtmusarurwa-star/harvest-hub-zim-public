import jsPDF from "jspdf";
import type { Database } from "@/integrations/supabase/types";

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

export function downloadReceiptPDF(orders: OrderRow[], buyerName: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFillColor(13, 59, 46);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(232, 160, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("HARVEST HUB ZIMBABWE", 40, 50);
  doc.setTextColor(240, 237, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Official Payment Receipt", 40, 70);

  y = 130;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text(`Buyer: ${buyerName}`, 40, y);
  doc.text(`Date: ${new Date().toLocaleString("en-GB")}`, 40, y + 16);
  doc.text(
    `Payment Method: ${PAYMENT_METHOD_LABEL[orders[0].payment_method]}`,
    40,
    y + 32,
  );
  doc.text(
    `Payment Status: ${PAYMENT_STATUS_LABEL[orders[0].payment_status]}`,
    40,
    y + 48,
  );

  y += 84;
  doc.setFont("helvetica", "bold");
  doc.text("Order Code", 40, y);
  doc.text("Item", 160, y);
  doc.text("Qty", 380, y);
  doc.text("Total (USD)", 460, y);
  doc.setDrawColor(200);
  doc.line(40, y + 6, W - 40, y + 6);
  y += 22;
  doc.setFont("helvetica", "normal");

  let grand = 0;
  for (const o of orders) {
    doc.text(o.order_code, 40, y);
    doc.text(
      String(o.listing_title).slice(0, 38),
      160,
      y,
    );
    doc.text(`${o.quantity} ${o.unit}`, 380, y);
    doc.text(`$${Number(o.total_amount).toFixed(2)}`, 460, y);
    grand += Number(o.total_amount);
    y += 18;
  }

  doc.setDrawColor(200);
  doc.line(40, y, W - 40, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Grand Total", 380, y);
  doc.setTextColor(201, 168, 76);
  doc.text(`$${grand.toFixed(2)}`, 460, y);

  y += 50;
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Thank you for trading on Harvest Hub Zimbabwe — connecting farmers to markets.",
    40,
    y,
  );

  doc.save(`harvest-hub-receipt-${orders[0].order_code}.pdf`);
}

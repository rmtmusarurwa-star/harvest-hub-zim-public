import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLICKNPAY_BASE = "https://backendservices.clicknpay.africa:2081";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { primaryCode } = await req.json() as { primaryCode: string };
    if (!primaryCode) return json({ error: "primaryCode required" }, 400);

    const cpRes = await fetch(
      `${CLICKNPAY_BASE}/payme/orders/top-paid/${encodeURIComponent(primaryCode)}`,
      { headers: { "Content-Type": "application/json" } },
    );

    if (!cpRes.ok) throw new Error(`ClicknPay status check failed: ${cpRes.status}`);

    const data = await cpRes.json() as { status?: string };
    const rawStatus = (data.status ?? "").toUpperCase();

    const paymentStatus =
      rawStatus === "SUCCESS" ? "paid" :
      rawStatus === "FAILED" ? "failed" :
      "pending";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Snapshot pending orders BEFORE update — used to fire one-time notifications.
    // If all orders are already paid (repeat poll), pendingOrders is empty → no re-notify.
    const { data: pendingOrders } = await supabase
      .from("orders")
      .select("farmer_id, listing_title, quantity, unit")
      .eq("payment_reference", primaryCode)
      .eq("payment_status", "pending");

    // Update payment_status on all orders sharing this reference
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: paymentStatus } as never)
      .eq("payment_reference", primaryCode);

    if (error) console.error("[clicknpay-verify] DB update error:", error.message);

    // Notify each farmer exactly once when payment first lands
    if (paymentStatus === "paid" && pendingOrders && pendingOrders.length > 0) {
      // Group items by farmer_id so each seller gets one notification per checkout
      const farmerMap = new Map<string, { listing_title: string; quantity: number; unit: string }[]>();
      for (const o of pendingOrders) {
        if (!o.farmer_id) continue;
        if (!farmerMap.has(o.farmer_id)) farmerMap.set(o.farmer_id, []);
        farmerMap.get(o.farmer_id)!.push({
          listing_title: o.listing_title,
          quantity: Number(o.quantity),
          unit: o.unit,
        });
      }

      const notifications: {
        user_id: string;
        type: string;
        message: string;
        link: string;
      }[] = [];

      for (const [farmerId, orders] of farmerMap.entries()) {
        const summary =
          orders.length === 1
            ? `${orders[0].listing_title} (${orders[0].quantity} ${orders[0].unit})`
            : `${orders.length} items`;
        notifications.push({
          user_id: farmerId,
          type: "order",
          message: `New order paid: ${summary} — payment confirmed via ClicknPay`,
          link: "/orders",
        });
      }

      if (notifications.length > 0) {
        const { error: notifErr } = await supabase
          .from("notifications")
          .insert(notifications);
        if (notifErr) {
          console.error("[clicknpay-verify] notification insert error:", notifErr.message);
        }
      }
    }

    return json({ rawStatus, paymentStatus });
  } catch (err) {
    console.error("[clicknpay-verify]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

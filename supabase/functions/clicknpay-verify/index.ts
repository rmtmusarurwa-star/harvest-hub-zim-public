import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLICKNPAY_BASE    = "https://backendservices.clicknpay.africa:2081";
const PLATFORM_FEE_RATE = 0.02; // 2% commission kept by Harvest Hub
const ADMIN_EMAIL       = "rmtmusarurwa@icloud.com";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ─── Helper: look up admin user ID (cached per invocation) ─────────────────
async function getAdminUserId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    return users.find((u) => u.email === ADMIN_EMAIL)?.id ?? null;
  } catch (e) {
    console.error("[clicknpay-verify] could not resolve admin ID:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { primaryCode } = await req.json() as { primaryCode: string };
    if (!primaryCode) return json({ error: "primaryCode required" }, 400);

    // ── 1. Poll ClicknPay for order status ───────────────────────────────────
    let cpStatus: string;
    try {
      const cpRes = await fetch(
        `${CLICKNPAY_BASE}/payme/orders/top-paid/${encodeURIComponent(primaryCode)}`,
        { headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10_000) },
      );
      if (!cpRes.ok) {
        const body = await cpRes.text().catch(() => "");
        console.error(`[clicknpay-verify] ClicknPay ${cpRes.status}:`, body);
        return json({ rawStatus: "UNKNOWN", paymentStatus: "pending", error: `ClicknPay API error ${cpRes.status}` });
      }
      const data = await cpRes.json() as { status?: string };
      cpStatus = (data.status ?? "").toUpperCase();
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("[clicknpay-verify] fetch error:", msg);
      return json({ rawStatus: "UNKNOWN", paymentStatus: "pending", error: `Network error: ${msg}` });
    }

    const paymentStatus =
      cpStatus === "SUCCESS" ? "paid"    :
      cpStatus === "FAILED"  ? "failed"  :
      "pending";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 2. Snapshot pending orders BEFORE marking paid ───────────────────────
    // If we've already processed this ref (repeat poll), pendingOrders is empty.
    const { data: pendingOrders, error: snapErr } = await supabase
      .from("orders")
      .select("id, order_code, buyer_id, farmer_id, listing_title, quantity, unit, subtotal, total_amount")
      .eq("payment_reference", primaryCode)
      .eq("payment_status", "pending");

    if (snapErr) console.error("[clicknpay-verify] snapshot error:", snapErr.message);

    // ── 3. Update order payment_status ───────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ payment_status: paymentStatus } as never)
      .eq("payment_reference", primaryCode);

    if (updateErr) console.error("[clicknpay-verify] order update error:", updateErr.message);

    // ── 4. Resolve admin user ID (needed for both success + failure paths) ──
    const adminId = await getAdminUserId(supabase);

    // ── 5. PAID: create payout obligations + notify farmer, buyer, admin ─────
    if (paymentStatus === "paid" && pendingOrders && pendingOrders.length > 0) {

      // 5a. Payout obligations
      const obligations = pendingOrders
        .filter((o) => !!o.farmer_id)
        .map((o) => {
          // subtotal = what the product cost (farmer's portion, 100%)
          // total_amount = subtotal + 2% platform fee charged to buyer
          // For legacy orders (subtotal not set), fall back to old formula.
          const subtotal   = o.subtotal != null
            ? Number(o.subtotal)
            : Math.round(Number(o.total_amount ?? 0) / 1.02 * 100) / 100;
          const total      = Number(o.total_amount ?? 0);
          const fee        = Math.round((total - subtotal) * 100) / 100;
          const net        = subtotal; // farmer receives 100% of product price
          return {
            order_id:          o.id,
            seller_id:         o.farmer_id,
            payment_reference: primaryCode,
            gross_amount:      total,   // total buyer paid (including fee)
            platform_fee:      fee,     // 2% fee collected from buyer
            net_amount:        net,     // what farmer gets (subtotal, 100%)
            status:            "pending",
          };
        });

      if (obligations.length > 0) {
        const { error: oblErr } = await supabase
          .from("payout_obligations")
          .upsert(obligations, { onConflict: "order_id", ignoreDuplicates: true });
        if (oblErr) console.error("[clicknpay-verify] payout_obligations error:", oblErr.message);
        else console.log(`[clicknpay-verify] created ${obligations.length} payout obligation(s) for ref ${primaryCode}`);
      }

      const totalAmount = pendingOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
      const notifications: { user_id: string; type: string; message: string; link: string }[] = [];

      // 5b. Farmer notifications (one per farmer, not per order)
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
      for (const [farmerId, items] of farmerMap.entries()) {
        const summary = items.length === 1
          ? `${items[0].listing_title} (${items[0].quantity} ${items[0].unit})`
          : `${items.length} items`;
        notifications.push({
          user_id: farmerId,
          type:    "order",
          message: `💰 Payment confirmed: ${summary} — funds received via ClicknPay, payout pending.`,
          link:    "/orders",
        });
      }

      // 5c. Buyer notifications (one per buyer)
      const buyerIds = [...new Set(pendingOrders.map((o) => o.buyer_id).filter(Boolean))];
      const itemCount = pendingOrders.length;
      for (const buyerId of buyerIds) {
        notifications.push({
          user_id: buyerId,
          type:    "order",
          message: `✅ Payment confirmed! Your ${itemCount === 1 ? "order" : `${itemCount} orders`} (ref: ${primaryCode}) ${itemCount === 1 ? "has" : "have"} been placed successfully.`,
          link:    "/orders",
        });
      }

      // 5d. Admin notification
      if (adminId) {
        notifications.push({
          user_id: adminId,
          type:    "announcement",
          message: `💳 Payment received: $${totalAmount.toFixed(2)} · Ref: ${primaryCode} · ${pendingOrders.length} item(s) · Payout required — check Financial tab.`,
          link:    "/admin",
        });
      }

      if (notifications.length > 0) {
        const { error: notifErr } = await supabase.from("notifications").insert(notifications);
        if (notifErr) console.error("[clicknpay-verify] notification insert error:", notifErr.message);
        else console.log(`[clicknpay-verify] sent ${notifications.length} notification(s)`);
      }
    }

    // ── 6. FAILED: notify buyer + admin ──────────────────────────────────────
    if (paymentStatus === "failed") {
      // Fetch buyer_ids (snapshot may be empty if already processed)
      const { data: relatedOrders } = await supabase
        .from("orders")
        .select("buyer_id, total_amount")
        .eq("payment_reference", primaryCode)
        .limit(10);

      const failedNotifs: { user_id: string; type: string; message: string; link: string }[] = [];

      const buyerIds = [...new Set((relatedOrders ?? []).map((o: any) => o.buyer_id).filter(Boolean))];
      for (const buyerId of buyerIds) {
        failedNotifs.push({
          user_id: buyerId,
          type:    "order",
          message: `❌ Payment failed (ref: ${primaryCode}). Please return to checkout and try again. Your cart has been saved.`,
          link:    "/checkout",
        });
      }

      if (adminId) {
        const totalAttempted = (relatedOrders ?? []).reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0);
        failedNotifs.push({
          user_id: adminId,
          type:    "announcement",
          message: `⚠️ Payment failed: $${totalAttempted.toFixed(2)} · Ref: ${primaryCode} — no action required.`,
          link:    "/admin",
        });
      }

      if (failedNotifs.length > 0) {
        const { error: failErr } = await supabase.from("notifications").insert(failedNotifs);
        if (failErr) console.error("[clicknpay-verify] failed notification error:", failErr.message);
      }
    }

    return json({ rawStatus: cpStatus, paymentStatus });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[clicknpay-verify] unhandled error:", msg);
    return json({ error: msg, paymentStatus: "pending" }, 500);
  }
});

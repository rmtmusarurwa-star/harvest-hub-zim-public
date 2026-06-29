import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLICKNPAY_BASE = "https://backendservices.clicknpay.africa:2081";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLICKNPAY_PUBLIC_UID = Deno.env.get("CLICKNPAY_PUBLIC_UID") ?? "HQGVaTYJihldpvzsw";
// APP_URL must be set as a Supabase secret: supabase secrets set APP_URL=https://your-domain
// Falls back to the Workers URL — update this if your custom domain changes.
const APP_URL = Deno.env.get("APP_URL") ?? "https://harvest-hub-zim.rowlandmusarurwa.workers.dev";

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

function genCode() {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `HHZ-${ts}${rand}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { buyerId, buyerEmail, paymentMethod, items, customerPhone, appOrigin } =
      await req.json() as {
        buyerId: string;
        buyerEmail?: string;
        paymentMethod?: string;
        appOrigin?: string;
        items: Array<{
          id: string;
          farmer_id?: string;
          title: string;
          quantity: number;
          unit: string;
          price: number;
        }>;
        customerPhone?: string;
      };

    if (!buyerId || !items?.length) return json({ error: "Missing required fields" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const PLATFORM_FEE_RATE = 0.02; // 2% charged TO the buyer on top of product price

    const primaryCode = genCode();
    const orderRows = items.map((it, i) => {
      const subtotal     = Math.round(it.price * it.quantity * 100) / 100;
      const platformFee  = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
      const totalAmount  = Math.round((subtotal + platformFee) * 100) / 100;
      return {
        order_code: i === 0 ? primaryCode : genCode(),
        buyer_id: buyerId,
        farmer_id: it.farmer_id && it.farmer_id !== "mock" ? it.farmer_id : buyerId,
        listing_id: it.id && !String(it.id).startsWith("mock-") ? it.id : null,
        listing_title: it.title,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.price,
        subtotal,                          // product cost, what farmer receives
        total_amount: totalAmount,         // what buyer pays (subtotal + 2% fee)
        payment_method: paymentMethod ?? "card",
        payment_status: "pending",
        payment_reference: primaryCode,
      };
    });

    const { data: inserted, error: dbErr } = await supabase
      .from("orders")
      .insert(orderRows)
      .select("order_code, listing_title, quantity, unit, unit_price, subtotal, total_amount");

    if (dbErr) throw new Error(dbErr.message);

    const codes = inserted!.map((o: { order_code: string }) => o.order_code);

    // Use the origin reported by the browser (always the correct deployed domain).
    // Falls back to the APP_URL env secret, then the hardcoded default.
    const baseUrl =
      (appOrigin as string | undefined)?.trim() ||
      Deno.env.get("APP_URL") ||
      "https://harvest-hub-zim.harvesthub.workers.dev";
    const returnUrl = `${baseUrl}/checkout/payment-return`;

    // ClicknPay only supports integer quantities — always send quantity:1 with
    // price = total line amount. The actual qty and unit go in the description.
    const productsList = inserted!.map((o: {
      listing_title: string;
      quantity: number;
      unit: string;
      unit_price: number;
      subtotal: number;
      total_amount: number;
    }, i: number) => ({
      id: i,
      productName: o.listing_title ?? "Farm Produce",
      // description shows product qty; price is the full buyer amount (subtotal + 2% fee)
      description: `${Number(o.quantity)} ${o.unit} · incl. 2% platform fee`,
      price: Number(o.total_amount),  // buyer charged subtotal + platform fee
      quantity: 1,
    }));

    const clicknpayBody = {
      channel: "AUTOMATED",
      clientReference: primaryCode,
      currency: "USD",
      customerCharged: true,
      customerPhoneNumber: customerPhone ?? "",
      customerEmail: buyerEmail ?? "",
      description: `Harvest Hub – ${codes.length} order${codes.length > 1 ? "s" : ""}`,
      multiplePayments: true,
      orderType: "DYNAMIC",
      productsList,
      publicUniqueId: CLICKNPAY_PUBLIC_UID,
      returnUrl,
    };

    const cpRes = await fetch(`${CLICKNPAY_BASE}/payme/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clicknpayBody),
    });

    const cpText = await cpRes.text();
    if (!cpRes.ok) throw new Error(`ClicknPay ${cpRes.status}: ${cpText}`);

    const cpData = JSON.parse(cpText);
    const paymeURL: string | undefined =
      cpData.paymeURL ?? cpData.payme_url ?? cpData.PaymeURL;

    if (!paymeURL) {
      console.error("[clicknpay-checkout] response missing paymeURL:", cpText);
      throw new Error("ClicknPay did not return a payment URL");
    }

    return json({ paymeURL, codes: codes.join(","), primaryCode });
  } catch (err) {
    console.error("[clicknpay-checkout]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

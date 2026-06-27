import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CLICKNPAY_BASE = "https://backendservices.clicknpay.africa:2081";
const CLICKNPAY_PUBLIC_UID = Deno.env.get("CLICKNPAY_PUBLIC_UID") ?? "";
const TEST_UID = "HQGVaTYJihldpvzsw";

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

  const configured = !!CLICKNPAY_PUBLIC_UID;
  const isLive = configured && CLICKNPAY_PUBLIC_UID !== TEST_UID;
  const uidMasked = configured
    ? `${CLICKNPAY_PUBLIC_UID.slice(0, 6)}…${CLICKNPAY_PUBLIC_UID.slice(-4)}`
    : "not configured";

  // Lightweight reachability check — try the ClicknPay API base
  let apiReachable = false;
  try {
    const res = await fetch(`${CLICKNPAY_BASE}/payme/orders`, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(5000),
    });
    apiReachable = res.status < 600; // any HTTP response = reachable
  } catch {
    apiReachable = false;
  }

  return json({
    configured,
    mode: isLive ? "live" : "test",
    uidMasked,
    apiReachable,
    paymentMethods: ["ecocash", "onemoney", "card"],
  });
});

// Harvest Hub — agentic chat core.
//
// Single entry point for BOTH the web "Ask Harvest AI" launcher and the
// future WhatsApp channel (see whatsapp-agent-spec.md §2-5). Same agent,
// same tools, same conversation model — only the transport differs.
//
// Deploy:  supabase functions deploy agent-chat
// Secrets: supabase secrets set DEEPSEEK_API_KEY=sk-...
//   (get a free key with no card needed at platform.deepseek.com/api_keys —
//    new accounts get a 5M token grant, which is the actual reason this
//    moved off Anthropic: no billing setup required to start testing)
//
// Request body:
//   {
//     channel: "web" | "whatsapp",
//     message: string,
//     profileId?: string,      // required for channel "web"
//     phoneNumber?: string,    // required for channel "whatsapp" (E.164)
//     conversationId?: string  // omit to start/continue-by-identity automatically
//   }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Running on DeepSeek's Anthropic-compatible endpoint instead of Anthropic
// directly — same request/response shape (x-api-key auth, same tool-calling
// format), just a different base_url and model name, so the rest of this
// file (TOOLS, the tool-use loop, etc.) didn't need to change at all.
// DeepSeek's Anthropic-compatible endpoint does NOT support image input
// though, so diagnose-photo (vision) still needs real Anthropic credits —
// see that function's comments.
const LLM_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;
const LLM_BASE_URL = "https://api.deepseek.com/anthropic/v1/messages";
const LLM_MODEL = "deepseek-v4-flash";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Without these, the browser blocks the request before it even reaches this
// function (a failed CORS preflight) and supabase.functions.invoke() just
// surfaces as a generic network error on the client — which is what was
// showing up as "Harvest AI isn't connected yet" even after deploying.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Harvest AI — the agentic assistant for Harvest Hub, a Zimbabwean
agricultural marketplace. You help farmers and buyers buy, sell, track orders, book transport,
and get real-time market and weather information by chatting in plain language.

TOOLS YOU HAVE:
- search_listings: find active produce/livestock listings
- create_listing: list produce or livestock for sale (confirm details first)
- place_order: buy from a listing (confirm listing, quantity, and payment method first)
- get_my_listings: show the user their own listings
- get_my_orders: show the user's purchase or sales orders
- request_transport: post a transport request to find a driver (confirm details first)
- update_listing: change price, quantity, description, or mark as sold
- get_market_price: current commodity prices from live listings
- get_weather: weather for any location (Open-Meteo, free, keyless)

RULES:
- Be concise — this may be read on a basic phone or WhatsApp.
- For any action that creates or modifies data (create_listing, place_order, request_transport,
  update_listing) you MUST read the details back to the user and get explicit confirmation
  BEFORE calling the tool. There is no UI to catch mistakes.
- Use real tools rather than guessing at prices, availability, or weather.
- For get_weather and get_market_price, always use the location/commodity from the user's
  MOST RECENT message — never reuse one from an earlier turn.
- Reply in the user's language if it is not English (Shona and Ndebele are common).
- If the user asks what you can do, list your capabilities briefly.`;

const TOOLS = [
  {
    name: "search_listings",
    description: "Search active marketplace listings by crop/category, location, and/or max price.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Crop or product name, e.g. 'tomatoes'" },
        location: { type: "string", description: "Town, province, or country, optional" },
        max_price: { type: "number", description: "Maximum price per unit, optional" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_listing",
    description: "Create a new marketplace listing on behalf of the current farmer. Only call this AFTER reading the details back to the user and getting explicit confirmation.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        category: { type: "string", enum: ["produce", "livestock", "poultry", "equipment", "other"] },
        quantity: { type: "number" },
        unit: { type: "string", description: "e.g. kg, ton, bag, head, bird" },
        price: { type: "number", description: "Price per unit, USD" },
        location: { type: "string" },
        province: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "category", "quantity", "unit", "price", "location"],
    },
  },
  {
    name: "get_market_price",
    description: "Get the current indicative market price for a commodity.",
    input_schema: {
      type: "object",
      properties: {
        commodity: { type: "string" },
        market: { type: "string", description: "Optional market/region name" },
      },
      required: ["commodity"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather / short forecast for a location.",
    input_schema: {
      type: "object",
      properties: { location: { type: "string" } },
      required: ["location"],
    },
  },
  {
    name: "place_order",
    description: "Place a purchase order on behalf of the current user for a specific listing. Confirm listing_id, quantity, and payment method with the user BEFORE calling this. Only call once the user has explicitly confirmed.",
    input_schema: {
      type: "object",
      properties: {
        listing_id: { type: "string", description: "UUID of the listing to order from" },
        quantity: { type: "number", description: "How many units to order" },
        payment_method: {
          type: "string",
          enum: ["ecocash", "onemoney", "zipit", "cash_on_delivery", "card"],
          description: "Payment method the buyer will use",
        },
        notes: { type: "string", description: "Optional message to the farmer" },
      },
      required: ["listing_id", "quantity", "payment_method"],
    },
  },
  {
    name: "get_my_listings",
    description: "Get the current user's own marketplace listings. Use to review, update, or close their listings.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "sold", "expired", "all"],
          description: "Filter by listing status. Defaults to 'active'.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_my_orders",
    description: "Get the current user's orders — either as a buyer (orders they placed) or as a farmer (orders received on their listings).",
    input_schema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          enum: ["buyer", "farmer"],
          description: "Fetch orders where the user is the buyer or the farmer/seller",
        },
      },
      required: ["role"],
    },
  },
  {
    name: "request_transport",
    description: "Post a transport request to find a vehicle/driver. Confirm details with the user before calling.",
    input_schema: {
      type: "object",
      properties: {
        pickup: { type: "string", description: "Pickup location (town or address)" },
        destination: { type: "string", description: "Drop-off destination" },
        cargo: { type: "string", description: "What is being transported, e.g. '500 kg maize'" },
        estimated_weight_kg: { type: "number", description: "Approximate weight in kg" },
        scheduled_date: { type: "string", description: "Date in YYYY-MM-DD format, optional" },
        budget: { type: "number", description: "Maximum budget in USD, 0 if unknown" },
        contact_phone: { type: "string", description: "Contact phone number for the driver to call" },
      },
      required: ["pickup", "destination", "cargo", "estimated_weight_kg", "contact_phone"],
    },
  },
  {
    name: "update_listing",
    description: "Update the price, quantity, or description of one of the current user's own listings. Only call with fields the user explicitly wants to change.",
    input_schema: {
      type: "object",
      properties: {
        listing_id: { type: "string", description: "UUID of the listing to update" },
        price: { type: "number", description: "New price per unit in USD, optional" },
        quantity: { type: "number", description: "New available quantity, optional" },
        description: { type: "string", description: "Updated description, optional" },
        status: { type: "string", enum: ["active", "sold", "expired"], description: "Mark as sold/expired, optional" },
      },
      required: ["listing_id"],
    },
  },
];

// WMO weather codes (used by Open-Meteo) collapsed into plain-language conditions.
function weatherCodeToText(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

// Open-Meteo is free and keyless — geocode the place name, then pull current conditions.
async function getRealWeather(location: string) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
  );
  if (!geoRes.ok) throw new Error(`Geocoding failed (${geoRes.status})`);
  const geo = await geoRes.json();
  const place = geo.results?.[0];
  if (!place) return { error: `Couldn't find a location called "${location}".` };

  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`,
  );
  if (!wxRes.ok) throw new Error(`Forecast failed (${wxRes.status})`);
  const wx = await wxRes.json();
  const c = wx.current;
  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    temp_c: c.temperature_2m,
    condition: weatherCodeToText(c.weather_code),
    humidity_pct: c.relative_humidity_2m,
    precipitation_mm: c.precipitation,
    wind_kmh: c.wind_speed_10m,
    as_of: c.time,
    source: "open-meteo.com",
  };
}

// Real price discovery from actual active listings rather than a static guess —
// reflects what the marketplace is actually asking right now, not a curated number.
async function getRealMarketPrice(commodity: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("price, unit")
    .eq("status", "active")
    .ilike("title", `%${commodity}%`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: `No active listings for "${commodity}" right now — can't quote a current price.` };
  }
  const prices = data.map((d) => Number(d.price)).filter((p) => Number.isFinite(p));
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  return {
    commodity,
    avg_price: Math.round(avg * 100) / 100,
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    unit: data[0].unit,
    sample_size: prices.length,
    currency: "USD",
    source: "live Harvest Hub listings",
    as_of: new Date().toISOString(),
  };
}

// Maps each tool name → which agent card it belongs to
const TOOL_AGENT_MAP = {
  create_listing:    "sales",
  update_listing:    "sales",
  get_my_listings:   "sales",
  search_listings:   "buyers",
  place_order:       "buyers",
  get_market_price:  "market",
  get_weather:       "market",
  request_transport: "transport",
} as const;

// Human-readable title for each tool action shown in the card feed
const TOOL_LOG_TITLE = {
  create_listing:    "Created a new listing",
  update_listing:    "Updated a listing",
  get_my_listings:   "Checked your listings",
  search_listings:   "Searched the marketplace",
  place_order:       "Placed an order",
  get_market_price:  "Fetched commodity prices",
  get_weather:       "Checked weather forecast",
  request_transport: "Posted a transport request",
} as const;

async function runTool(name: string, input: Record<string, unknown>, ctx: { farmerId: string | null }) {
  switch (name) {
    case "search_listings": {
      let q = supabase
        .from("listings")
        .select("id, title, price, unit, quantity, location, province, status")
        .eq("status", "active")
        .ilike("title", `%${input.query}%`)
        .limit(8);
      if (input.max_price) q = q.lte("price", input.max_price as number);
      if (input.location) q = q.ilike("location", `%${input.location}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { results: data };
    }

    case "create_listing": {
      if (!ctx.farmerId) {
        return { error: "No linked Harvest Hub account — ask the user to link their account first (link_account flow, not yet implemented)." };
      }
      const { data, error } = await supabase
        .from("listings")
        .insert({
          title: input.title,
          category: input.category,
          quantity: input.quantity,
          unit: input.unit,
          price: input.price,
          location: input.location,
          province: input.province ?? "",
          description: input.description ?? "",
          farmer_id: ctx.farmerId,
        })
        .select("id, title, price, unit")
        .single();
      if (error) return { error: error.message };
      return { created: data };
    }

    case "get_market_price": {
      try {
        return await getRealMarketPrice(String(input.commodity));
      } catch (err) {
        return { error: (err as Error).message };
      }
    }

    case "get_weather": {
      try {
        return await getRealWeather(String(input.location));
      } catch (err) {
        return { error: (err as Error).message };
      }
    }

    case "place_order": {
      if (!ctx.farmerId) return { error: "No linked account — cannot place an order." };
      // look up the listing to get farmer_id, price, title
      const { data: listing, error: listingErr } = await supabase
        .from("listings")
        .select("id, title, farmer_id, price, unit, quantity, status")
        .eq("id", String(input.listing_id))
        .single();
      if (listingErr || !listing) return { error: "Listing not found." };
      if (listing.status !== "active") return { error: "This listing is no longer active." };
      if (listing.farmer_id === ctx.farmerId) return { error: "You cannot order your own listing." };
      const qty = Number(input.quantity);
      if (qty <= 0) return { error: "Quantity must be greater than 0." };
      const totalAmount = qty * Number(listing.price);
      const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_code: orderCode,
          buyer_id: ctx.farmerId,
          farmer_id: listing.farmer_id,
          listing_id: listing.id,
          listing_title: listing.title,
          quantity: qty,
          unit: listing.unit,
          unit_price: listing.price,
          total_amount: totalAmount,
          payment_method: String(input.payment_method),
          notes: input.notes ? String(input.notes) : null,
        })
        .select("id, order_code, total_amount")
        .single();
      if (orderErr) return { error: orderErr.message };
      return {
        success: true,
        order_code: order.order_code,
        total_amount_usd: order.total_amount,
        message: `Order ${order.order_code} placed for ${qty} ${listing.unit} of ${listing.title} — total $${totalAmount.toFixed(2)} USD.`,
      };
    }

    case "get_my_listings": {
      if (!ctx.farmerId) return { error: "No linked account." };
      const statusFilter = String(input.status ?? "active");
      let q = supabase
        .from("listings")
        .select("id, title, category, price, unit, quantity, status, location, created_at")
        .eq("farmer_id", ctx.farmerId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { listings: data ?? [], count: (data ?? []).length };
    }

    case "get_my_orders": {
      if (!ctx.farmerId) return { error: "No linked account." };
      const role = String(input.role ?? "buyer");
      const column = role === "farmer" ? "farmer_id" : "buyer_id";
      const { data, error } = await supabase
        .from("orders")
        .select("order_code, listing_title, quantity, unit, unit_price, total_amount, payment_method, payment_status, created_at")
        .eq(column, ctx.farmerId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) return { error: error.message };
      return { orders: data ?? [], role, count: (data ?? []).length };
    }

    case "request_transport": {
      if (!ctx.farmerId) return { error: "No linked account." };
      const { data, error } = await supabase
        .from("transport_requests")
        .insert({
          poster_id: ctx.farmerId,
          pickup: String(input.pickup),
          destination: String(input.destination),
          cargo: String(input.cargo),
          estimated_weight_kg: Number(input.estimated_weight_kg) || 0,
          scheduled_date: input.scheduled_date ? String(input.scheduled_date) : null,
          budget: Number(input.budget) || 0,
          contact_phone: String(input.contact_phone),
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      return {
        success: true,
        request_id: data.id,
        message: `Transport request posted from ${input.pickup} to ${input.destination}. Drivers will see your request and can respond.`,
      };
    }

    case "update_listing": {
      if (!ctx.farmerId) return { error: "No linked account." };
      // verify ownership
      const { data: existing, error: fetchErr } = await supabase
        .from("listings")
        .select("id, farmer_id")
        .eq("id", String(input.listing_id))
        .single();
      if (fetchErr || !existing) return { error: "Listing not found." };
      if (existing.farmer_id !== ctx.farmerId) return { error: "You can only update your own listings." };
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.price !== undefined) updates.price = Number(input.price);
      if (input.quantity !== undefined) updates.quantity = Number(input.quantity);
      if (input.description !== undefined) updates.description = String(input.description);
      if (input.status !== undefined) updates.status = String(input.status);
      const { error: updateErr } = await supabase.from("listings").update(updates).eq("id", String(input.listing_id));
      if (updateErr) return { error: updateErr.message };
      return { success: true, updated_fields: Object.keys(updates).filter((k) => k !== "updated_at") };
    }

    default:
      return { error: `Unknown tool ${name}` };
  }
}

async function callClaude(messages: unknown[]) {
  const res = await fetch(LLM_BASE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function resolveConversation(channel: string, profileId?: string, phoneNumber?: string, conversationId?: string) {
  if (conversationId) {
    const { data } = await supabase.from("agent_conversations").select("*").eq("id", conversationId).single();
    if (data) return data;
  }

  if (channel === "whatsapp") {
    if (!phoneNumber) throw new Error("phoneNumber required for whatsapp channel");
    let { data: wu } = await supabase.from("whatsapp_users").select("*").eq("phone_number", phoneNumber).maybeSingle();
    if (!wu) {
      const { data: created } = await supabase.from("whatsapp_users").insert({ phone_number: phoneNumber }).select("*").single();
      wu = created;
    }
    let { data: convo } = await supabase
      .from("agent_conversations").select("*")
      .eq("channel", "whatsapp").eq("whatsapp_user_id", wu.id)
      .order("last_message_at", { ascending: false }).limit(1).maybeSingle();
    if (!convo) {
      const { data: created } = await supabase
        .from("agent_conversations").insert({ channel: "whatsapp", whatsapp_user_id: wu.id }).select("*").single();
      convo = created;
    }
    return { ...convo, _farmerId: wu.linked_profile_id ?? null };
  }

  // web channel
  if (!profileId) throw new Error("profileId required for web channel");
  let { data: convo } = await supabase
    .from("agent_conversations").select("*")
    .eq("channel", "web").eq("profile_id", profileId)
    .order("last_message_at", { ascending: false }).limit(1).maybeSingle();
  if (!convo) {
    const { data: created } = await supabase
      .from("agent_conversations").insert({ channel: "web", profile_id: profileId }).select("*").single();
    convo = created;
  }
  return { ...convo, _farmerId: profileId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const { channel, message, profileId, phoneNumber, conversationId } = body;
    if (!channel || !message) {
      return new Response(JSON.stringify({ error: "channel and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const convo = await resolveConversation(channel, profileId, phoneNumber, conversationId);
    const farmerId: string | null = (convo as Record<string, unknown>)._farmerId as string | null ?? null;

    await supabase.from("agent_messages").insert({
      conversation_id: convo.id, direction: "inbound", type: "text", content: message,
    });

    // Most recent 8 messages (4 exchanges), not the oldest 20 — keeps the
    // model anchored to what's actually being asked right now instead of
    // re-fetching ancient turns once a conversation runs long, and limits
    // how much a stale earlier answer (e.g. an old weather lookup) can bias
    // a new one.
    const { data: historyDesc, error: historyErr } = await supabase
      .from("agent_messages").select("direction, content, tool_calls")
      .eq("conversation_id", convo.id).order("created_at", { ascending: false }).limit(8);
    if (historyErr) throw new Error(`Failed to load conversation history: ${historyErr.message}`);
    const history = (historyDesc ?? []).slice().reverse();

    const claudeMessages: unknown[] = (history ?? []).map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content ?? "",
    }));

    let finalText = "";
    for (let turn = 0; turn < 3; turn++) {
      const resp = await callClaude(claudeMessages);
      if (!Array.isArray(resp.content)) {
        console.error("Unexpected LLM response shape:", JSON.stringify(resp));
        throw new Error("The AI service returned an unexpected response — see function logs.");
      }
      const toolUses = resp.content.filter((b: { type: string }) => b.type === "tool_use");
      const textBlocks = resp.content.filter((b: { type: string }) => b.type === "text");
      finalText = textBlocks.map((b: { text: string }) => b.text).join("\n");

      if (toolUses.length === 0) break;

      claudeMessages.push({ role: "assistant", content: resp.content });
      const toolResults = [];
      for (const tu of toolUses) {
        const result = await runTool(tu.name, tu.input, { farmerId });
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) });

        // Log activity so the Agent Control Center cards show real history
        if (farmerId) {
          const agentType = TOOL_AGENT_MAP[tu.name as keyof typeof TOOL_AGENT_MAP] ?? "sales";
          const logTitle = TOOL_LOG_TITLE[tu.name as keyof typeof TOOL_LOG_TITLE] ?? tu.name;
          const detail = (() => {
            const r = result as Record<string, unknown>;
            if (r?.title) return String(r.title);
            if (r?.name) return String(r.name);
            if (r?.error) return `⚠ ${r.error}`;
            if (Array.isArray(r)) return `${r.length} result${r.length === 1 ? "" : "s"}`;
            return null;
          })();
          await supabase.from("agent_activity_log").insert({
            user_id: farmerId,
            agent: agentType,
            title: logTitle,
            detail,
          }).then(() => {/* fire-and-forget */});
        }
      }
      claudeMessages.push({ role: "user", content: toolResults });
    }

    if (!finalText.trim()) {
      console.error("Empty reply after tool loop. Last claudeMessages:", JSON.stringify(claudeMessages));
      finalText = "Sorry, I wasn't able to put together a reply for that — try rephrasing, or ask again in a moment.";
    }

    await supabase.from("agent_messages").insert({
      conversation_id: convo.id, direction: "outbound", type: "text", content: finalText,
    });
    await supabase.from("agent_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convo.id);

    return new Response(JSON.stringify({ conversationId: convo.id, reply: finalText }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});

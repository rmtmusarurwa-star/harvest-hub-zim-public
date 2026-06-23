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

const SYSTEM_PROMPT = `You are the Harvest Hub assistant — helping farmers and buyers across our markets
buy, sell, and get information by chatting in plain language, over WhatsApp or the web.
Be concise (this may be read on a basic phone). Use the tools you're given rather than
guessing at prices, listings, or weather. When a farmer describes produce to sell, confirm
the details back to them in plain language BEFORE calling create_listing — there is no UI
here to catch typos, so confirmation is mandatory. Reply in the user's language if it is
not English.

When calling get_weather or get_market_price, always extract the location or commodity from
the user's MOST RECENT message — never reuse one from earlier in the conversation. If the
latest message names a different place or item than before, call the tool with that new one,
even if an earlier turn already covered a different location/commodity.`;

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

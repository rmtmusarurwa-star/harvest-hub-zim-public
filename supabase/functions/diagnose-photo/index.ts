// Real photo diagnosis for disease-id.tsx's "Photo diagnosis" tab.
//
// The previous implementation picked a RANDOM disease from the matching
// crop/livestock pool after a fake progress bar — clearly disclosed as
// "Demo AI" in the UI, but not actually doing anything. This calls Claude's
// vision capability for real classification, then hands back just a
// disease id + confidence + short reasoning.
//
// Deliberately NOT asking the model to invent treatment/dosage/prevention
// text — that stays sourced from the curated DISEASES library already in
// disease-id.tsx, which has been checked against real Zimbabwean extension
// guidance. The model's only job is: "which of these known diseases does
// this photo most likely show". Keeps the high-stakes content (chemical
// dosages, vaccine schedules) out of LLM-freetext territory.
//
// Deploy:  supabase functions deploy diagnose-photo
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Request body:
//   { imageBase64: string, mediaType: string, mode: "crop" | "livestock", host?: string }
// Response:
//   { diseaseId: string | null, confidence: number, reasoning: string }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Keep in sync with the `id`/`name`/`hosts` fields of DISEASES in
// src/routes/_authenticated/disease-id.tsx. Intentionally compact — this is
// a classification checklist, not the full knowledge base.
const KNOWN_DISEASES = [
  { id: "fall-armyworm", type: "crop", hosts: ["Maize", "Sorghum"] },
  { id: "maize-streak", type: "crop", hosts: ["Maize"] },
  { id: "grey-leaf-spot", type: "crop", hosts: ["Maize"] },
  { id: "fusarium-wilt", type: "crop", hosts: ["Tomatoes", "Bananas", "Cotton"] },
  { id: "damping-off", type: "crop", hosts: ["Tomatoes", "Cabbages", "Tobacco", "Onions"] },
  { id: "tobacco-mosaic", type: "crop", hosts: ["Tobacco", "Tomatoes"] },
  { id: "anthracnose", type: "crop", hosts: ["Tomatoes", "Beans", "Mangoes"] },
  { id: "bacterial-blight", type: "crop", hosts: ["Cotton", "Beans"] },
  { id: "rust", type: "crop", hosts: ["Wheat", "Barley"] },
  { id: "groundnut-rosette", type: "crop", hosts: ["Groundnuts"] },
  { id: "newcastle", type: "livestock", hosts: ["Chickens"] },
  { id: "fmd", type: "livestock", hosts: ["Cattle", "Goats", "Sheep", "Pigs"] },
  { id: "asf", type: "livestock", hosts: ["Pigs"] },
  { id: "blackleg", type: "livestock", hosts: ["Cattle", "Sheep"] },
  { id: "ecf", type: "livestock", hosts: ["Cattle"] },
  { id: "lsd", type: "livestock", hosts: ["Cattle"] },
  { id: "anthrax", type: "livestock", hosts: ["Cattle", "Goats", "Sheep"] },
  { id: "mastitis", type: "livestock", hosts: ["Cattle", "Goats"] },
  { id: "coccidiosis", type: "livestock", hosts: ["Chickens", "Goats"] },
  { id: "brucellosis", type: "livestock", hosts: ["Cattle", "Goats", "Pigs"] },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const { imageBase64, mediaType, mode, host } = await req.json();
    if (!imageBase64 || !mediaType || !mode) {
      return new Response(JSON.stringify({ error: "imageBase64, mediaType, and mode are required" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const checklist = KNOWN_DISEASES.filter(
      (d) => d.type === mode && (!host || d.hosts.includes(host))
    );

    const prompt = `You are assisting a Zimbabwean farmer with a ${mode} health photo. Pick the SINGLE
most likely match from this known-disease checklist (respond with its exact id, or null if
none plausibly match):

${checklist.map((d) => `- ${d.id} (hosts: ${d.hosts.join(", ")})`).join("\n")}

Respond with ONLY a JSON object, no other text: {"diseaseId": "<id-or-null>", "confidence": <0-100>, "reasoning": "<one short sentence on the visual signs you used>"}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content ?? []).find((b: { type: string }) => b.type === "text")?.text ?? "{}";

    let parsed: { diseaseId: string | null; confidence: number; reasoning: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { diseaseId: null, confidence: 0, reasoning: "Could not parse model response." };
    }

    return new Response(JSON.stringify(parsed), {
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

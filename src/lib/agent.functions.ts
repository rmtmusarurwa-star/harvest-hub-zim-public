import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AgentKind = z.enum(["sales", "buyers", "disease", "market", "transport"]);

const ResultCard = z.object({
  title: z.string(),
  subtitle: z.string(),
  meta: z.string(),
  score: z.number().int().min(0).max(100),
});

const AgentResponse = z.object({
  agent: AgentKind,
  summary: z.string(),
  results: z.array(ResultCard).max(5),
});

export type AgentResult = z.infer<typeof AgentResponse>;

const SYSTEM = `You are Harvest AI, an agentic assistant for a Zimbabwean
agricultural marketplace (Harvest Hub). The user is a farmer or buyer.
Their input may be in English, Shona, or Ndebele.

Pick the single agent best suited to handle the request:
- sales: list/sell produce/livestock, pricing strategy
- buyers: find or match buyers to a listing
- disease: livestock/crop disease identification or care advice
- market: commodity price intel, demand trends
- transport: vehicle/transport booking or quotes

Return a short summary (one sentence, max 14 words) plus up to 3 concrete,
plausible result cards specific to Zimbabwe (real-sounding operator names,
USD prices, real cities like Harare/Bulawayo/Mutare/Gweru).
Score = confidence the card fits the request (0-100).

Respond ONLY with valid JSON, no markdown, no code fences:
{"agent":"...","summary":"...","results":[{"title":"...","subtitle":"...","meta":"...","score":85}]}`;

async function callGemini(apiKey: string, userQuery: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: SYSTEM }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

export const runAgentQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const q = String(input?.query ?? "").trim();
    if (!q) throw new Error("Query required");
    if (q.length > 500) throw new Error("Query too long");
    return { query: q };
  })
  .handler(async ({ data, context }) => {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) throw new Error("AI service not configured.");

    let parsed: AgentResult;
    try {
      const text = await callGemini(key, data.query);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      parsed = AgentResponse.parse(JSON.parse(jsonMatch[0]));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (lower.includes("429") || lower.includes("quota") || lower.includes("rate")) {
        throw new Error("Harvest AI is busy — try again in a moment.");
      }
      if (lower.includes("400") || lower.includes("api key") || lower.includes("401")) {
        throw new Error("AI service not configured.");
      }
      throw new Error("Harvest AI couldn't respond. Try again.");
    }

    // Log to agent_activity_log
    const { supabase, userId } = context;
    await supabase.from("agent_activity_log").insert({
      user_id: userId,
      agent: parsed.agent,
      event_type: "action",
      title: data.query.slice(0, 120),
      detail: parsed.summary,
      metadata: { results: parsed.results },
    });

    return parsed;
  });

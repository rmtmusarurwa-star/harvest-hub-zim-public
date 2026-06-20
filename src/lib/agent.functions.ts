import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

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
agricultural marketplace (Harvest Hub). The user is a farmer or buyer. Their
input may be in English or Shona/Ndebele.

Pick the single agent best suited to handle the request:
- sales: list/sell produce/livestock, pricing strategy
- buyers: find or match buyers to a listing
- disease: livestock/crop disease identification or care advice
- market: commodity price intel, demand trends
- transport: vehicle/transport booking or quotes

Return a short summary (one sentence, max 14 words) plus up to 3 concrete,
plausible result cards. Cards must be specific to Zimbabwe (real-sounding
operator names, USD prices, real cities like Harare/Bulawayo/Mutare/Gweru).
Score = your confidence the card fits the user's request (0-100).`;

export const runAgentQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const q = String(input?.query ?? "").trim();
    if (!q) throw new Error("Query required");
    if (q.length > 500) throw new Error("Query too long");
    return { query: q };
  })
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    let parsed: AgentResult;
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: SYSTEM,
        prompt: data.query,
        experimental_output: Output.object({ schema: AgentResponse }),
      });
      parsed = experimental_output as AgentResult;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (lower.includes("429") || lower.includes("rate")) {
        throw new Error("Harvest AI is busy. Try again in a moment.");
      }
      if (lower.includes("402") || lower.includes("credit")) {
        throw new Error("AI credits exhausted. Please top up.");
      }
      throw new Error("Harvest AI couldn't respond. Try again.");
    }

    // Log to agent_activity_log (RLS scopes to this user).
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

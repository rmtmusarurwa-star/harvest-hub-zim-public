import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Returns an AI provider pointed at Google Gemini's OpenAI-compatible endpoint.
 * Set GOOGLE_AI_API_KEY in your Cloudflare Workers secrets:
 *   wrangler secret put GOOGLE_AI_API_KEY
 * Get a free key at https://aistudio.google.com/apikey
 */
export function createHarvestAiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "harvest-ai",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

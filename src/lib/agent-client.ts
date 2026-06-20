// Thin client for the agent-chat Edge Function (supabase/functions/agent-chat).
// Used by the web "Ask Harvest AI" launcher. The WhatsApp channel hits the
// same function with channel: "whatsapp" from the Twilio webhook instead.

import { supabase } from "@/integrations/supabase/client";

export type AgentReply = {
  conversationId: string;
  reply: string;
};

export async function askHarvestAi(
  message: string,
  profileId: string,
  conversationId?: string,
): Promise<AgentReply> {
  const { data, error } = await supabase.functions.invoke("agent-chat", {
    body: { channel: "web", message, profileId, conversationId },
  });
  if (error) throw error;
  return data as AgentReply;
}

export type PhotoDiagnosis = {
  diseaseId: string | null;
  confidence: number;
  reasoning: string;
};

// Thin client for supabase/functions/diagnose-photo — real Claude-vision
// classification for the disease-id.tsx "Photo diagnosis" tab. Returns only
// a disease id + confidence + reasoning; the actual treatment/prevention
// text stays sourced from the curated DISEASES library in disease-id.tsx,
// not the model.
export async function diagnosePhoto(
  file: File,
  mode: "crop" | "livestock",
  host?: string,
): Promise<PhotoDiagnosis> {
  const imageBase64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke("diagnose-photo", {
    body: { imageBase64, mediaType: file.type || "image/jpeg", mode, host },
  });
  if (error) throw error;
  return data as PhotoDiagnosis;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:image/...;base64," prefix — Anthropic wants raw base64
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

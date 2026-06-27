// Harvest Hub — Twilio WhatsApp webhook
//
// Twilio sends a POST (application/x-www-form-urlencoded) for every
// inbound WhatsApp message. This function:
//   1. Validates the Twilio signature (prevents spoofed requests)
//   2. Calls the agent-chat function with channel: "whatsapp"
//   3. Returns TwiML so Twilio sends the reply back to the user
//
// Deploy:  supabase functions deploy whatsapp-webhook
// Secrets: supabase secrets set \
//   TWILIO_ACCOUNT_SID=ACxxxx \
//   TWILIO_AUTH_TOKEN=xxxx \
//   TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
//
// In Twilio console → Messaging → WhatsApp Sandbox (or your number):
//   Webhook URL: https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook
//   Method: HTTP POST

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;

// ─── Twilio signature validation ─────────────────────────────────────────────
// Prevents anyone from hitting this endpoint pretending to be Twilio.
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  // Sort params alphabetically, concatenate key+value pairs onto the URL
  const sortedKeys = Object.keys(params).sort();
  const data = url + sortedKeys.map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", authToken)
    .update(data)
    .digest("base64");
  return expected === signature;
}

// ─── Send reply via Twilio REST API ──────────────────────────────────────────
// Used as a fallback if TwiML delivery fails (e.g. long processing time).
async function sendTwilioMessage(to: string, from: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
}

// ─── TwiML response ───────────────────────────────────────────────────────────
function twiml(message: string): Response {
  // Twilio reads TwiML synchronously from the webhook response.
  // Keep the message under ~1600 chars (WhatsApp limit).
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Message>
</Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // Signature validation is skipped in sandbox mode.
  // Set TWILIO_VALIDATE_SIGNATURE=true via supabase secrets to enable in production.
  const validateSig = Deno.env.get("TWILIO_VALIDATE_SIGNATURE") === "true";
  if (validateSig) {
    const twilioSignature = req.headers.get("X-Twilio-Signature") ?? "";
    const webhookUrl = req.url;
    const valid = validateTwilioSignature(
      TWILIO_AUTH_TOKEN,
      twilioSignature,
      webhookUrl,
      params,
    );
    if (!valid) {
      console.warn("Invalid Twilio signature — request rejected");
      return new Response("Forbidden", { status: 403 });
    }
  }

  const from: string = params.From ?? "";       // e.g. "whatsapp:+263771234567"
  const body: string = (params.Body ?? "").trim();
  const to: string = params.To ?? "";           // your Twilio WhatsApp number

  if (!from || !body) {
    return twiml("Sorry, I didn't catch that. Send me a message and I'll help.");
  }

  // Normalise: strip the "whatsapp:" prefix for storage, keep E.164 format
  const phoneNumber = from.replace(/^whatsapp:/i, "");

  console.log(`[whatsapp-webhook] ${phoneNumber}: ${body.slice(0, 80)}`);

  try {
    // Call the shared agent-chat Edge Function
    const agentRes = await fetch(
      `${SUPABASE_URL}/functions/v1/agent-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channel: "whatsapp",
          message: body,
          phoneNumber,
        }),
      },
    );

    if (!agentRes.ok) {
      const errText = await agentRes.text();
      console.error(`[whatsapp-webhook] agent-chat error ${agentRes.status}: ${errText}`);
      return twiml("Something went wrong on our end. Try again in a moment.");
    }

    const { reply } = await agentRes.json() as { reply: string };

    // WhatsApp messages max out at ~1600 chars. Truncate gracefully.
    const safeReply =
      reply.length > 1500
        ? reply.slice(0, 1497) + "…"
        : reply;

    return twiml(safeReply);
  } catch (err) {
    console.error("[whatsapp-webhook] unexpected error:", err);
    return twiml("Harvest AI is unavailable right now. Try again shortly.");
  }
});

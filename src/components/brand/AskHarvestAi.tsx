import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { askHarvestAi } from "@/lib/agent-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant" | "error"; content: string };

/**
 * Global "Ask Harvest AI" launcher — mounted once in AppLayout, so it's
 * available on every authenticated page. Calls the real agent-chat Edge
 * Function (src/lib/agent-client.ts). Degrades gracefully with a clear
 * message if that function hasn't been deployed yet, rather than failing
 * silently or throwing — see whatsapp-agent-spec.md for deploy steps.
 */
export function AskHarvestAi() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const conversationIdRef = useRef<string | undefined>(undefined);

  if (!user) return null;
  const userId = user.id;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const res = await askHarvestAi(text, userId, conversationIdRef.current);
      conversationIdRef.current = res.conversationId;
      setMessages((m) => [...m, { role: "assistant", content: res.reply || "…" }]);
    } catch (err) {
      // Surface the REAL backend error instead of a guessed/stale message —
      // supabase-js wraps the Edge Function's JSON error body in `context`
      // (a Response object) on FunctionsHttpError.
      let detail = (err as Error).message || "Unknown error";
      const context = (err as { context?: Response }).context;
      if (context) {
        try {
          const body = await context.clone().json();
          if (body?.error) detail = body.error;
        } catch {
          // body wasn't JSON — fall back to the generic message above
        }
      }
      setMessages((m) => [...m, { role: "error", content: `Harvest AI error: ${detail}` }]);
      console.error("[AskHarvestAi]", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-secondary to-accent px-5 py-3.5 text-sm font-semibold text-background shadow-[0_18px_40px_-12px_rgba(232,160,32,0.5)]"
      >
        <Sparkles className="h-4 w-4" /> {open ? "Close" : "Ask Harvest AI"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="glass-strong fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-secondary" /> Harvest AI
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Ask about prices, list produce, or get a disease ID — in plain language, same as
                  on WhatsApp.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[88%] rounded-xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-secondary/15 text-foreground ring-1 ring-secondary/30"
                      : m.role === "error"
                        ? "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30 text-xs"
                        : "bg-white/[0.04] text-foreground ring-1 ring-white/5",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {sending && <div className="text-xs text-muted-foreground">Thinking…</div>}
            </div>

            <form
              onSubmit={send}
              className="flex items-center gap-2 border-t border-white/5 px-3 py-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { askHarvestAi } from "@/lib/agent-client";

const PROMPTS = [
  "Sell 500 broilers",
  "Find buyers for maize",
  "Book transport to Harare",
  "What's today's tomato price?",
  "Match my soya beans to buyers",
];

export function CommandBar() {
  const { user } = useAuth();
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PROMPTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || pending || !user) return;
    setSubmitted(q);
    setPending(true);
    setReply(null);
    setError(null);
    try {
      const res = await askHarvestAi(q, user.id, conversationIdRef.current);
      conversationIdRef.current = res.conversationId;
      setReply(res.reply);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Harvest AI couldn't respond.";
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  const clear = () => {
    setSubmitted(null);
    setReply(null);
    setError(null);
    setQuery("");
  };

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4 lg:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary/90">
          Harvest AI · Command Bar
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-background/40 px-4 py-3 text-sm text-foreground outline-none focus:border-secondary/60"
            aria-label="Ask Harvest AI"
            disabled={pending}
          />
          {!query && (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="whitespace-nowrap"
                >
                  Try: "{PROMPTS[placeholderIdx]}"
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="btn-glow inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
        >
          {pending ? "Thinking…" : "Ask"} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Results for <span className="text-foreground">"{submitted}"</span>
              </span>
              <button onClick={clear} className="hover:text-foreground">
                Clear
              </button>
            </div>

            {pending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-secondary" /> Thinking…
              </div>
            )}

            {!pending && error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            {!pending && reply && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/5 bg-white/[0.04] px-4 py-3 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap"
              >
                {reply}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

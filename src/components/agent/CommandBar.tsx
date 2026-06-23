import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ArrowRight, Check, X, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { runAgentQuery, type AgentResult } from "@/lib/agent.functions";
import { toast } from "sonner";

const PROMPTS = [
  "Sell 500 broilers",
  "Find buyers for maize",
  "Book transport to Harare",
  "What's today's tomato price?",
  "Match my soya beans to buyers",
];

export function CommandBar() {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [response, setResponse] = useState<AgentResult | null>(null);
  const [decided, setDecided] = useState<Record<number, "accepted" | "declined">>({});
  const [error, setError] = useState<string | null>(null);

  const runQuery = useServerFn(runAgentQuery);

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PROMPTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || pending) return;
    setSubmitted(q);
    setPending(true);
    setResponse(null);
    setDecided({});
    setError(null);
    try {
      const result = await runQuery({ data: { query: q } });
      setResponse(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Harvest AI couldn't respond.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  const clear = () => {
    setSubmitted(null);
    setResponse(null);
    setError(null);
    setQuery("");
    setDecided({});
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
                {response ? (
                  <span className="text-foreground/90">{response.summary}</span>
                ) : (
                  <>
                    Results for <span className="text-foreground">"{submitted}"</span>
                  </>
                )}
              </span>
              <button onClick={clear} className="hover:text-foreground">
                Clear
              </button>
            </div>

            {pending && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
                  />
                ))}
              </div>
            )}

            {!pending && error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            {!pending && response && response.results.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {response.results.map((r, idx) => {
                  const status = decided[idx];
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      className="glass rounded-xl p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {r.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>
                        </div>
                        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                          {r.score}%
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-foreground/80">{r.meta}</div>
                      {!status ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              setDecided((d) => ({ ...d, [idx]: "accepted" }));
                              toast.success("Deal initiated");
                            }}
                            className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-semibold text-secondary-foreground hover:opacity-90"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => setDecided((d) => ({ ...d, [idx]: "declined" }))}
                            className="flex-1 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-foreground/80 hover:bg-white/5"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold ${
                            status === "accepted"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/5 text-muted-foreground"
                          }`}
                        >
                          {status === "accepted" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          {status === "accepted" ? "Deal created" : "Declined"}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

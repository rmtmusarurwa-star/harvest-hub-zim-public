import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ArrowRight, Check, X } from "lucide-react";

const PROMPTS = [
  "Sell 500 broilers",
  "Find buyers for maize",
  "Book transport to Harare",
  "What's today's tomato price?",
  "Match my soya beans to buyers",
];

type ResultCard = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  score: number;
};

function mockResults(query: string): ResultCard[] {
  const seed = query.toLowerCase();
  return [
    {
      id: "1",
      title: "Mbare Wholesale Co.",
      subtitle: `Interested in: ${seed.slice(0, 28) || "your listing"}`,
      meta: "Offer: $385/ton · Pickup Harare",
      score: 92,
    },
    {
      id: "2",
      title: "GreenLeaf Exporters",
      subtitle: "Bulk buyer · verified",
      meta: "Offer: $372/ton · Pickup Bulawayo",
      score: 86,
    },
    {
      id: "3",
      title: "Highveld Millers",
      subtitle: "Recurring weekly demand",
      meta: "Offer: $360/ton · 90-day contract",
      score: 78,
    },
  ];
}

export function CommandBar() {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<ResultCard[]>([]);
  const [decided, setDecided] = useState<Record<string, "accepted" | "declined">>({});

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PROMPTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    setPending(true);
    setResults([]);
    setDecided({});
    setTimeout(() => {
      setResults(mockResults(q));
      setPending(false);
    }, 700);
  };

  const clear = () => {
    setSubmitted(null);
    setResults([]);
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
            className="w-full rounded-xl border border-white/10 bg-background/40 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-secondary/60"
            placeholder="What would you like to do today?"
            aria-label="Ask Harvest AI"
          />
          {!query && (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60">
              <span className="opacity-0">.</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap"
                >
                  Try: "{PROMPTS[placeholderIdx]}"
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn-glow inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
        >
          Ask <ArrowRight className="h-4 w-4" />
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
                  />
                ))}
              </div>
            )}

            {!pending && results.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {results.map((r, idx) => {
                  const status = decided[r.id];
                  return (
                    <motion.div
                      key={r.id}
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
                          <div className="truncate text-xs text-muted-foreground">
                            {r.subtitle}
                          </div>
                        </div>
                        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                          {r.score}% match
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-foreground/80">{r.meta}</div>
                      {!status ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setDecided((d) => ({ ...d, [r.id]: "accepted" }))}
                            className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-semibold text-secondary-foreground hover:opacity-90"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => setDecided((d) => ({ ...d, [r.id]: "declined" }))}
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

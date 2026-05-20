import { Sparkles } from "lucide-react";

export function AIInsight() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-secondary/20 bg-gradient-to-br from-secondary/[0.08] via-transparent to-accent/[0.06] p-5">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/15 blur-3xl" />
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-secondary/20">
          <Sparkles className="h-4 w-4 text-secondary" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-secondary">
          AI Insight
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Maize prices in Mashonaland are trending up <span className="text-secondary">+4.2%</span> this
        week as buyers in Harare restock ahead of winter. If you're holding grade A stock,
        consider listing within the next 5 days to capture the spike before the next GMB tender.
      </p>
    </div>
  );
}

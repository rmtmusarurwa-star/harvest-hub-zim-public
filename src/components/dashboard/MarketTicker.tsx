import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { COMMODITIES, commodityChangePct } from "@/lib/market-data";

export function MarketTicker() {
  const enriched = COMMODITIES.map((c) => ({
    name: c.name,
    unit: c.unit.replace("USD / ", "/"),
    price: c.price,
    change: commodityChangePct(c),
  }));
  const items = [...enriched, ...enriched];
  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#0F1F18] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#0F1F18] to-transparent" />
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary/90">
          Live Market · USD
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
          ZW Mercantile
        </span>
      </div>
      <motion.div
        className="flex gap-10 whitespace-nowrap py-3"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ ease: "linear", duration: 60, repeat: Infinity }}
      >
        {items.map((c, i) => {
          const up = c.change >= 0;
          return (
            <div key={i} className="flex items-center gap-3 px-2">
              <span className="text-sm text-foreground/90">{c.name}</span>
              <span className="font-mono text-sm text-secondary">${c.price.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground">{c.unit}</span>
              <span
                className={`flex items-center gap-1 text-xs ${
                  up ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {up ? "+" : ""}
                {c.change.toFixed(1)}%
              </span>
              <span className="text-white/10">•</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

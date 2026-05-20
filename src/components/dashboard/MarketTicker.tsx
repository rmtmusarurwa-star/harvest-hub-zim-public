import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

const COMMODITIES = [
  { name: "Maize (white)", unit: "/ton", price: 385, change: 2.4 },
  { name: "Soya Beans", unit: "/ton", price: 720, change: -1.1 },
  { name: "Beef (carcass)", unit: "/kg", price: 4.85, change: 0.8 },
  { name: "Pork (live)", unit: "/kg", price: 3.2, change: 1.6 },
  { name: "Tomatoes", unit: "/crate", price: 12.5, change: -3.2 },
  { name: "Onions", unit: "/bag 50kg", price: 28, change: 4.1 },
  { name: "Broilers (live)", unit: "/bird", price: 6.4, change: 2.0 },
  { name: "Groundnuts", unit: "/kg", price: 1.85, change: 0.5 },
];

export function MarketTicker() {
  const items = [...COMMODITIES, ...COMMODITIES];
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
              <span className="font-mono text-sm text-secondary">
                ${c.price.toFixed(2)}
              </span>
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

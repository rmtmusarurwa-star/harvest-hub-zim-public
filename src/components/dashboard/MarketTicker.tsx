import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type TickerItem = {
  name: string;
  price: number;
  unit: string;
  count: number;
};

export function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("title, price, unit")
        .eq("status", "active");

      if (!data?.length) return;

      // Group by title to get per-commodity avg price
      const map = new Map<string, { prices: number[]; unit: string }>();
      for (const row of data) {
        const entry = map.get(row.title) ?? { prices: [], unit: row.unit };
        entry.prices.push(row.price);
        map.set(row.title, entry);
      }

      setItems(
        [...map.entries()].map(([name, { prices, unit }]) => ({
          name,
          price: prices.reduce((s, p) => s + p, 0) / prices.length,
          unit,
          count: prices.length,
        })),
      );
    }
    load();
  }, []);

  if (!items.length) return null;

  // Triplicate so the loop is seamless regardless of item count
  const scrollItems = [...items, ...items, ...items];

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
          Harvest Hub Listings
        </span>
      </div>
      <motion.div
        className="flex gap-10 whitespace-nowrap py-3"
        animate={{ x: ["0%", `-${(100 / 3).toFixed(4)}%`] }}
        transition={{ ease: "linear", duration: 50, repeat: Infinity }}
      >
        {scrollItems.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-2">
            <span className="text-sm text-foreground/90">{c.name}</span>
            <span className="font-mono text-sm text-secondary">
              ${c.price.toFixed(c.price < 10 ? 2 : 0)}
            </span>
            <span className="text-[10px] text-muted-foreground">/{c.unit}</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Layers className="h-3 w-3" />
              {c.count}
            </div>
            <span className="text-white/10">•</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

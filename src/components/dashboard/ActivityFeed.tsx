import { motion } from "framer-motion";
import { ArrowUpRight, Package, Handshake } from "lucide-react";

type Item = {
  kind: "listing" | "sale";
  who: string;
  what: string;
  qty: string;
  where: string;
  price: string;
  time: string;
};

const ITEMS: Item[] = [
  { kind: "listing", who: "Tendai M.", what: "White Maize", qty: "12 tons", where: "Chinhoyi", price: "$380/t", time: "2m" },
  { kind: "sale", who: "Bulawayo Meats", what: "Beef carcass", qty: "640 kg", where: "Bulawayo", price: "$4.90/kg", time: "6m" },
  { kind: "listing", who: "Rufaro Farms", what: "Broilers (live)", qty: "480 birds", where: "Harare", price: "$6.40", time: "11m" },
  { kind: "sale", who: "Mutare Fresh", what: "Tomatoes", qty: "85 crates", where: "Mutare", price: "$12.20", time: "17m" },
  { kind: "listing", who: "Gokwe Co-op", what: "Cotton seed", qty: "3 tons", where: "Gokwe", price: "$0.55/kg", time: "23m" },
  { kind: "sale", who: "OK Zimbabwe", what: "Onions", qty: "42 bags", where: "Harare", price: "$27/bag", time: "31m" },
  { kind: "listing", who: "Nyamandlovu Dairy", what: "Raw milk", qty: "1,200 L", where: "Nyamandlovu", price: "$0.70/L", time: "44m" },
];

export function ActivityFeed() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl">Live Marketplace</h3>
          <p className="text-xs text-muted-foreground">Recent listings and sales</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </div>
      </div>

      <ul className="space-y-2">
        {ITEMS.map((it, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.35 }}
            className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.015] px-3 py-3 hover:bg-white/[0.04]"
          >
            <div
              className={`grid h-9 w-9 place-items-center rounded-lg ${
                it.kind === "listing"
                  ? "bg-secondary/15 text-secondary"
                  : "bg-emerald-400/15 text-emerald-400"
              }`}
            >
              {it.kind === "listing" ? <Package className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 truncate text-sm">
                <span className="text-foreground">{it.who}</span>
                <span className="text-muted-foreground">
                  {it.kind === "listing" ? "listed" : "sold"}
                </span>
                <span className="text-foreground/90">{it.what}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {it.qty} · {it.where}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-secondary">{it.price}</div>
              <div className="text-[10px] text-muted-foreground">{it.time} ago</div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

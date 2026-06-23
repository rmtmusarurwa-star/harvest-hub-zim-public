import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FeedItem = {
  id: string;
  title: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  created_at: string;
  farmer_id: string;
  farmer_name: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatPrice(price: number, unit: string): string {
  if (price >= 100) return `$${price.toFixed(0)}/${unit}`;
  if (price >= 1) return `$${price.toFixed(2)}/${unit}`;
  return `$${price.toFixed(2)}/${unit}`;
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch the 8 most recent active listings
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, category, price, unit, quantity, location, created_at, farmer_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);

      if (!listings?.length) {
        setLoading(false);
        return;
      }

      // Fetch farmer names for those listings
      const farmerIds = [...new Set(listings.map((l) => l.farmer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", farmerIds);

      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) nameMap[p.id] = p.full_name;

      setItems(
        listings.map((l) => ({
          ...l,
          farmer_name: nameMap[l.farmer_id] ?? "Farmer",
        })),
      );
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl">Live Marketplace</h3>
          <p className="text-xs text-muted-foreground">Most recent listings</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </div>
      </div>

      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="h-14 animate-pulse rounded-xl bg-white/[0.03]"
            />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Package className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No listings yet.</p>
          <p className="text-xs text-muted-foreground/60">
            Post your first listing to see activity here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.35 }}
              className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.015] px-3 py-3 hover:bg-white/[0.04]"
            >
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-secondary/15 text-secondary">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-sm">
                  <span className="max-w-[7rem] truncate font-medium text-foreground">
                    {it.farmer_name.split(" ")[0]}{" "}
                    {it.farmer_name.split(" ")[1]?.[0] ?? ""}.
                  </span>
                  <span className="text-muted-foreground">listed</span>
                  <span className="truncate text-foreground/90">{it.title}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {it.quantity.toLocaleString()} {it.unit} · {it.location}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="font-mono text-sm text-secondary">
                  {formatPrice(it.price, it.unit)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {timeAgo(it.created_at)} ago
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

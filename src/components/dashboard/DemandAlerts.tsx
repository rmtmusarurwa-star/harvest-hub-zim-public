import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CategoryBucket = {
  category: string;
  count: number;
  locations: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Fresh Produce",
  livestock: "Livestock",
  poultry: "Poultry",
  dairy: "Dairy",
  grain: "Grain",
  other: "Other",
};

function urgencyFor(count: number, total: number): "high" | "med" | "low" {
  const share = count / total;
  if (share > 0.3) return "high";
  if (share > 0.15) return "med";
  return "low";
}

export function DemandAlerts() {
  const [buckets, setBuckets] = useState<CategoryBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("category, location")
        .eq("status", "active");

      if (!data?.length) {
        setLoading(false);
        return;
      }

      const map = new Map<string, CategoryBucket>();
      for (const row of data) {
        const b = map.get(row.category) ?? {
          category: row.category,
          count: 0,
          locations: [],
        };
        b.count++;
        if (!b.locations.includes(row.location)) b.locations.push(row.location);
        map.set(row.category, b);
      }

      const sorted = [...map.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      setBuckets(sorted);
      setLoading(false);
    }
    load();
  }, []);

  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent" />
        <h3 className="font-display text-xl">Active Categories</h3>
      </div>

      {loading ? (
        <ul className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </ul>
      ) : buckets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted-foreground">
          No listings yet. Post your first to see category activity.
        </div>
      ) : (
        <ul className="space-y-2">
          {buckets.map((b, i) => {
            const urgency = urgencyFor(b.count, total);
            const locationStr =
              b.locations.slice(0, 2).join(" & ") +
              (b.locations.length > 2 ? ` +${b.locations.length - 2}` : "");
            return (
              <motion.li
                key={b.category}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="relative overflow-hidden rounded-xl border border-accent/15 bg-accent/[0.04] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-foreground">
                      {CATEGORY_LABELS[b.category] ?? b.category}
                    </div>
                    <div className="text-xs text-muted-foreground">{locationStr}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                        urgency === "high"
                          ? "bg-rose-400"
                          : urgency === "med"
                            ? "bg-accent"
                            : "bg-secondary"
                      }`}
                    />
                    <span className="font-mono text-sm text-accent">
                      {b.count} listing{b.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

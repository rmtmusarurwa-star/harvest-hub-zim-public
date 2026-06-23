import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Star, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Listing = {
  id: string;
  title: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  location: string;
  farmer_name: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Fresh Produce",
  livestock: "Livestock",
  poultry: "Poultry",
  dairy: "Dairy",
  grain: "Grain",
  other: "Other",
};

export function FeaturedOpportunities() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch active listings, sort by value = price × quantity, take top 3
      const { data: listings } = await supabase
        .from("listings")
        .select("id, title, category, price, unit, quantity, location, farmer_id")
        .eq("status", "active")
        .limit(50);

      if (!listings?.length) {
        setLoading(false);
        return;
      }

      const top3 = [...listings]
        .sort((a, b) => b.price * b.quantity - a.price * a.quantity)
        .slice(0, 3);

      const farmerIds = [...new Set(top3.map((l) => l.farmer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", farmerIds);

      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) nameMap[p.id] = p.full_name;

      setItems(
        top3.map((l) => ({
          id: l.id,
          title: l.title,
          category: l.category,
          price: l.price,
          unit: l.unit,
          quantity: l.quantity,
          location: l.location,
          farmer_name: nameMap[l.farmer_id] ?? "Farmer",
        })),
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-4">
          <h3 className="font-display text-xl">Featured Opportunities</h3>
          <p className="text-xs text-muted-foreground">Highest-value active listings</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass h-44 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div>
        <div className="mb-4">
          <h3 className="font-display text-xl">Featured Opportunities</h3>
        </div>
        <div className="glass flex flex-col items-center gap-2 rounded-2xl py-12 text-center">
          <Package className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No listings yet.</p>
          <p className="text-xs text-muted-foreground/60">
            Post your first listing to feature it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="font-display text-xl">Featured Opportunities</h3>
          <p className="text-xs text-muted-foreground">
            Highest-value active listings right now
          </p>
        </div>
        <Link
          to="/marketplace"
          className="text-xs text-secondary underline-offset-2 hover:underline"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.45 }}
            className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:border-secondary/30"
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-secondary/10 blur-2xl transition group-hover:bg-secondary/20" />
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary">
                {CATEGORY_LABELS[it.category] ?? it.category}
              </span>
              <Star className="h-4 w-4 text-secondary/70" />
            </div>
            <h4 className="mt-4 font-display text-lg leading-tight text-foreground">
              {it.title}
            </h4>
            <p className="truncate text-xs text-muted-foreground">{it.farmer_name}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-2xl text-secondary">
                ${it.price.toFixed(it.price < 10 ? 2 : 0)}
              </span>
              <span className="text-xs text-muted-foreground">/{it.unit}</span>
            </div>
            <div className="mt-1 text-xs text-foreground/80">
              {it.quantity.toLocaleString()} {it.unit} available
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {it.location}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

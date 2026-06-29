import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, ShoppingBag, Package, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function useCounter(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Stat({
  label,
  value,
  suffix,
  prefix,
  sublabel,
  icon: Icon,
  delay,
  loading,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
  loading?: boolean;
}) {
  const n = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-secondary/10 blur-2xl" />
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-secondary" />
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        {loading ? (
          <span className="h-9 w-20 animate-pulse rounded-lg bg-white/5" />
        ) : (
          <span className="font-display text-3xl text-foreground">
            {prefix}
            {n.toLocaleString()}
            {suffix}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="text-xs text-muted-foreground">{sublabel}</span>
      </div>
    </motion.div>
  );
}

export function StatCards() {
  const [farmers, setFarmers] = useState(0);
  const [buyers, setBuyers] = useState(0);
  const [listings, setListings] = useState(0);
  const [volume, setVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [farmersRes, buyersRes, listingsCountRes, volumeRes] =
        await Promise.all([
          // Use select("id") not head:true — head sends a HEAD request whose
          // Content-Range header is stripped by Cloudflare Workers, returning null.
          supabase
            .from("profiles")
            .select("id", { count: "exact" })
            .eq("role", "farmer"),
          supabase
            .from("profiles")
            .select("id", { count: "exact" })
            .in("role", ["buyer", "supplier", "transporter"]),
          supabase
            .from("listings")
            .select("id", { count: "exact" })
            .eq("status", "active"),
          supabase
            .from("listings")
            .select("price, quantity")
            .eq("status", "active"),
        ]);

      setFarmers(farmersRes.count ?? 0);
      setBuyers(buyersRes.count ?? 0);
      setListings(listingsCountRes.count ?? 0);

      if (volumeRes.data) {
        const total = volumeRes.data.reduce(
          (sum, l) => sum + l.price * l.quantity,
          0,
        );
        setVolume(Math.round(total));
      }

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Active Farmers"
        value={farmers}
        sublabel="on the platform"
        icon={Users}
        delay={0.0}
        loading={loading}
      />
      <Stat
        label="Buyers & Traders"
        value={buyers}
        sublabel="on the platform"
        icon={ShoppingBag}
        delay={0.05}
        loading={loading}
      />
      <Stat
        label="Active Listings"
        value={listings}
        sublabel="available now"
        icon={Package}
        delay={0.1}
        loading={loading}
      />
      <Stat
        label="Listed Value"
        value={volume}
        prefix="$"
        sublabel="across all listings"
        icon={BarChart3}
        delay={0.15}
        loading={loading}
      />
    </div>
  );
}

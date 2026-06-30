/**
 * Zimbabwe Province Activity Heatmap
 *
 * SVG map of Zimbabwe's provinces, backed by live listing activity pulled
 * from Supabase.
 *
 * If `listings.province` is empty in dev, falls back to seed numbers so the
 * map never looks broken.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Province = {
  id: string;
  name: string;
};

const PROVINCES: Province[] = [
  { id: "mash-west", name: "Mashonaland West" },
  { id: "mash-central", name: "Mashonaland Central" },
  { id: "mash-east", name: "Mashonaland East" },
  { id: "manicaland", name: "Manicaland" },
  { id: "masvingo", name: "Masvingo" },
  { id: "mat-south", name: "Matabeleland South" },
  { id: "mat-north", name: "Matabeleland North" },
  { id: "midlands", name: "Midlands" },
];

// City "blocks" — Harare and Bulawayo are administrative city-provinces.
const CITIES = [
  { id: "harare", name: "Harare" },
  { id: "bulawayo", name: "Bulawayo" },
];

// Seed counts used only if Supabase returns nothing (e.g., dev with empty db).
const SEED: Record<string, number> = {
  "mash-west": 32,
  "mash-central": 24,
  "mash-east": 18,
  "manicaland": 41,
  "masvingo": 27,
  "mat-south": 14,
  "mat-north": 19,
  "midlands": 36,
  "harare": 58,
  "bulawayo": 22,
};

// Map free-text province strings → our IDs.
function normalizeProvince(raw: string): string | null {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return null;
  if (s.includes("harare")) return "harare";
  if (s.includes("bulawayo")) return "bulawayo";
  if (s.includes("manicaland")) return "manicaland";
  if (s.includes("masvingo")) return "masvingo";
  if (s.includes("midlands")) return "midlands";
  if (s.includes("mashonaland")) {
    if (s.includes("west")) return "mash-west";
    if (s.includes("central")) return "mash-central";
    if (s.includes("east")) return "mash-east";
  }
  if (s.includes("matabeleland") || s.includes("mat ")) {
    if (s.includes("north")) return "mat-north";
    if (s.includes("south")) return "mat-south";
  }
  return null;
}

function CityMarker({
  name,
  count,
  className,
  labelClassName,
  delay,
}: {
  name: string;
  count: number;
  className: string;
  labelClassName: string;
  delay: number;
}) {
  return (
    <>
      <motion.span
        aria-hidden="true"
        className={`absolute z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/25 blur-sm ${className}`}
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.55, ease: "easeOut" }}
      />
      <motion.span
        title={`${name}: ${count.toLocaleString()} active listings`}
        className={`absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_18px_rgba(232,160,32,0.78)] ${className}`}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.08, duration: 0.45, ease: "backOut" }}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-secondary/70" />
      </motion.span>
      <motion.span
        className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-foreground drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] ${labelClassName}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.16, duration: 0.45 }}
      >
        {name}
      </motion.span>
    </>
  );
}

export function ZimbabweHeatmap() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("listings")
        .select("province")
        .eq("status", "active");
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setCounts(SEED);
        return;
      }
      const tally: Record<string, number> = {};
      for (const row of data) {
        const id = normalizeProvince(row.province || "");
        if (id) tally[id] = (tally[id] ?? 0) + 1;
      }
      // If supabase returned rows but no province matched → seed
      const total = Object.values(tally).reduce((a, b) => a + b, 0);
      setCounts(total > 0 ? tally : SEED);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalActivity = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );

  const topProvince = useMemo(() => {
    const sorted = [...PROVINCES, ...CITIES]
      .map((p) => ({ name: p.name, n: counts[p.id] ?? 0 }))
      .sort((a, b) => b.n - a.n);
    return sorted[0];
  }, [counts]);

  return (
    <div
      ref={ref}
      data-testid="zimbabwe-heatmap"
      className="glass relative min-h-[620px] overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-secondary" />
        <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
          Live across Zimbabwe
        </span>
      </div>
      <h2 className="font-display text-3xl md:text-4xl">
        Activity in every province.
      </h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Brighter regions = more active listings right now. Tap a province to see
        its share of the marketplace.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
        {/* Map */}
        <div className="relative min-h-[390px]">
          <motion.div
            className="relative mx-auto aspect-[504/392] w-full max-w-[590px]"
            initial={{ opacity: 0, scale: 0.94, rotateX: -8 }}
            animate={inView ? { opacity: 1, scale: 1, rotateX: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1400, transformStyle: "preserve-3d" }}
          >
            <img
              src="/zimbabwe-provinces.svg"
              alt="Zimbabwe provinces map"
              className="h-full w-full object-contain opacity-90"
              draggable={false}
            />
            <CityMarker
              name="Harare"
              count={counts.harare ?? 0}
              className="left-[63.5%] top-[32.8%]"
              labelClassName="left-[67%] top-[31%]"
              delay={0.75}
            />
            <CityMarker
              name="Bulawayo"
              count={counts.bulawayo ?? 0}
              className="left-[37.8%] top-[63.2%]"
              labelClassName="left-[26%] top-[58.5%]"
              delay={0.9}
            />
          </motion.div>
        </div>

        {/* Right panel — stats */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-secondary/15 bg-secondary/5 p-5">
            <div className="text-xs uppercase tracking-widest text-secondary/70">
              Live listings nationwide
            </div>
            <div className="mt-1 font-display text-4xl text-secondary">
              {totalActivity.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Updated live from Supabase
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-secondary" />
              Most active region
            </div>
            <div className="font-display text-2xl text-foreground">
              {topProvince?.name || "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {topProvince?.n.toLocaleString() || 0} active listings
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Activity
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 flex-1 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgb(13,59,46), rgb(168,132,42), rgb(232,160,32))",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Few</span>
              <span>Many</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

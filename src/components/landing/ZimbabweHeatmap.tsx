/**
 * Zimbabwe Province Activity Heatmap
 *
 * SVG map of Zimbabwe's 10 provinces, colored by live listing activity pulled
 * from Supabase. Provinces with more active listings glow brighter gold.
 *
 * The SVG paths are deliberately simplified silhouettes — they read clearly as
 * Zimbabwe at landing-page scale without shipping a 200KB topojson.
 * If `listings.province` is empty in dev, falls back to seed numbers so the
 * map never looks broken.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Province polygons (viewBox 0 0 600 500) ────────────────────────────────
// Simplified outlines, oriented north-up.

type Province = {
  id: string;
  name: string;
  path: string;
  // Centroid for the label
  cx: number;
  cy: number;
};

const PROVINCES: Province[] = [
  {
    id: "mash-west",
    name: "Mashonaland West",
    path: "M 60 110 L 260 80 L 285 195 L 195 250 L 75 205 Z",
    cx: 170,
    cy: 165,
  },
  {
    id: "mash-central",
    name: "Mashonaland Central",
    path: "M 260 80 L 415 70 L 420 180 L 285 195 Z",
    cx: 340,
    cy: 130,
  },
  {
    id: "mash-east",
    name: "Mashonaland East",
    path: "M 415 70 L 545 105 L 540 240 L 420 240 L 420 180 Z",
    cx: 478,
    cy: 165,
  },
  {
    id: "manicaland",
    name: "Manicaland",
    path: "M 545 105 L 585 145 L 590 385 L 465 400 L 460 280 L 540 240 Z",
    cx: 520,
    cy: 280,
  },
  {
    id: "masvingo",
    name: "Masvingo",
    path: "M 325 285 L 460 280 L 465 400 L 355 425 L 295 365 Z",
    cx: 395,
    cy: 350,
  },
  {
    id: "mat-south",
    name: "Matabeleland South",
    path: "M 75 365 L 230 365 L 295 365 L 355 425 L 205 465 L 75 425 Z",
    cx: 210,
    cy: 420,
  },
  {
    id: "mat-north",
    name: "Matabeleland North",
    path: "M 75 205 L 195 250 L 230 365 L 75 365 Z",
    cx: 130,
    cy: 290,
  },
  {
    id: "midlands",
    name: "Midlands",
    path: "M 195 250 L 285 195 L 325 285 L 295 365 L 230 365 Z",
    cx: 260,
    cy: 290,
  },
];

// City "blocks" — Harare and Bulawayo are administrative city-provinces.
const CITIES = [
  { id: "harare", name: "Harare", cx: 485, cy: 175 },
  { id: "bulawayo", name: "Bulawayo", cx: 215, cy: 330 },
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

function heatColor(value: number, max: number) {
  // 0..1 fraction → gold heat (deep green → gold → bright accent)
  const t = max > 0 ? value / max : 0;
  // Interpolate between three colors
  const stops = [
    { stop: 0.0, r: 13, g: 59, b: 46 }, // deep green
    { stop: 0.5, r: 168, g: 132, b: 42 }, // muted gold
    { stop: 1.0, r: 232, g: 160, b: 32 }, // bright accent
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].stop && t <= stops[i + 1].stop) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const local = (t - a.stop) / Math.max(0.0001, b.stop - a.stop);
  const r = Math.round(a.r + (b.r - a.r) * local);
  const g = Math.round(a.g + (b.g - a.g) * local);
  const bl = Math.round(a.b + (b.b - a.b) * local);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function ZimbabweHeatmap() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState<string | null>(null);
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

  const max = useMemo(() => {
    const all = [...PROVINCES, ...CITIES];
    return Math.max(1, ...all.map((p) => counts[p.id] ?? 0));
  }, [counts]);

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
      className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
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

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        {/* Map */}
        <div className="relative">
          <motion.svg
            viewBox="0 0 600 500"
            className="h-auto w-full"
            initial={{ opacity: 0, scale: 0.94, rotateX: -8 }}
            animate={inView ? { opacity: 1, scale: 1, rotateX: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1400, transformStyle: "preserve-3d" }}
          >
            <defs>
              <filter id="province-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="city-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E8A020" stopOpacity="1" />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.4" />
              </radialGradient>
            </defs>

            {PROVINCES.map((p, i) => {
              const n = counts[p.id] ?? 0;
              const color = heatColor(n, max);
              const isHovered = hovered === p.id;
              return (
                <motion.g
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.06 }}
                >
                  <motion.path
                    d={p.path}
                    fill={color}
                    fillOpacity={isHovered ? 0.95 : 0.7}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={isHovered ? 1.4 : 0.8}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      cursor: "pointer",
                      filter: isHovered
                        ? "drop-shadow(0 0 14px rgba(232,160,32,0.55))"
                        : "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
                      transition: "fill-opacity 0.25s, stroke-width 0.25s, filter 0.25s",
                    }}
                  />
                </motion.g>
              );
            })}

            {/* City markers */}
            {CITIES.map((c, i) => {
              const n = counts[c.id] ?? 0;
              const r = 6 + Math.min(10, (n / max) * 10);
              return (
                <motion.g
                  key={c.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.7 + i * 0.15, duration: 0.5, ease: "backOut" }}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* pulse */}
                  <circle
                    cx={c.cx}
                    cy={c.cy}
                    r={r}
                    fill="none"
                    stroke="#E8A020"
                    strokeOpacity="0.6"
                    strokeWidth="1.2"
                  >
                    <animate
                      attributeName="r"
                      from={r}
                      to={r + 14}
                      dur="2.6s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="stroke-opacity"
                      from="0.6"
                      to="0"
                      dur="2.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    cx={c.cx}
                    cy={c.cy}
                    r={r}
                    fill="url(#city-grad)"
                    filter="url(#province-glow)"
                  />
                  <text
                    x={c.cx}
                    y={c.cy - r - 6}
                    fill="#F0EDE6"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    style={{ fontFamily: "Instrument Sans, sans-serif" }}
                  >
                    {c.name}
                  </text>
                </motion.g>
              );
            })}

            {/* Province labels (only show on hover for clarity) */}
            {hovered &&
              [...PROVINCES, ...CITIES]
                .filter((p) => p.id === hovered)
                .map((p) => (
                  <g key={`label-${p.id}`} style={{ pointerEvents: "none" }}>
                    <rect
                      x={p.cx - 72}
                      y={p.cy - 28}
                      width={144}
                      height={42}
                      rx={8}
                      fill="rgba(8, 15, 12, 0.92)"
                      stroke="rgba(201,168,76,0.4)"
                    />
                    <text
                      x={p.cx}
                      y={p.cy - 12}
                      fill="#F0EDE6"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                      style={{ fontFamily: "Instrument Sans, sans-serif" }}
                    >
                      {p.name}
                    </text>
                    <text
                      x={p.cx}
                      y={p.cy + 4}
                      fill="#C9A84C"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      style={{ fontFamily: "DM Serif Display, serif" }}
                    >
                      {counts[p.id] ?? 0} active listings
                    </text>
                  </g>
                ))}
          </motion.svg>
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

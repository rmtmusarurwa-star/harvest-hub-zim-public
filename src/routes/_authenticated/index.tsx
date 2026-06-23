import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  MapPin,
  Package,
  ShieldCheck,
  Sprout,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { FieldMapBackground } from "@/components/brand/FieldMapBackground";

// Authenticated users redirect straight to /dashboard
export const Route = createFileRoute("/_authenticated/")({
  component: IndexPage,
});

function IndexPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  if (loading) return null;
  if (session) return null; // redirect in effect

  return <LandingPage />;
}

// ─── Live stats from Supabase ───────────────────────────────────────────────
function useLiveStats() {
  const [stats, setStats] = useState({ farmers: 0, listings: 0, value: 0 });

  useEffect(() => {
    async function load() {
      const [farmersRes, listingsRes, valueRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "farmer"),
        supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("listings")
          .select("price, quantity")
          .eq("status", "active"),
      ]);

      const value = (valueRes.data ?? []).reduce(
        (s, l) => s + Number(l.price) * Number(l.quantity),
        0,
      );

      setStats({
        farmers: farmersRes.count ?? 0,
        listings: listingsRes.count ?? 0,
        value,
      });
    }
    load();
  }, []);

  return stats;
}

// ─── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Store,
    title: "Live Marketplace",
    desc: "Browse fresh produce, livestock, grain and more from verified farmers across all ten provinces.",
  },
  {
    icon: BarChart3,
    title: "Market Intelligence",
    desc: "Real-time price charts and demand signals so you always know what to grow and when to sell.",
  },
  {
    icon: Bot,
    title: "AI Farm Agent",
    desc: "Ask anything — weather outlooks, price forecasts, disease ID — powered by your actual farm data.",
  },
  {
    icon: Truck,
    title: "Transport Network",
    desc: "Connect with vetted transporters to move produce from gate to market reliably.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Sellers",
    desc: "Every listing is tied to a confirmed Harvest Hub account. Trade with confidence.",
  },
  {
    icon: MapPin,
    title: "All 10 Provinces",
    desc: "Harare, Bulawayo, Masvingo, Manicaland and beyond — Zimbabwe's farm network in one place.",
  },
];

// ─── Landing page ────────────────────────────────────────────────────────────
function LandingPage() {
  const { farmers, listings, value } = useLiveStats();

  const STATS = [
    { label: "Farmers", value: farmers > 0 ? farmers.toLocaleString() : "—" },
    {
      label: "Active listings",
      value: listings > 0 ? listings.toLocaleString() : "—",
    },
    {
      label: "Listed value",
      value:
        value > 0
          ? value >= 1_000_000
            ? `$${(value / 1_000_000).toFixed(1)}M`
            : `$${(value / 1_000).toFixed(1)}k`
          : "—",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden ambient-glow">
      <FieldMapBackground />

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary">
              <Sprout className="h-4 w-4 text-secondary" />
            </div>
            <span className="font-display text-lg text-foreground">Harvest Hub</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/marketplace"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Marketplace
            </Link>
            <Link
              to="/market-intelligence"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Market Prices
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-secondary px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-20 lg:px-6 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3.5 py-1.5 text-xs text-secondary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
            </span>
            Zimbabwe's Agricultural Marketplace
          </div>

          <h1 className="font-display text-5xl leading-[1.08] tracking-tight md:text-7xl">
            Grow more.
            <br />
            <span className="text-secondary">Sell smarter.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg">
            Harvest Hub connects Zimbabwe's farmers, buyers, transporters and agri-businesses on one platform — with live prices, AI insights and a trusted marketplace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-primary shadow-md transition hover:bg-secondary/90"
            >
              Browse Marketplace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-foreground transition hover:bg-white/[0.07]"
            >
              <Users className="h-4 w-4" />
              Get Started Free
            </Link>
          </div>
        </motion.div>

        {/* ── Live stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-14 grid grid-cols-3 gap-4 sm:max-w-xl"
        >
          {STATS.map(({ label, value: v }) => (
            <div key={label} className="glass rounded-2xl p-4 text-center">
              <div className="font-display text-2xl text-secondary sm:text-3xl">{v}</div>
              <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
              Everything you need
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl">
            Built for Zimbabwean agriculture
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="glass rounded-2xl p-5"
            >
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-secondary/10">
                <Icon className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-display text-lg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass overflow-hidden rounded-3xl p-8 text-center sm:p-12"
        >
          <div className="mb-2 flex items-center justify-center gap-2">
            <Package className="h-4 w-4 text-secondary" />
            <span className="text-xs uppercase tracking-widest text-secondary/80">
              Free to join
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl">
            Ready to trade smarter?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Join farmers, buyers and agri-businesses already using Harvest Hub. No subscription fees — create your account in under a minute.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/90"
            >
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-foreground transition hover:bg-white/[0.07]"
            >
              <Store className="h-4 w-4" />
              Browse First
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between lg:px-6">
          <div className="flex items-center gap-2">
            <Sprout className="h-3.5 w-3.5 text-secondary" />
            <span>Harvest Hub Zimbabwe</span>
          </div>
          <span>© {new Date().getFullYear()} · Connecting Zimbabwe's farms</span>
          <div className="flex items-center gap-4">
            <Link to="/marketplace" className="hover:text-foreground transition-colors">Marketplace</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

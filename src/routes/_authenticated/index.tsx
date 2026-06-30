import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  Wheat,
  ShoppingBag,
  CloudSun,
  TrendingUp,
  MessageSquare,
  Quote,
  Zap,
  Wallet,
  Phone,
} from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ScrollProgressBar,
  CinematicHeroMockup,
  Tilt3DCard,
  AnimatedCounter,
  RevealOnScroll,
  Parallax,
} from "@/components/landing/Cinematic3D";
import { CinematicBackground } from "@/components/landing/CinematicBackground";
import { ZimbabweHeatmap } from "@/components/landing/ZimbabweHeatmap";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";

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
  if (session) return null;

  return <LandingPage />;
}

// ─── Live stats ──────────────────────────────────────────────────────────────
function useLiveStats() {
  const [stats, setStats] = useState({ farmers: 0, listings: 0, value: 0 });
  useEffect(() => {
    async function load() {
      const [farmersRes, listingsRes, valueRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "farmer"),
        supabase.from("listings").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("listings").select("price, quantity").eq("status", "active"),
      ]);
      const value = (valueRes.data ?? []).reduce(
        (s, l) => s + Number(l.price) * Number(l.quantity),
        0,
      );
      setStats({ farmers: farmersRes.count ?? 0, listings: listingsRes.count ?? 0, value });
    }
    load();
  }, []);
  return stats;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const FARMER_STEPS = [
  { icon: Package, step: "1", title: "Post a listing", desc: "Crop, livestock, equipment — takes about a minute. Set your price and location. That's it." },
  { icon: Users, step: "2", title: "Buyers come to you", desc: "No calling around. No middleman taking a cut. Buyers find your listing and reach out directly." },
  { icon: Truck, step: "3", title: "Move the goods", desc: "Post a transport request. Drivers quote. You pick one and coordinate delivery, all in one place." },
];

const BUYER_STEPS = [
  { icon: Store, step: "1", title: "Search what you need", desc: "Maize, tomatoes, cattle, a tractor — it's all here. Filter by province, price, quantity." },
  { icon: BarChart3, step: "2", title: "See the real price", desc: "Market prices are pulled from actual live listings, not a static table someone last updated in 2022." },
  { icon: ShoppingBag, step: "3", title: "Order and pay", desc: "EcoCash, ZipIt or cash on delivery. Place the order, track it, get your produce." },
];

const FEATURES = [
  { icon: Bot, title: "Harvest AI", desc: "Type a question in Shona, Ndebele or English. It pulls live data — prices, weather, disease symptoms — and answers in seconds. Also on WhatsApp." },
  { icon: BarChart3, title: "Market prices", desc: "What's soya beans going for in Gweru right now? The data comes from active listings, not guesswork." },
  { icon: Store, title: "Agri-Shops", desc: "Agro-vets, feed suppliers, irrigation equipment and more. Open your own shop or browse verified stores across Zimbabwe." },
  { icon: Truck, title: "Transport", desc: "Post a request with your cargo, route and budget. Nearby drivers respond. You don't have to know anyone." },
  { icon: ShieldCheck, title: "Verified sellers", desc: "Every listing links to a real Harvest Hub account. One tap to report anything that looks off." },
  { icon: TrendingUp, title: "Dashboard", desc: "Your listings, orders, and revenue in one place. No spreadsheets." },
];

const TESTIMONIALS = [
  {
    name: "Tendai Moyo",
    role: "Maize farmer · Mashonaland West",
    quote: "I used to sell through a broker who took 30% off the top. First week on Harvest Hub I sold 3 tonnes directly to a buyer in Harare. He paid via EcoCash — money was in my account the same day.",
    initials: "TM",
  },
  {
    name: "Sithembile Dube",
    role: "Cattle farmer · Matabeleland South",
    quote: "I listed 8 heifers on a Sunday evening. By Tuesday I had 4 serious inquiries and sold 6 of them. No phone calls to brokers, no waiting at the market. Just messages and a confirmed price.",
    initials: "SD",
  },
  {
    name: "Rudo Chinamasa",
    role: "Tomato & pepper grower · Manicaland",
    quote: "The AI told me tomatoes were selling for $0.38/kg in Harare when my broker was only offering $0.22. I used the platform to find a direct buyer and got $0.35. That difference paid my school fees.",
    initials: "RC",
  },
];

const PAYMENT_METHODS = [
  { label: "EcoCash", icon: "📱", desc: "Instant mobile" },
  { label: "OneMoney", icon: "📲", desc: "NetOne users" },
  { label: "ZIPIT", icon: "🏦", desc: "Bank transfer" },
  { label: "Cash", icon: "💵", desc: "On collection" },
];

const AI_DEMOS = [
  { q: "What's the tomato price in Harare today?", a: "Averaging $0.38/kg across 12 active listings. Cheapest is $0.30/kg — a farmer in Mazowe. Want me to contact them?" },
  { q: "My cattle have red eyes and won't eat", a: "Sounds like Pink Eye (IBK). Isolate the animal now and apply oxytetracycline eye ointment. If it's not improving in 3 days, call a vet." },
  { q: "I need a truck, Mutare to Harare, 800kg maize", a: "Transport request posted. Drivers in your area will see it. Expect 2–4 quotes — usually within the hour." },
];

// ─── Landing page ─────────────────────────────────────────────────────────────
function LandingPage() {
  const { farmers, listings, value } = useLiveStats();
  const [aiDemo, setAiDemo] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setAiDemo((i) => (i + 1) % AI_DEMOS.length), 4000);
    return () => clearInterval(id);
  }, []);

  const STATS = [
    { label: "Farmers", value: farmers > 0 ? farmers.toLocaleString() : "Growing" },
    { label: "Active listings", value: listings > 0 ? listings.toLocaleString() : "Live now" },
    {
      label: "Listed value",
      value: value > 0
        ? value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${(value / 1_000).toFixed(1)}k`
        : "In market",
    },
  ];

  return (
    <div className="relative min-h-screen">
      <CinematicBackground />
      <ScrollProgressBar />
      <div className="relative" style={{ zIndex: 1 }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/"><Wordmark size={32} /></Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/marketplace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Marketplace</Link>
            <Link to="/shops" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Shops</Link>
            <Link to="/market-intelligence" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Market Prices</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="rounded-lg bg-secondary px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary/90">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 lg:px-6 lg:pt-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3.5 py-1.5 text-xs text-secondary backdrop-blur"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
              </span>
              Zimbabwe's Agricultural Marketplace
            </motion.div>

            <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
              {"Grow more.".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 30, rotateX: -40 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: "inline-block", transformPerspective: 800 }}
                  className="mr-3"
                >
                  {word}
                </motion.span>
              ))}
              <br />
              {"Sell smarter.".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 30, rotateX: -40 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: 0.45 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: "inline-block", transformPerspective: 800 }}
                  className="mr-3 text-secondary"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg"
            >
              Zimbabwe's farm marketplace. List produce, find buyers, check prices, book transport — and ask an AI agent anything, in Shona, Ndebele or English.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/signup"
                data-testid="hero-cta-signup"
                className="btn-glow inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-primary shadow-md transition hover:bg-secondary/90"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/marketplace"
                data-testid="hero-cta-marketplace"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-foreground backdrop-blur transition hover:bg-white/[0.07]"
              >
                <Store className="h-4 w-4" /> Browse Marketplace
              </Link>
            </motion.div>

            {/* Live stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.05 }}
              className="mt-14 grid grid-cols-3 gap-3 sm:max-w-md"
            >
              {STATS.map(({ label, value: v }, i) => (
                <Tilt3DCard
                  key={label}
                  intensity={6}
                  className="glass rounded-2xl p-4 text-center"
                >
                  <div className="font-display text-2xl text-secondary sm:text-3xl">
                    {typeof v === "string" && /^\d/.test(v) && !v.includes("$") ? (
                      <AnimatedCounter to={Number(v.replace(/,/g, ""))} duration={1.4 + i * 0.2} />
                    ) : (
                      v
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                </Tilt3DCard>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — cinematic 3D mockup */}
          <div className="relative hidden lg:block">
            <CinematicHeroMockup />
          </div>
        </div>
      </section>

      {/* ── For Farmers / For Buyers ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">How it works</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl">Pick your side</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Farmer or buyer — same platform, different flow. Both take about three steps.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Farmer card */}
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="glass rounded-3xl p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/15">
                <Wheat className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-secondary/70">For Farmers</div>
                <h3 className="font-display text-xl">Cut out the middleman.</h3>
              </div>
            </div>
            <div className="space-y-5">
              {FARMER_STEPS.map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10 text-xs font-bold text-secondary">{step}</div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Icon className="h-3.5 w-3.5 text-secondary" />{title}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary/90">
              Start selling <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          {/* Buyer card */}
          <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="glass rounded-3xl p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/15">
                <ShoppingBag className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-secondary/70">For Buyers</div>
                <h3 className="font-display text-xl">Direct from the farm gate.</h3>
              </div>
            </div>
            <div className="space-y-5">
              {BUYER_STEPS.map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10 text-xs font-bold text-secondary">{step}</div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Icon className="h-3.5 w-3.5 text-secondary" />{title}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/marketplace" className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/[0.07]">
              Browse listings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Harvest AI spotlight ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <RevealOnScroll className="glass overflow-hidden rounded-3xl">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left — description */}
            <div className="p-8 lg:p-12">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary/15">
                  <Sparkles className="h-4 w-4 text-secondary" />
                </div>
                <span className="text-[10px] uppercase tracking-widest text-secondary/80">Harvest AI</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl">Ask it anything.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Harvest AI speaks Shona, Ndebele and English. It doesn't guess — it pulls live data from the marketplace, weather APIs and real listings to give you an actual answer.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Commodity prices from live listings, not a stale table",
                  "Crop and livestock disease identification",
                  "Weather at your location before you plant or ship",
                  "Place an order or book transport, all by chat",
                  "On WhatsApp — no app download required",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />{item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary/90">
                Try Harvest AI <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right — animated chat demo */}
            <div className="flex items-center justify-center border-t border-white/5 bg-white/[0.02] p-8 lg:border-l lg:border-t-0 lg:p-12">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center gap-2 text-xs text-secondary/80 mb-4">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span className="uppercase tracking-widest">Live demo</span>
                </div>
                {AI_DEMOS.map((demo, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: aiDemo === i ? 1 : 0.15, scale: aiDemo === i ? 1 : 0.97 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-2"
                  >
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-xl bg-secondary/15 px-3 py-2 text-xs text-foreground ring-1 ring-secondary/20">
                        <MessageSquare className="mb-1 h-3 w-3 text-secondary" />
                        {demo.q}
                      </div>
                    </div>
                    {/* AI reply */}
                    <div className="flex gap-2">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary/15">
                        <Sparkles className="h-3 w-3 text-secondary" />
                      </div>
                      <div className="max-w-[82%] rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-foreground/85 ring-1 ring-white/5">
                        {demo.a}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {/* Dots */}
                <div className="flex justify-center gap-1.5 pt-2">
                  {AI_DEMOS.map((_, i) => (
                    <button key={i} onClick={() => setAiDemo(i)} className={`h-1.5 rounded-full transition-all ${aiDemo === i ? "w-5 bg-secondary" : "w-1.5 bg-white/20"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">What's included</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl">One platform. The whole chain.</h2>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24, rotateX: -10 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformPerspective: 1000 }}
            >
              <Tilt3DCard intensity={10} className="glass h-full rounded-2xl p-5">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-secondary/10">
                  <Icon className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="font-display text-lg">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </Tilt3DCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Why Harvest Hub ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: MapPin, value: "10", label: "Provinces covered", count: 10, suffix: "" },
            { icon: ShieldCheck, value: "100%", label: "Verified sellers", count: 100, suffix: "%" },
            { icon: Package, value: "Free", label: "To join & list", count: 0, suffix: "" },
            { icon: Bot, value: "24/7", label: "AI agent on WhatsApp", count: 0, suffix: "" },
          ].map(({ icon: Icon, value, label, count, suffix }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 18, rotateX: -12 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformPerspective: 1000 }}
            >
              <Tilt3DCard intensity={8} className="glass rounded-2xl p-5 text-center">
                <Icon className="mx-auto mb-2 h-5 w-5 text-secondary" />
                <div className="font-display text-2xl text-foreground">
                  {count > 0 ? <AnimatedCounter to={count} suffix={suffix} duration={1.4 + i * 0.15} /> : value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{label}</div>
              </Tilt3DCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Middleman math ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <RevealOnScroll className="glass overflow-hidden rounded-3xl border border-secondary/10">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left — the problem */}
            <div className="p-8 lg:p-10 border-b border-white/5 lg:border-b-0 lg:border-r">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs text-red-400">
                ❌ The old way
              </div>
              <h3 className="font-display text-2xl mb-2">You sell beef worth $100.</h3>
              <div className="space-y-3 mt-5">
                <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="text-foreground/70">You sell to broker</span>
                  <span className="text-foreground">$100</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="text-foreground/70">Broker takes 30–40%</span>
                  <span className="text-red-400 font-semibold">− $35</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="text-foreground/70">Transport you arranged</span>
                  <span className="text-red-400">− $8</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="font-semibold">You actually receive</span>
                  <span className="font-display text-2xl text-red-400">$57</span>
                </div>
              </div>
            </div>
            {/* Right — the solution */}
            <div className="p-8 lg:p-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary/10 border border-secondary/20 px-3 py-1 text-xs text-secondary">
                ✅ With Harvest Hub
              </div>
              <h3 className="font-display text-2xl mb-2">Keep almost everything.</h3>
              <div className="space-y-3 mt-5">
                <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="text-foreground/70">Buyer pays you directly</span>
                  <span className="text-foreground">$100</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="text-foreground/70">Harvest Hub platform fee</span>
                  <span className="text-secondary/70">− $2</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="text-foreground/70">Transport (quoted via app)</span>
                  <span className="text-foreground/50">− $5</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="font-semibold">You actually receive</span>
                  <span className="font-display text-2xl text-secondary">$93</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-3">
                <p className="text-sm font-semibold text-secondary">That's $36 more per $100 sold.</p>
                <p className="text-xs text-muted-foreground mt-0.5">On 10 tonnes of maize, that's a meaningful difference.</p>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">From farmers like you</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl">Real farmers. Real results.</h2>
        </motion.div>
        <RevealOnScroll>
          <TestimonialCarousel testimonials={TESTIMONIALS} />
        </RevealOnScroll>
      </section>

      {/* ── Zimbabwe heatmap ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <RevealOnScroll>
          <ZimbabweHeatmap />
        </RevealOnScroll>
      </section>

      {/* ── Payment trust strip ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="glass rounded-2xl px-6 py-5">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 justify-between">
            <div className="flex items-center gap-2 shrink-0">
              <Wallet className="h-4 w-4 text-secondary" />
              <span className="text-sm font-semibold">Payments accepted:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
              {PAYMENT_METHODS.map(({ label, icon, desc }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                  <span className="text-base">{icon}</span>
                  <div>
                    <div className="text-xs font-semibold">{label}</div>
                    <div className="text-[10px] text-muted-foreground">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Zap className="h-3.5 w-3.5 text-secondary" />
              <span className="text-xs text-muted-foreground">Powered by <span className="text-foreground">ClicknPay</span></span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Shops showcase ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <RevealOnScroll className="glass overflow-hidden rounded-3xl">
          <div className="grid gap-0 md:grid-cols-2">
            {/* Left — copy */}
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <motion.div initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <div className="mb-3 flex items-center gap-2">
                  <Store className="h-5 w-5 text-secondary" />
                  <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">Agri-Shops</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl">Everything your farm needs, in one place.</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Browse agro-vets, feed suppliers, irrigation equipment, fertilizers and more — all verified and rated. Or open your own shop and reach buyers across all 10 provinces.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/shops" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary/90">
                    Browse Shops <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/shops/setup" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/[0.07]">
                    Open a Shop
                  </Link>
                </div>
              </motion.div>
            </div>
            {/* Right — category pills */}
            <div className="flex flex-col justify-center gap-3 border-t border-white/5 p-8 md:border-l md:border-t-0 sm:p-10">
              {[
                { icon: "🐄", label: "Agro-Vets", sub: "Vaccines, dewormers, antibiotics" },
                { icon: "🌾", label: "Feed Suppliers", sub: "Broiler, layer, dairy & pig feed" },
                { icon: "🧪", label: "Fertilizers & Chemicals", sub: "NPK, herbicides, fungicides" },
                { icon: "💧", label: "Irrigation Equipment", sub: "Drip kits, pumps, poly pipe" },
                { icon: "🛠️", label: "Farming Tools", sub: "Hoes, sprayers, hand tools" },
              ].map(({ icon, label, sub }) => (
                <motion.div key={label} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotateX: -8 }}
          whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 1400 }}
          className="glass overflow-hidden rounded-3xl p-8 text-center sm:p-12 relative"
        >
          {/* cinematic glow */}
          <motion.div
            animate={{ rotateZ: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute -inset-32 -z-10 opacity-30 blur-3xl"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(201,168,76,0.5), transparent 30%, rgba(232,160,32,0.4) 60%, transparent 90%)",
            }}
          />
          <div className="mb-2 flex items-center justify-center gap-2">
            <Package className="h-4 w-4 text-secondary" />
            <span className="text-xs uppercase tracking-widest text-secondary/80">Free to join</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl">Start today. It's free.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            No subscription. No listing fee. Create an account, post your first listing and see who shows up.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/signup" data-testid="final-cta-signup" className="btn-glow inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-primary transition hover:bg-secondary/90">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/marketplace" data-testid="final-cta-marketplace" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-foreground transition hover:bg-white/[0.07]">
              <Store className="h-4 w-4" /> Browse First
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between lg:px-6">
          <Wordmark size={22} />
          <span>© {new Date().getFullYear()} Harvest Hub · Connecting Zimbabwe's farms</span>
          <div className="flex items-center gap-4">
            <Link to="/marketplace" className="transition-colors hover:text-foreground">Marketplace</Link>
            <Link to="/shops" className="transition-colors hover:text-foreground">Shops</Link>
            <Link to="/market-intelligence" className="transition-colors hover:text-foreground">Prices</Link>
            <Link to="/login" className="transition-colors hover:text-foreground">Sign in</Link>
            <Link to="/signup" className="transition-colors hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Store,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CinematicBackground } from "@/components/landing/CinematicBackground";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["farmer", "buyer", "supplier", "transporter"]),
});

const ROLES: { value: AppRole; label: string; description: string; icon: typeof Sprout }[] = [
  { value: "farmer", label: "Farmer", description: "List produce and find buyers", icon: Sprout },
  { value: "buyer", label: "Buyer", description: "Source directly from farms", icon: ShoppingBag },
  { value: "supplier", label: "Shop Owner", description: "Sell inputs and equipment", icon: Store },
  { value: "transporter", label: "Transporter", description: "Move goods across Zimbabwe", icon: Truck },
];

const ROLE_MARKETING: Record<AppRole, { title: string; text: string }> = {
  farmer: {
    title: "Sell at your price.",
    text: "Create listings, reach buyers beyond your district, and track every order from inquiry to settlement.",
  },
  buyer: {
    title: "Source with confidence.",
    text: "Find produce, compare live listings, message sellers, and keep payment records in one place.",
  },
  supplier: {
    title: "Put your shop in front of farmers.",
    text: "List inputs, feed, tools, and equipment for customers who are already looking to buy.",
  },
  transporter: {
    title: "Turn routes into paid jobs.",
    text: "Respond to transport requests, coordinate deliveries, and keep your haulage work organized.",
  },
};

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AppRole>("farmer");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const parsed = schema.safeParse({ full_name: fullName, email, password, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: parsed.data.full_name,
          role: parsed.data.role,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard" });
    } else {
      setInfo("Check your inbox to confirm your email, then sign in.");
    }
  }

  const selectedMarketing = ROLE_MARKETING[role];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06100B]">
      <CinematicBackground />

      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <Wordmark size={42} animated showTagline />
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-white/[0.07] hover:text-foreground"
          >
            Sign in
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-secondary/85 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Join Harvest Hub Zimbabwe
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
              Your farm trade.{" "}
              <span className="bg-gradient-to-r from-secondary via-secondary to-secondary/70 bg-clip-text text-transparent">
                Your market.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/72 lg:mx-0">
              Create a free account to list produce, source from farms, sell inputs,
              book transport, and track payments through one connected marketplace.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <ValueCard icon={ShieldCheck} title="Verified trade" text="Real accounts and clear marketplace records." />
              <ValueCard icon={Wallet} title="Payment clarity" text="Orders and settlement status stay visible." />
              <ValueCard icon={Truck} title="Transport ready" text="Move produce without chasing contacts." />
            </div>

            <div className="mt-6 rounded-2xl border border-secondary/15 bg-secondary/10 p-4 text-left backdrop-blur">
              <div className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Built for the way Zimbabwe trades.
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    EcoCash, OneMoney, ZIPIT, cash-on-collection, and ClicknPay-supported payment records can all sit beside your orders.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 hidden items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur md:inline-flex">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-secondary/25 bg-[#06100B] shadow-[0_0_36px_rgba(201,168,76,0.22)] animate-[brand-float_5.5s_ease-in-out_infinite]">
                <img src="/harvest-hub-mark.png" alt="" aria-hidden="true" className="h-full w-full scale-[1.08] object-cover" />
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.22)_45%,transparent_68%)] opacity-0 animate-[brand-shine_4.8s_ease-in-out_infinite]" />
              </div>
              <div className="max-w-xs text-left">
                <div className="font-display text-xl text-foreground">Connect. Trade. Grow.</div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/68">
                  Start with a free profile, then build listings, orders, transport requests, and payment records around your trade.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="glass-strong mx-auto w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-8"
          >
            <div className="mb-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
                <Sprout className="h-5 w-5" />
              </div>
              <h2 className="font-display text-3xl leading-tight text-foreground">
                Create your account.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Choose your role first. We will shape your dashboard around how you trade.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <motion.div variants={fieldVariants}>
                <FieldLabel>I am a</FieldLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ROLES.map(({ value, label, description, icon: Icon }) => {
                    const active = role === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRole(value)}
                        className={cn(
                          "group relative flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                          active
                            ? "border-secondary/60 bg-secondary/10 shadow-[0_0_24px_rgba(201,168,76,0.08)]"
                            : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                            active ? "bg-secondary/20 text-secondary" : "bg-white/5 text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{label}</div>
                          <div className="text-[11px] leading-snug text-muted-foreground">
                            {description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">{selectedMarketing.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {selectedMarketing.text}
                  </p>
                </div>
              </motion.div>

              <motion.div variants={fieldVariants}>
                <FieldLabel>Full name</FieldLabel>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tendai Moyo"
                    autoComplete="name"
                    className={inputCls + " pl-11"}
                  />
                </div>
              </motion.div>

              <motion.div variants={fieldVariants}>
                <FieldLabel>Email address</FieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@farm.co.zw"
                    className={inputCls + " pl-11"}
                  />
                </div>
              </motion.div>

              <motion.div variants={fieldVariants}>
                <FieldLabel>Password</FieldLabel>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={inputCls + " pr-12"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground"
                >
                  {error}
                </motion.p>
              )}
              {info && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-foreground"
                >
                  {info}
                </motion.p>
              )}

              <motion.div variants={fieldVariants}>
                <button type="submit" disabled={submitting} className={primaryBtn}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create free account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.div>

              <motion.p variants={fieldVariants} className="text-center text-[11px] leading-relaxed text-muted-foreground">
                No listing fee. By continuing you agree to Harvest Hub's terms and privacy policy.
              </motion.p>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-secondary hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-foreground placeholder:text-muted-foreground/55 outline-none transition focus:border-secondary/60 focus:bg-white/[0.065] focus:ring-2 focus:ring-secondary/20";

const primaryBtn =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-[0_18px_42px_-18px_rgba(201,168,76,0.72)] transition hover:bg-secondary/90 disabled:opacity-60";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </label>
  );
}

const fieldVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

function ValueCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left backdrop-blur">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-secondary/10 text-secondary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

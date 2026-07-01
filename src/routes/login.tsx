import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CinematicBackground } from "@/components/landing/CinematicBackground";
import { Wordmark } from "@/components/brand/Wordmark";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06100B]">
      <CinematicBackground />

      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="group inline-flex items-center gap-3">
            <Wordmark size={42} animated showTagline />
          </Link>
          <Link
            to="/"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-white/[0.07] hover:text-foreground sm:inline-flex"
          >
            View marketplace
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.9fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-secondary/85 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            Harvest Hub Zimbabwe
          </div>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
            Pick up where your{" "}
            <span className="bg-gradient-to-r from-secondary via-secondary to-secondary/70 bg-clip-text text-transparent">
              harvest left off.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/72 lg:mx-0">
            Sign in to manage listings, orders, payments, transport requests, and
            buyer conversations from one secure dashboard.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <TrustCard
              icon={Wallet}
              title="Payments tracked"
              text="Clear order records from checkout to seller settlement."
            />
            <TrustCard
              icon={Truck}
              title="Trade operations"
              text="Listings, transport, messages, and receipts stay together."
            />
          </div>

          <div className="mt-7 hidden items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur md:inline-flex">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-secondary/25 bg-[#06100B] shadow-[0_0_36px_rgba(201,168,76,0.22)] animate-[brand-float_5.5s_ease-in-out_infinite]">
              <img src="/harvest-hub-mark.png" alt="" aria-hidden="true" className="h-full w-full scale-[1.08] object-cover" />
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.22)_45%,transparent_68%)] opacity-0 animate-[brand-shine_4.8s_ease-in-out_infinite]" />
            </div>
            <div className="max-w-xs text-left">
              <div className="font-display text-xl text-foreground">Harvest Hub</div>
              <p className="mt-1 text-sm leading-relaxed text-foreground/68">
                A connected trade desk for Zimbabwe's farms, buyers, transporters, and suppliers.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="glass-strong mx-auto w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-8"
        >
          <div className="mb-7">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="font-display text-3xl leading-tight text-foreground">
              Sign in to your dashboard.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your marketplace activity, payment records, and messages are waiting.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
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
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <FieldLabel>Password</FieldLabel>
                <Link to="/forgot-password" className="text-xs text-secondary hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls + " pr-10"}
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
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground"
              >
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in to dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <MiniTrust icon={ShieldCheck} label="Secure access" />
            <MiniTrust icon={BadgeCheck} label="ClicknPay ready" />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-secondary hover:underline">
              Create your Harvest Hub account
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
  "mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-[0_18px_42px_-18px_rgba(201,168,76,0.72)] transition hover:bg-secondary/90 disabled:opacity-60";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </label>
  );
}

function TrustCard({
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

function MiniTrust({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-secondary" />
      <span>{label}</span>
    </div>
  );
}

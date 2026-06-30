import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

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
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex flex-col items-center text-center"
        >
          <div className="mb-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-secondary/80">
            <span className="h-px w-8 bg-secondary/40" />
            Harvest Hub ZW
            <span className="h-px w-8 bg-secondary/40" />
          </div>
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-secondary via-secondary to-secondary/70 bg-clip-text text-transparent">
              HarvestHubZW
            </span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Sign in to access your dashboard, listings and operations.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="glass-strong w-full rounded-3xl p-7 lg:p-8"
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <FieldLabel>Email</FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@farm.co.zw"
                  className={inputCls + " pl-9"}
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
                  className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
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
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Harvest Hub?{" "}
            <Link to="/signup" className="text-secondary hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-secondary/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-secondary/20";

const primaryBtn =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-medium text-secondary-foreground shadow-[0_10px_30px_-10px_rgba(201,168,76,0.55)] transition hover:bg-secondary/90 disabled:opacity-60";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
      {children}
    </label>
  );
}

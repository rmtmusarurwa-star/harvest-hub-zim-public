import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, User, Sprout, ShoppingBag, Truck, Wrench } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, fieldVariants } from "@/components/auth/AuthShell";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["farmer", "buyer", "supplier", "transporter"]),
});

const ROLES: { value: AppRole; label: string; description: string; icon: typeof Sprout }[] = [
  { value: "farmer", label: "Farmer", description: "Grow & sell produce", icon: Sprout },
  { value: "buyer", label: "Buyer", description: "Source from farms", icon: ShoppingBag },
  { value: "supplier", label: "Supplier", description: "Inputs & equipment", icon: Wrench },
  { value: "transporter", label: "Transporter", description: "Logistics & haulage", icon: Truck },
];

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

  return (
    <AuthShell
      eyebrow="Create account"
      title="Join Harvest Hub Zimbabwe"
      subtitle="One platform for farmers, buyers, suppliers and transporters."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="text-secondary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <motion.div variants={fieldVariants}>
          <FieldLabel>I am a</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(({ value, label, description, icon: Icon }) => {
              const active = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-secondary/60 bg-secondary/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      active ? "bg-secondary/20 text-secondary" : "bg-white/5 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground">{label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={fieldVariants}>
          <FieldLabel>Full name</FieldLabel>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tendai Moyo"
              autoComplete="name"
              className={inputCls + " pl-9"}
            />
          </div>
        </motion.div>

        <motion.div variants={fieldVariants}>
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
        </motion.div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground"
          >
            {error}
          </motion.p>
        )}
        {info && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-foreground"
          >
            {info}
          </motion.p>
        )}

        <motion.div variants={fieldVariants}>
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </button>
        </motion.div>

        <motion.p variants={fieldVariants} className="text-center text-[11px] text-muted-foreground">
          By continuing you agree to Harvest Hub's terms and privacy policy.
        </motion.p>
      </form>
    </AuthShell>
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

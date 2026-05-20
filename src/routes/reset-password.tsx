import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, fieldVariants } from "@/components/auth/AuthShell";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/" }), 1200);
  }

  return (
    <AuthShell
      eyebrow="New password"
      title="Set a new password"
      subtitle="Choose a strong password to secure your Harvest Hub account."
    >
      {done ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm"
        >
          Password updated. Redirecting to your dashboard…
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <motion.div variants={fieldVariants}>
            <FieldLabel>New password</FieldLabel>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputCls + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label="Toggle password"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>

          <motion.div variants={fieldVariants}>
            <FieldLabel>Confirm password</FieldLabel>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className={inputCls}
            />
          </motion.div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
              {error}
            </p>
          )}

          <motion.div variants={fieldVariants}>
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </button>
          </motion.div>
        </form>
      )}
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

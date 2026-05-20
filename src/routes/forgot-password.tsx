import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, fieldVariants } from "@/components/auth/AuthShell";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <span>
          Back to{" "}
          <Link to="/login" className="text-secondary hover:underline">
            sign in
          </Link>
        </span>
      }
    >
      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm"
        >
          If <span className="text-secondary">{email}</span> matches an account,
          a reset link is on its way. Check your inbox and spam folder.
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <motion.div variants={fieldVariants}>
            <FieldLabel>Email</FieldLabel>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@farm.co.zw"
                className={inputCls + " pl-9"}
              />
            </div>
          </motion.div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
              {error}
            </p>
          )}

          <motion.div variants={fieldVariants}>
            <button type="submit" disabled={submitting} className={primaryBtn}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
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

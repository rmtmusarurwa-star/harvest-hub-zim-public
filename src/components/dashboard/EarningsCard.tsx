/**
 * EarningsCard — shows a seller their pending payout balance and history.
 * Shown on the dashboard only for users who can sell (farmer, supplier, shop_owner).
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type ObligationRow = {
  id: string;
  net_amount: number;
  gross_amount: number;
  platform_fee: number;
  status: "pending" | "disbursed" | "failed";
  disbursed_at: string | null;
  payment_reference: string;
  created_at: string;
};

export function EarningsCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ObligationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("payout_obligations")
        .select(
          "id, net_amount, gross_amount, platform_fee, status, disbursed_at, payment_reference, created_at",
        )
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setRows(
        (data ?? []).map((r: any) => ({
          ...r,
          net_amount: Number(r.net_amount),
          gross_amount: Number(r.gross_amount),
          platform_fee: Number(r.platform_fee),
        })),
      );
      setLoading(false);
    }
    load();
  }, [user]);

  const pending = rows.filter((r) => r.status === "pending");
  const disbursed = rows.filter((r) => r.status === "disbursed");

  const pendingTotal = pending.reduce((s, r) => s + r.net_amount, 0);
  const disbursedTotal = disbursed.reduce((s, r) => s + r.net_amount, 0);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading earnings…
      </div>
    );
  }

  // Only render when there's at least one obligation (never sold = no widget)
  if (rows.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl border border-white/5 overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-secondary" />
          <span className="text-sm font-semibold text-foreground">My Earnings</span>
        </div>
        <Link
          to="/orders"
          className="flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 transition-colors"
        >
          View orders <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Balance cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-white/5">
        {/* Pending payout */}
        <div className="p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Harvest Hub owes you
            </span>
          </div>
          <div
            className={`font-display text-3xl ${
              pendingTotal > 0 ? "text-amber-400" : "text-foreground/40"
            }`}
          >
            ${pendingTotal.toFixed(2)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pending.length === 0
              ? "No pending payouts"
              : `${pending.length} order${pending.length > 1 ? "s" : ""} awaiting transfer`}
          </p>
        </div>

        {/* Total disbursed */}
        <div className="p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <BadgeCheck className="h-3.5 w-3.5 text-secondary" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total received
            </span>
          </div>
          <div className="font-display text-3xl text-secondary">
            ${disbursedTotal.toFixed(2)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {disbursed.length === 0
              ? "Nothing disbursed yet"
              : `Across ${disbursed.length} payout${disbursed.length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* ── Pending orders breakdown ─────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="border-t border-white/5 px-5 py-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            Pending breakdown
          </p>
          {pending.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between text-sm py-1.5 border-b border-white/[0.04] last:border-0"
            >
              <div>
                <div className="font-mono text-xs text-muted-foreground">
                  {r.payment_reference}
                </div>
                <div className="text-[11px] text-muted-foreground/60">
                  {new Date(r.created_at).toLocaleDateString("en-ZW", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-amber-400 font-semibold">
                  ${r.net_amount.toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground/60">
                  after 2% fee
                </div>
              </div>
            </div>
          ))}
          {pending.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{pending.length - 5} more — <Link to="/orders" className="text-secondary underline">view all</Link>
            </p>
          )}
        </div>
      )}

      {/* ── Info footer ─────────────────────────────────────────────── */}
      <div className="border-t border-white/5 bg-white/[0.02] px-5 py-3 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
        <p className="text-[11px] leading-relaxed text-muted-foreground/60">
          Payouts are processed manually within 24–48 hours. Make sure your payout account is set up in{" "}
          <Link to="/settings" className="underline hover:text-muted-foreground transition-colors">
            Settings
          </Link>
          .
        </p>
      </div>
    </motion.div>
  );
}

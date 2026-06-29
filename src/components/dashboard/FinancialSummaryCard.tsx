/**
 * FinancialSummaryCard — shows every user their full financial position:
 *   • What you OWE  (pending buyer orders — COD not yet paid, ZIPIT not yet confirmed)
 *   • What you're OWED (pending seller payouts — Harvest Hub owes you)
 *
 * Only renders when there is at least one outstanding balance on either side.
 * Clears automatically as balances are settled.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Clock,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type PendingOrder = {
  id: string;
  order_code: string;
  listing_title: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  farmer_id: string;
};

type PayoutRow = {
  id: string;
  net_amount: number;
  gross_amount: number;
  payment_reference: string;
  status: string;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function methodLabel(method: string, status: string) {
  if (method === "cash_on_delivery") return "Cash on delivery";
  if (method === "zipit") return status === "awaiting_confirmation" ? "ZIPIT — awaiting admin confirmation" : "ZIPIT";
  return method;
}

function statusBadge(status: string, method: string) {
  if (status === "awaiting_confirmation") return { label: "Proof uploaded", color: "text-blue-400 bg-blue-400/10" };
  if (method === "cash_on_delivery") return { label: "Pay on collection", color: "text-amber-400 bg-amber-400/10" };
  return { label: status, color: "text-muted-foreground bg-white/5" };
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinancialSummaryCard() {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);

      const [ordersRes, payoutsRes] = await Promise.all([
        // What you OWE as buyer — COD not yet paid, ZIPIT not yet confirmed
        supabase
          .from("orders")
          .select(
            "id, order_code, listing_title, total_amount, payment_status, payment_method, created_at, farmer_id",
          )
          .eq("buyer_id", user!.id)
          .in("payment_status", ["pending", "awaiting_confirmation"])
          .in("payment_method", ["cash_on_delivery", "zipit"])
          .order("created_at", { ascending: false })
          .limit(20),

        // What you're OWED as seller — pending payout obligations
        (supabase as any)
          .from("payout_obligations")
          .select("id, net_amount, gross_amount, payment_reference, status, created_at")
          .eq("seller_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      setPendingOrders(
        (ordersRes.data ?? []).map((o: any) => ({
          ...o,
          total_amount: Number(o.total_amount),
        })),
      );
      setPendingPayouts(
        (payoutsRes.data ?? []).map((p: any) => ({
          ...p,
          net_amount: Number(p.net_amount),
          gross_amount: Number(p.gross_amount),
        })),
      );
      setLoading(false);
    }

    load();
  }, [user]);

  const totalOwed    = pendingOrders.reduce((s, o) => s + o.total_amount, 0);
  const totalOwedTo  = pendingPayouts.reduce((s, p) => s + p.net_amount, 0);
  const hasAnything  = pendingOrders.length > 0 || pendingPayouts.length > 0;

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading balances…
      </div>
    );
  }

  // Only show when there's something outstanding
  if (!hasAnything) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl border border-white/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-secondary" />
          <span className="text-sm font-semibold">Outstanding Balances</span>
        </div>
        <Link
          to="/orders"
          className="flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 transition-colors"
        >
          View all orders <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Balance summary cards */}
      <div className={`grid divide-white/5 ${pendingOrders.length > 0 && pendingPayouts.length > 0 ? "grid-cols-2 divide-x" : "grid-cols-1"}`}>
        {/* You OWE (as buyer) */}
        {pendingOrders.length > 0 && (
          <div className="p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                You owe
              </span>
            </div>
            <div className="font-display text-3xl text-amber-400">
              ${totalOwed.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingOrders.length} unpaid order{pendingOrders.length > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* You're OWED (as seller) */}
        {pendingPayouts.length > 0 && (
          <div className="p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-secondary" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Harvest Hub owes you
              </span>
            </div>
            <div className="font-display text-3xl text-secondary">
              ${totalOwedTo.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingPayouts.length} pending payout{pendingPayouts.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* ── What you OWE breakdown ─────────────────────────────────────── */}
      {pendingOrders.length > 0 && (
        <div className="border-t border-white/5 px-5 py-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-amber-400/70 mb-3 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Your pending payments
          </p>
          {pendingOrders.slice(0, 5).map((o) => {
            const badge = statusBadge(o.payment_status, o.payment_method);
            return (
              <div
                key={o.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="min-w-0 mr-3">
                  <div className="text-sm font-medium truncate">{o.listing_title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-amber-400">${o.total_amount.toFixed(2)}</div>
                  <div className="text-[11px] text-muted-foreground/60 font-mono">{o.order_code}</div>
                </div>
              </div>
            );
          })}
          {pendingOrders.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{pendingOrders.length - 5} more · <Link to="/orders" className="text-secondary underline">view all</Link>
            </p>
          )}
        </div>
      )}

      {/* ── What you're OWED breakdown ─────────────────────────────────── */}
      {pendingPayouts.length > 0 && (
        <div className={`px-5 py-4 space-y-1 ${pendingOrders.length > 0 ? "border-t border-white/5 bg-white/[0.01]" : ""}`}>
          <p className="text-[11px] uppercase tracking-wider text-secondary/70 mb-3 flex items-center gap-1.5">
            <BadgeCheck className="h-3 w-3" /> Awaiting payout from Harvest Hub
          </p>
          {pendingPayouts.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
            >
              <div>
                <div className="font-mono text-xs text-muted-foreground">{p.payment_reference}</div>
                <div className="text-[11px] text-muted-foreground/60 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString("en-ZW", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-secondary">${p.net_amount.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground/60">after 2% fee</div>
              </div>
            </div>
          ))}
          {pendingPayouts.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{pendingPayouts.length - 5} more · <Link to="/orders" className="text-secondary underline">view all</Link>
            </p>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="border-t border-white/5 bg-white/[0.02] px-5 py-3 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />
        <p className="text-[11px] leading-relaxed text-muted-foreground/60">
          Balances clear automatically when payments are confirmed. Set up your payout account in{" "}
          <Link to="/settings" className="underline hover:text-muted-foreground transition-colors">Settings</Link>{" "}
          so transfers reach you quickly.
        </p>
      </div>
    </motion.div>
  );
}

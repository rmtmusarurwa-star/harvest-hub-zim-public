/**
 * FinancialSummaryCard — shows every user their settlement position:
 *   • Buyer balances still awaiting payment/confirmation
 *   • Seller payouts that are incoming, sent, or failed
 *
 * Always renders so users can see zero balances clearly.
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
  Landmark,
  Loader2,
  TrendingDown,
  TrendingUp,
  XCircle,
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
  status: "pending" | "disbursed" | "failed";
  created_at: string;
  disbursed_at: string | null;
  notes: string | null;
};

type PendingOrderResult = PendingOrder & {
  total_amount: number | string;
};

type PayoutResult = PayoutRow & {
  net_amount: number | string;
  gross_amount: number | string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function methodLabel(method: string, status: string) {
  if (method === "cash_on_delivery") return "Cash on delivery";
  if (method === "zipit")
    return status === "awaiting_confirmation" ? "ZIPIT — awaiting admin confirmation" : "ZIPIT";
  return method;
}

function statusBadge(status: string, method: string) {
  if (status === "awaiting_confirmation")
    return { label: "Proof uploaded", color: "text-blue-400 bg-blue-400/10" };
  if (method === "cash_on_delivery")
    return { label: "Pay on collection", color: "text-amber-400 bg-amber-400/10" };
  return { label: status, color: "text-muted-foreground bg-white/5" };
}

function payoutStatus(status: PayoutRow["status"]) {
  if (status === "pending") {
    return {
      label: "Incoming",
      detail: "Harvest Hub is preparing this payout",
      color: "text-amber-400 bg-amber-400/10",
      icon: Clock,
    };
  }
  if (status === "disbursed") {
    return {
      label: "Sent",
      detail: "Transfer has been marked as sent",
      color: "text-secondary bg-secondary/10",
      icon: BadgeCheck,
    };
  }
  return {
    label: "Needs attention",
    detail: "Payout could not be completed",
    color: "text-rose-400 bg-rose-400/10",
    icon: XCircle,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function FinancialSummaryCard() {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
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

        // Seller settlement ledger — pending, sent, and failed payout obligations
        // payout_obligations exists in migrations but not in generated Supabase types yet.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("payout_obligations")
          .select(
            "id, net_amount, gross_amount, payment_reference, status, created_at, disbursed_at, notes",
          )
          .eq("seller_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      setPendingOrders(
        ((ordersRes.data ?? []) as PendingOrderResult[]).map((o) => ({
          ...o,
          total_amount: Number(o.total_amount),
        })),
      );
      setPayouts(
        ((payoutsRes.data ?? []) as PayoutResult[]).map((p) => ({
          ...p,
          net_amount: Number(p.net_amount),
          gross_amount: Number(p.gross_amount),
        })),
      );
      setLoading(false);
    }

    load();
  }, [user]);

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const sentPayouts = payouts.filter((p) => p.status === "disbursed");
  const failedPayouts = payouts.filter((p) => p.status === "failed");
  const totalOwed = pendingOrders.reduce((s, o) => s + o.total_amount, 0);
  const incomingTotal = pendingPayouts.reduce((s, p) => s + p.net_amount, 0);
  const sentTotal = sentPayouts.reduce((s, p) => s + p.net_amount, 0);
  const failedTotal = failedPayouts.reduce((s, p) => s + p.net_amount, 0);
  const hasAnything = pendingOrders.length > 0 || payouts.length > 0;

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading balances…
      </div>
    );
  }

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
          <span className="text-sm font-semibold">Balance & Settlement</span>
        </div>
        <Link
          to="/orders"
          className="flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 transition-colors"
        >
          View all orders <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Balance summary cards */}
      <div className="grid divide-y divide-white/5 md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* You OWE (as buyer) */}
        <div className="p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              You owe
            </span>
          </div>
          <div className="font-display text-3xl text-amber-400">${totalOwed.toFixed(2)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pendingOrders.length > 0
              ? `${pendingOrders.length} unpaid order${pendingOrders.length > 1 ? "s" : ""}`
              : "No pending buyer payments"}
          </p>
        </div>

        {/* Seller settlement */}
        <div className="p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-secondary" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Seller settlement
            </span>
          </div>
          <div className="font-display text-3xl text-secondary">${incomingTotal.toFixed(2)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {incomingTotal > 0
              ? `${pendingPayouts.length} incoming payout${pendingPayouts.length > 1 ? "s" : ""}`
              : sentPayouts.length > 0
                ? `$${sentTotal.toFixed(2)} sent so far`
                : "No incoming payouts"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/5 divide-x divide-white/5 bg-white/[0.01]">
        {[
          {
            label: "Incoming",
            value: incomingTotal,
            count: pendingPayouts.length,
            icon: Clock,
            color: "text-amber-400",
          },
          {
            label: "Sent",
            value: sentTotal,
            count: sentPayouts.length,
            icon: BadgeCheck,
            color: "text-secondary",
          },
          {
            label: "Failed",
            value: failedTotal,
            count: failedPayouts.length,
            icon: XCircle,
            color: "text-rose-400",
          },
        ].map((item) => (
          <div key={item.label} className="p-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <item.icon className={`h-3 w-3 ${item.color}`} />
              {item.label}
            </div>
            <div className={`font-display text-lg ${item.color}`}>${item.value.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">
              {item.count} payout{item.count === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      {!hasAnything && (
        <div className="border-t border-white/5 px-5 py-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
            <Landmark className="h-4 w-4 text-secondary" />
            No settlement activity yet. New buyer balances and seller payouts will appear here.
          </div>
        </div>
      )}

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
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-amber-400">${o.total_amount.toFixed(2)}</div>
                  <div className="text-[11px] text-muted-foreground/60 font-mono">
                    {o.order_code}
                  </div>
                </div>
              </div>
            );
          })}
          {pendingOrders.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{pendingOrders.length - 5} more ·{" "}
              <Link to="/orders" className="text-secondary underline">
                view all
              </Link>
            </p>
          )}
        </div>
      )}

      {/* ── Seller settlement breakdown ────────────────────────────────── */}
      {payouts.length > 0 && (
        <div
          className={`px-5 py-4 space-y-1 ${pendingOrders.length > 0 ? "border-t border-white/5 bg-white/[0.01]" : ""}`}
        >
          <p className="text-[11px] uppercase tracking-wider text-secondary/70 mb-3 flex items-center gap-1.5">
            <Landmark className="h-3 w-3" /> Seller payout status
          </p>
          {payouts.slice(0, 8).map((p) => {
            const meta = payoutStatus(p.status);
            const Icon = meta.icon;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-mono text-xs text-muted-foreground">
                    {p.payment_reference}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      {p.status === "disbursed" && p.disbursed_at
                        ? new Date(p.disbursed_at).toLocaleDateString("en-ZW", {
                            day: "numeric",
                            month: "short",
                          })
                        : new Date(p.created_at).toLocaleDateString("en-ZW", {
                            day: "numeric",
                            month: "short",
                          })}
                    </span>
                    {p.status === "disbursed" && p.notes && (
                      <span className="text-[11px] text-muted-foreground/60">Ref: {p.notes}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-semibold ${p.status === "failed" ? "text-rose-400" : p.status === "pending" ? "text-amber-400" : "text-secondary"}`}
                  >
                    ${p.net_amount.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground/60">{meta.detail}</div>
                </div>
              </div>
            );
          })}
          {payouts.length > 8 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{payouts.length - 8} more ·{" "}
              <Link to="/orders" className="text-secondary underline">
                view all
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="border-t border-white/5 bg-white/[0.02] px-5 py-3 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />
        <p className="text-[11px] leading-relaxed text-muted-foreground/60">
          Buyer balances clear when payment is confirmed. Seller balances move from incoming to sent
          after admin settlement. Set up your payout account in{" "}
          <Link to="/settings" className="underline hover:text-muted-foreground transition-colors">
            Settings
          </Link>{" "}
          so transfers reach you quickly.
        </p>
      </div>
    </motion.div>
  );
}

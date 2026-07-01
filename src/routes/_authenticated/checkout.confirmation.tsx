import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Download, Home, Loader2, Package, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  downloadReceiptPDF,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderRow,
} from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { splitExistingBuyerTotal } from "@/lib/payment-fees";

const searchSchema = z.object({
  codes: z.string().min(1),
  // primaryCode is passed when we navigate here before verify confirms success
  // (e.g. ClicknPay API lag) — the page self-polls until the status flips to paid.
  primaryCode: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/checkout/confirmation")({
  validateSearch: searchSchema,
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { codes, primaryCode } = Route.useSearch();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const codeList = codes.split(",").filter(Boolean);

  // When primaryCode is present the checkout page navigated here before the
  // payment was confirmed (ClicknPay API can lag a few seconds).
  // We poll clicknpay-verify until the status flips.
  const [verifying, setVerifying] = useState(!!primaryCode);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);
  const MAX_ATTEMPTS = 40; // 2 min at 3 s intervals

  useEffect(() => {
    if (!primaryCode) return;

    async function check() {
      attemptRef.current += 1;
      try {
        const { data } = await supabase.functions.invoke("clicknpay-verify", {
          body: { primaryCode },
        });
        const status: string = data?.paymentStatus ?? "pending";
        if (status === "paid" || status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setVerifying(false);
          // Refresh orders to show updated payment_status
          void queryClient.invalidateQueries({ queryKey: ["orders", codes] });
          return;
        }
      } catch {
        /* harmless — keep polling */
      }
      if (attemptRef.current >= MAX_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setVerifying(false); // stop after 2 min regardless
      }
    }

    // Run once immediately, then every 3 s
    void check();
    pollRef.current = setInterval(() => void check(), 3_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCode]);

  const {
    data: orders,
    isLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ["orders", codes],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase.from("orders").select("*").in("order_code", codeList);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mb-3 h-6 w-6 animate-spin opacity-50" />
        Finalising your order…
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="grid place-items-center gap-4 py-20 text-center">
        <Clock className="h-10 w-10 text-amber-400/60" />
        <p className="text-sm font-medium text-foreground">Could not load order details</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Your payment was submitted — the order may still be processing. Check{" "}
          <Link to="/orders" className="text-secondary underline">
            your orders
          </Link>{" "}
          in a few moments, or{" "}
          <button onClick={() => window.location.reload()} className="text-secondary underline">
            refresh this page
          </button>
          .
        </p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="grid place-items-center gap-4 py-20 text-center">
        <Package className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/orders">View all orders</Link>
        </Button>
      </div>
    );
  }

  const total = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const subtotal = orders.reduce((s, o) => {
    const row = o as OrderRow & { subtotal?: number | string | null };
    return s + Number(row.subtotal ?? Number(o.total_amount) / 1.02);
  }, 0);
  const split = splitExistingBuyerTotal(total, subtotal);
  const platformFee = split.platformFee;
  const processingFee = split.processingFee;
  const buyerName = profile?.full_name || user?.email || "Buyer";
  const allPaid = orders.every((o) => o.payment_status === "paid");

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-6">
      {/* ── Payment confirming banner ──────────────────────────────────────── */}
      {verifying && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-200"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <div>
            <span className="font-medium">Confirming your payment…</span>
            <span className="ml-2 text-amber-200/70">
              This usually takes a few seconds. Stay on this page.
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative overflow-hidden rounded-3xl border border-secondary/20 p-8 text-center"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-emerald-500/10" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 18 }}
          className={`relative mx-auto grid h-20 w-20 place-items-center rounded-full shadow-2xl ${
            allPaid
              ? "bg-gradient-to-br from-secondary to-amber-500 shadow-secondary/30"
              : "bg-gradient-to-br from-amber-500/60 to-amber-700/60 shadow-amber-500/20"
          }`}
        >
          {allPaid ? (
            <CheckCircle2 className="h-10 w-10 text-primary" />
          ) : (
            <Clock className="h-10 w-10 text-amber-100" />
          )}
        </motion.div>
        <h1 className="relative mt-5 font-display text-3xl md:text-4xl">
          {allPaid ? "Order Confirmed" : "Order Placed"}
        </h1>
        <p className="relative mt-2 text-sm text-muted-foreground">
          {allPaid
            ? `Thank you, ${buyerName}. Your harvest is on its way.`
            : `Thank you, ${buyerName}. We're waiting for payment confirmation.`}
        </p>
        <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          <span className="font-mono text-sm text-secondary">
            {orders[0].order_code}
            {orders.length > 1 && ` +${orders.length - 1} more`}
          </span>
        </div>
      </motion.div>

      {/* ── Order details ──────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">Order Details</h3>
          <span
            className={`rounded-full px-3 py-1 text-[11px] ${
              allPaid
                ? "bg-emerald-500/15 text-emerald-300"
                : verifying
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-white/5 text-foreground"
            }`}
          >
            {verifying ? "Confirming…" : PAYMENT_STATUS_LABEL[orders[0].payment_status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Via {PAYMENT_METHOD_LABEL[orders[0].payment_method] ?? orders[0].payment_method}
        </p>
        <ul className="mt-4 divide-y divide-white/5">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-3 text-sm">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/15">
                <Package className="h-4 w-4 text-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate">{o.listing_title}</div>
                <div className="text-xs text-muted-foreground">
                  {o.quantity} {o.unit} · ref {o.order_code}
                </div>
              </div>
              <div className="font-mono text-sm">
                $
                {Number(
                  (o as OrderRow & { subtotal?: number | string | null }).subtotal ??
                    o.total_amount,
                ).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Produce subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Harvest Hub fee (2%)</span>
            <span className="font-mono text-amber-400">${platformFee.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment processing</span>
            <span className="font-mono text-blue-300">${processingFee.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Grand Total
            </span>
            <span className="font-display text-2xl text-secondary">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {allPaid && (
          <Button
            variant="secondary"
            onClick={() => {
              void downloadReceiptPDF(orders, buyerName);
            }}
          >
            <Download className="h-4 w-4" /> Download Receipt (PDF)
          </Button>
        )}
        <Button asChild>
          <Link to="/orders">
            <Package className="h-4 w-4" /> View My Orders
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/marketplace">Keep shopping</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">
            <Home className="h-4 w-4" /> Back to dashboard
          </Link>
        </Button>
      </div>
    </section>
  );
}

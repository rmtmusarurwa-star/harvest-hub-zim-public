import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Home, Package, Sparkles } from "lucide-react";
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

const searchSchema = z.object({
  codes: z.string().min(1),
});

export const Route = createFileRoute("/_authenticated/checkout/confirmation")({
  validateSearch: searchSchema,
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { codes } = Route.useSearch();
  const { profile, user } = useAuth();
  const codeList = codes.split(",").filter(Boolean);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", codes],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("order_code", codeList);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20 text-sm text-muted-foreground">
        Finalising your order…
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="grid place-items-center py-20 text-sm text-muted-foreground">
        Order not found.
      </div>
    );
  }

  const total = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const buyerName = profile?.full_name || user?.email || "Buyer";

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-6">
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
          className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-secondary to-amber-500 shadow-2xl shadow-secondary/30"
        >
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </motion.div>
        <h1 className="relative mt-5 font-display text-3xl md:text-4xl">
          Order Confirmed
        </h1>
        <p className="relative mt-2 text-sm text-muted-foreground">
          Thank you, {buyerName}. Your harvest is on its way.
        </p>
        <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          <span className="font-mono text-sm text-secondary">
            {orders[0].order_code}
            {orders.length > 1 && ` +${orders.length - 1} more`}
          </span>
        </div>
      </motion.div>

      <div className="glass rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">Order Details</h3>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-foreground">
            {PAYMENT_STATUS_LABEL[orders[0].payment_status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid via {PAYMENT_METHOD_LABEL[orders[0].payment_method]}
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
                  {o.quantity} {o.unit} · code {o.order_code}
                </div>
              </div>
              <div className="font-mono text-sm">
                ${Number(o.total_amount).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Grand Total
          </span>
          <span className="font-display text-2xl text-secondary">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => downloadReceiptPDF(orders, buyerName)}
        >
          <Download className="h-4 w-4" /> Download Receipt (PDF)
        </Button>
        <Button asChild>
          <Link to="/financial-hub">
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

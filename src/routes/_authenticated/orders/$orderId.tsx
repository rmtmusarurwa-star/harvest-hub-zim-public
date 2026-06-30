import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDashed,
  Package,
  Star,
  Truck,
  XCircle,
  AlertTriangle,
  Sparkles,
  MapPin,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  FULFILLMENT_STATUS_LABEL,
  FULFILLMENT_STATUS_COLOR,
  FULFILLMENT_STEPS,
  type ExtendedOrderRow,
  type FulfillmentStatus,
} from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  component: OrderDetailPage,
});

function orderMoneySplit(order: ExtendedOrderRow) {
  const row = order as ExtendedOrderRow & { subtotal?: number | string | null };
  const total = Number(order.total_amount);
  const subtotal =
    row.subtotal == null ? Math.round((total / 1.02) * 100) / 100 : Number(row.subtotal);
  const fee = Math.max(0, Math.round((total - subtotal) * 100) / 100);
  return { subtotal, fee, total };
}

// ── Step icon helper ────────────────────────────────────────────────────────
const STEP_ICONS: Record<FulfillmentStatus, typeof Package> = {
  pending: CircleDashed,
  confirmed: ClipboardCheck,
  dispatched: Truck,
  delivered: Check,
  cancelled: XCircle,
};

// ── Next status transitions ──────────────────────────────────────────────────
const NEXT_STATUS: Partial<Record<FulfillmentStatus, FulfillmentStatus>> = {
  pending: "confirmed",
  confirmed: "dispatched",
  dispatched: "delivered",
};

const NEXT_LABEL: Partial<Record<FulfillmentStatus, string>> = {
  pending: "Confirm Order",
  confirmed: "Mark as Dispatched",
  dispatched: "Mark as Delivered",
};

// ── Timeline ─────────────────────────────────────────────────────────────────
function FulfillmentTimeline({ status }: { status: FulfillmentStatus }) {
  const isCancelled = status === "cancelled";
  const steps = isCancelled ? [...FULFILLMENT_STEPS] : FULFILLMENT_STEPS;
  const activeIdx = isCancelled ? -1 : steps.indexOf(status);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Fulfillment Status
      </h3>

      {isCancelled ? (
        <div className="flex items-center gap-2 text-rose-400">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">Order cancelled</span>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <ol className="flex min-w-[320px] items-start">
            {steps.map((step, i) => {
              const done = i <= activeIdx;
              const active = i === activeIdx;
              const Icon = STEP_ICONS[step];
              const isLast = i === steps.length - 1;

              return (
                <li key={step} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center">
                    {/* Circle */}
                    <div
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border-2 transition-colors",
                        done
                          ? "border-secondary bg-secondary text-primary"
                          : "border-white/15 bg-background text-muted-foreground",
                        active && "ring-2 ring-secondary/30 ring-offset-2 ring-offset-background",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {/* Label */}
                    <span
                      className={cn(
                        "mt-2 text-center text-[11px] leading-tight",
                        done ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {FULFILLMENT_STATUS_LABEL[step]}
                    </span>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "mt-4 h-0.5 flex-1 transition-colors",
                        i < activeIdx ? "bg-secondary" : "bg-white/10",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Review form (buyer, shown after delivery) ─────────────────────────────────
function ReviewForm({
  farmerId,
  orderId,
  onDone,
}: {
  farmerId: string;
  orderId: string;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("farmer_reviews").upsert(
        {
          farmer_id: farmerId,
          reviewer_id: user.id,
          rating,
          comment: comment.trim(),
          order_id: orderId,
        } as never,
        { onConflict: "farmer_id,reviewer_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review posted — thanks for the feedback!");
      qc.invalidateQueries({ queryKey: ["farmer-reviews", farmerId] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-secondary/20 p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h3 className="font-medium text-foreground">Rate your experience</h3>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Your order was delivered. How did it go?</p>

      {/* Stars */}
      <div className="mb-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star
              className={cn(
                "h-7 w-7 transition",
                (hover || rating) >= n ? "fill-secondary text-secondary" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Describe the quality, freshness, communication…"
        rows={3}
        className="mb-3"
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </button>
        <Button
          variant="secondary"
          size="sm"
          disabled={submit.isPending || !comment.trim()}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? "Posting…" : "Post review"}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reviewDone, setReviewDone] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [notes, setNotes] = useState("");

  const {
    data: order,
    isLoading,
    error: orderError,
  } = useQuery({
    queryKey: ["order-detail", orderId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as ExtendedOrderRow | null;
    },
  });

  // Load partner profile (farmer if buyer, buyer if farmer)
  const isFarmer = order?.farmer_id === user?.id;
  const isBuyer = order?.buyer_id === user?.id;
  const partnerId = isFarmer ? order?.buyer_id : order?.farmer_id;

  const { data: partner } = useQuery({
    queryKey: ["profile", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", partnerId!)
        .maybeSingle();
      return data;
    },
  });

  // Has buyer already reviewed this farmer?
  const { data: existingReview } = useQuery({
    queryKey: ["my-review", order?.farmer_id, user?.id],
    enabled: !!order && isBuyer && order.fulfillment_status === "delivered",
    queryFn: async () => {
      const { data } = await supabase
        .from("farmer_reviews")
        .select("id")
        .eq("farmer_id", order!.farmer_id)
        .eq("reviewer_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      status,
      fulfillment_notes,
    }: {
      status: FulfillmentStatus;
      fulfillment_notes?: string;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          fulfillment_status: status as never,
          fulfillment_notes: fulfillment_notes ?? null,
        } as never)
        .eq("id", orderId);
      if (error) throw error;

      // Notify the buyer of the status change
      if (order?.buyer_id) {
        const label = FULFILLMENT_STATUS_LABEL[status];
        const itemName = order.listing_title ?? "your order";
        await supabase.from("notifications").insert({
          user_id: order.buyer_id,
          type: "order_status",
          message: `${itemName} is now ${label.toLowerCase()}.`,
          link: `/orders/${orderId}`,
        } as never);
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(`Order ${FULFILLMENT_STATUS_LABEL[vars.status].toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
      qc.invalidateQueries({ queryKey: ["all-orders", user?.id] });
      setCancelConfirm(false);
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass h-24 animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400/60" />
        <p className="text-sm font-medium text-foreground">Could not load order</p>
        <p className="mt-1 text-xs text-muted-foreground">{(orderError as Error).message}</p>
        <Link to="/orders" className="mt-4 inline-block text-sm text-secondary hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Link to="/orders" className="mt-3 inline-block text-sm text-secondary hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const fs = (order.fulfillment_status ?? "pending") as FulfillmentStatus;
  const split = orderMoneySplit(order);
  const nextStatus = NEXT_STATUS[fs];
  const nextLabel = NEXT_LABEL[fs];
  const canAdvance = isFarmer && !!nextStatus && fs !== "cancelled";
  const canCancel = isFarmer && (fs === "pending" || fs === "confirmed");
  const showReview = isBuyer && fs === "delivered" && !reviewDone && !existingReview;

  return (
    <section className="mx-auto max-w-2xl space-y-5 py-2">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/orders" })}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-muted-foreground transition hover:border-white/20 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-xl text-foreground">
            Order <span className="font-mono text-secondary">{order.order_code}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Placed{" "}
            {new Date(order.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {/* Current fulfillment badge */}
        <span
          className={cn(
            "ml-auto inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
            FULFILLMENT_STATUS_COLOR[fs],
          )}
        >
          {FULFILLMENT_STATUS_LABEL[fs]}
        </span>
      </div>

      {/* Fulfillment timeline */}
      <FulfillmentTimeline status={fs} />

      {/* Review prompt (buyer, after delivery) */}
      <AnimatePresence>
        {showReview && (
          <ReviewForm
            farmerId={order.farmer_id}
            orderId={orderId}
            onDone={() => setReviewDone(true)}
          />
        )}
      </AnimatePresence>

      {/* Farmer action controls */}
      {isFarmer && fs !== "delivered" && fs !== "cancelled" && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Update Order</h3>

          {/* Notes field */}
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">
              Add a note (optional) — e.g. tracking number, dispatch time
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dispatch note, collection point, estimated time…"
              rows={2}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {canAdvance && (
              <Button
                variant="secondary"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    status: nextStatus!,
                    fulfillment_notes: notes.trim() || undefined,
                  })
                }
              >
                <ChevronRight className="h-4 w-4" />
                {updateStatus.isPending ? "Updating…" : nextLabel}
              </Button>
            )}

            {canCancel && !cancelConfirm && (
              <Button
                variant="outline"
                className="border-rose-500/30 text-rose-400 hover:border-rose-500/60 hover:bg-rose-500/10"
                onClick={() => setCancelConfirm(true)}
              >
                <XCircle className="h-4 w-4" /> Cancel Order
              </Button>
            )}

            {cancelConfirm && (
              <div className="flex w-full items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">Cancel this order?</span>
                <button
                  className="rounded px-3 py-2 font-medium hover:text-rose-200"
                  disabled={updateStatus.isPending}
                  onClick={() =>
                    updateStatus.mutate({
                      status: "cancelled",
                      fulfillment_notes: notes.trim() || "Cancelled by farmer",
                    })
                  }
                >
                  {updateStatus.isPending ? "…" : "Yes, cancel"}
                </button>
                <button
                  className="rounded px-3 py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setCancelConfirm(false)}
                >
                  Keep
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order details card */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Order Details</h3>

        {/* Item row */}
        <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary/10">
            <Package className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{order.listing_title}</p>
            <p className="text-xs text-muted-foreground">
              {order.quantity} {order.unit} ·{" "}
              <span className="font-mono">
                ${Number(order.unit_price).toFixed(2)}/{order.unit}
              </span>
            </p>
          </div>
          <p className="font-mono font-semibold text-secondary">${split.subtotal.toFixed(2)}</p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Produce subtotal</span>
            <span className="font-mono">${split.subtotal.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Harvest Hub fee (2%)</span>
            <span className="font-mono text-amber-400">${split.fee.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/5 pt-2 font-medium">
            <span>Buyer paid</span>
            <span className="font-mono text-secondary">${split.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Info grid */}
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <InfoRow label="Payment method" value={PAYMENT_METHOD_LABEL[order.payment_method]} />
          <InfoRow label="Payment status" value={PAYMENT_STATUS_LABEL[order.payment_status]} />
          {order.payment_reference && <InfoRow label="Reference" value={order.payment_reference} />}
          {order.notes && (
            <div className="col-span-2">
              <InfoRow label="Order notes" value={order.notes} />
            </div>
          )}
          {order.fulfillment_notes && (
            <div className="col-span-2">
              <InfoRow label="Farmer notes" value={order.fulfillment_notes} />
            </div>
          )}
        </dl>
      </div>

      {/* Partner card */}
      {partner && (
        <div className="glass flex items-center gap-4 rounded-2xl p-4">
          {partner.avatar_url ? (
            <img
              src={partner.avatar_url}
              alt={partner.full_name ?? ""}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-secondary/30"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
              {(partner.full_name ?? "?")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{partner.full_name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {isFarmer ? "Buyer" : "Farmer"}
            </p>
          </div>
          {!isFarmer && (
            <Link
              to="/farmers/$farmerId"
              params={{ farmerId: order.farmer_id }}
              className="text-xs text-secondary hover:underline"
            >
              View profile →
            </Link>
          )}
          <Link
            to="/chat"
            search={{ farmer: isFarmer ? order.buyer_id : order.farmer_id }}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-foreground transition hover:border-secondary/30 hover:text-secondary"
          >
            Message
          </Link>
        </div>
      )}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

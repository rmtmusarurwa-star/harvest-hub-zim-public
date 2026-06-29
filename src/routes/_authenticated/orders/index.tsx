import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Package, RefreshCw, ShoppingBag, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  PAYMENT_STATUS_LABEL,
  FULFILLMENT_STATUS_LABEL,
  FULFILLMENT_STATUS_COLOR,
  type ExtendedOrderRow,
} from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["all-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`buyer_id.eq.${user!.id},farmer_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExtendedOrderRow[];
    },
  });

  const purchases = orders.filter((o) => o.buyer_id === user?.id);
  // Exclude orders where the user is both buyer and farmer (mock/test listings
  // fall back to buyer_id for farmer_id — those belong only in Purchases).
  const sales = orders.filter(
    (o) => o.farmer_id === user?.id && o.buyer_id !== user?.id,
  );

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Orders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track purchases and manage incoming sales
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["all-orders", user?.id] });
            void refetch();
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Query error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Could not load orders.</span>
            <span className="ml-2 text-rose-300/70">
              {(error as Error).message}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases" className="gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" />
            Purchases
            {purchases.length > 0 && (
              <span className="ml-1 rounded-full bg-secondary/20 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
                {purchases.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Sales
            {sales.length > 0 && (
              <span className="ml-1 rounded-full bg-secondary/20 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
                {sales.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-4">
          <OrderList
            orders={purchases}
            isLoading={isLoading}
            emptyMsg="You haven't placed any orders yet."
            emptyAction={
              <Link
                to="/marketplace"
                className="mt-3 inline-block text-sm text-secondary hover:underline"
              >
                Browse the marketplace →
              </Link>
            }
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <OrderList
            orders={sales}
            isLoading={isLoading}
            emptyMsg="No incoming orders yet."
            emptyAction={
              <Link
                to="/marketplace"
                className="mt-3 inline-block text-sm text-secondary hover:underline"
              >
                Create a listing →
              </Link>
            }
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function OrderList({
  orders,
  isLoading,
  emptyMsg,
  emptyAction,
}: {
  orders: ExtendedOrderRow[];
  isLoading: boolean;
  emptyMsg: string;
  emptyAction?: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="glass h-20 animate-pulse rounded-2xl bg-white/[0.03]"
          />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {orders.map((order, i) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.035 }}
        >
          <Link
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className="glass group flex items-center gap-4 rounded-2xl border border-white/[0.04] p-4 transition hover:border-secondary/20 hover:bg-white/[0.03]"
          >
            {/* Icon */}
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary/10">
              <Package className="h-5 w-5 text-secondary" />
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="truncate font-medium text-foreground">
                  {order.listing_title || "Order"}
                </p>
                <span className="font-mono text-[11px] text-muted-foreground/60">
                  {order.order_code}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    FULFILLMENT_STATUS_COLOR[order.fulfillment_status ?? "pending"]
                  }`}
                >
                  {FULFILLMENT_STATUS_LABEL[order.fulfillment_status ?? "pending"]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {PAYMENT_STATUS_LABEL[order.payment_status]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {order.quantity} × {order.unit}
                </span>
                <span className="font-mono text-xs font-medium text-secondary">
                  ${Number(order.total_amount).toFixed(2)}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground/60">
                  {new Date(order.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition group-hover:text-secondary" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

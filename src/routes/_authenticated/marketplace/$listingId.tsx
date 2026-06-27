import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORY_LABEL,
  freshnessLabel,
  liveBuyers,
  MOCK_LISTINGS,
  type ListingRow,
} from "@/lib/marketplace-data";
import { useCart, unitStep } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/brand/CategoryIcon";

export const Route = createFileRoute("/_authenticated/marketplace/$listingId")({
  component: ListingDetailPage,
});

const CATEGORY_GRADIENT: Record<ListingRow["category"], string> = {
  produce: "from-emerald-700/40 via-emerald-900/40 to-secondary/20",
  livestock: "from-amber-800/40 via-stone-900/40 to-secondary/20",
  poultry: "from-rose-700/30 via-amber-900/40 to-secondary/20",
  dairy: "from-sky-700/30 via-slate-900/40 to-secondary/20",
  grain: "from-yellow-700/40 via-stone-900/40 to-secondary/20",
  other: "from-emerald-800/30 via-stone-900/40 to-secondary/20",
};
function ListingDetailPage() {
  const { listingId } = Route.useParams();
  const { add, open } = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");

  function requireAuth(action: () => void) {
    if (!session) {
      toast("Create a free account to continue", {
        description: "Sign up in seconds — no credit card required.",
        action: { label: "Get Started", onClick: () => navigate({ to: "/signup" }) },
      });
      return;
    }
    action();
  }

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async (): Promise<ListingRow | null> => {
      if (listingId.startsWith("mock-")) {
        return MOCK_LISTINGS.find((m) => m.id === listingId) ?? null;
      }
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .maybeSingle();
      if (error) throw error;
      return (data as ListingRow | null) ?? null;
    },
  });

  const farmerProfile = useQuery({
    queryKey: ["profile", listing?.farmer_id],
    enabled: !!listing && !listing.id.startsWith("mock-") && listing.farmer_id !== "mock",
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", listing!.farmer_id)
        .maybeSingle();
      return data;
    },
  });

  const buyers = useMemo(() => (listing ? liveBuyers(listing.id) : 0), [listing]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20 text-sm text-muted-foreground">
        Loading listing…
      </div>
    );
  }

  if (!listing) {
    throw notFound();
  }

  const price = Number(listing.price);
  const { step, min, isDecimal } = unitStep(listing.unit);
  const fresh = freshnessLabel(listing.created_at);
  const farmerName =
    farmerProfile.data?.full_name?.trim() ||
    (listing.farmer_id === "mock" ? "Verified ZW Farmer" : "Harvest Hub Farmer");

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`glass relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br ${CATEGORY_GRADIENT[listing.category]}`}
        >
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-secondary/70">
              <CategoryIcon category={listing.category} className="h-40 w-40" />
            </div>
          )}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-widest text-secondary backdrop-blur">
              {CATEGORY_LABEL[listing.category]}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-foreground backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <Users className="h-3 w-3" /> {buyers} viewing
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-5"
        >
          <div>
            <h1 className="font-display text-3xl leading-tight md:text-4xl">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {listing.location}
                {listing.province && ` · ${listing.province}`}
              </span>
              <span className="flex items-center gap-1 text-secondary">
                <Star className="h-3 w-3 fill-secondary" />
                {Number(listing.rating).toFixed(1)}
              </span>
              <span>Listed {fresh.text}</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl text-secondary">${price.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">/ {listing.unit}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {Number(listing.quantity).toLocaleString()} {listing.unit} available
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Qty</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty((q) => Math.max(min, Math.round((q - step) * 100) / 100))}
                    className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-muted-foreground hover:bg-white/5"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    min={min}
                    step={step}
                    value={qty}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) {
                        setQty(isDecimal ? Math.max(min, v) : Math.max(min, Math.round(v)));
                      }
                    }}
                    className="h-8 w-16 rounded-md border border-white/10 bg-white/[0.02] text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground">{listing.unit}</span>
                  <button
                    onClick={() => setQty((q) => Math.round((q + step) * 100) / 100)}
                    className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-muted-foreground hover:bg-white/5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="ml-auto font-mono text-sm text-foreground">
                  ${(price * qty).toFixed(2)}
                </span>
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                  Delivery
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDelivery("pickup")}
                    className={`rounded-lg border px-3 py-2 text-left text-xs ${
                      delivery === "pickup"
                        ? "border-secondary/40 bg-secondary/10 text-secondary"
                        : "border-white/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="text-sm text-foreground">Pickup</div>
                    From {listing.location}
                  </button>
                  <button
                    onClick={() => setDelivery("delivery")}
                    disabled={!listing.delivery_available}
                    className={`rounded-lg border px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                      delivery === "delivery"
                        ? "border-secondary/40 bg-secondary/10 text-secondary"
                        : "border-white/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-sm text-foreground">
                      <Truck className="h-3.5 w-3.5" /> Delivery
                    </div>
                    {listing.delivery_available ? "Quote on checkout" : "Not available"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => requireAuth(() => add(listing, qty))}
                >
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    requireAuth(() =>
                      navigate({ to: "/chat", search: { listing: listing.id } })
                    )
                  }
                >
                  <MessageCircle className="h-4 w-4" /> Contact Farmer
                </Button>
              </div>
              <button
                onClick={() => requireAuth(() => { add(listing, qty); open(); })}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Buy now — go to checkout
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-secondary font-display">
                {farmerName
                  .split(/\s+/)
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  {farmerName}
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Member · Harvest Hub Zimbabwe</div>
              </div>
              <Button size="sm" variant="outline">
                View Profile
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-display text-xl">About this listing</h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
          {listing.description || "No additional description provided."}
        </p>
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, Filter, Plus, Search, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  MOCK_LISTINGS,
  PROVINCES,
  type ListingCategory,
  type ListingRow,
} from "@/lib/marketplace-data";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { PostListingModal } from "@/components/marketplace/PostListingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/marketplace/")({
  component: MarketplacePage,
});

function MarketplacePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [priceMax, setPriceMax] = useState(1000);
  const [province, setProvince] = useState<string>("all");
  const [minRating, setMinRating] = useState(0);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const { count, open } = useCart();

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

  const { data: dbListings = [], error: listingsError } = useQuery({
    queryKey: ["listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListingRow[];
    },
  });

  const all = useMemo<ListingRow[]>(
    () => [...dbListings, ...MOCK_LISTINGS],
    [dbListings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (Number(l.price) > priceMax) return false;
      if (province !== "all" && l.province !== province) return false;
      if (Number(l.rating) < minRating) return false;
      if (deliveryOnly && !l.delivery_available) return false;
      if (q) {
        const hay =
          `${l.title} ${l.description} ${l.location} ${l.province}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, category, search, priceMax, province, minRating, deliveryOnly]);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
              Marketplace
            </span>
          </div>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
            Zimbabwe's Farm Marketplace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fresh listings from farmers across all ten provinces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => requireAuth(open)}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {session && count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-secondary-foreground">
                {count}
              </span>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => requireAuth(() => setPostOpen(true))}
          >
            <Plus className="h-4 w-4" />
            Post a Listing
          </Button>
        </div>
      </motion.div>

      {/* Search + category tabs */}
      <div className="glass rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search maize, broilers, Masvingo…"
              className="border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden gap-2"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="mt-3 -mx-1 flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => {
            const active = c.value === category;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`relative min-h-[40px] whitespace-nowrap rounded-full px-3 py-2 text-xs transition ${
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DB error banner — still shows mock listings so the page is useful */}
      {listingsError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Live listings unavailable.</span>
            <span className="ml-2 text-amber-300/70">Showing demo data — check your connection and try refreshing.</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filter sidebar */}
        <aside
          className={`${showFilters ? "block" : "hidden"} lg:block`}
        >
          <div className="glass space-y-5 rounded-2xl p-5">
            <div>
              <h4 className="mb-3 text-xs uppercase tracking-widest text-secondary/80">
                Price range
              </h4>
              <div className="px-1">
                <Slider
                  value={[priceMax]}
                  min={1}
                  max={1000}
                  step={1}
                  onValueChange={([v]) => setPriceMax(v)}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>$0</span>
                <span className="text-foreground">Up to ${priceMax}</span>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs uppercase tracking-widest text-secondary/80">
                Province
              </h4>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All provinces</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h4 className="mb-2 text-xs uppercase tracking-widest text-secondary/80">
                Minimum rating
              </h4>
              <div className="flex gap-1">
                {[0, 3, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs ${
                      minRating === r
                        ? "border-secondary/40 bg-secondary/10 text-secondary"
                        : "border-white/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Star className="h-3 w-3" />
                    {r === 0 ? "Any" : r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
              <div>
                <div className="text-sm">Delivery only</div>
                <div className="text-xs text-muted-foreground">
                  Show listings with transport
                </div>
              </div>
              <Switch checked={deliveryOnly} onCheckedChange={setDeliveryOnly} />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setPriceMax(1000);
                setProvince("all");
                setMinRating(0);
                setDeliveryOnly(false);
              }}
            >
              Reset filters
            </Button>
          </div>
        </aside>

        {/* Listings grid */}
        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} listings</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live updates
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="glass grid place-items-center rounded-2xl p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No listings match your filters. Try widening your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l, i) => (
                <ListingCard key={l.id} listing={l} delay={i * 0.03} />
              ))}
            </div>
          )}
        </div>
      </div>

      {session && <PostListingModal open={postOpen} onClose={() => setPostOpen(false)} />}
    </section>
  );
}

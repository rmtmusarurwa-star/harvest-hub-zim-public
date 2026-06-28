import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Plus, Search, ShoppingCart, Star, Store, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  MOCK_SHOPS,
  SHOP_CATEGORIES,
  categoryIcon,
  categoryLabel,
  type ShopCategory,
  type ShopRow,
} from "@/lib/shops-data";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/shops/")({
  component: ShopsPage,
});

function ShopsPage() {
  const [category, setCategory] = useState<ShopCategory | "all">("all");
  const [search, setSearch] = useState("");
  const { count, open } = useCart();
  const { user } = useAuth();

  // Check if logged-in user already owns a shop
  const { data: myShop } = useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data as { id: string } | null;
    },
  });

  const { data: dbShops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShopRow[];
    },
  });

  const all = useMemo<ShopRow[]>(() => [...dbShops, ...MOCK_SHOPS], [dbShops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (q) {
        const hay = `${s.name} ${s.location} ${s.province} ${s.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, category, search]);

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
              Shops &amp; Suppliers
            </span>
          </div>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            Verified agri-shops near you
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vets, feeds, fertilizers, irrigation and tools across Zimbabwe.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start">
          {myShop ? (
            <Button asChild variant="secondary" size="sm">
              <Link to="/shops/manage">
                <Store className="h-4 w-4" /> Manage My Shop
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/shops/setup">
                <Plus className="h-4 w-4" /> Open a Shop
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={open} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Cart
            {count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-secondary-foreground">
                {count}
              </span>
            )}
          </Button>
        </div>
      </motion.div>

      <div className="glass rounded-2xl p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shops, towns, products…"
            className="border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
          />
        </div>

        <div className="mt-3 -mx-1 flex gap-1 overflow-x-auto pb-1">
          {SHOP_CATEGORIES.map((c) => {
            const active = c.value === category;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} shops</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live inventory
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass grid place-items-center rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No shops match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <ShopCard key={s.id} shop={s} delay={i * 0.04} />
          ))}
        </div>
      )}
    </section>
  );
}

function ShopCard({ shop, delay }: { shop: ShopRow; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/shops/$shopId"
        params={{ shopId: shop.id }}
        className="glass group block overflow-hidden rounded-2xl border border-white/5 transition hover:border-secondary/30"
      >
        <div className="relative h-28 bg-gradient-to-br from-secondary/30 via-primary/20 to-background">
          <div className="absolute inset-0 grid place-items-center text-4xl opacity-70">
            {categoryIcon(shop.category)}
          </div>
          {shop.verified && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 backdrop-blur">
              <BadgeCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base leading-tight group-hover:text-secondary">
              {shop.name}
            </h3>
            <span className="flex items-center gap-0.5 text-xs text-amber-300">
              <Star className="h-3 w-3 fill-current" />
              {Number(shop.rating).toFixed(1)}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-widest text-secondary/70">
            {categoryLabel(shop.category)}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {shop.location}
            </span>
            {shop.distance_km !== undefined && (
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {shop.distance_km.toFixed(1)} km
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

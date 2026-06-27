import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  ShoppingCart,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_SHOPS,
  MOCK_SHOP_PRODUCTS,
  categoryIcon,
  categoryLabel,
  type ShopProductRow,
  type ShopRow,
} from "@/lib/shops-data";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/shops/$shopId")({
  component: ShopDetailPage,
});

function ShopDetailPage() {
  const { shopId } = Route.useParams();
  const { count, open, addItem } = useCart();
  const isMock = shopId.startsWith("mock-shop-");

  const { data: dbShop } = useQuery({
    queryKey: ["shop", shopId],
    enabled: !isMock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .maybeSingle();
      if (error) throw error;
      return data as ShopRow | null;
    },
  });

  const { data: dbProducts = [] } = useQuery({
    queryKey: ["shop-products", shopId],
    enabled: !isMock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShopProductRow[];
    },
  });

  const shop = useMemo<ShopRow | null>(
    () => (isMock ? MOCK_SHOPS.find((s) => s.id === shopId) ?? null : dbShop ?? null),
    [isMock, shopId, dbShop],
  );

  const products = useMemo<ShopProductRow[]>(
    () => (isMock ? MOCK_SHOP_PRODUCTS[shopId] ?? [] : dbProducts),
    [isMock, shopId, dbProducts],
  );

  if (!shop) {
    return (
      <section className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-sm text-muted-foreground">Shop not found.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/shops">Back to shops</Link>
        </Button>
      </section>
    );
  }

  const whatsappLink = shop.whatsapp
    ? `https://wa.me/${shop.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        `Hi ${shop.name}, I'm enquiring via Harvest Hub.`,
      )}`
    : null;

  const handleAdd = (p: ShopProductRow) => {
    addItem({
      id: p.id,
      listing_id: null, // shop products are not in listings table — prevent FK violation
      title: p.name,
      price: Number(p.price),
      unit: p.unit,
      location: shop.location,
      image_url: p.image_url,
      farmer_id: shop.owner_id,
    });
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/shops">
            <ArrowLeft className="h-4 w-4" /> All shops
          </Link>
        </Button>
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

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative overflow-hidden rounded-2xl border border-white/5"
      >
        <div className="relative h-48 bg-gradient-to-br from-secondary/40 via-primary/30 to-background sm:h-60">
          <div className="absolute inset-0 grid place-items-center text-7xl opacity-50">
            {categoryIcon(shop.category)}
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 -mt-12 place-items-center rounded-2xl border border-white/10 bg-background text-3xl shadow-lg">
              {categoryIcon(shop.category)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl">{shop.name}</h1>
                {shop.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-secondary/80">
                {categoryLabel(shop.category)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {shop.location}
                  {shop.province ? `, ${shop.province}` : ""}
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Star className="h-3 w-3 fill-current" />
                  {Number(shop.rating).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {whatsappLink && (
              <Button asChild size="sm" className="gap-2 bg-emerald-500 text-white hover:bg-emerald-500/90">
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
            )}
            {shop.phone && (
              <Button asChild size="sm" variant="outline" className="gap-2">
                <a href={`tel:${shop.phone}`}>
                  <Phone className="h-4 w-4" /> Call
                </a>
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display text-lg">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {shop.description || "No description provided."}
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg">Inventory</h2>
              <span className="text-xs text-muted-foreground">
                {products.length} {products.length === 1 ? "product" : "products"}
              </span>
            </div>
            {products.length === 0 ? (
              <div className="glass grid place-items-center rounded-2xl p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  This shop hasn't listed any products yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} delay={i * 0.03} onAdd={() => handleAdd(p)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <aside className="space-y-3">
          <div className="glass space-y-3 rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-secondary/80">Contact</h3>
            {shop.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" /> {shop.phone}
              </div>
            )}
            {shop.whatsapp && (
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-muted-foreground" /> {shop.whatsapp}
              </div>
            )}
            {shop.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a className="hover:text-secondary" href={`mailto:${shop.email}`}>
                  {shop.email}
                </a>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span>
                {shop.location}
                {shop.province ? `, ${shop.province}` : ""}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  delay,
  onAdd,
}: {
  product: ShopProductRow;
  delay: number;
  onAdd: () => void;
}) {
  const inStock = product.stock_quantity > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass flex flex-col overflow-hidden rounded-2xl border border-white/5"
    >
      <div className="relative h-28 bg-gradient-to-br from-primary/15 via-secondary/15 to-background">
        <div className="absolute inset-0 grid place-items-center text-3xl opacity-70">📦</div>
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            inStock
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-rose-500/20 text-rose-300"
          }`}
        >
          {inStock ? `In stock · ${product.stock_quantity}` : "Out of stock"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight">{product.name}</h4>
          <div className="text-right">
            <div className="font-display text-lg text-secondary">
              ${Number(product.price).toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground">per {product.unit}</div>
          </div>
        </div>
        {product.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="mt-auto gap-2"
          disabled={!inStock}
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" /> Add to Cart
        </Button>
      </div>
    </motion.div>
  );
}

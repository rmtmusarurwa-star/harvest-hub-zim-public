import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Minus, Plus, Star, Truck, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  CATEGORY_LABEL,
  freshnessLabel,
  liveBuyers,
  type ListingRow,
} from "@/lib/marketplace-data";
import { Button } from "@/components/ui/button";
import { useCart, unitStep } from "@/lib/cart-context";
import { CategoryIcon } from "@/components/brand/CategoryIcon";

const CATEGORY_GRADIENT: Record<ListingRow["category"], string> = {
  produce: "from-emerald-700/40 via-emerald-900/40 to-secondary/20",
  livestock: "from-amber-800/40 via-stone-900/40 to-secondary/20",
  poultry: "from-rose-700/30 via-amber-900/40 to-secondary/20",
  dairy: "from-sky-700/30 via-slate-900/40 to-secondary/20",
  grain: "from-yellow-700/40 via-stone-900/40 to-secondary/20",
  other: "from-emerald-800/30 via-stone-900/40 to-secondary/20",
};

export function ListingCard({ listing, delay = 0 }: { listing: ListingRow; delay?: number }) {
  const fresh = freshnessLabel(listing.created_at);
  const buyers = liveBuyers(listing.id);
  const { add } = useCart();
  const price = Number(listing.price);
  const { step, min, isDecimal } = unitStep(listing.unit);
  const [qty, setLocalQty] = useState(min);

  const decrement = () =>
    setLocalQty((q) => Math.max(min, Math.round((q - step) * 100) / 100));
  const increment = () =>
    setLocalQty((q) => Math.round((q + step) * 100) / 100);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add(listing, qty);
    setLocalQty(min);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass group relative flex flex-col overflow-hidden rounded-2xl transition hover:border-secondary/30"
    >
      <Link to="/marketplace/$listingId" params={{ listingId: listing.id }} className="block">
        <div
          className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${CATEGORY_GRADIENT[listing.category]}`}
        >
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-secondary/70">
              <CategoryIcon category={listing.category} className="h-16 w-16" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary backdrop-blur">
              {CATEGORY_LABEL[listing.category]}
            </span>
            {fresh.tone === "fresh" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300 backdrop-blur">
                <Sparkles className="h-3 w-3" /> Fresh
              </span>
            )}
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <Users className="h-3 w-3" /> {buyers}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/marketplace/$listingId"
            params={{ listingId: listing.id }}
            className="font-display text-lg leading-tight text-foreground hover:text-secondary"
          >
            {listing.title}
          </Link>
          <div className="flex items-center gap-1 text-xs text-secondary">
            <Star className="h-3.5 w-3.5 fill-secondary" />
            {Number(listing.rating).toFixed(1)}
          </div>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {listing.location || listing.province}
          {listing.delivery_available && (
            <span className="ml-auto flex items-center gap-1 text-emerald-400">
              <Truck className="h-3 w-3" /> Delivery
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-display text-xl text-secondary">${price.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">/ {listing.unit}</span>
          <span className="ml-auto text-[10px] text-muted-foreground">{fresh.text}</span>
        </div>

        {/* Quantity picker */}
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.02] px-1.5 py-1">
          <button
            onClick={decrement}
            className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-muted-foreground hover:bg-white/5"
            aria-label="Decrease quantity"
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
                setLocalQty(isDecimal ? Math.max(min, v) : Math.max(min, Math.round(v)));
              }
            }}
            className="h-9 w-10 bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-[10px] text-muted-foreground">{listing.unit}</span>
          <span className="ml-auto font-mono text-sm text-secondary">
            ${(price * qty).toFixed(2)}
          </span>
          <button
            onClick={increment}
            className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-muted-foreground hover:bg-white/5"
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={handleAdd}>
            Add to Cart
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/marketplace/$listingId" params={{ listingId: listing.id }}>
              View
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

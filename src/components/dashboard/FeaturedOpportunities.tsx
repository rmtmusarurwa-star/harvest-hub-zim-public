import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

const ITEMS = [
  {
    title: "Premium White Maize",
    seller: "Karoi Growers Co-op",
    where: "Karoi, Mash West",
    price: "$385",
    unit: "/ton",
    qty: "240 tons available",
    tag: "Grade A",
  },
  {
    title: "Free-Range Broilers",
    seller: "Rufaro Poultry",
    where: "Harare South",
    price: "$6.40",
    unit: "/bird",
    qty: "2,800 birds ready",
    tag: "Live",
  },
  {
    title: "Beef Carcass — Brahman",
    seller: "Matabeleland Ranch",
    where: "Gwanda",
    price: "$4.90",
    unit: "/kg",
    qty: "18 carcasses",
    tag: "Cold chain",
  },
];

export function FeaturedOpportunities() {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="font-display text-xl">Featured Opportunities</h3>
          <p className="text-xs text-muted-foreground">
            Curated for you based on demand and proximity
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ITEMS.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.45 }}
            className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:border-secondary/30"
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-secondary/10 blur-2xl transition group-hover:bg-secondary/20" />
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary">
                {it.tag}
              </span>
              <Star className="h-4 w-4 text-secondary/70" />
            </div>
            <h4 className="mt-4 font-display text-lg leading-tight text-foreground">
              {it.title}
            </h4>
            <p className="text-xs text-muted-foreground">{it.seller}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-2xl text-secondary">{it.price}</span>
              <span className="text-xs text-muted-foreground">{it.unit}</span>
            </div>
            <div className="mt-1 text-xs text-foreground/80">{it.qty}</div>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {it.where}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

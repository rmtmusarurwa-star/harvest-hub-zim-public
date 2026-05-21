import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Package, Star, Users } from "lucide-react";
import { initials, trustTone, type FarmerCardData } from "@/lib/farmers-data";
import { TrustBadge } from "./TrustBadge";

export function FarmerCard({
  farmer,
  delay = 0,
}: {
  farmer: FarmerCardData;
  delay?: number;
}) {
  const tone = trustTone(farmer.trust_score);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass group relative overflow-hidden rounded-2xl transition hover:border-secondary/30"
    >
      <Link
        to="/farmers/$farmerId"
        params={{ farmerId: farmer.id }}
        className="block"
      >
        <div className="relative h-20 bg-gradient-to-br from-primary/40 via-emerald-900/40 to-secondary/30">
          <div className="absolute right-3 top-3">
            <TrustBadge score={farmer.trust_score} />
          </div>
        </div>
        <div className="px-5 pb-5">
          <div
            className={`-mt-8 mb-3 inline-grid h-16 w-16 place-items-center rounded-full bg-surface2 font-display text-xl text-secondary ring-2 ${tone.ring}`}
          >
            {farmer.avatar_url ? (
              <img
                src={farmer.avatar_url}
                alt={farmer.full_name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials(farmer.full_name)
            )}
          </div>
          <h3 className="font-display text-lg text-foreground group-hover:text-secondary">
            {farmer.full_name}
          </h3>
          <p className="mt-0.5 text-xs uppercase tracking-widest text-secondary/80">
            {farmer.speciality}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {farmer.province}
            </span>
            <span className="flex items-center gap-1 text-secondary">
              <Star className="h-3 w-3 fill-secondary" />
              {farmer.rating.toFixed(1)}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" /> {farmer.active_listings} active
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {farmer.follower_count}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

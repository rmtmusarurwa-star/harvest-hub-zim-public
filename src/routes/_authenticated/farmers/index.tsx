import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Filter, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_FARMERS,
  PROVINCES,
  SPECIALITIES,
  type FarmerCardData,
} from "@/lib/farmers-data";
import { FarmerCard } from "@/components/farmers/FarmerCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/farmers/")({
  component: FarmersDirectoryPage,
});

function FarmersDirectoryPage() {
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>("all");
  const [speciality, setSpeciality] = useState<string>("all");
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { data: dbFarmers = [] } = useQuery({
    queryKey: ["farmers-directory"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("role", "farmer");
      if (error) throw error;
      const ids = (profiles ?? []).map((p) => p.id);
      if (!ids.length) return [] as FarmerCardData[];

      const [{ data: details }, { data: listings }] = await Promise.all([
        supabase.from("farmer_details").select("*").in("user_id", ids),
        supabase
          .from("listings")
          .select("farmer_id, rating, status")
          .in("farmer_id", ids),
      ]);

      const detailMap = new Map((details ?? []).map((d) => [d.user_id, d]));
      const stats = new Map<string, { count: number; rating: number; n: number }>();
      (listings ?? []).forEach((l) => {
        if (l.status !== "active") return;
        const s = stats.get(l.farmer_id) ?? { count: 0, rating: 0, n: 0 };
        s.count += 1;
        s.rating += Number(l.rating);
        s.n += 1;
        stats.set(l.farmer_id, s);
      });

      return (profiles ?? []).map<FarmerCardData>((p) => {
        const d = detailMap.get(p.id);
        const s = stats.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name || "Unnamed Farmer",
          avatar_url: p.avatar_url,
          cover_url: d?.cover_url ?? null,
          province: d?.province ?? "",
          speciality: d?.speciality ?? "",
          bio: d?.bio ?? "",
          trust_score: d?.trust_score ?? 50,
          follower_count: d?.follower_count ?? 0,
          rating: s && s.n ? +(s.rating / s.n).toFixed(1) : 4.6,
          active_listings: s?.count ?? 0,
        };
      });
    },
  });

  const all = useMemo<FarmerCardData[]>(
    () => [...dbFarmers, ...MOCK_FARMERS],
    [dbFarmers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((f) => {
      if (province !== "all" && f.province !== province) return false;
      if (speciality !== "all" && f.speciality !== speciality) return false;
      if (f.rating < minRating) return false;
      if (q) {
        const hay = `${f.full_name} ${f.speciality} ${f.province} ${f.bio}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, search, province, speciality, minRating]);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-secondary">
            <Users className="h-3.5 w-3.5" /> Farmers Directory
          </div>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            Verified Zimbabwean farmers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover producers across the country. Trust scores blend listings, reviews and follower momentum.
          </p>
        </div>
      </motion.div>

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmer, crop or location…"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters((s) => !s)}
            className="sm:w-auto"
          >
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-3"
          >
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                Province
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
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
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                Speciality
              </label>
              <select
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="all">All specialities</option>
                {SPECIALITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                Min rating: {minRating.toFixed(1)}
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full accent-[color:var(--secondary)]"
              />
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} farmer{filtered.length === 1 ? "" : "s"} found
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((f, i) => (
          <FarmerCard key={f.id} farmer={f} delay={i * 0.03} />
        ))}
      </div>

      {!filtered.length && (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No farmers match your filters yet.
        </div>
      )}
    </section>
  );
}

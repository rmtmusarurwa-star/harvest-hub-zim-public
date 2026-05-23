import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, MapPin, MessageCircle, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  initials,
  MOCK_FARMERS,
  trustTone,
  type FarmerCardData,
} from "@/lib/farmers-data";
import type { ListingRow } from "@/lib/marketplace-data";
import { TrustBadge } from "@/components/farmers/TrustBadge";
import { ReviewSection } from "@/components/farmers/ReviewSection";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/farmers/$farmerId")({
  component: FarmerProfilePage,
});

function FarmerProfilePage() {
  const { farmerId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMock = farmerId.startsWith("mock-");

  const { data: farmer, isLoading } = useQuery({
    queryKey: ["farmer-detail", farmerId],
    queryFn: async (): Promise<FarmerCardData | null> => {
      if (isMock) return MOCK_FARMERS.find((f) => f.id === farmerId) ?? null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("id", farmerId)
        .maybeSingle();
      if (!profile) return null;
      const [{ data: d }, { data: listings }, { data: revs }] = await Promise.all([
        supabase.from("farmer_details").select("*").eq("user_id", farmerId).maybeSingle(),
        supabase
          .from("listings")
          .select("farmer_id, rating, status")
          .eq("farmer_id", farmerId)
          .eq("status", "active"),
        supabase.from("farmer_reviews").select("rating").eq("farmer_id", farmerId),
      ]);
      const ratings = [
        ...(listings ?? []).map((l) => Number(l.rating)),
        ...(revs ?? []).map((r) => Number(r.rating)),
      ];
      const avg = ratings.length
        ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : 4.6;
      return {
        id: profile.id,
        full_name: profile.full_name || "Unnamed Farmer",
        avatar_url: profile.avatar_url,
        cover_url: d?.cover_url ?? null,
        province: d?.province ?? "",
        speciality: d?.speciality ?? "",
        bio: d?.bio ?? "",
        trust_score: d?.trust_score ?? 50,
        follower_count: d?.follower_count ?? 0,
        rating: avg,
        active_listings: listings?.length ?? 0,
      };
    },
  });

  const { data: activeListings = [] } = useQuery({
    queryKey: ["farmer-listings", farmerId],
    enabled: !isMock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("farmer_id", farmerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListingRow[];
    },
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["farmer-following", farmerId, user?.id],
    enabled: !!user && !isMock,
    queryFn: async () => {
      const { data } = await supabase
        .from("farmer_follows")
        .select("farmer_id")
        .eq("farmer_id", farmerId)
        .eq("follower_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const followToggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to follow");
      if (isFollowing) {
        const { error } = await supabase
          .from("farmer_follows")
          .delete()
          .eq("farmer_id", farmerId)
          .eq("follower_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("farmer_follows")
          .insert({ farmer_id: farmerId, follower_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["farmer-following", farmerId, user?.id] });
      qc.invalidateQueries({ queryKey: ["farmer-detail", farmerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tone = useMemo(() => (farmer ? trustTone(farmer.trust_score) : null), [farmer]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center text-sm text-muted-foreground">
        Loading farmer…
      </div>
    );
  }

  if (!farmer || !tone) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center">
        <p className="text-muted-foreground">Farmer not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/farmers">Back to directory</Link>
        </Button>
      </div>
    );
  }

  const isSelf = user?.id === farmer.id;

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/farmers"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-secondary"
      >
        <ArrowLeft className="h-3 w-3" /> All farmers
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass overflow-hidden rounded-3xl"
      >
        <div className="relative h-40 bg-gradient-to-br from-primary via-emerald-900 to-secondary/40 sm:h-56">
          {farmer.cover_url && (
            <img
              src={farmer.cover_url}
              alt=""
              className="h-full w-full object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
          <div className="absolute right-4 top-4">
            <TrustBadge score={farmer.trust_score} size="lg" />
          </div>
        </div>
        <div className="-mt-14 px-6 pb-6 sm:-mt-16 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div
                className={`grid h-24 w-24 place-items-center rounded-2xl bg-surface2 font-display text-3xl text-secondary ring-2 ${tone.ring} sm:h-28 sm:w-28`}
              >
                {farmer.avatar_url ? (
                  <img
                    src={farmer.avatar_url}
                    alt={farmer.full_name}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  initials(farmer.full_name)
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-display text-2xl text-foreground sm:text-3xl">
                  {farmer.full_name}
                </h1>
                {farmer.speciality && (
                  <p className="text-xs uppercase tracking-widest text-secondary/80">
                    {farmer.speciality}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {farmer.province && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {farmer.province}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-secondary">
                    <Star className="h-3 w-3 fill-secondary" /> {farmer.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {farmer.follower_count} followers
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isFollowing ? "outline" : "secondary"}
                disabled={isSelf || isMock || followToggle.isPending}
                onClick={() => followToggle.mutate()}
              >
                <Heart
                  className={`h-4 w-4 ${isFollowing ? "fill-secondary text-secondary" : ""}`}
                />
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button asChild disabled={isSelf || isMock}>
                <Link to="/chat" search={{ farmer: farmer.id }}>
                  <MessageCircle className="h-4 w-4" /> Contact
                </Link>
              </Button>
            </div>
          </div>

          {farmer.bio && (
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {farmer.bio}
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <Stat label="Trust score" value={farmer.trust_score.toString()} tone={tone.text} />
            <Stat label="Active listings" value={farmer.active_listings.toString()} />
            <Stat label="Followers" value={farmer.follower_count.toString()} />
          </div>
        </div>
      </motion.div>

      <div>
        <h2 className="mb-3 font-display text-xl text-foreground">Active listings</h2>
        {activeListings.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeListings.map((l, i) => (
              <ListingCard key={l.id} listing={l} delay={i * 0.04} />
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            {isMock
              ? "Sample farmer — listings appear once the profile activates."
              : "No active listings right now."}
          </div>
        )}
      </div>

      <ReviewSection farmerId={farmer.id} />
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface2/40 p-3">
      <p className={`font-display text-2xl ${tone ?? "text-secondary"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

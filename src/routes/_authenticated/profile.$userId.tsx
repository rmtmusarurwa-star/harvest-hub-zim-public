import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Edit,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL, type AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  component: PublicProfilePage,
});

type ProfileRow = {
  id: string;
  full_name: string;
  role: AppRole;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  created_at: string;
};

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const isOwn = user?.id === userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", userId, isOwn],
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, avatar_url, bio, location, phone_verified, created_at",
        )
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let phone: string | null = null;
      if (isOwn) {
        const { data: p } = await supabase.rpc("get_my_phone");
        phone = (p as string | null) ?? null;
      }
      return { ...(data as Omit<ProfileRow, "phone">), phone } as ProfileRow;
    },
  });

  const isFarmer = profile?.role === "farmer";

  const { data: farmerDetails } = useQuery({
    queryKey: ["farmer-details-public", userId],
    enabled: !!profile && isFarmer,
    queryFn: async () => {
      const { data } = await supabase
        .from("farmer_details")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["profile-listings", userId],
    enabled: !!profile && isFarmer,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, unit, image_url, rating, status")
        .eq("farmer_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["profile-reviews", userId],
    enabled: !!profile && isFarmer,
    queryFn: async () => {
      const { data } = await supabase
        .from("farmer_reviews")
        .select("rating")
        .eq("farmer_id", userId);
      return data ?? [];
    },
  });

  const { data: salesCount = 0 } = useQuery({
    queryKey: ["profile-sales", userId],
    enabled: !!profile && isFarmer,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("farmer_id", userId)
        .eq("payment_status", "paid");
      return count ?? 0;
    },
  });

  const avgRating = useMemo(() => {
    if (!reviews.length) return null;
    return +(
      reviews.reduce((a, r) => a + Number(r.rating), 0) / reviews.length
    ).toFixed(1);
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-muted-foreground">Profile not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const initials = (profile.full_name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="glass-strong rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Avatar className="h-24 w-24 shrink-0 ring-2 ring-secondary/30 sm:h-32 sm:w-32 lg:h-[160px] lg:w-[160px]">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            )}
            <AvatarFallback className="text-2xl sm:text-3xl lg:text-4xl">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-display text-3xl">
                {profile.full_name || "Unnamed"}
              </h1>
              {profile.phone_verified && (
                <Badge variant="secondary" className="gap-1">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </div>
            <div className="text-sm uppercase tracking-wider text-secondary/80">
              {ROLE_LABEL[profile.role]}
            </div>

            {profile.bio && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </span>
              )}
              {profile.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {profile.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Member since {memberSince}
              </span>
              {avgRating !== null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                  {avgRating} ({reviews.length} reviews)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:justify-start">
              {isOwn ? (
                <Button asChild size="sm">
                  <Link to="/profile/edit">
                    <Edit className="h-4 w-4" /> Edit profile
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/chat">
                    <MessageCircle className="h-4 w-4" /> Message
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isFarmer && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Total sales" value={String(salesCount)} />
          <StatTile
            label="Active listings"
            value={String(listings.length)}
          />
          <StatTile
            label="Avg rating"
            value={avgRating !== null ? `${avgRating} / 5` : "—"}
          />
        </div>
      )}

      {isFarmer && farmerDetails && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-xl">Farm details</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {farmerDetails.farm_name && (
              <Row label="Farm name" value={farmerDetails.farm_name} />
            )}
            {farmerDetails.farm_location && (
              <Row label="Farm location" value={farmerDetails.farm_location} />
            )}
            {farmerDetails.province && (
              <Row label="Province" value={farmerDetails.province} />
            )}
            {farmerDetails.speciality && (
              <Row label="Specialities" value={farmerDetails.speciality} />
            )}
          </div>
          {farmerDetails.bio && (
            <p className="text-sm text-muted-foreground pt-2 border-t border-white/5">
              {farmerDetails.bio}
            </p>
          )}
        </div>
      )}

      {isFarmer && listings.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Products</h2>
            <span className="text-xs text-muted-foreground">
              {listings.length} active
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <Link
                key={l.id}
                to="/marketplace/$listingId"
                params={{ listingId: l.id }}
                className="group rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-secondary/30 transition"
              >
                {l.image_url ? (
                  <img
                    src={l.image_url}
                    alt={l.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video w-full grid place-items-center bg-muted">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <div className="truncate text-sm font-medium group-hover:text-secondary">
                    {l.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${Number(l.price).toFixed(2)} / {l.unit}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-secondary/80">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

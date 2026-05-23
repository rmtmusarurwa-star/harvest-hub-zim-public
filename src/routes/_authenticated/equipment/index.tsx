import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Filter,
  MapPin,
  Plus,
  Search,
  Star,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  EQUIPMENT_CATEGORIES,
  MOCK_EQUIPMENT,
  availabilityLabel,
  availabilityTone,
  bookingLabel,
  bookingTone,
  categoryIcon,
  categoryLabel,
  type EquipmentAvailability,
  type EquipmentBookingRow,
  type EquipmentBookingStatus,
  type EquipmentCategory,
  type EquipmentRow,
} from "@/lib/equipment-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostEquipmentModal } from "@/components/equipment/PostEquipmentModal";

export const Route = createFileRoute("/_authenticated/equipment/")({
  component: EquipmentPage,
});

function EquipmentPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
            Equipment Rentals
          </span>
        </div>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          Rent farm equipment. Get the job done.
        </h1>
        <p className="text-sm text-muted-foreground">
          Tractors, combines, irrigation rigs and more — from farmers near you.
        </p>
      </motion.div>

      <Tabs defaultValue="browse">
        <TabsList className="bg-white/[0.03]">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="rentals">My rentals</TabsTrigger>
          <TabsTrigger value="dashboard">Owner dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-4">
          <BrowseTab />
        </TabsContent>
        <TabsContent value="rentals" className="mt-4">
          <MyRentalsTab />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <OwnerDashboardTab />
        </TabsContent>
      </Tabs>
    </section>
  );
}

/* ---------------- Browse ---------------- */

function BrowseTab() {
  const [cat, setCat] = useState<EquipmentCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<EquipmentAvailability | "all">("all");

  const { data: dbEquipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EquipmentRow[];
    },
  });

  const all = useMemo(() => [...dbEquipment, ...MOCK_EQUIPMENT], [dbEquipment]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      if (cat !== "all" && e.category !== cat) return false;
      if (availability !== "all" && e.availability !== availability) return false;
      if (q) {
        const hay =
          `${e.name} ${e.location} ${e.province} ${e.description} ${e.specs}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, cat, search, availability]);

  return (
    <div className="space-y-4">
      <div className="glass space-y-3 rounded-2xl p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tractors, generators, towns…"
            className="border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
          />
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {EQUIPMENT_CATEGORIES.map((c) => {
            const active = c.value === cat;
            return (
              <button
                key={c.value}
                onClick={() => setCat(c.value)}
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

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {(["all", "available", "unavailable", "maintenance"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAvailability(a)}
              className={`rounded-full border px-2.5 py-1 ${
                availability === a
                  ? "border-secondary/40 bg-secondary/10 text-secondary"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {a === "all" ? "Any availability" : availabilityLabel[a]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} pieces of equipment</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live availability
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass grid place-items-center rounded-2xl p-12 text-center text-sm text-muted-foreground">
          No equipment matches your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e, i) => (
            <EquipmentCard key={e.id} equipment={e} delay={i * 0.03} />
          ))}
        </div>
      )}
    </div>
  );
}

function EquipmentCard({ equipment, delay }: { equipment: EquipmentRow; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/equipment/$equipmentId"
        params={{ equipmentId: equipment.id }}
        className="glass group block overflow-hidden rounded-2xl border border-white/5 transition hover:border-secondary/30"
      >
        <div className="relative h-28 bg-gradient-to-br from-secondary/30 via-primary/20 to-background">
          <div className="absolute inset-0 grid place-items-center text-5xl opacity-70">
            {categoryIcon(equipment.category)}
          </div>
          <span
            className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium ${availabilityTone[equipment.availability]}`}
          >
            {availabilityLabel[equipment.availability]}
          </span>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base leading-tight group-hover:text-secondary">
              {equipment.name}
            </h3>
            <span className="flex items-center gap-0.5 text-xs text-amber-300">
              <Star className="h-3 w-3 fill-current" />
              {Number(equipment.rating).toFixed(1)}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-widest text-secondary/70">
            {categoryLabel(equipment.category)} · {equipment.owner_name ?? "Owner"}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {equipment.location}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Calendar
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-display text-lg text-secondary">
              ${Number(equipment.price_per_day).toFixed(0)}
            </span>
            <span className="text-[10px] text-muted-foreground">per day</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ---------------- My rentals ---------------- */

function MyRentalsTab() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["equipment-bookings", "renter", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_bookings")
        .select("*")
        .eq("renter_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EquipmentBookingRow[];
    },
  });

  const active = bookings.filter(
    (b) => b.status === "active" || (b.status === "confirmed" && b.start_date <= today && b.end_date >= today),
  );
  const upcoming = bookings.filter(
    (b) => (b.status === "pending" || b.status === "confirmed") && b.start_date > today,
  );
  const past = bookings.filter((b) =>
    ["completed", "cancelled", "rejected"].includes(b.status) || b.end_date < today,
  );

  if (!user) {
    return (
      <div className="glass grid place-items-center rounded-2xl p-12 text-sm text-muted-foreground">
        Sign in to view your rentals.
      </div>
    );
  }
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading rentals…</div>;
  }

  return (
    <div className="space-y-6">
      <RentalGroup title="Active" rows={active} role="renter" />
      <RentalGroup title="Upcoming" rows={upcoming} role="renter" />
      <RentalGroup title="Past" rows={past} role="renter" />
    </div>
  );
}

/* ---------------- Owner dashboard ---------------- */

function OwnerDashboardTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [postOpen, setPostOpen] = useState(false);

  const { data: myListings = [] } = useQuery({
    queryKey: ["equipment", "owner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EquipmentRow[];
    },
  });

  const { data: ownerBookings = [] } = useQuery({
    queryKey: ["equipment-bookings", "owner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_bookings")
        .select("*")
        .eq("owner_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EquipmentBookingRow[];
    },
  });

  const setAvailability = useMutation({
    mutationFn: async (vars: { id: string; availability: EquipmentAvailability }) => {
      const { error } = await supabase
        .from("equipment")
        .update({ availability: vars.availability })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated availability");
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="glass grid place-items-center rounded-2xl p-12 text-sm text-muted-foreground">
        Sign in to manage your equipment.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">Your equipment</h3>
          <p className="text-xs text-muted-foreground">
            {myListings.length} listing{myListings.length === 1 ? "" : "s"} ·{" "}
            {ownerBookings.filter((b) => b.status === "pending").length} pending requests
          </p>
        </div>
        <Button variant="secondary" size="sm" className="gap-2" onClick={() => setPostOpen(true)}>
          <Plus className="h-4 w-4" /> Post equipment
        </Button>
      </div>

      {myListings.length === 0 ? (
        <div className="glass grid place-items-center rounded-2xl p-12 text-center">
          <Wrench className="mb-3 h-8 w-8 text-secondary/60" />
          <p className="text-sm text-muted-foreground">
            You have no listings yet. Post your first piece of equipment to start earning.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {myListings.map((e) => (
            <div
              key={e.id}
              className="glass flex items-center justify-between gap-3 rounded-2xl border border-white/5 p-4"
            >
              <div className="min-w-0">
                <div className="font-display">{e.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {categoryLabel(e.category)} · {e.location} · ${Number(e.price_per_day).toFixed(0)}/day
                </div>
              </div>
              <select
                value={e.availability}
                onChange={(ev) =>
                  setAvailability.mutate({
                    id: e.id,
                    availability: ev.target.value as EquipmentAvailability,
                  })
                }
                className={`rounded-full px-2 py-1 text-[11px] ${availabilityTone[e.availability]}`}
              >
                <option value="available">Available</option>
                <option value="unavailable">Booked</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-2 font-display text-lg">Booking requests</h3>
        <RentalGroup title="Pending" rows={ownerBookings.filter((b) => b.status === "pending")} role="owner" />
        <RentalGroup
          title="Confirmed & active"
          rows={ownerBookings.filter((b) => ["confirmed", "active"].includes(b.status))}
          role="owner"
        />
        <RentalGroup
          title="History"
          rows={ownerBookings.filter((b) =>
            ["completed", "cancelled", "rejected"].includes(b.status),
          )}
          role="owner"
        />
      </div>

      <PostEquipmentModal open={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  );
}

/* ---------------- Shared rental list ---------------- */

function RentalGroup({
  title,
  rows,
  role,
}: {
  title: string;
  rows: EquipmentBookingRow[];
  role: "renter" | "owner";
}) {
  const qc = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async (vars: { id: string; status: EquipmentBookingStatus }) => {
      const { error } = await supabase
        .from("equipment_bookings")
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Marked as ${bookingLabel[vars.status]}`);
      qc.invalidateQueries({ queryKey: ["equipment-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rows.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="text-[11px] uppercase tracking-widest text-secondary/70">{title}</div>
      <div className="space-y-2">
        {rows.map((b) => (
          <div
            key={b.id}
            className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 p-4 text-sm"
          >
            <div className="min-w-0">
              <div className="font-display">{b.equipment_name || "Equipment"}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(b.start_date).toLocaleDateString()} →{" "}
                {new Date(b.end_date).toLocaleDateString()} · {b.delivery ? "Delivery" : "Pickup"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-secondary">${Number(b.total_cost).toFixed(2)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${bookingTone[b.status]}`}
              >
                {bookingLabel[b.status]}
              </span>
              {role === "owner" && b.status === "pending" && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: b.id, status: "confirmed" })}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: b.id, status: "rejected" })}>
                    Reject
                  </Button>
                </>
              )}
              {role === "owner" && b.status === "confirmed" && (
                <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: b.id, status: "active" })}>
                  Mark in use
                </Button>
              )}
              {role === "owner" && b.status === "active" && (
                <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: b.id, status: "completed" })}>
                  Complete
                </Button>
              )}
              {role === "renter" && ["pending", "confirmed"].includes(b.status) && (
                <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: b.id, status: "cancelled" })}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

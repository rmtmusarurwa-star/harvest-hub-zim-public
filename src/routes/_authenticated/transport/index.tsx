import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Filter,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Search,
  Star,
  Truck,
  Weight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  MOCK_VEHICLES,
  VEHICLE_TYPES,
  availabilityLabel,
  availabilityTone,
  bookingLabel,
  bookingTone,
  vehicleIcon,
  vehicleLabel,
  whatsappLink,
  type TransportBookingRow,
  type TransportRequestRow,
  type TransportResponseRow,
  type VehicleAvailability,
  type VehicleRow,
  type VehicleType,
} from "@/lib/transport-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PostRequestModal } from "@/components/transport/PostRequestModal";

export const Route = createFileRoute("/_authenticated/transport/")({
  component: TransportPage,
});

function TransportPage() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
            Transport &amp; Logistics
          </span>
        </div>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          Move your harvest. Faster.
        </h1>
        <p className="text-sm text-muted-foreground">
          Book trucks, tractors and refrigerated vehicles, or post a load and let transporters bid.
        </p>
      </motion.div>

      <Tabs defaultValue="vehicles">
        <TabsList className="bg-white/[0.03]">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="requests">Transport board</TabsTrigger>
          <TabsTrigger value="bookings">My bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="bookings" className="mt-4">
          <BookingsTab />
        </TabsContent>
      </Tabs>
    </section>
  );
}

/* ---------------- Vehicles ---------------- */

function VehiclesTab() {
  const [type, setType] = useState<VehicleType | "all">("all");
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<VehicleAvailability | "all">("all");
  const [minCap, setMinCap] = useState(0);

  const { data: dbVehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VehicleRow[];
    },
  });

  const all = useMemo(() => [...dbVehicles, ...MOCK_VEHICLES], [dbVehicles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((v) => {
      if (type !== "all" && v.type !== type) return false;
      if (availability !== "all" && v.availability !== availability) return false;
      if (Number(v.capacity_kg) < minCap) return false;
      if (q) {
        const hay = `${v.name} ${v.location} ${v.province} ${v.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, type, search, availability, minCap]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-3 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trucks, towns, capacity…"
            className="border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
          />
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {VEHICLE_TYPES.map((t) => {
            const active = t.value === type;
            return (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span>{t.icon}</span>{t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {(["all", "available", "busy", "offline"] as const).map((a) => (
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground">Min capacity:</span>
            <select
              value={minCap}
              onChange={(e) => setMinCap(Number(e.target.value))}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1"
            >
              <option value={0}>Any</option>
              <option value={1000}>1 t+</option>
              <option value={5000}>5 t+</option>
              <option value={10000}>10 t+</option>
              <option value={20000}>20 t+</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} vehicles</span>
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
          No vehicles match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v, i) => <VehicleCard key={v.id} vehicle={v} delay={i * 0.03} />)}
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, delay }: { vehicle: VehicleRow; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/transport/$vehicleId"
        params={{ vehicleId: vehicle.id }}
        className="glass group block overflow-hidden rounded-2xl border border-white/5 transition hover:border-secondary/30"
      >
        <div className="relative h-28 bg-gradient-to-br from-secondary/30 via-primary/20 to-background">
          <div className="absolute inset-0 grid place-items-center text-5xl opacity-70">
            {vehicleIcon(vehicle.type)}
          </div>
          <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium ${availabilityTone[vehicle.availability]}`}>
            {availabilityLabel[vehicle.availability]}
          </span>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base leading-tight group-hover:text-secondary">
              {vehicle.name}
            </h3>
            <span className="flex items-center gap-0.5 text-xs text-amber-300">
              <Star className="h-3 w-3 fill-current" />
              {Number(vehicle.rating).toFixed(1)}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-widest text-secondary/70">
            {vehicleLabel(vehicle.type)} · {vehicle.owner_name ?? "Owner"}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {vehicle.location}
            </span>
            <span className="flex items-center gap-1">
              <Weight className="h-3 w-3" />
              {(vehicle.capacity_kg / 1000).toFixed(1)} t
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-display text-lg text-secondary">
              {vehicle.price_per_km > 0
                ? `$${Number(vehicle.price_per_km).toFixed(2)}`
                : `$${Number(vehicle.price_per_trip).toFixed(0)}`}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {vehicle.price_per_km > 0 ? "per km" : "per trip"}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ---------------- Transport board (requests) ---------------- */

function RequestsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [postOpen, setPostOpen] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ["transport-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_requests").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TransportRequestRow[];
    },
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["transport-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_request_responses").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TransportResponseRow[];
    },
  });

  const responsesByReq = useMemo(() => {
    const m = new Map<string, TransportResponseRow[]>();
    for (const r of responses) {
      if (!m.has(r.request_id)) m.set(r.request_id, []);
      m.get(r.request_id)!.push(r);
    }
    return m;
  }, [responses]);

  const respond = useMutation({
    mutationFn: async (vars: { request_id: string; message: string; price: number; phone: string }) => {
      if (!user) throw new Error("Please sign in first.");
      const { error } = await supabase.from("transport_request_responses").insert({
        request_id: vars.request_id,
        responder_id: user.id,
        message: vars.message,
        quoted_price: vars.price,
        contact_phone: vars.phone,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offer sent");
      qc.invalidateQueries({ queryKey: ["transport-responses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {requests.length} active loads
        </div>
        <Button variant="secondary" size="sm" className="gap-2" onClick={() => setPostOpen(true)}>
          <Plus className="h-4 w-4" /> Post a need
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="glass grid place-items-center rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No transport requests yet. Be the first to post a load.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {requests.map((r, i) => (
            <RequestCard
              key={r.id} request={r} delay={i * 0.03}
              responses={responsesByReq.get(r.id) ?? []}
              isOwner={user?.id === r.poster_id}
              onRespond={(vars) => respond.mutate({ request_id: r.id, ...vars })}
              submitting={respond.isPending}
            />
          ))}
        </div>
      )}

      <PostRequestModal open={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  );
}

function RequestCard({
  request, delay, responses, isOwner, onRespond, submitting,
}: {
  request: TransportRequestRow;
  delay: number;
  responses: TransportResponseRow[];
  isOwner: boolean;
  onRespond: (vars: { message: string; price: number; phone: string }) => void;
  submitting: boolean;
}) {
  const [msg, setMsg] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass space-y-3 rounded-2xl border border-white/5 p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {request.pickup}
            <Navigation className="h-3 w-3 mx-1" /> {request.destination}
          </div>
          <h4 className="mt-1 font-display text-lg">{request.cargo}</h4>
        </div>
        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary">
          {request.status}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {request.scheduled_date && (
          <span>📅 {new Date(request.scheduled_date).toLocaleDateString()}</span>
        )}
        {request.estimated_weight_kg > 0 && (
          <span className="flex items-center gap-1">
            <Weight className="h-3 w-3" /> {Number(request.estimated_weight_kg).toLocaleString()} kg
          </span>
        )}
        {request.budget > 0 && (
          <span className="text-secondary">Budget: ${Number(request.budget).toFixed(2)}</span>
        )}
      </div>

      {responses.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[11px] uppercase tracking-widest text-secondary/80">
            {responses.length} {responses.length === 1 ? "offer" : "offers"}
          </div>
          {responses.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="truncate">{r.message || "Interested in this load"}</div>
                {r.contact_phone && (
                  <div className="mt-0.5 text-muted-foreground">{r.contact_phone}</div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-secondary">${Number(r.quoted_price).toFixed(2)}</div>
                {r.contact_phone && (
                  <a
                    className="text-[10px] text-emerald-300 hover:underline"
                    href={whatsappLink(r.contact_phone, "Hi, about your transport offer on Harvest Hub")}
                    target="_blank" rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isOwner && (
        <div className="space-y-2 border-t border-white/5 pt-3">
          <Textarea
            value={msg} onChange={(e) => setMsg(e.target.value)} rows={2}
            placeholder="Hi, I can move this load on Tuesday with my 10-ton truck."
          />
          <div className="flex gap-2">
            <Input
              type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="Quote ($)"
            />
            <Input
              value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone"
            />
            <Button
              size="sm" variant="secondary" disabled={submitting}
              onClick={() => {
                if (!msg && !price) {
                  toast.error("Add a message or a price quote.");
                  return;
                }
                onRespond({ message: msg, price: Number(price) || 0, phone });
                setMsg(""); setPrice(""); setPhone("");
              }}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ---------------- My bookings ---------------- */

function BookingsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_bookings").select("*")
        .or(`buyer_id.eq.${user!.id},owner_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TransportBookingRow[];
    },
  });

  const update = useMutation({
    mutationFn: async (vars: { id: string; status: TransportBookingRow["status"] }) => {
      const { error } = await supabase
        .from("transport_bookings").update({ status: vars.status }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading bookings…</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="glass grid place-items-center rounded-2xl p-12 text-center">
        <Truck className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">No bookings yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Book a vehicle to see it appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {bookings.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="glass space-y-2 rounded-2xl border border-white/5 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {b.pickup}
                <Navigation className="mx-1 h-3 w-3" /> {b.destination}
              </div>
              <h4 className="mt-1 truncate font-display text-base">{b.cargo}</h4>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {b.scheduled_date && <span>📅 {new Date(b.scheduled_date).toLocaleDateString()}</span>}
                {b.estimated_weight_kg > 0 && (
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3" /> {Number(b.estimated_weight_kg).toLocaleString()} kg
                  </span>
                )}
                {b.contact_phone && (
                  <a
                    className="flex items-center gap-1 text-emerald-300 hover:underline"
                    href={whatsappLink(b.contact_phone, "Hi, about our Harvest Hub booking")}
                    target="_blank" rel="noreferrer"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${bookingTone[b.status]}`}>
              {bookingLabel[b.status]}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {user?.id === b.owner_id && b.status === "pending" && (
              <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: b.id, status: "confirmed" })}>
                Confirm
              </Button>
            )}
            {user?.id === b.owner_id && b.status === "confirmed" && (
              <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: b.id, status: "in_transit" })}>
                Mark in transit
              </Button>
            )}
            {user?.id === b.owner_id && b.status === "in_transit" && (
              <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: b.id, status: "completed" })}>
                Mark completed
              </Button>
            )}
            {b.status !== "completed" && b.status !== "cancelled" && (
              <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: b.id, status: "cancelled" })}>
                Cancel
              </Button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

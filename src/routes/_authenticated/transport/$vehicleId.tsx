import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Truck,
  Weight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_VEHICLES,
  availabilityLabel,
  availabilityTone,
  vehicleIcon,
  vehicleLabel,
  whatsappLink,
  type VehicleRow,
} from "@/lib/transport-data";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/transport/BookingModal";

export const Route = createFileRoute("/_authenticated/transport/$vehicleId")({
  component: VehicleDetailPage,
});

function VehicleDetailPage() {
  const { vehicleId } = Route.useParams();
  const [bookOpen, setBookOpen] = useState(false);
  const isMock = vehicleId.startsWith("mock-veh-");

  const { data: dbVehicle } = useQuery({
    queryKey: ["vehicle", vehicleId],
    enabled: !isMock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
      if (error) throw error;
      return data as VehicleRow | null;
    },
  });

  const vehicle = useMemo<VehicleRow | null>(
    () => (isMock ? MOCK_VEHICLES.find((v) => v.id === vehicleId) ?? null : dbVehicle ?? null),
    [isMock, vehicleId, dbVehicle],
  );

  if (!vehicle) {
    return (
      <section className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-sm text-muted-foreground">Vehicle not found.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/transport">Back to transport</Link>
        </Button>
      </section>
    );
  }

  const waLink = vehicle.whatsapp
    ? whatsappLink(vehicle.whatsapp, `Hi ${vehicle.owner_name ?? ""}, enquiring about your ${vehicle.name} via Harvest Hub.`)
    : null;

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/transport"><ArrowLeft className="h-4 w-4" /> All transport</Link>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass overflow-hidden rounded-2xl border border-white/5"
      >
        <div className="relative h-64 bg-gradient-to-br from-secondary/40 via-primary/30 to-background sm:h-80">
          <div className="absolute inset-0 grid place-items-center text-[6rem] opacity-60">
            {vehicleIcon(vehicle.type)}
          </div>
          <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-medium ${availabilityTone[vehicle.availability]}`}>
            {availabilityLabel[vehicle.availability]}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-secondary/80">
              {vehicleLabel(vehicle.type)}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="font-display text-3xl md:text-4xl">{vehicle.name}</h1>
              <span className="flex items-center gap-1 text-sm text-amber-300">
                <Star className="h-4 w-4 fill-current" /> {Number(vehicle.rating).toFixed(1)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {vehicle.location}
                {vehicle.province ? `, ${vehicle.province}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <Weight className="h-4 w-4" /> {Number(vehicle.capacity_kg).toLocaleString()} kg capacity
              </span>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="font-display text-lg">About this vehicle</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {vehicle.description || "No description provided."}
            </p>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-secondary/80">Specifications</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Spec label="Type" value={vehicleLabel(vehicle.type)} />
              <Spec label="Capacity" value={`${(vehicle.capacity_kg / 1000).toFixed(1)} t`} />
              <Spec label="Base" value={vehicle.location} />
              <Spec label="Availability" value={availabilityLabel[vehicle.availability]} />
              <Spec label="Rating" value={`${Number(vehicle.rating).toFixed(1)} / 5`} />
              <Spec label="Owner" value={vehicle.owner_name ?? "Verified owner"} />
            </dl>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="glass space-y-3 rounded-2xl p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-3xl text-secondary">
                {vehicle.price_per_km > 0
                  ? `$${Number(vehicle.price_per_km).toFixed(2)}`
                  : `$${Number(vehicle.price_per_trip).toFixed(0)}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {vehicle.price_per_km > 0 ? "per km" : "per trip"}
              </span>
            </div>
            <Button
              className="w-full gap-2"
              size="lg"
              variant="secondary"
              disabled={vehicle.availability === "offline"}
              onClick={() => setBookOpen(true)}
            >
              <Truck className="h-4 w-4" /> Book now
            </Button>
            {waLink && (
              <Button asChild className="w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-500/90">
                <a href={waLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Contact transporter
                </a>
              </Button>
            )}
            {vehicle.phone && (
              <Button asChild variant="outline" className="w-full gap-2">
                <a href={`tel:${vehicle.phone}`}>
                  <Phone className="h-4 w-4" /> Call
                </a>
              </Button>
            )}
          </div>

          <div className="glass space-y-2 rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-secondary/80">Owner</h3>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary/20 text-sm">
                {(vehicle.owner_name ?? "O").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-sm">{vehicle.owner_name ?? "Verified transporter"}</div>
                <div className="text-xs text-muted-foreground">{vehicle.province || vehicle.location}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <BookingModal vehicle={vehicle} open={bookOpen} onClose={() => setBookOpen(false)} />
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

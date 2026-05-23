import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Truck,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_EQUIPMENT,
  availabilityLabel,
  availabilityTone,
  categoryIcon,
  categoryLabel,
  whatsappLink,
  type EquipmentBookingRow,
  type EquipmentRow,
} from "@/lib/equipment-data";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { BookingModal } from "@/components/equipment/BookingModal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/equipment/$equipmentId")({
  component: EquipmentDetailPage,
});

function EquipmentDetailPage() {
  const { equipmentId } = useParams({ from: "/_authenticated/equipment/$equipmentId" });
  const [bookOpen, setBookOpen] = useState(false);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment", equipmentId],
    queryFn: async () => {
      const mock = MOCK_EQUIPMENT.find((e) => e.id === equipmentId);
      if (mock) return mock;
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", equipmentId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EquipmentRow | null;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["equipment-bookings", "equipment", equipmentId],
    enabled: !equipmentId.startsWith("mock-"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_bookings")
        .select("start_date,end_date,status")
        .eq("equipment_id", equipmentId);
      if (error) throw error;
      return (data ?? []) as Pick<EquipmentBookingRow, "start_date" | "end_date" | "status">[];
    },
  });

  const bookedDays = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      if (b.status === "cancelled" || b.status === "rejected") continue;
      const s = new Date(b.start_date);
      const e = new Date(b.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        set.add(d.toISOString().slice(0, 10));
      }
    }
    return set;
  }, [bookings]);

  if (isLoading) {
    return <div className="mx-auto max-w-5xl text-sm text-muted-foreground">Loading…</div>;
  }
  if (!equipment) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Equipment not found.</p>
        <Link to="/equipment" className="text-sm text-secondary">
          ← Back to equipment
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/equipment"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All equipment
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass overflow-hidden rounded-3xl border border-white/5"
      >
        <div className="relative h-56 bg-gradient-to-br from-secondary/30 via-primary/20 to-background sm:h-72">
          <div className="absolute inset-0 grid place-items-center text-8xl opacity-70">
            {categoryIcon(equipment.category)}
          </div>
          <span
            className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-medium ${availabilityTone[equipment.availability]}`}
          >
            {availabilityLabel[equipment.availability]}
          </span>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-3 md:p-8">
          <div className="space-y-4 md:col-span-2">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-secondary/70">
                {categoryLabel(equipment.category)}
              </div>
              <h1 className="font-display text-2xl md:text-3xl">{equipment.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {equipment.location}, {equipment.province}
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Star className="h-3 w-3 fill-current" /> {Number(equipment.rating).toFixed(1)}
                </span>
                {equipment.delivery_available && (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <Truck className="h-3 w-3" /> Delivery available
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{equipment.description}</p>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary/70">
                <Wrench className="h-3.5 w-3.5" /> Specifications
              </div>
              <p className="text-sm">{equipment.specs || "Specs available on request."}</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary/70">
                <CalendarDays className="h-3.5 w-3.5" /> Availability calendar
              </div>
              <Calendar
                mode="single"
                modifiers={{
                  booked: (d) => bookedDays.has(d.toISOString().slice(0, 10)),
                }}
                modifiersClassNames={{ booked: "bg-rose-500/30 text-rose-100" }}
                className={cn("p-2 pointer-events-auto")}
              />
              <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Booked
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-300" /> Free to book
                </span>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
              <div className="text-[11px] uppercase tracking-widest text-secondary/70">
                Pricing
              </div>
              <div className="mt-2 space-y-1.5 text-sm">
                <Row label="Per day" value={`$${Number(equipment.price_per_day).toFixed(2)}`} highlight />
                {equipment.price_per_week > 0 && (
                  <Row label="Per week" value={`$${Number(equipment.price_per_week).toFixed(2)}`} />
                )}
                {equipment.price_per_month > 0 && (
                  <Row label="Per month" value={`$${Number(equipment.price_per_month).toFixed(2)}`} />
                )}
                <Row
                  label="Refundable deposit"
                  value={`$${Number(equipment.deposit).toFixed(2)}`}
                />
              </div>
              <Button
                variant="secondary"
                className="mt-4 w-full"
                disabled={equipment.availability !== "available"}
                onClick={() => setBookOpen(true)}
              >
                {equipment.availability === "available" ? "Book now" : "Not available"}
              </Button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm">
              <div className="text-[11px] uppercase tracking-widest text-secondary/70">Owner</div>
              <div className="mt-2 font-display">{equipment.owner_name ?? "Owner"}</div>
              <div className="text-xs text-muted-foreground">{equipment.location}</div>
              <div className="mt-3 flex gap-2">
                {equipment.whatsapp && (
                  <a
                    href={whatsappLink(equipment.whatsapp, `Hi, about ${equipment.name} on Harvest Hub`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/30"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {equipment.phone && (
                  <a
                    href={`tel:${equipment.phone}`}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      </motion.div>

      <BookingModal open={bookOpen} onClose={() => setBookOpen(false)} equipment={equipment} />
    </section>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-display text-lg text-secondary" : ""}>{value}</span>
    </div>
  );
}

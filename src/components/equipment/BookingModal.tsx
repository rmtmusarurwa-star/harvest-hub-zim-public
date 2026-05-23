import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Truck } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  daysBetween,
  estimateCost,
  type EquipmentRow,
} from "@/lib/equipment-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function BookingModal({
  open,
  onClose,
  equipment,
}: {
  open: boolean;
  onClose: () => void;
  equipment: EquipmentRow;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [delivery, setDelivery] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const startStr = start ? format(start, "yyyy-MM-dd") : "";
  const endStr = end ? format(end, "yyyy-MM-dd") : "";
  const days = useMemo(
    () => (startStr && endStr ? daysBetween(startStr, endStr) : 0),
    [startStr, endStr],
  );
  const cost = useMemo(() => estimateCost(equipment, days), [equipment, days]);

  const book = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to book.");
      if (!startStr || !endStr) throw new Error("Pick start and end dates.");
      if (!phone) throw new Error("Add a contact phone.");
      if (delivery && !address) throw new Error("Add a delivery address.");
      if (equipment.id.startsWith("mock-")) {
        // demo data — simulate booking
        await new Promise((r) => setTimeout(r, 400));
        return;
      }
      const { error } = await supabase.from("equipment_bookings").insert({
        equipment_id: equipment.id,
        equipment_name: equipment.name,
        renter_id: user.id,
        owner_id: equipment.owner_id,
        start_date: startStr,
        end_date: endStr,
        total_cost: cost,
        deposit: equipment.deposit,
        delivery,
        delivery_address: address,
        contact_phone: phone,
        notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking request sent to the owner");
      qc.invalidateQueries({ queryKey: ["equipment-bookings"] });
      onClose();
      setStart(undefined);
      setEnd(undefined);
      setDelivery(false);
      setAddress("");
      setPhone("");
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book {equipment.name}</DialogTitle>
          <DialogDescription>
            {equipment.location} · ${equipment.price_per_day.toFixed(0)}/day
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DatePick label="Start date" value={start} onChange={setStart} />
            <DatePick label="End date" value={end} onChange={setEnd} fromDate={start} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-secondary" />
              <span>Delivery to my farm</span>
            </div>
            <Switch
              checked={delivery}
              onCheckedChange={setDelivery}
              disabled={!equipment.delivery_available}
            />
          </div>

          {delivery && (
            <div className="space-y-1.5">
              <Label className="text-xs">Delivery address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 14, Mazoe Road…"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Your phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263 77…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes for the owner</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What you'll use it for, pickup time…"
              />
            </div>
          </div>

          <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Days</span>
              <span>{days || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rental cost</span>
              <span>${cost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Refundable deposit</span>
              <span>${Number(equipment.deposit).toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 font-display text-base text-secondary">
              <span>Pay on confirmation</span>
              <span>${(cost + Number(equipment.deposit)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={book.isPending}
            onClick={() => book.mutate()}
          >
            {book.isPending ? "Booking…" : "Confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DatePick({
  label,
  value,
  onChange,
  fromDate,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  fromDate?: Date;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            disabled={(d) =>
              d < new Date(new Date().setHours(0, 0, 0, 0)) ||
              (fromDate ? d < fromDate : false)
            }
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

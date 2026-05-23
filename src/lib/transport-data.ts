export type VehicleType = "truck" | "tractor" | "pickup" | "refrigerated" | "van" | "lorry";
export type VehicleAvailability = "available" | "busy" | "offline";
export type BookingStatus = "pending" | "confirmed" | "in_transit" | "completed" | "cancelled";
export type RequestStatus = "open" | "matched" | "closed";

export const VEHICLE_TYPES: { value: VehicleType | "all"; label: string; icon: string }[] = [
  { value: "all", label: "All vehicles", icon: "🚗" },
  { value: "truck", label: "Truck", icon: "🚚" },
  { value: "lorry", label: "Lorry", icon: "🚛" },
  { value: "pickup", label: "Pickup", icon: "🛻" },
  { value: "tractor", label: "Tractor", icon: "🚜" },
  { value: "refrigerated", label: "Refrigerated", icon: "❄️" },
  { value: "van", label: "Van", icon: "🚐" },
];

export const vehicleIcon = (t: VehicleType) =>
  VEHICLE_TYPES.find((x) => x.value === t)?.icon ?? "🚚";
export const vehicleLabel = (t: VehicleType) =>
  VEHICLE_TYPES.find((x) => x.value === t)?.label ?? t;

export const availabilityTone: Record<VehicleAvailability, string> = {
  available: "bg-emerald-500/20 text-emerald-300",
  busy: "bg-amber-500/20 text-amber-300",
  offline: "bg-rose-500/20 text-rose-300",
};
export const availabilityLabel: Record<VehicleAvailability, string> = {
  available: "Available",
  busy: "On a trip",
  offline: "Offline",
};

export const bookingTone: Record<BookingStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  confirmed: "bg-sky-500/20 text-sky-300",
  in_transit: "bg-violet-500/20 text-violet-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-rose-500/20 text-rose-300",
};
export const bookingLabel: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_transit: "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type VehicleRow = {
  id: string;
  owner_id: string;
  owner_name?: string;
  type: VehicleType;
  name: string;
  capacity_kg: number;
  location: string;
  province: string;
  price_per_km: number;
  price_per_trip: number;
  availability: VehicleAvailability;
  description: string;
  rating: number;
  phone: string;
  whatsapp: string;
  image_url: string | null;
  created_at: string;
};

export type TransportBookingRow = {
  id: string;
  vehicle_id: string | null;
  buyer_id: string;
  owner_id: string;
  pickup: string;
  destination: string;
  scheduled_date: string | null;
  cargo: string;
  estimated_weight_kg: number;
  contact_phone: string;
  status: BookingStatus;
  notes: string;
  created_at: string;
};

export type TransportRequestRow = {
  id: string;
  poster_id: string;
  pickup: string;
  destination: string;
  cargo: string;
  estimated_weight_kg: number;
  scheduled_date: string | null;
  budget: number;
  contact_phone: string;
  status: RequestStatus;
  created_at: string;
};

export type TransportResponseRow = {
  id: string;
  request_id: string;
  responder_id: string;
  message: string;
  quoted_price: number;
  contact_phone: string;
  created_at: string;
};

export const whatsappLink = (number: string, msg: string) =>
  `https://wa.me/${number.replace(/[^\d]/g, "")}?text=${encodeURIComponent(msg)}`;

export const MOCK_VEHICLES: VehicleRow[] = [
  {
    id: "mock-veh-1", owner_id: "mock-own-1", owner_name: "Tendai Moyo",
    type: "truck", name: "Iveco Eurocargo 10T",
    capacity_kg: 10000, location: "Harare", province: "Harare",
    price_per_km: 1.2, price_per_trip: 0, availability: "available",
    description: "10-ton curtain-side truck, ideal for grain and packed produce. Driver included.",
    rating: 4.8, phone: "+263772113344", whatsapp: "+263772113344",
    image_url: null, created_at: new Date().toISOString(),
  },
  {
    id: "mock-veh-2", owner_id: "mock-own-2", owner_name: "Rudo Chikore",
    type: "refrigerated", name: "Isuzu Reefer 5T",
    capacity_kg: 5000, location: "Bulawayo", province: "Bulawayo",
    price_per_km: 1.8, price_per_trip: 0, availability: "available",
    description: "Temperature controlled 0–6°C. Perfect for dairy, meat and horticulture.",
    rating: 4.9, phone: "+263773998811", whatsapp: "+263773998811",
    image_url: null, created_at: new Date().toISOString(),
  },
  {
    id: "mock-veh-3", owner_id: "mock-own-3", owner_name: "Farai Sibanda",
    type: "pickup", name: "Toyota Hilux 1T",
    capacity_kg: 1000, location: "Mutare", province: "Manicaland",
    price_per_km: 0.6, price_per_trip: 0, availability: "busy",
    description: "Reliable double-cab pickup for short hauls within the Eastern Highlands.",
    rating: 4.5, phone: "+263772556677", whatsapp: "+263772556677",
    image_url: null, created_at: new Date().toISOString(),
  },
  {
    id: "mock-veh-4", owner_id: "mock-own-4", owner_name: "Blessing Ncube",
    type: "tractor", name: "Massey Ferguson 385",
    capacity_kg: 2000, location: "Gweru", province: "Midlands",
    price_per_km: 0, price_per_trip: 90, availability: "available",
    description: "Tractor with trailer for in-farm haulage and short rural transfers. Per-trip pricing.",
    rating: 4.6, phone: "+263775223311", whatsapp: "+263775223311",
    image_url: null, created_at: new Date().toISOString(),
  },
  {
    id: "mock-veh-5", owner_id: "mock-own-5", owner_name: "Kuda Mhaka",
    type: "lorry", name: "Hino 30-ton Lorry",
    capacity_kg: 30000, location: "Chinhoyi", province: "Mashonaland West",
    price_per_km: 2.4, price_per_trip: 0, availability: "available",
    description: "Long haul 30-ton lorry. Routes to Beitbridge, Chirundu and Beira.",
    rating: 4.7, phone: "+263778445566", whatsapp: "+263778445566",
    image_url: null, created_at: new Date().toISOString(),
  },
  {
    id: "mock-veh-6", owner_id: "mock-own-6", owner_name: "Tariro Dube",
    type: "van", name: "Nissan NV200 Van",
    capacity_kg: 800, location: "Masvingo", province: "Masvingo",
    price_per_km: 0.5, price_per_trip: 0, availability: "offline",
    description: "Light delivery van. On break — back next week.",
    rating: 4.3, phone: "+263772889900", whatsapp: "+263772889900",
    image_url: null, created_at: new Date().toISOString(),
  },
];

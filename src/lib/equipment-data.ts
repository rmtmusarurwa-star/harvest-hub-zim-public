export type EquipmentCategory =
  | "tractors"
  | "combine_harvesters"
  | "irrigation_systems"
  | "generators"
  | "balers"
  | "planters"
  | "sprayers"
  | "tillage_equipment"
  | "other";

export type EquipmentAvailability = "available" | "unavailable" | "maintenance";

export type EquipmentBookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "rejected";

export const EQUIPMENT_CATEGORIES: {
  value: EquipmentCategory | "all";
  label: string;
  icon: string;
}[] = [
  { value: "all", label: "All", icon: "🛠️" },
  { value: "tractors", label: "Tractors", icon: "🚜" },
  { value: "combine_harvesters", label: "Combine Harvesters", icon: "🌾" },
  { value: "irrigation_systems", label: "Irrigation", icon: "💧" },
  { value: "generators", label: "Generators", icon: "⚡" },
  { value: "balers", label: "Balers", icon: "🟡" },
  { value: "planters", label: "Planters", icon: "🌱" },
  { value: "sprayers", label: "Sprayers", icon: "🧴" },
  { value: "tillage_equipment", label: "Tillage", icon: "⛏️" },
  { value: "other", label: "Other", icon: "🔧" },
];

export const categoryIcon = (c: EquipmentCategory) =>
  EQUIPMENT_CATEGORIES.find((x) => x.value === c)?.icon ?? "🛠️";
export const categoryLabel = (c: EquipmentCategory) =>
  EQUIPMENT_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const availabilityTone: Record<EquipmentAvailability, string> = {
  available: "bg-emerald-500/20 text-emerald-300",
  unavailable: "bg-rose-500/20 text-rose-300",
  maintenance: "bg-amber-500/20 text-amber-300",
};

export const availabilityLabel: Record<EquipmentAvailability, string> = {
  available: "Available",
  unavailable: "Booked",
  maintenance: "Maintenance",
};

export const bookingTone: Record<EquipmentBookingStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  confirmed: "bg-sky-500/20 text-sky-300",
  active: "bg-violet-500/20 text-violet-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-rose-500/20 text-rose-300",
  rejected: "bg-rose-500/20 text-rose-300",
};

export const bookingLabel: Record<EquipmentBookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  active: "In use",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export type EquipmentRow = {
  id: string;
  owner_id: string;
  owner_name?: string;
  name: string;
  category: EquipmentCategory;
  location: string;
  province: string;
  description: string;
  specs: string;
  price_per_day: number;
  price_per_week: number;
  price_per_month: number;
  deposit: number;
  availability: EquipmentAvailability;
  rating: number;
  image_url: string | null;
  phone: string;
  whatsapp: string;
  delivery_available: boolean;
  created_at: string;
};

export type EquipmentBookingRow = {
  id: string;
  equipment_id: string | null;
  equipment_name: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  total_cost: number;
  deposit: number;
  delivery: boolean;
  delivery_address: string;
  contact_phone: string;
  notes: string;
  status: EquipmentBookingStatus;
  created_at: string;
};

export const daysBetween = (a: string, b: string) => {
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};

export const estimateCost = (
  eq: Pick<EquipmentRow, "price_per_day" | "price_per_week" | "price_per_month">,
  days: number,
) => {
  if (days <= 0) return 0;
  if (days >= 28 && eq.price_per_month > 0) {
    const months = Math.floor(days / 28);
    const rem = days - months * 28;
    return months * eq.price_per_month + rem * eq.price_per_day;
  }
  if (days >= 7 && eq.price_per_week > 0) {
    const weeks = Math.floor(days / 7);
    const rem = days - weeks * 7;
    return weeks * eq.price_per_week + rem * eq.price_per_day;
  }
  return days * eq.price_per_day;
};

export const MOCK_EQUIPMENT: EquipmentRow[] = [
  {
    id: "mock-eq-1",
    owner_id: "mock-eq-own-1",
    owner_name: "Tatenda Moyo",
    name: "John Deere 5075E Tractor",
    category: "tractors",
    location: "Harare South",
    province: "Harare",
    description:
      "75HP utility tractor with PTO and 3-point hitch. Perfect for ploughing, harrowing and trailer hauling.",
    specs: "75 HP · 4WD · 3-point hitch · PTO 540 rpm · 12F/12R transmission",
    price_per_day: 120,
    price_per_week: 700,
    price_per_month: 2400,
    deposit: 300,
    availability: "available",
    rating: 4.8,
    image_url: null,
    phone: "+263772113344",
    whatsapp: "+263772113344",
    delivery_available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-eq-2",
    owner_id: "mock-eq-own-2",
    owner_name: "Rumbi Chikore",
    name: "Borehole Pump & Generator Set",
    category: "generators",
    location: "Masvingo",
    province: "Masvingo",
    description:
      "20kVA diesel generator paired with a 5HP borehole pump. Reliable backup for irrigation cycles.",
    specs: "20 kVA diesel · 5 HP submersible pump · 50m head · fuel-efficient",
    price_per_day: 45,
    price_per_week: 250,
    price_per_month: 900,
    deposit: 100,
    availability: "available",
    rating: 4.6,
    image_url: null,
    phone: "+263773998811",
    whatsapp: "+263773998811",
    delivery_available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-eq-3",
    owner_id: "mock-eq-own-3",
    owner_name: "Farai Sibanda",
    name: "Case IH 4088 Combine Harvester",
    category: "combine_harvesters",
    location: "Chinhoyi",
    province: "Mashonaland West",
    description:
      "Self-propelled combine harvester for maize, wheat and soya. Operator and fuel negotiable.",
    specs: "280 HP · 6.7m header · 8,800L grain tank · rotary threshing",
    price_per_day: 480,
    price_per_week: 2900,
    price_per_month: 0,
    deposit: 1200,
    availability: "available",
    rating: 4.9,
    image_url: null,
    phone: "+263772556677",
    whatsapp: "+263772556677",
    delivery_available: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-eq-4",
    owner_id: "mock-eq-own-4",
    owner_name: "Blessing Ncube",
    name: "Centre Pivot Irrigation 30ha",
    category: "irrigation_systems",
    location: "Gweru",
    province: "Midlands",
    description:
      "Mobile centre pivot system covering up to 30 hectares. Setup and tear-down included.",
    specs: "30 ha coverage · 8-tower span · pressure-regulated sprinklers",
    price_per_day: 180,
    price_per_week: 1100,
    price_per_month: 3800,
    deposit: 500,
    availability: "maintenance",
    rating: 4.7,
    image_url: null,
    phone: "+263775223311",
    whatsapp: "+263775223311",
    delivery_available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-eq-5",
    owner_id: "mock-eq-own-5",
    owner_name: "Kuda Mhaka",
    name: "Round Baler Hesston 5556",
    category: "balers",
    location: "Marondera",
    province: "Mashonaland East",
    description:
      "Round baler for hay and silage. Produces 1.2m bales. Ideal for stockfeed operations.",
    specs: "1.2m bale · twine wrap · PTO drive · 540 rpm",
    price_per_day: 90,
    price_per_week: 540,
    price_per_month: 0,
    deposit: 200,
    availability: "available",
    rating: 4.5,
    image_url: null,
    phone: "+263778445566",
    whatsapp: "+263778445566",
    delivery_available: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-eq-6",
    owner_id: "mock-eq-own-6",
    owner_name: "Tariro Dube",
    name: "Boom Sprayer 600L",
    category: "sprayers",
    location: "Bulawayo",
    province: "Bulawayo",
    description:
      "Tractor-mounted 600L boom sprayer with 12m boom. Perfect for cotton, soya and maize.",
    specs: "600L tank · 12m boom · diaphragm pump · adjustable nozzles",
    price_per_day: 55,
    price_per_week: 300,
    price_per_month: 0,
    deposit: 120,
    availability: "available",
    rating: 4.4,
    image_url: null,
    phone: "+263772889900",
    whatsapp: "+263772889900",
    delivery_available: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-eq-7",
    owner_id: "mock-eq-own-7",
    owner_name: "Munashe Kativhu",
    name: "4-Row Maize Planter",
    category: "planters",
    location: "Mutare",
    province: "Manicaland",
    description:
      "Precision 4-row planter with fertilizer applicator. Ideal for 1-5 hectare farms.",
    specs: "4 rows · 75cm spacing · fertilizer hopper · seed monitor",
    price_per_day: 75,
    price_per_week: 420,
    price_per_month: 0,
    deposit: 150,
    availability: "available",
    rating: 4.6,
    image_url: null,
    phone: "+263772334455",
    whatsapp: "+263772334455",
    delivery_available: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-eq-8",
    owner_id: "mock-eq-own-8",
    owner_name: "Charity Mubaiwa",
    name: "Disc Harrow 24-plate",
    category: "tillage_equipment",
    location: "Kwekwe",
    province: "Midlands",
    description: "Heavy-duty 24-plate disc harrow for primary tillage. Tractor not included.",
    specs: "24 discs · 2.5m working width · greaseable bearings",
    price_per_day: 60,
    price_per_week: 350,
    price_per_month: 0,
    deposit: 150,
    availability: "available",
    rating: 4.5,
    image_url: null,
    phone: "+263776112233",
    whatsapp: "+263776112233",
    delivery_available: false,
    created_at: new Date().toISOString(),
  },
];

export const whatsappLink = (number: string, msg: string) =>
  `https://wa.me/${number.replace(/[^\d]/g, "")}?text=${encodeURIComponent(msg)}`;

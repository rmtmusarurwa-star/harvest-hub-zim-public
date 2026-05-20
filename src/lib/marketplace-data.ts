import type { Database } from "@/integrations/supabase/types";

export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingCategory = Database["public"]["Enums"]["listing_category"];

export const CATEGORIES: { value: ListingCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "produce", label: "Produce" },
  { value: "livestock", label: "Livestock" },
  { value: "poultry", label: "Poultry" },
  { value: "dairy", label: "Dairy" },
  { value: "grain", label: "Grain" },
  { value: "other", label: "Other" },
];

export const PROVINCES = [
  "Harare",
  "Bulawayo",
  "Manicaland",
  "Mashonaland Central",
  "Mashonaland East",
  "Mashonaland West",
  "Masvingo",
  "Matabeleland North",
  "Matabeleland South",
  "Midlands",
];

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  produce: "Produce",
  livestock: "Livestock",
  poultry: "Poultry",
  dairy: "Dairy",
  grain: "Grain",
  other: "Other",
};

// Curated mock listings to ensure rich UI even before farmers post.
// Shape matches ListingRow (id prefixed `mock-`).
export const MOCK_LISTINGS: ListingRow[] = [
  {
    id: "mock-1",
    farmer_id: "mock",
    title: "100kg Dovi Groundnuts",
    category: "produce",
    description:
      "Sun-dried red dovi groundnuts, shelled and cleaned. Ideal for peanut butter or roasting. Sourced from Masvingo highlands.",
    price: 1.85,
    quantity: 100,
    unit: "kg",
    location: "Masvingo town",
    province: "Masvingo",
    image_url: null,
    delivery_available: true,
    rating: 4.8,
    view_count: 184,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-2",
    farmer_id: "mock",
    title: "20 Boerboer Pigs — Live Weight",
    category: "livestock",
    description:
      "Healthy Boerboer cross pigs, 60–80kg live weight. Vet-certified, ear-tagged. Available for collection.",
    price: 3.2,
    quantity: 20,
    unit: "kg live",
    location: "Harare South",
    province: "Harare",
    image_url: null,
    delivery_available: false,
    rating: 4.9,
    view_count: 312,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-3",
    farmer_id: "mock",
    title: "500 Broilers Ready",
    category: "poultry",
    description:
      "Cobb 500 broilers, 6 weeks, average 2.1kg. Raised on Profeeds starter and finisher. Pickup Chinhoyi.",
    price: 6.4,
    quantity: 500,
    unit: "bird",
    location: "Chinhoyi",
    province: "Mashonaland West",
    image_url: null,
    delivery_available: true,
    rating: 4.7,
    view_count: 521,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-4",
    farmer_id: "mock",
    title: "12 Tons Grade A White Maize",
    category: "grain",
    description:
      "Freshly threshed white maize, 13.5% moisture. GMB-grade. Bagged in 50kg polypropylene.",
    price: 385,
    quantity: 12,
    unit: "ton",
    location: "Karoi",
    province: "Mashonaland West",
    image_url: null,
    delivery_available: true,
    rating: 4.85,
    view_count: 246,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-5",
    farmer_id: "mock",
    title: "1,200L Fresh Raw Milk Daily",
    category: "dairy",
    description:
      "Friesland & Jersey cross herd. Twice-daily collection, chilled to 4°C. Contract supply available.",
    price: 0.7,
    quantity: 1200,
    unit: "litre",
    location: "Nyamandlovu",
    province: "Matabeleland North",
    image_url: null,
    delivery_available: true,
    rating: 4.6,
    view_count: 138,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-6",
    farmer_id: "mock",
    title: "85 Crates Roma Tomatoes",
    category: "produce",
    description:
      "Firm Roma tomatoes, 18kg per crate. Harvested this morning. Best for retail and processing.",
    price: 12.2,
    quantity: 85,
    unit: "crate",
    location: "Mutare",
    province: "Manicaland",
    image_url: null,
    delivery_available: false,
    rating: 4.5,
    view_count: 92,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-7",
    farmer_id: "mock",
    title: "42 Bags Onions (50kg)",
    category: "produce",
    description: "Texas Grano onions, well-cured. Long shelf life.",
    price: 27,
    quantity: 42,
    unit: "bag",
    location: "Bulawayo wholesale",
    province: "Bulawayo",
    image_url: null,
    delivery_available: true,
    rating: 4.7,
    view_count: 175,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-8",
    farmer_id: "mock",
    title: "8 Brahman Heifers",
    category: "livestock",
    description: "In-calf Brahman heifers, 18–24 months. Papers and vet records on request.",
    price: 880,
    quantity: 8,
    unit: "head",
    location: "Gwanda",
    province: "Matabeleland South",
    image_url: null,
    delivery_available: false,
    rating: 4.95,
    view_count: 401,
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function freshnessLabel(createdAt: string) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 60) return { text: `${mins}m ago`, tone: "fresh" as const };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { text: `${hrs}h ago`, tone: "fresh" as const };
  const days = Math.floor(hrs / 24);
  if (days < 3) return { text: `${days}d ago`, tone: "warm" as const };
  return { text: `${days}d ago`, tone: "stale" as const };
}

// Deterministic pseudo-random buyer count, stable per id
export function liveBuyers(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 3 + (h % 28);
}

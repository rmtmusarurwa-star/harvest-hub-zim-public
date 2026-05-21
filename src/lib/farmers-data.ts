import type { Database } from "@/integrations/supabase/types";

export type FarmerDetailsRow = Database["public"]["Tables"]["farmer_details"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["farmer_reviews"]["Row"];

export type FarmerCardData = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  province: string;
  speciality: string;
  bio: string;
  trust_score: number;
  follower_count: number;
  rating: number;
  active_listings: number;
};

export const SPECIALITIES = [
  "Maize & Grain",
  "Horticulture",
  "Livestock",
  "Poultry",
  "Dairy",
  "Tobacco",
  "Groundnuts",
  "Soya & Pulses",
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

export function trustTone(score: number): {
  label: string;
  badge: string;
  ring: string;
  text: string;
} {
  if (score >= 80)
    return {
      label: "Trusted",
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      ring: "ring-emerald-400/40",
      text: "text-emerald-300",
    };
  if (score >= 50)
    return {
      label: "Building",
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      ring: "ring-amber-400/40",
      text: "text-amber-300",
    };
  return {
    label: "New",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    ring: "ring-rose-400/40",
    text: "text-rose-300",
  };
}

export function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "F"
  );
}

// Curated mock farmers so the directory feels alive before sign-ups.
export const MOCK_FARMERS: FarmerCardData[] = [
  {
    id: "mock-farmer-1",
    full_name: "Tendai Mukamuri",
    avatar_url: null,
    cover_url: null,
    province: "Mashonaland West",
    speciality: "Maize & Grain",
    bio: "Third-generation maize farmer running 80 hectares in Chinhoyi. Specialising in white maize and soya rotation.",
    trust_score: 92,
    follower_count: 184,
    rating: 4.9,
    active_listings: 6,
  },
  {
    id: "mock-farmer-2",
    full_name: "Rutendo Chigumira",
    avatar_url: null,
    cover_url: null,
    province: "Manicaland",
    speciality: "Horticulture",
    bio: "Mutare-based grower of tomatoes, onions and leafy greens under drip irrigation. Supplying Harare wholesalers weekly.",
    trust_score: 86,
    follower_count: 142,
    rating: 4.8,
    active_listings: 4,
  },
  {
    id: "mock-farmer-3",
    full_name: "Brighton Moyo",
    avatar_url: null,
    cover_url: null,
    province: "Matabeleland South",
    speciality: "Livestock",
    bio: "Boerboer pig and Brahman cattle breeder near Gwanda. Vet-certified herd with full traceability.",
    trust_score: 78,
    follower_count: 96,
    rating: 4.6,
    active_listings: 3,
  },
  {
    id: "mock-farmer-4",
    full_name: "Chipo Nyathi",
    avatar_url: null,
    cover_url: null,
    province: "Mashonaland East",
    speciality: "Poultry",
    bio: "Running 12,000-bird broiler cycles in Marondera. Ready stock every three weeks.",
    trust_score: 81,
    follower_count: 118,
    rating: 4.7,
    active_listings: 5,
  },
  {
    id: "mock-farmer-5",
    full_name: "Farai Sibanda",
    avatar_url: null,
    cover_url: null,
    province: "Masvingo",
    speciality: "Groundnuts",
    bio: "Dovi groundnut specialist working with 40 smallholders in Masvingo. Bulk shelled and unshelled supply.",
    trust_score: 64,
    follower_count: 47,
    rating: 4.4,
    active_listings: 2,
  },
  {
    id: "mock-farmer-6",
    full_name: "Anesu Madziva",
    avatar_url: null,
    cover_url: null,
    province: "Midlands",
    speciality: "Dairy",
    bio: "Holstein-Friesian dairy operation in Gweru. 1,800 litres / day, supplying local processors.",
    trust_score: 73,
    follower_count: 88,
    rating: 4.5,
    active_listings: 3,
  },
  {
    id: "mock-farmer-7",
    full_name: "Kuda Mhlanga",
    avatar_url: null,
    cover_url: null,
    province: "Mashonaland Central",
    speciality: "Tobacco",
    bio: "Karoi tobacco grower with contract sales experience. Also rotates with maize.",
    trust_score: 42,
    follower_count: 12,
    rating: 4.0,
    active_listings: 1,
  },
  {
    id: "mock-farmer-8",
    full_name: "Tatenda Banda",
    avatar_url: null,
    cover_url: null,
    province: "Harare",
    speciality: "Soya & Pulses",
    bio: "Peri-urban soya and sugar bean producer in Harare South. Sells direct to processors.",
    trust_score: 88,
    follower_count: 161,
    rating: 4.8,
    active_listings: 4,
  },
];

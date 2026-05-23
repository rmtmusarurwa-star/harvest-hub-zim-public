export type ShopCategory =
  | "agro_vets"
  | "feed_suppliers"
  | "fertilizer_chemicals"
  | "irrigation_equipment"
  | "farming_tools"
  | "vaccines_medicine"
  | "butcheries";

export const SHOP_CATEGORIES: { value: ShopCategory | "all"; label: string; icon: string }[] = [
  { value: "all", label: "All Shops", icon: "🏪" },
  { value: "agro_vets", label: "Agro-Vets", icon: "🐄" },
  { value: "feed_suppliers", label: "Feed Suppliers", icon: "🌾" },
  { value: "fertilizer_chemicals", label: "Fertilizer & Chemicals", icon: "🧪" },
  { value: "irrigation_equipment", label: "Irrigation Equipment", icon: "💧" },
  { value: "farming_tools", label: "Farming Tools", icon: "🛠️" },
  { value: "vaccines_medicine", label: "Vaccines & Medicine", icon: "💉" },
  { value: "butcheries", label: "Butcheries", icon: "🥩" },
];

export const categoryLabel = (c: ShopCategory) =>
  SHOP_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const categoryIcon = (c: ShopCategory) =>
  SHOP_CATEGORIES.find((x) => x.value === c)?.icon ?? "🏪";

export type ShopRow = {
  id: string;
  owner_id: string;
  name: string;
  category: ShopCategory;
  location: string;
  province: string;
  description: string;
  verified: boolean;
  rating: number;
  logo_url: string | null;
  banner_url: string | null;
  whatsapp: string;
  phone: string;
  email: string;
  created_at: string;
  distance_km?: number;
};

export type ShopProductRow = {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  unit: string;
  stock_quantity: number;
  description: string;
  image_url: string | null;
  created_at: string;
};

export const MOCK_SHOPS: ShopRow[] = [
  {
    id: "mock-shop-1",
    owner_id: "mock-owner-1",
    name: "AgroVet Harare",
    category: "vaccines_medicine",
    location: "Borrowdale, Harare",
    province: "Harare",
    description:
      "Trusted veterinary supplies serving Zimbabwean farmers since 2008. Vaccines, dewormers, antibiotics and animal health consultations.",
    verified: true,
    rating: 4.8,
    logo_url: null,
    banner_url: null,
    whatsapp: "+263772111222",
    phone: "+263242701234",
    email: "sales@agrovetharare.co.zw",
    created_at: new Date().toISOString(),
    distance_km: 3.2,
  },
  {
    id: "mock-shop-2",
    owner_id: "mock-owner-2",
    name: "Green Valley Seeds",
    category: "fertilizer_chemicals",
    location: "Marondera",
    province: "Mashonaland East",
    description:
      "Premium hybrid maize, soya and horticultural seeds. Compound D, AN and foliar fertilizers in stock.",
    verified: true,
    rating: 4.7,
    logo_url: null,
    banner_url: null,
    whatsapp: "+263778334455",
    phone: "+263279323344",
    email: "info@greenvalley.co.zw",
    created_at: new Date().toISOString(),
    distance_km: 71.5,
  },
  {
    id: "mock-shop-3",
    owner_id: "mock-owner-3",
    name: "ZimIrrigation Supplies",
    category: "irrigation_equipment",
    location: "Bulawayo CBD",
    province: "Bulawayo",
    description:
      "Drip lines, sprinklers, pumps and solar irrigation kits. Installation crews available across Matabeleland.",
    verified: true,
    rating: 4.6,
    logo_url: null,
    banner_url: null,
    whatsapp: "+263773998877",
    phone: "+263292887766",
    email: "orders@zimirrigation.co.zw",
    created_at: new Date().toISOString(),
    distance_km: 438.1,
  },
  {
    id: "mock-shop-4",
    owner_id: "mock-owner-4",
    name: "Mash Feeds Chinhoyi",
    category: "feed_suppliers",
    location: "Chinhoyi",
    province: "Mashonaland West",
    description:
      "Broiler starter, layers mash, pig grower and dairy meal. Bulk discounts for commercial farms.",
    verified: false,
    rating: 4.4,
    logo_url: null,
    banner_url: null,
    whatsapp: "+263775112233",
    phone: "+263267222111",
    email: "mashfeeds@zol.co.zw",
    created_at: new Date().toISOString(),
    distance_km: 118.4,
  },
  {
    id: "mock-shop-5",
    owner_id: "mock-owner-5",
    name: "Mutare Farm Tools",
    category: "farming_tools",
    location: "Mutare",
    province: "Manicaland",
    description:
      "Hoes, ploughs, knapsack sprayers, wheelbarrows and small machinery spares. Eastern Highlands' biggest tool yard.",
    verified: true,
    rating: 4.5,
    logo_url: null,
    banner_url: null,
    whatsapp: "+263772556677",
    phone: "+263202060440",
    email: "tools@mutarefarm.co.zw",
    created_at: new Date().toISOString(),
    distance_km: 263.7,
  },
  {
    id: "mock-shop-6",
    owner_id: "mock-owner-6",
    name: "Kuda Butchery",
    category: "butcheries",
    location: "Glen View, Harare",
    province: "Harare",
    description:
      "Fresh beef, pork and goat cuts daily. Wholesale to lodges, restaurants and tuckshops.",
    verified: false,
    rating: 4.3,
    logo_url: null,
    banner_url: null,
    whatsapp: "+263776334411",
    phone: "+263242778899",
    email: "kuda.butchery@gmail.com",
    created_at: new Date().toISOString(),
    distance_km: 9.8,
  },
];

export const MOCK_SHOP_PRODUCTS: Record<string, ShopProductRow[]> = {
  "mock-shop-1": [
    {
      id: "p-1-1", shop_id: "mock-shop-1", name: "Newcastle Disease Vaccine (500 doses)",
      price: 18.5, unit: "vial", stock_quantity: 42,
      description: "Live lyophilized La Sota strain. Cold chain delivery in Harare.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-1-2", shop_id: "mock-shop-1", name: "Ivermectin Pour-On 1L",
      price: 24, unit: "bottle", stock_quantity: 60,
      description: "Broad spectrum dewormer for cattle and pigs.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-1-3", shop_id: "mock-shop-1", name: "Oxytetracycline LA 100ml",
      price: 9, unit: "vial", stock_quantity: 120,
      description: "Long acting antibiotic for livestock infections.",
      image_url: null, created_at: new Date().toISOString(),
    },
  ],
  "mock-shop-2": [
    {
      id: "p-2-1", shop_id: "mock-shop-2", name: "SC 649 Hybrid Maize Seed 10kg",
      price: 28, unit: "bag", stock_quantity: 200,
      description: "Medium maturity, high yielding white maize for all regions.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-2-2", shop_id: "mock-shop-2", name: "Compound D Fertilizer 50kg",
      price: 42, unit: "bag", stock_quantity: 380,
      description: "Basal fertilizer for maize, soya and tobacco.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-2-3", shop_id: "mock-shop-2", name: "Ammonium Nitrate 50kg",
      price: 46, unit: "bag", stock_quantity: 240,
      description: "Top dressing for cereal crops.",
      image_url: null, created_at: new Date().toISOString(),
    },
  ],
  "mock-shop-3": [
    {
      id: "p-3-1", shop_id: "mock-shop-3", name: "Drip Line 16mm — 1000m roll",
      price: 145, unit: "roll", stock_quantity: 32,
      description: "Pressure compensating, 30cm emitter spacing.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-3-2", shop_id: "mock-shop-3", name: "Solar Pump Kit 1.5HP",
      price: 980, unit: "kit", stock_quantity: 6,
      description: "Complete kit with panels, controller and submersible pump.",
      image_url: null, created_at: new Date().toISOString(),
    },
  ],
  "mock-shop-4": [
    {
      id: "p-4-1", shop_id: "mock-shop-4", name: "Broiler Starter Mash 50kg",
      price: 36, unit: "bag", stock_quantity: 150,
      description: "0-3 weeks. 23% protein.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-4-2", shop_id: "mock-shop-4", name: "Layers Mash 50kg",
      price: 33, unit: "bag", stock_quantity: 180,
      description: "Balanced ration for peak egg production.",
      image_url: null, created_at: new Date().toISOString(),
    },
  ],
  "mock-shop-5": [
    {
      id: "p-5-1", shop_id: "mock-shop-5", name: "Heavy Duty Hoe",
      price: 8, unit: "piece", stock_quantity: 240,
      description: "Forged carbon steel, hardwood handle.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-5-2", shop_id: "mock-shop-5", name: "Knapsack Sprayer 16L",
      price: 32, unit: "piece", stock_quantity: 48,
      description: "Brass nozzle, comfortable shoulder straps.",
      image_url: null, created_at: new Date().toISOString(),
    },
  ],
  "mock-shop-6": [
    {
      id: "p-6-1", shop_id: "mock-shop-6", name: "Beef T-bone",
      price: 6.5, unit: "kg", stock_quantity: 80,
      description: "Fresh, locally sourced. Cut to order.",
      image_url: null, created_at: new Date().toISOString(),
    },
    {
      id: "p-6-2", shop_id: "mock-shop-6", name: "Pork Belly",
      price: 5.8, unit: "kg", stock_quantity: 60,
      description: "Bone-in, perfect for braais.",
      image_url: null, created_at: new Date().toISOString(),
    },
  ],
};

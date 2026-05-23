import { useMemo, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Leaf,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { MOCK_SHOPS, categoryLabel as shopCategoryLabel, type ShopRow } from "@/lib/shops-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/disease-id")({
  component: DiseaseIdPage,
});

/* ============================================================
   Data
============================================================ */

type Mode = "crop" | "livestock";

type Disease = {
  id: string;
  name: string;
  type: Mode;
  hosts: string[]; // crops or animals
  symptoms: string[];
  treatment: string;
  prevention: string;
  regions: string[];
  severity: "mild" | "moderate" | "severe";
  supplies: string[]; // matched against shops
};

const CROPS = ["Maize", "Tobacco", "Soya beans", "Tomatoes", "Cotton", "Wheat", "Groundnuts"];
const ANIMALS = ["Cattle", "Goats", "Pigs", "Chickens", "Sheep"];

const DISEASES: Disease[] = [
  // Crops
  {
    id: "fall-armyworm",
    name: "Fall Armyworm",
    type: "crop",
    hosts: ["Maize", "Sorghum"],
    symptoms: [
      "Pinhole damage on young leaves",
      "Window-pane feeding on leaves",
      "Sawdust-like droppings (frass) in whorl",
      "Caterpillars in maize whorl",
      "Ragged or skeletonised leaves",
    ],
    treatment:
      "Apply Emamectin Benzoate or Chlorantraniliprole into the whorl in the late afternoon. Use 200ml per ha mixed with 200L water. Treat again after 7 days if larvae persist.",
    prevention:
      "Early planting, scout twice a week, intercrop with legumes, encourage natural enemies, set pheromone traps, and rotate insecticide modes of action.",
    regions: ["Mashonaland East", "Manicaland", "Midlands", "Mashonaland West"],
    severity: "severe",
    supplies: ["Emamectin Benzoate", "Chlorantraniliprole", "Pheromone traps", "Knapsack sprayer"],
  },
  {
    id: "maize-streak",
    name: "Maize Streak Virus (MSV)",
    type: "crop",
    hosts: ["Maize"],
    symptoms: [
      "Pale yellow streaks along leaf veins",
      "Stunted plants",
      "Narrow, chlorotic leaves",
      "Poor cob formation",
    ],
    treatment:
      "No chemical cure. Remove and burn infected plants. Control leafhopper vectors with systemic insecticides such as Imidacloprid.",
    prevention:
      "Plant MSV-tolerant varieties (e.g. SC513, ZAP55), plant early before vector build-up, and remove volunteer maize and grass hosts around fields.",
    regions: ["Masvingo", "Matabeleland South", "Midlands"],
    severity: "moderate",
    supplies: ["MSV-tolerant seed", "Imidacloprid"],
  },
  {
    id: "grey-leaf-spot",
    name: "Grey Leaf Spot",
    type: "crop",
    hosts: ["Maize"],
    symptoms: [
      "Rectangular grey lesions between veins",
      "Lesions on lower leaves first",
      "Premature leaf death",
      "Lodging in severe cases",
    ],
    treatment:
      "Apply a triazole + strobilurin fungicide (e.g. Azoxystrobin + Cyproconazole) at tasselling. Two applications 14 days apart.",
    prevention:
      "Crop rotation, deep ploughing of residues, resistant hybrids, and balanced nitrogen fertilisation.",
    regions: ["Mashonaland Central", "Manicaland", "Mashonaland East"],
    severity: "moderate",
    supplies: ["Azoxystrobin", "Cyproconazole", "Fungicide sprayer"],
  },
  {
    id: "fusarium-wilt",
    name: "Fusarium Wilt",
    type: "crop",
    hosts: ["Tomatoes", "Bananas", "Cotton"],
    symptoms: [
      "Yellowing of lower leaves on one side",
      "Wilting during the day, recovery at night",
      "Brown discolouration of stem vascular tissue",
      "Plant death before fruiting",
    ],
    treatment:
      "Drench soil with Carbendazim or Trichoderma-based biofungicide. Remove and destroy severely affected plants.",
    prevention:
      "Use resistant varieties, rotate with cereals for 3+ seasons, sterilise seedbeds, and improve drainage.",
    regions: ["Mashonaland West", "Manicaland", "Midlands"],
    severity: "severe",
    supplies: ["Carbendazim", "Trichoderma biofungicide", "Resistant tomato seed"],
  },
  {
    id: "damping-off",
    name: "Damping Off",
    type: "crop",
    hosts: ["Tomatoes", "Cabbages", "Tobacco", "Onions"],
    symptoms: [
      "Seedlings collapse at soil line",
      "Water-soaked stems",
      "Poor germination patches in seedbed",
      "White or grey fungal growth at base",
    ],
    treatment:
      "Drench with Captan or Metalaxyl. Improve drainage and reduce watering frequency immediately.",
    prevention:
      "Sterilise nursery soil, use well-drained seedbeds, avoid over-watering, and treat seed with fungicide before planting.",
    regions: ["All provinces"],
    severity: "moderate",
    supplies: ["Captan", "Metalaxyl", "Seedling trays"],
  },
  {
    id: "tobacco-mosaic",
    name: "Tobacco Mosaic Virus",
    type: "crop",
    hosts: ["Tobacco", "Tomatoes"],
    symptoms: [
      "Mottled light and dark green leaves",
      "Leaf distortion and curling",
      "Stunted growth",
      "Reduced yield and leaf quality",
    ],
    treatment:
      "No cure. Rogue infected plants. Disinfect hands and tools with milk or skimmed milk powder solution.",
    prevention:
      "Use certified seed, avoid tobacco use near fields, rotate crops, and control aphid vectors.",
    regions: ["Mashonaland Central", "Mashonaland West", "Manicaland"],
    severity: "moderate",
    supplies: ["Certified tobacco seed", "Aphicide"],
  },
  {
    id: "anthracnose",
    name: "Anthracnose",
    type: "crop",
    hosts: ["Tomatoes", "Beans", "Mangoes"],
    symptoms: [
      "Sunken dark spots on fruit",
      "Black lesions on leaves and stems",
      "Pink spore masses in lesions",
      "Premature fruit drop",
    ],
    treatment:
      "Spray Mancozeb or Copper Oxychloride every 7-10 days during wet weather.",
    prevention: "Plant on raised beds, mulch to prevent splash, prune for airflow, and rotate crops.",
    regions: ["Manicaland", "Mashonaland East"],
    severity: "moderate",
    supplies: ["Mancozeb", "Copper Oxychloride"],
  },
  {
    id: "bacterial-blight",
    name: "Bacterial Blight",
    type: "crop",
    hosts: ["Cotton", "Beans"],
    symptoms: [
      "Angular water-soaked lesions on leaves",
      "Black streaks on stems",
      "Boll rot in cotton",
      "Defoliation",
    ],
    treatment:
      "Spray copper-based bactericide. Remove and burn infected crop residues after harvest.",
    prevention: "Use certified disease-free seed, avoid overhead irrigation, and rotate crops.",
    regions: ["Lowveld", "Mashonaland West"],
    severity: "moderate",
    supplies: ["Copper hydroxide", "Certified seed"],
  },
  {
    id: "rust",
    name: "Wheat Rust",
    type: "crop",
    hosts: ["Wheat", "Barley"],
    symptoms: [
      "Orange-brown pustules on leaves and stems",
      "Pustules release rusty spores when rubbed",
      "Shrivelled grain",
      "Yield loss up to 70%",
    ],
    treatment: "Apply triazole fungicide (Propiconazole) at first sign. Repeat after 14 days.",
    prevention: "Plant rust-resistant varieties, scout weekly, and plant early.",
    regions: ["Mashonaland Central", "Manicaland"],
    severity: "severe",
    supplies: ["Propiconazole", "Resistant wheat seed"],
  },
  {
    id: "groundnut-rosette",
    name: "Groundnut Rosette Disease",
    type: "crop",
    hosts: ["Groundnuts"],
    symptoms: [
      "Stunted bushy plants",
      "Yellowing or green mosaic leaves",
      "Reduced pod set",
      "Aphid colonies on young leaves",
    ],
    treatment: "Control aphid vectors with Dimethoate. Rogue infected plants.",
    prevention: "Plant early, use resistant varieties, and intercrop with cereals.",
    regions: ["Masvingo", "Matabeleland South", "Midlands"],
    severity: "severe",
    supplies: ["Dimethoate", "Resistant groundnut seed"],
  },

  // Livestock
  {
    id: "newcastle",
    name: "Newcastle Disease",
    type: "livestock",
    hosts: ["Chickens"],
    symptoms: [
      "Sudden death in flock",
      "Greenish watery diarrhoea",
      "Twisted neck (torticollis)",
      "Gasping and coughing",
      "Drop in egg production",
      "Swollen eyes and face",
    ],
    treatment:
      "No cure once infected. Cull sick birds humanely. Disinfect houses with formalin or iodine. Provide multivitamins to recovering birds.",
    prevention:
      "Vaccinate at day 1 (HB1/I2), week 3 (Lasota) and every 3 months. Quarantine new birds, restrict visitors, and disinfect footwear.",
    regions: ["All provinces - endemic"],
    severity: "severe",
    supplies: ["I2 Newcastle vaccine", "Lasota vaccine", "Multivitamins", "Disinfectant"],
  },
  {
    id: "fmd",
    name: "Foot and Mouth Disease",
    type: "livestock",
    hosts: ["Cattle", "Goats", "Sheep", "Pigs"],
    symptoms: [
      "Blisters on tongue, gums and lips",
      "Lesions between hooves",
      "Excessive salivation and drooling",
      "Lameness and reluctance to move",
      "High fever",
      "Drop in milk production",
    ],
    treatment:
      "No specific treatment — supportive care only. Notify Veterinary Services immediately. Soft feed and clean water. Antiseptic mouth and foot washes.",
    prevention:
      "Vaccinate annually in endemic zones. Strict movement control, quarantine new stock for 30 days, disinfect vehicles, and report suspicious cases.",
    regions: ["Matabeleland North", "Matabeleland South", "Masvingo - Save Conservancy buffer"],
    severity: "severe",
    supplies: ["FMD vaccine", "Iodine solution", "Disinfectant footbath"],
  },
  {
    id: "asf",
    name: "African Swine Fever",
    type: "livestock",
    hosts: ["Pigs"],
    symptoms: [
      "High fever (40.5-42°C)",
      "Reddening of ears, snout and belly",
      "Bloody diarrhoea or vomiting",
      "Sudden death within 7 days",
      "Abortion in pregnant sows",
    ],
    treatment:
      "No treatment and no vaccine. Notify Veterinary Services immediately — this is a notifiable disease. Infected pigs must be culled and burned.",
    prevention:
      "Strict biosecurity: no swill feeding, restrict visitors, disinfect vehicles, quarantine new pigs 30 days, and control ticks.",
    regions: ["Mashonaland Central", "Manicaland", "Mashonaland East"],
    severity: "severe",
    supplies: ["Disinfectant", "Tick control acaricide", "Biosecurity fencing"],
  },
  {
    id: "blackleg",
    name: "Blackleg",
    type: "livestock",
    hosts: ["Cattle", "Sheep"],
    symptoms: [
      "Sudden lameness",
      "Hot swollen muscle (often hindquarter)",
      "Crackling sound when swelling is pressed",
      "High fever then collapse",
      "Death within 12-36 hours",
    ],
    treatment:
      "High doses of penicillin if caught very early — most animals die before treatment works. Lance and drain swellings under vet guidance.",
    prevention:
      "Vaccinate calves at 6 months with Blanthrax or Blackleg vaccine, repeat annually before rainy season.",
    regions: ["Midlands", "Masvingo", "Matabeleland South"],
    severity: "severe",
    supplies: ["Blanthrax vaccine", "Penicillin injectable"],
  },
  {
    id: "ecf",
    name: "East Coast Fever",
    type: "livestock",
    hosts: ["Cattle"],
    symptoms: [
      "Swollen lymph nodes (parotid, prescapular)",
      "High fever",
      "Difficulty breathing",
      "Discharge from eyes and nose",
      "Loss of appetite and weight",
    ],
    treatment:
      "Buparvaquone (Butalex) injection early in infection. Supportive care with fluids and antibiotics for secondary infections.",
    prevention:
      "Weekly dipping with acaricide to control brown ear tick. Vaccinate with ITM (Infection and Treatment Method).",
    regions: ["Mashonaland Central", "Mashonaland West", "Manicaland"],
    severity: "severe",
    supplies: ["Buparvaquone", "Acaricide for dipping", "ITM vaccine"],
  },
  {
    id: "lsd",
    name: "Lumpy Skin Disease",
    type: "livestock",
    hosts: ["Cattle"],
    symptoms: [
      "Firm raised nodules on skin",
      "Fever and reduced appetite",
      "Nasal discharge and watery eyes",
      "Drop in milk yield",
    ],
    treatment: "Supportive care, antibiotics to prevent secondary infection, anti-inflammatories.",
    prevention: "Annual vaccination, fly and tick control, isolate affected animals.",
    regions: ["All provinces"],
    severity: "moderate",
    supplies: ["LSD vaccine", "Long-acting oxytetracycline", "Fly repellent"],
  },
  {
    id: "anthrax",
    name: "Anthrax",
    type: "livestock",
    hosts: ["Cattle", "Goats", "Sheep"],
    symptoms: [
      "Sudden death with no prior signs",
      "Dark blood from natural openings",
      "Bloating after death",
      "Carcass does not stiffen normally",
    ],
    treatment:
      "Notify Veterinary Services. Do NOT open the carcass — burn or bury deeply with lime. Treat in-contact animals with penicillin.",
    prevention: "Annual Blanthrax vaccination. Avoid grazing on contaminated pastures.",
    regions: ["Matabeleland South", "Masvingo - Gonarezhou belt"],
    severity: "severe",
    supplies: ["Blanthrax vaccine", "Penicillin", "Quicklime"],
  },
  {
    id: "mastitis",
    name: "Mastitis",
    type: "livestock",
    hosts: ["Cattle", "Goats"],
    symptoms: [
      "Swollen hot udder",
      "Clotted, watery or bloody milk",
      "Reduced milk yield",
      "Pain on milking",
    ],
    treatment: "Intramammary antibiotic tubes (e.g. Albadry) after milking, for 3-5 days.",
    prevention: "Pre and post-dip teats, clean milking parlour, dry-cow therapy, cull chronic cases.",
    regions: ["All provinces - dairy zones"],
    severity: "moderate",
    supplies: ["Intramammary antibiotic tubes", "Teat dip iodine", "California Mastitis Test"],
  },
  {
    id: "coccidiosis",
    name: "Coccidiosis",
    type: "livestock",
    hosts: ["Chickens", "Goats"],
    symptoms: [
      "Bloody or mucoid diarrhoea",
      "Ruffled feathers, huddling",
      "Pale comb and wattles",
      "Drop in growth and weight",
    ],
    treatment: "Amprolium in drinking water for 5-7 days, plus electrolytes and vitamins.",
    prevention: "Coccidiostat in starter feed, dry clean litter, avoid overcrowding.",
    regions: ["All provinces"],
    severity: "moderate",
    supplies: ["Amprolium", "Coccidiostat feed", "Electrolytes"],
  },
  {
    id: "brucellosis",
    name: "Brucellosis",
    type: "livestock",
    hosts: ["Cattle", "Goats", "Pigs"],
    symptoms: [
      "Late-term abortion",
      "Retained afterbirth",
      "Reduced fertility",
      "Swollen testicles in bulls",
    ],
    treatment: "No effective treatment. Cull positive animals. Zoonotic — wear gloves when handling.",
    prevention: "Vaccinate heifers with S19, test breeding bulls annually, source replacements carefully.",
    regions: ["Mashonaland West", "Midlands"],
    severity: "severe",
    supplies: ["S19 Brucella vaccine", "Brucella test kit", "Protective gloves"],
  },
];

const VETS: { name: string; province: string; town: string; phone: string; whatsapp: string }[] = [
  { name: "Dr Tendai Mahere", province: "Harare", town: "Borrowdale", phone: "+263242701234", whatsapp: "+263772111222" },
  { name: "Dr Rumbi Chikore", province: "Bulawayo", town: "Hillside", phone: "+263292278899", whatsapp: "+263773998811" },
  { name: "Dr Farai Sibanda", province: "Manicaland", town: "Mutare", phone: "+263202060011", whatsapp: "+263772556677" },
  { name: "Dr Blessing Ncube", province: "Midlands", town: "Gweru", phone: "+263542223344", whatsapp: "+263775223311" },
  { name: "Dr Kuda Mhaka", province: "Mashonaland West", town: "Chinhoyi", phone: "+263672123456", whatsapp: "+263778445566" },
  { name: "Dr Tariro Dube", province: "Masvingo", town: "Masvingo", phone: "+263392265432", whatsapp: "+263772889900" },
  { name: "Dr Munashe Kativhu", province: "Mashonaland East", town: "Marondera", phone: "+263279224400", whatsapp: "+263772334455" },
  { name: "Dr Charity Mubaiwa", province: "Matabeleland South", town: "Gwanda", phone: "+263842322233", whatsapp: "+263776112233" },
];

const whatsappLink = (n: string, msg: string) =>
  `https://wa.me/${n.replace(/[^\d]/g, "")}?text=${encodeURIComponent(msg)}`;

const severityTone: Record<Disease["severity"], string> = {
  mild: "bg-emerald-500/20 text-emerald-300",
  moderate: "bg-amber-500/20 text-amber-300",
  severe: "bg-rose-500/20 text-rose-300",
};

/* ============================================================
   Page
============================================================ */

function DiseaseIdPage() {
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
            Disease Identification
          </span>
        </div>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          Diagnose. Treat. Protect.
        </h1>
        <p className="text-sm text-muted-foreground">
          Symptom checker, photo diagnosis and a Zimbabwe-focused disease library — for crops and livestock.
        </p>
      </motion.div>

      <Tabs defaultValue="checker">
        <TabsList className="bg-white/[0.03]">
          <TabsTrigger value="checker">Symptom checker</TabsTrigger>
          <TabsTrigger value="photo">Photo diagnosis</TabsTrigger>
          <TabsTrigger value="library">Disease library</TabsTrigger>
          <TabsTrigger value="vets">Vet directory</TabsTrigger>
        </TabsList>

        <TabsContent value="checker" className="mt-4">
          <SymptomCheckerTab />
        </TabsContent>
        <TabsContent value="photo" className="mt-4">
          <PhotoDiagnosisTab />
        </TabsContent>
        <TabsContent value="library" className="mt-4">
          <LibraryTab />
        </TabsContent>
        <TabsContent value="vets" className="mt-4">
          <VetDirectoryTab />
        </TabsContent>
      </Tabs>
    </section>
  );
}

/* ============================================================
   Symptom Checker
============================================================ */

type Diagnosis = { disease: Disease; confidence: number };

function SymptomCheckerTab() {
  const [mode, setMode] = useState<Mode>("crop");
  const [host, setHost] = useState<string>("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Diagnosis[] | null>(null);

  const candidates = useMemo(() => {
    return DISEASES.filter((d) => d.type === mode && (!host || d.hosts.includes(host)));
  }, [mode, host]);

  const symptomPool = useMemo(() => {
    const set = new Set<string>();
    for (const d of candidates) d.symptoms.forEach((s) => set.add(s));
    return Array.from(set);
  }, [candidates]);

  const toggle = (s: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const diagnose = () => {
    if (checked.size === 0) return;
    const ranked = candidates
      .map<Diagnosis>((d) => {
        const matches = d.symptoms.filter((s) => checked.has(s)).length;
        const coverage = matches / Math.max(1, d.symptoms.length);
        const specificity = matches / Math.max(1, checked.size);
        const confidence = Math.round((coverage * 0.6 + specificity * 0.4) * 100);
        return { disease: d, confidence };
      })
      .filter((r) => r.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    setResult(ranked);
  };

  const reset = () => {
    setHost("");
    setChecked(new Set());
    setResult(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <div className="flex gap-2">
          {(["crop", "livestock"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setHost("");
                setChecked(new Set());
                setResult(null);
              }}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                mode === m
                  ? "border-secondary/40 bg-secondary/15 text-secondary"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "crop" ? (
                <span className="flex items-center justify-center gap-2">
                  <Leaf className="h-4 w-4" /> Crop disease
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Stethoscope className="h-4 w-4" /> Livestock disease
                </span>
              )}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-secondary/70">
            {mode === "crop" ? "Select crop" : "Select animal"}
          </div>
          <div className="flex flex-wrap gap-2">
            {(mode === "crop" ? CROPS : ANIMALS).map((h) => (
              <button
                key={h}
                onClick={() => {
                  setHost(host === h ? "" : h);
                  setChecked(new Set());
                  setResult(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  host === h
                    ? "border-secondary/40 bg-secondary/15 text-secondary"
                    : "border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-secondary/70">
            Check all symptoms that apply
          </div>
          {symptomPool.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-muted-foreground">
              Select a {mode === "crop" ? "crop" : "animal"} above to see symptoms.
            </div>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
              {symptomPool.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 text-sm hover:bg-white/5"
                >
                  <Checkbox
                    checked={checked.has(s)}
                    onCheckedChange={() => toggle(s)}
                    className="mt-0.5"
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={checked.size === 0} onClick={diagnose}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Get diagnosis
          </Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {!result ? (
          <div className="glass grid place-items-center rounded-2xl border border-white/5 p-12 text-center">
            <Search className="mb-3 h-8 w-8 text-secondary/60" />
            <p className="text-sm text-muted-foreground">
              Your diagnosis will appear here once you've selected some symptoms.
            </p>
          </div>
        ) : result.length === 0 ? (
          <div className="glass rounded-2xl border border-white/5 p-6 text-sm text-muted-foreground">
            No matching diseases. Try selecting more symptoms or a different {mode === "crop" ? "crop" : "animal"}.
          </div>
        ) : (
          <>
            {result.map((r, i) => (
              <DiagnosisCard key={r.disease.id} result={r} primary={i === 0} />
            ))}
            <NearbySuppliers disease={result[0].disease} />
          </>
        )}
      </div>
    </div>
  );
}

function DiagnosisCard({ result, primary }: { result: Diagnosis; primary: boolean }) {
  const { disease, confidence } = result;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass space-y-3 rounded-2xl border p-5 ${
        primary ? "border-secondary/30" : "border-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {primary && (
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary">
              <Sparkles className="h-3 w-3" /> Most likely
            </div>
          )}
          <h3 className="font-display text-lg">{disease.name}</h3>
          <div className="text-xs text-muted-foreground">{disease.hosts.join(", ")}</div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${severityTone[disease.severity]}`}>
          {disease.severity}
        </span>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-mono text-secondary">{confidence}%</span>
        </div>
        <Progress value={confidence} className="h-1.5" />
      </div>
      <div className="space-y-2 text-sm">
        <Section title="Treatment" body={disease.treatment} />
        <Section title="Prevention" body={disease.prevention} />
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" /> {disease.regions.join(" · ")}
        </div>
      </div>
    </motion.div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-secondary/70">{title}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

/* ============================================================
   Nearby Suppliers Widget
============================================================ */

function NearbySuppliers({ disease }: { disease: Disease }) {
  const supplyTerms = disease.supplies.map((s) => s.toLowerCase());
  const relevantCategory = disease.type === "crop" ? "fertilizer_chemicals" : "vaccines_medicine";

  const matches: (ShopRow & { matchedItem: string })[] = MOCK_SHOPS
    .filter((s) => s.category === relevantCategory || s.category === "agro_vets")
    .slice(0, 3)
    .map((s, i) => ({ ...s, matchedItem: disease.supplies[i % disease.supplies.length] }));

  if (matches.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass space-y-3 rounded-2xl border border-white/5 p-5"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary/70">
        <ShieldCheck className="h-3.5 w-3.5" /> Nearby suppliers with what you need
      </div>
      <div className="space-y-2">
        {matches.map((shop) => (
          <Link
            key={shop.id}
            to="/shops/$shopId"
            params={{ shopId: shop.id }}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-secondary/30"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-display text-sm">
                {shop.name}
                {shop.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {shopCategoryLabel(shop.category)} · {shop.location}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                ✓ {shop.matchedItem} in stock
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-secondary" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/* ============================================================
   Photo Diagnosis
============================================================ */

function PhotoDiagnosisTab() {
  const [mode, setMode] = useState<Mode>("crop");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Disease | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const analyse = () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setResult(null);
    const steps = [12, 28, 46, 63, 78, 91, 100];
    let i = 0;
    const tick = setInterval(() => {
      setProgress(steps[i]);
      i++;
      if (i >= steps.length) {
        clearInterval(tick);
        // pick a realistic mock based on mode
        const pool = DISEASES.filter((d) => d.type === mode);
        const picked = pool[Math.floor(Math.random() * pool.length)];
        setTimeout(() => {
          setProcessing(false);
          setResult(picked);
        }, 350);
      }
    }, 380);
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setProgress(0);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="glass space-y-4 rounded-2xl border border-white/5 p-5">
        <div className="flex gap-2">
          {(["crop", "livestock"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                mode === m
                  ? "border-secondary/40 bg-secondary/15 text-secondary"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "crop" ? "Crop photo" : "Livestock photo"}
            </button>
          ))}
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          className="relative grid cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 transition hover:border-secondary/40"
        >
          {preview ? (
            <>
              <img src={preview} alt="Upload preview" className="max-h-72 w-full rounded-xl object-contain" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-1 text-white"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-secondary/15 text-secondary">
                <Camera className="h-5 w-5" />
              </div>
              <p className="text-sm">Tap to upload a clear photo</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Affected leaves, lesions, droppings, eyes, hooves — the closer the better
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <Button
          variant="secondary"
          className="w-full"
          disabled={!file || processing}
          onClick={analyse}
        >
          {processing ? (
            "Analysing…"
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" /> Analyse photo
            </span>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Demo AI — results are illustrative and based on a Zimbabwean disease knowledge base. Always confirm with a vet or extension officer.
        </p>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {processing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass space-y-3 rounded-2xl border border-white/5 p-6"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
                </span>
                Analysing image…
              </div>
              <Progress value={progress} className="h-1.5" />
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>· Detecting subject and framing</li>
                <li>· Extracting visual features</li>
                <li>· Matching against Zimbabwean disease patterns</li>
                <li>· Scoring most likely diagnoses</li>
              </ul>
            </motion.div>
          )}

          {!processing && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <DiagnosisCard result={{ disease: result, confidence: 78 + Math.floor(Math.random() * 18) }} primary />
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Symptoms typically seen:</span>{" "}
                {result.symptoms.slice(0, 3).join("; ")}
              </div>
              <NearbySuppliers disease={result} />
            </motion.div>
          )}

          {!processing && !result && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass grid place-items-center rounded-2xl border border-white/5 p-12 text-center"
            >
              <Camera className="mb-3 h-8 w-8 text-secondary/60" />
              <p className="text-sm text-muted-foreground">
                Upload a photo and the AI will return a likely diagnosis with treatment guidance.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================
   Library
============================================================ */

function LibraryTab() {
  const [mode, setMode] = useState<Mode | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DISEASES.filter((d) => {
      if (mode !== "all" && d.type !== mode) return false;
      if (!q) return true;
      const hay = `${d.name} ${d.hosts.join(" ")} ${d.symptoms.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [mode, search]);

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search diseases, symptoms, crops…"
            className="border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "crop", "livestock"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                mode === m
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {m === "all" ? "All" : m === "crop" ? "Crops" : "Livestock"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02, duration: 0.3 }}
            className="glass space-y-3 rounded-2xl border border-white/5 p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-secondary/70">
                  {d.type === "crop" ? "🌱 Crop" : "🐄 Livestock"} · {d.hosts.join(", ")}
                </div>
                <h3 className="font-display text-base leading-tight">{d.name}</h3>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${severityTone[d.severity]}`}>
                {d.severity}
              </span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-secondary/70">Symptoms</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {d.symptoms.slice(0, 3).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <Section title="Treatment" body={d.treatment} />
            <Section title="Prevention" body={d.prevention} />
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {d.regions.join(" · ")}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Vet Directory
============================================================ */

function VetDirectoryTab() {
  const [province, setProvince] = useState<string>("all");
  const provinces = useMemo(() => ["all", ...Array.from(new Set(VETS.map((v) => v.province)))], []);
  const filtered = VETS.filter((v) => province === "all" || v.province === province);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {provinces.map((p) => (
          <button
            key={p}
            onClick={() => setProvince(p)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              province === p
                ? "bg-secondary text-secondary-foreground"
                : "border border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            {p === "all" ? "All provinces" : p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v, i) => (
          <motion.div
            key={v.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className="glass space-y-3 rounded-2xl border border-white/5 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary/15 text-secondary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display">{v.name}</div>
                <div className="text-xs text-muted-foreground">
                  {v.town}, {v.province}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={whatsappLink(v.whatsapp, `Hi Dr, I need a consultation via Harvest Hub Zimbabwe.`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/30"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
              <a
                href={`tel:${v.phone}`}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

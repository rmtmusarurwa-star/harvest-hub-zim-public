import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  Store,
  Users,
  ShoppingBag,
  Wrench,
  Truck,
  Globe2,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ResultGroup = "listings" | "farmers" | "shops" | "equipment" | "vehicles" | "forum";

type SearchResult = {
  id: string;
  group: ResultGroup;
  title: string;
  subtitle?: string;
  to: string;
  params: Record<string, string>;
};

const GROUP_META: Record<ResultGroup, { label: string; icon: any }> = {
  listings: { label: "Marketplace", icon: Store },
  farmers: { label: "Farmers", icon: Users },
  shops: { label: "Shops", icon: ShoppingBag },
  equipment: { label: "Equipment", icon: Wrench },
  vehicles: { label: "Vehicles", icon: Truck },
  forum: { label: "Community", icon: Globe2 },
};

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-secondary/30 text-secondary rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Cmd/Ctrl+K focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Run search
  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = `%${debounced}%`;

    Promise.all([
      supabase
        .from("listings")
        .select("id, title, category, location")
        .eq("status", "active")
        .or(`title.ilike.${q},category.ilike.${q},location.ilike.${q},province.ilike.${q}`)
        .limit(5),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "farmer")
        .ilike("full_name", q)
        .limit(5),
      supabase
        .from("shops")
        .select("id, name, category, location")
        .or(`name.ilike.${q},category.ilike.${q},location.ilike.${q},province.ilike.${q}`)
        .limit(5),
      supabase
        .from("equipment")
        .select("id, name, category, location")
        .or(`name.ilike.${q},category.ilike.${q},location.ilike.${q}`)
        .limit(5),
      supabase
        .from("vehicles")
        .select("id, name, type, location")
        .or(`name.ilike.${q},type.ilike.${q},location.ilike.${q},province.ilike.${q}`)
        .limit(5),
      supabase
        .from("forum_posts")
        .select("id, title, category")
        .or(`title.ilike.${q},category.ilike.${q}`)
        .limit(5),
    ]).then(([listings, farmers, shops, equipment, vehicles, forum]) => {
      if (cancelled) return;
      const out: SearchResult[] = [];
      (listings.data ?? []).forEach((l: any) =>
        out.push({
          id: l.id,
          group: "listings",
          title: l.title,
          subtitle: `${l.category} · ${l.location}`,
          to: "/marketplace/$listingId",
          params: { listingId: l.id },
        })
      );
      (farmers.data ?? []).forEach((f: any) =>
        out.push({
          id: f.id,
          group: "farmers",
          title: f.full_name || "Farmer",
          subtitle: "Farmer profile",
          to: "/farmers/$farmerId",
          params: { farmerId: f.id },
        })
      );
      (shops.data ?? []).forEach((s: any) =>
        out.push({
          id: s.id,
          group: "shops",
          title: s.name,
          subtitle: `${s.category} · ${s.location}`,
          to: "/shops/$shopId",
          params: { shopId: s.id },
        })
      );
      (equipment.data ?? []).forEach((e: any) =>
        out.push({
          id: e.id,
          group: "equipment",
          title: e.name,
          subtitle: `${e.category} · ${e.location}`,
          to: "/equipment/$equipmentId",
          params: { equipmentId: e.id },
        })
      );
      (vehicles.data ?? []).forEach((v: any) =>
        out.push({
          id: v.id,
          group: "vehicles",
          title: v.name || v.type,
          subtitle: `${v.type} · ${v.location}`,
          to: "/transport/$vehicleId",
          params: { vehicleId: v.id },
        })
      );
      (forum.data ?? []).forEach((p: any) =>
        out.push({
          id: p.id,
          group: "forum",
          title: p.title,
          subtitle: p.category,
          to: "/community/$postId",
          params: { postId: p.id },
        })
      );
      setResults(out);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const grouped = useMemo(() => {
    const g: Record<ResultGroup, SearchResult[]> = {
      listings: [], farmers: [], shops: [], equipment: [], vehicles: [], forum: [],
    };
    results.forEach((r) => g[r.group].push(r));
    return g;
  }, [results]);

  const showPanel = open && debounced.length >= 2;
  const hasResults = results.length > 0;

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm focus-within:border-secondary/40">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search farmers, produce, shops, equipment…"
          className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <kbd className="ml-1 hidden sm:inline-flex h-5 items-center rounded border border-white/10 bg-white/5 px-1.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {showPanel && (
        <div className="glass-strong absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/5 p-2 shadow-2xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : !hasResults ? (
            <div className="p-6 text-center text-sm">
              <p className="text-muted-foreground">No results found for "{debounced}"</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Try searching for: <span className="text-secondary">maize</span>,{" "}
                <span className="text-secondary">Harare</span>,{" "}
                <span className="text-secondary">tractor</span>, or{" "}
                <span className="text-secondary">livestock</span>
              </p>
            </div>
          ) : (
            (Object.keys(grouped) as ResultGroup[])
              .filter((g) => grouped[g].length > 0)
              .map((g) => {
                const Meta = GROUP_META[g];
                return (
                  <div key={g} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-secondary/80">
                      <Meta.icon className="h-3 w-3" />
                      {Meta.label}
                    </div>
                    <ul>
                      {grouped[g].map((r) => (
                        <li key={`${g}-${r.id}`}>
                          <Link
                            to={r.to as any}
                            params={r.params as any}
                            onClick={() => { setOpen(false); setQuery(""); }}
                            className="flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm hover:bg-white/[0.04]"
                          >
                            <span className="truncate text-foreground">
                              {highlight(r.title, debounced)}
                            </span>
                            {r.subtitle && (
                              <span className="truncate text-xs text-muted-foreground">
                                {highlight(r.subtitle, debounced)}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}

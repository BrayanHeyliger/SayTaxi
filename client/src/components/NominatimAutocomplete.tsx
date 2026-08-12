import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: { country_code?: string; country?: string };
}

interface Props {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  icon?: React.ReactNode;
  className?: string;
  /** ISO 3166-1 alpha-2 country code to prioritize results (e.g. "us", "mx", "ve") */
  countryCode?: string;
  /** Bounding box [minLon, minLat, maxLon, maxLat] to bias results */
  viewbox?: [number, number, number, number];
  /** Auto-detect current location on mount and seed the field with GPS */
  autoLocate?: boolean;
}

export default function NominatimAutocomplete({
  placeholder, value, onChange, onSelect, icon, className = "",
  countryCode, viewbox, autoLocate = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoLocate || value.trim()) return;
    if (!navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      if (cancelled) return;
      setLoading(true);
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "es,en;q=0.9" } });
        const data = await res.json();
        const parts = data.display_name?.split(",") || [];
        const short = parts.slice(0, 2).join(",").trim() || "Mi ubicación actual";
        onChange(short);
        onSelect(short, lat, lng);
      } catch {
        const short = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        onChange(short);
        onSelect(short, pos.coords.latitude, pos.coords.longitude);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [autoLocate, onChange, onSelect, value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Build URL with optional country bias
        const params = new URLSearchParams({
          format: "json",
          q,
          limit: "7",
          addressdetails: "1",
        });

        // If we have a country code, add it to bias results
        if (countryCode) {
          params.set("countrycodes", countryCode.toLowerCase());
        }

        // If we have a viewbox, add it for geographic bias
        if (viewbox) {
          params.set("viewbox", viewbox.join(","));
          params.set("bounded", "1"); // Strictly limit to viewbox
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { headers: { "Accept-Language": "es,en;q=0.9" } }
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (s: Suggestion) => {
    // Show first 3 parts of the address for readability
    const parts = s.display_name.split(",");
    const short = parts.slice(0, 3).join(",").trim();
    onChange(short);
    onSelect(short, parseFloat(s.lat), parseFloat(s.lon));
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>}
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); search(e.target.value); }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full py-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-green-400 outline-none text-base sm:text-sm md:py-3 ${icon ? "pl-9" : "pl-4"}`}
        />
        {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400 sm:size-14" />}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => {
            const parts = s.display_name.split(",");
            const country = s.address?.country || parts[parts.length - 1]?.trim();
            return (
              <button
                key={i}
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-4 py-3.5 hover:bg-green-50 transition-colors border-b border-slate-100 last:border-0 flex items-start gap-2 sm:py-3"
              >
                <MapPin size={16} className="text-green-500 mt-0.5 flex-shrink-0 sm:size-14" />
                <div className="min-w-0">
                  <p className="text-base font-medium text-slate-800 leading-tight truncate sm:text-sm">{parts[0]}</p>
                  <p className="text-xs text-slate-400 leading-tight mt-0.5 truncate">
                    {parts.slice(1, 3).join(",").trim()}
                    {country && ` · ${country}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

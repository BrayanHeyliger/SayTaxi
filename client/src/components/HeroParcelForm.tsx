import { useState, useRef, useCallback } from "react";
import { MapPin, Package, DollarSign, Clock, AlertCircle } from "lucide-react";
import LeafletMap, { type LeafletMapRef } from "./LeafletMap";
import NominatimAutocomplete from "./NominatimAutocomplete";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { calculateParcelPricing } from "@/lib/parcelUtils";

interface HeroParcelFormProps {
  onSubmit?: (data: ParcelFormData) => void;
  onNavigateToDashboard?: () => void;
}

export interface ParcelFormData {
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  packageType: "small" | "medium" | "large";
  weight: number;
  description: string;
  estimatedPrice: string;
}

export function HeroParcelForm({ onSubmit, onNavigateToDashboard }: HeroParcelFormProps) {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [packageType, setPackageType] = useState<"small" | "medium" | "large">("small");
  const [weight, setWeight] = useState("1");
  const [description, setDescription] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("$0.00");
  const [isCalculating, setIsCalculating] = useState(false);
  const [userCountryCode, setUserCountryCode] = useState<string | undefined>(undefined);
  const [userViewbox, setUserViewbox] = useState<[number, number, number, number] | undefined>(undefined);
  const mapRef = useRef<LeafletMapRef | null>(null);

  const handleMapReady = useCallback((ref: LeafletMapRef) => {
    mapRef.current = ref;
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPickupCoords(coords);
      const delta = 0.27;
      setUserViewbox([coords.lng - delta, coords.lat - delta, coords.lng + delta, coords.lat + delta]);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`, { headers: { "Accept-Language": "es" } });
        const data = await res.json();
        if (data.display_name) setPickupAddress(data.display_name.split(",").slice(0, 2).join(","));
        if (data.address?.country_code) setUserCountryCode(data.address.country_code);
      } catch {}
    });
  }, []);

  const handlePickupSelect = (address: string, lat: number, lng: number) => {
    setPickupAddress(address);
    setPickupCoords({ lat, lng });
    mapRef.current?.setPickup(lat, lng, address);
  };

  const handleDropoffSelect = (address: string, lat: number, lng: number) => {
    setDropoffAddress(address);
    setDropoffCoords({ lat, lng });
    mapRef.current?.setDropoff(lat, lng, address);
    if (pickupCoords) calculatePrice(pickupCoords, { lat, lng });
  };

  const calculatePrice = (pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) => {
    setIsCalculating(true);
    const pricing = calculateParcelPricing({
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      packageType,
      weight: parseFloat(weight) || 1,
      loyaltyEligible: true,
    });

    setEstimatedPrice(`$${pricing.price.toFixed(2)}`);
    setIsCalculating(false);
  };

  const handleSubmit = () => {
    if (!pickupAddress || !dropoffAddress || !pickupCoords || !dropoffCoords) {
      toast.error("Completa todos los campos");
      return;
    }

    const formData: ParcelFormData = {
      pickupAddress,
      pickupLat: pickupCoords.lat,
      pickupLng: pickupCoords.lng,
      dropoffAddress,
      dropoffLat: dropoffCoords.lat,
      dropoffLng: dropoffCoords.lng,
      packageType,
      weight: parseFloat(weight),
      description,
      estimatedPrice,
    };

    onSubmit?.(formData);
    onNavigateToDashboard?.();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mapa */}
        <div className="rounded-xl overflow-hidden h-64 lg:h-80 shadow-lg">
          <LeafletMap onMapReady={handleMapReady} />
        </div>

        {/* Formulario */}
        <div className="space-y-3 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-4">
          {/* Ubicación de recogida */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">📍 Recoger de</label>
            <NominatimAutocomplete
              placeholder="Tu ubicación"
              value={pickupAddress}
              onChange={setPickupAddress}
              onSelect={handlePickupSelect}
              countryCode={userCountryCode}
              viewbox={userViewbox}
              autoLocate
            />
          </div>

          {/* Ubicación de entrega */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">📦 Entregar en</label>
            <NominatimAutocomplete
              placeholder="Destino"
              value={dropoffAddress}
              onChange={setDropoffAddress}
              onSelect={handleDropoffSelect}
              countryCode={userCountryCode}
              viewbox={userViewbox}
            />
          </div>

          {/* Tipo de paquete */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">📦 Tipo de paquete</label>
            <select
              value={packageType}
              onChange={(e) => {
                setPackageType(e.target.value as "small" | "medium" | "large");
                if (pickupCoords && dropoffCoords) calculatePrice(pickupCoords, dropoffCoords);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="small">Pequeño (hasta 2kg)</option>
              <option value="medium">Mediano (2-5kg)</option>
              <option value="large">Grande (5-10kg)</option>
            </select>
          </div>

          {/* Peso */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">⚖️ Peso (kg)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  if (pickupCoords && dropoffCoords) calculatePrice(pickupCoords, dropoffCoords);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">💰 Precio</label>
              <div className="rounded-lg border border-green-300 bg-green-100/70 px-3 py-2 text-sm font-bold text-green-700">
                {estimatedPrice}
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">📝 Descripción (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Documentos, ropa, electrónica..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Botón enviar */}
          <Button
            onClick={handleSubmit}
            disabled={!pickupAddress || !dropoffAddress}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-lg gap-2"
          >
            <Package size={16} /> Enviar Paquete Ahora
          </Button>
        </div>
      </div>
    </div>
  );
}

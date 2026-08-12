import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Package, Clock, DollarSign, Phone, MessageCircle, X, Copy, CheckCircle } from "lucide-react";
import LeafletMap, { type LeafletMapRef } from "./LeafletMap";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";

export interface ParcelOrder {
  id: string;
  trackingCode: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  status: "pending" | "accepted" | "in_transit" | "delivered" | "cancelled";
  estimatedPrice: string;
  actualPrice?: string;
  createdAt: string;
  acceptedAt?: string;
  deliveredAt?: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    plate: string;
    rating: number;
  };
  driverLocation?: { lat: number; lng: number };
}

interface ParcelTrackingProps {
  order: ParcelOrder;
  onClose?: () => void;
}

const STATUS_CONFIG = {
  pending: { label: "Esperando conductor", color: "bg-yellow-50 border-yellow-200 text-yellow-800", icon: "⏳" },
  accepted: { label: "Conductor en camino", color: "bg-blue-50 border-blue-200 text-blue-800", icon: "🚗" },
  in_transit: { label: "En tránsito", color: "bg-orange-50 border-orange-200 text-orange-800", icon: "📦" },
  delivered: { label: "Entregado", color: "bg-green-50 border-green-200 text-green-800", icon: "✅" },
  cancelled: { label: "Cancelado", color: "bg-red-50 border-red-200 text-red-800", icon: "❌" },
};

export function ParcelTracking({ order, onClose }: ParcelTrackingProps) {
  const mapRef = useRef<LeafletMapRef | null>(null);
  const [driverLocation, setDriverLocation] = useState(order.driverLocation || null);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleMapReady = useCallback((ref: LeafletMapRef) => {
    mapRef.current = ref;
    mapRef.current?.setPickup(order.pickupLat, order.pickupLng, order.pickupAddress);
    mapRef.current?.setDropoff(order.dropoffLat, order.dropoffLng, order.dropoffAddress);
  }, [order]);

  // Simular movimiento del conductor
  useEffect(() => {
    if (order.status !== "accepted" && order.status !== "in_transit") return;
    if (!driverLocation) return;

    const interval = setInterval(() => {
      setDriverLocation(prev => {
        if (!prev) return prev;
        
        const pickup = { lat: order.pickupLat, lng: order.pickupLng };
        const dropoff = { lat: order.dropoffLat, lng: order.dropoffLng };
        
        let target = order.status === "accepted" ? pickup : dropoff;
        
        const newLat = prev.lat + (target.lat - prev.lat) * 0.05;
        const newLng = prev.lng + (target.lng - prev.lng) * 0.05;
        
        // Calcular distancia y ETA
        const distLat = Math.abs(target.lat - newLat) * 111000;
        const distLng = Math.abs(target.lng - newLng) * 111000 * Math.cos(newLat * Math.PI / 180);
        const distM = Math.sqrt(distLat * distLat + distLng * distLng);
        const etaMin = Math.ceil(Math.max(0, distM / 10) / 60);
        
        setDistance(distM < 1000 ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1)} km`);
        setEta(etaMin <= 1 ? "Menos de 1 min" : `${etaMin} min`);
        
        mapRef.current?.panTo(newLat, newLng);
        
        return { lat: newLat, lng: newLng };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [order.status, driverLocation, order.pickupLat, order.pickupLng, order.dropoffLat, order.dropoffLng]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código copiado al portapapeles");
  };

  const shareTrackingLink = () => {
    const link = `${window.location.origin}/track/${order.trackingCode}`;
    if (navigator.share) {
      navigator.share({ title: "Rastreo de paquete", text: `Sigue tu paquete con este enlace: ${link}` });
    } else {
      navigator.clipboard.writeText(link);
      toast.success("Enlace de rastreo copiado");
    }
  };

  const statusConfig = STATUS_CONFIG[order.status];

  return (
    <div className="space-y-4">
      {/* Header con estado */}
      <div className={`rounded-xl p-4 border ${statusConfig.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{statusConfig.icon}</span>
            <div>
              <p className="font-bold text-sm">{statusConfig.label}</p>
              <p className="text-xs opacity-75">Código: {order.trackingCode}</p>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-2 hover:bg-white/30 rounded-lg transition-colors"
            title="Copiar código de rastreo"
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Mapa */}
      <div className="rounded-xl overflow-hidden h-64 shadow-lg border border-slate-200">
        <LeafletMap onMapReady={handleMapReady} />
      </div>

      {/* Información del conductor */}
      {order.driver && order.status !== "pending" && (
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
              {order.driver.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900">{order.driver.name}</p>
              <p className="text-xs text-slate-500">{order.driver.vehicle} · {order.driver.plate}</p>
              <div className="flex items-center gap-1 text-xs mt-1">
                <span>⭐ {order.driver.rating}</span>
              </div>
            </div>
          </div>

          {/* ETA y distancia */}
          {(order.status === "accepted" || order.status === "in_transit") && (
            <div className="grid grid-cols-2 gap-2 mb-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500">ETA</p>
                <p className="font-bold text-slate-900">{eta || "Calculando..."}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Distancia</p>
                <p className="font-bold text-slate-900">{distance || "Calculando..."}</p>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2 text-sm" onClick={shareTrackingLink}>
              <MessageCircle size={14} /> Compartir
            </Button>
            <Button variant="outline" className="gap-2 text-sm">
              <Phone size={14} /> Llamar
            </Button>
          </div>
        </Card>
      )}

      {/* Detalles del paquete */}
      <Card className="p-4 space-y-3">
        <div>
          <p className="text-xs text-slate-500 mb-1">📍 Recogida</p>
          <p className="text-sm font-medium text-slate-900">{order.pickupAddress}</p>
        </div>
        <div className="h-px bg-slate-200" />
        <div>
          <p className="text-xs text-slate-500 mb-1">📦 Entrega</p>
          <p className="text-sm font-medium text-slate-900">{order.dropoffAddress}</p>
        </div>
        <div className="h-px bg-slate-200" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">💰 Precio</p>
            <p className="text-sm font-bold text-green-600">{order.actualPrice || order.estimatedPrice}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">🕐 Solicitado</p>
            <p className="text-sm font-medium text-slate-900">{new Date(order.createdAt).toLocaleTimeString()}</p>
          </div>
        </div>
      </Card>

      {/* Botón cerrar */}
      {onClose && (
        <Button onClick={onClose} variant="outline" className="w-full">
          <X size={16} className="mr-2" /> Cerrar Rastreo
        </Button>
      )}
    </div>
  );
}

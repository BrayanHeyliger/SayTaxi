import { useEffect, useRef, useState, useCallback } from "react";

export interface LeafletMapRef {
  setPickup: (lat: number, lng: number, label: string) => void;
  setDropoff: (lat: number, lng: number, label: string) => void;
  clearRoute: () => void;
  getRoute: () => Promise<{ distanceKm: number; durationMin: number } | null>;
  spawnVehicles: (lat: number, lng: number) => void;
  panTo: (lat: number, lng: number) => void;
  setDrivers: (drivers: DriverMarker[]) => void;
  setRouteBetween: (
    start: { lat: number; lng: number; label?: string },
    end: { lat: number; lng: number; label?: string },
    options?: { vehicleLabel?: string; vehicleEmoji?: string; animate?: boolean }
  ) => Promise<{ distanceKm: number; durationMin: number } | null>;
}

export interface DriverMarker {
  id: number | string;
  name: string;
  vehicle: string;
  status: string;
  isOnline: boolean | number;
  lat?: number | null;
  lng?: number | null;
}

interface Props {
  height?: string;
  onMapReady?: (ref: LeafletMapRef) => void;
  className?: string;
}

export default function LeafletMap({ height = "100%", onMapReady, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const liveVehicleMarkerRef = useRef<any>(null);
  const vehicleMarkersRef = useRef<any[]>([]);
  const driverMarkersRef = useRef<any[]>([]);
  const vehicleAnimRef = useRef<any>(null);
  const liveRouteAnimRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const buildVehicleIcon = useCallback((L: any, emoji: string, color = "#25D366") => L.divIcon({
    html: `
      <div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border-radius:999px;background:rgba(15,23,42,0.95);border:1px solid rgba(255,255,255,0.15);box-shadow:0 10px 22px rgba(0,0,0,0.25);color:white;font-size:15px;font-weight:700;">
        <span style="font-size:18px;line-height:1">${emoji}</span>
        <span style="width:8px;height:8px;border-radius:999px;background:${color};box-shadow:0 0 0 6px rgba(37,211,102,0.14);"></span>
      </div>
    `,
    className: "",
    iconAnchor: [24, 18],
  }), []);

  const stopLiveRouteAnimation = useCallback(() => {
    if (liveRouteAnimRef.current) {
      clearInterval(liveRouteAnimRef.current);
      liveRouteAnimRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let L: any;
    import("leaflet").then((mod) => {
      L = mod.default;
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(containerRef.current!, {
        zoomControl: false,
        attributionControl: false,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
        subdomains: "abcd",
        attribution: "© OpenStreetMap © CARTO",
      }).addTo(map);
      map.setView([19.4326, -99.1332], 13);
      mapRef.current = map;

      // Este componente se usa en un contexto operativo: nunca crea vehículos ficticios.
      const clearDemoVehicles = () => {
        vehicleMarkersRef.current.forEach(m => m.remove());
        vehicleMarkersRef.current = [];
        if (vehicleAnimRef.current) clearInterval(vehicleAnimRef.current);
        vehicleAnimRef.current = null;
      };
      const spawnVehiclesInternal = (_L?: any, _map?: any, _lat?: number, _lng?: number) => clearDemoVehicles();
      setReady(true);

      const renderDrivers = (drivers: DriverMarker[]) => {
        if (!L || !map) return;
        driverMarkersRef.current.forEach(m => m.remove());
        driverMarkersRef.current = [];

        const statusColor: Record<string, string> = {
          available: "#25D366",
          active: "#25D366",
          in_trip: "#3B82F6",
          in_progress: "#3B82F6",
          busy: "#3B82F6",
          inactive: "#94A3B8",
          pending: "#F59E0B",
          suspended: "#EF4444",
        };

        drivers.forEach(driver => {
          if (driver.lat == null || driver.lng == null) return;
          const color = statusColor[driver.status] ?? (driver.isOnline ? "#25D366" : "#94A3B8");
          const initials = (driver.name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
          const emoji = driver.vehicle?.toLowerCase().includes("motor") ? "🏍️" : "🚗";
          const marker = L.marker([driver.lat, driver.lng], {
            icon: L.divIcon({
              html: `
                <div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border-radius:999px;background:rgba(15,23,42,0.95);border:1px solid rgba(255,255,255,0.15);box-shadow:0 10px 22px rgba(0,0,0,0.25);color:white;font-size:15px;font-weight:700;">
                  <span style="font-size:16px;line-height:1">${emoji}</span>
                  <span>${initials}</span>
                  <span style="width:8px;height:8px;border-radius:999px;background:${color};box-shadow:0 0 0 4px ${color}33;"></span>
                </div>
              `,
              className: "",
              iconAnchor: [20, 18],
            }),
          }).addTo(map);
          marker.bindPopup(
            `<div style="font-family:sans-serif;min-width:170px;">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${driver.name}</div>
              <div style="font-size:12px;color:#666;margin-bottom:4px;">${driver.vehicle || "—"}</div>
              <div style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:#fff;background:${color};">${driver.isOnline ? "En línea" : "Desconectado"}</div>
            </div>`
          );
          driverMarkersRef.current.push(marker);
        });

        // Center map on the cluster of drivers if any were rendered
        if (driverMarkersRef.current.length > 0) {
          const group = L.featureGroup(driverMarkersRef.current);
          map.fitBounds(group.getBounds().pad(0.4), { maxZoom: 14 });
        }
      };

      const ref: LeafletMapRef = {
        setPickup: (lat, lng, label) => {
          if (pickupMarkerRef.current) pickupMarkerRef.current.remove();
          pickupMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({ html: '<div style="width:14px;height:14px;background:#25D366;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,211,102,0.5)"></div>', className: "", iconAnchor: [7, 7] }),
          }).addTo(map).bindPopup(`📍 ${label}`);
          map.setView([lat, lng], 15);
          spawnVehiclesInternal(L, map, lat, lng);
        },
        setDropoff: (lat, lng, label) => {
          if (dropoffMarkerRef.current) dropoffMarkerRef.current.remove();
          dropoffMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({ html: '<div style="width:14px;height:14px;background:#EF4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(239,68,68,0.5)"></div>', className: "", iconAnchor: [7, 7] }),
          }).addTo(map).bindPopup(`🏁 ${label}`);
        },
        clearRoute: () => {
          if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
        },
        getRoute: async () => {
          if (!pickupMarkerRef.current || !dropoffMarkerRef.current) return null;
          const p = pickupMarkerRef.current.getLatLng();
          const d = dropoffMarkerRef.current.getLatLng();
          try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${p.lng},${p.lat};${d.lng},${d.lat}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes?.[0]) {
              const route = data.routes[0];
              if (routeLayerRef.current) routeLayerRef.current.remove();
              routeLayerRef.current = L.geoJSON(route.geometry, {
                style: {
                  color: "#25D366",
                  weight: 6,
                  opacity: 0.9,
                  lineCap: "round",
                  lineJoin: "round",
                },
              }).addTo(map);
              map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
              return { distanceKm: route.distance / 1000, durationMin: Math.ceil(route.duration / 60) };
            }
          } catch {}
          return null;
        },
        spawnVehicles: (lat, lng) => spawnVehiclesInternal(L, map, lat, lng),
        setDrivers: (drivers) => renderDrivers(drivers),
        panTo: (lat, lng) => map.setView([lat, lng], 15),
        setRouteBetween: async (start, end, options) => {
          stopLiveRouteAnimation();
          if (liveVehicleMarkerRef.current) {
            liveVehicleMarkerRef.current.remove();
            liveVehicleMarkerRef.current = null;
          }

          try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (!data.routes?.[0]) return null;

            const route = data.routes[0];
            if (routeLayerRef.current) routeLayerRef.current.remove();
            routeLayerRef.current = L.geoJSON(route.geometry, {
              style: {
                color: "#25D366",
                weight: 6,
                opacity: 0.92,
                lineCap: "round",
                lineJoin: "round",
                dashArray: "8 10",
              },
            }).addTo(map);

            const routeCoords = route.geometry?.coordinates?.map((coord: [number, number]) => [coord[1], coord[0]]) || [];
            if (routeCoords.length > 0) {
              liveVehicleMarkerRef.current = L.marker(routeCoords[0], {
                icon: buildVehicleIcon(L, options?.vehicleEmoji || "🚗"),
                zIndexOffset: 1000,
              }).addTo(map);

              if (options?.animate !== false && routeCoords.length > 1) {
                let index = 0;
                liveRouteAnimRef.current = setInterval(() => {
                  index = Math.min(index + 1, routeCoords.length - 1);
                  liveVehicleMarkerRef.current?.setLatLng(routeCoords[index]);
                  if (index >= routeCoords.length - 1) {
                    stopLiveRouteAnimation();
                  }
                }, 700);
              }
            }

            map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
            return { distanceKm: route.distance / 1000, durationMin: Math.ceil(route.duration / 60) };
          } catch {
            return null;
          }
        },
      };
      onMapReady?.(ref);
    });
    return () => {
      if (vehicleAnimRef.current) clearInterval(vehicleAnimRef.current);
      stopLiveRouteAnimation();
    };
  }, [buildVehicleIcon, stopLiveRouteAnimation]);

  return (
    <div ref={containerRef} className={`wt-leaflet-map ${className}`} style={{ height, width: "100%", background: "#e8e8e8" }}>
      {!ready && (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 14 }}>
          Cargando mapa...
        </div>
      )}
    </div>
  );
}

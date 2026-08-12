import { useEffect, useRef, useState, useCallback } from "react";

export interface LeafletMapRef {
  setPickup: (lat: number, lng: number, label: string) => void;
  setDropoff: (lat: number, lng: number, label: string) => void;
  clearRoute: () => void;
  getRoute: () => Promise<{ distanceKm: number; durationMin: number } | null>;
  spawnVehicles: (lat: number, lng: number) => void;
  panTo: (lat: number, lng: number) => void;
  setRouteBetween: (
    start: { lat: number; lng: number; label?: string },
    end: { lat: number; lng: number; label?: string },
    options?: { vehicleLabel?: string; vehicleEmoji?: string; animate?: boolean }
  ) => Promise<{ distanceKm: number; durationMin: number } | null>;
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

      // Try to get user location
      navigator.geolocation?.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        const marker = L.marker([pos.coords.latitude, pos.coords.longitude], {
          icon: L.divIcon({ html: '<div style="width:14px;height:14px;background:#25D366;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,211,102,0.5)"></div>', className: "", iconAnchor: [7, 7] }),
        }).addTo(map).bindPopup("📍 Tu ubicación");
        pickupMarkerRef.current = marker;
        spawnVehiclesInternal(L, map, pos.coords.latitude, pos.coords.longitude);
      }, () => {
        spawnVehiclesInternal(L, map, 19.4326, -99.1332);
      });

      setReady(true);

      const spawnVehiclesInternal = (L: any, map: any, lat: number, lng: number) => {
        vehicleMarkersRef.current.forEach(m => m.remove());
        vehicleMarkersRef.current = [];
        const types = ["🚗","🚙","🚘","🚐"];
        for (let i = 0; i < 8; i++) {
          const spread = 0.012;
          const vLat = lat + (Math.random() - 0.5) * spread;
          const vLng = lng + (Math.random() - 0.5) * spread;
          const emoji = types[i % types.length];
          const m = L.marker([vLat, vLng], {
            icon: L.divIcon({ html: `<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</div>`, className: "", iconAnchor: [11, 11] }),
          }).addTo(map);
          vehicleMarkersRef.current.push(m);
        }
        if (vehicleAnimRef.current) clearInterval(vehicleAnimRef.current);
        vehicleAnimRef.current = setInterval(() => {
          vehicleMarkersRef.current.forEach(m => {
            const pos = m.getLatLng();
            m.setLatLng([pos.lat + (Math.random() - 0.5) * 0.0003, pos.lng + (Math.random() - 0.5) * 0.0003]);
          });
        }, 1500);
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

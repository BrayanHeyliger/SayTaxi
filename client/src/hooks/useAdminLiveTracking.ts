import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

export type FleetMarker = {
  tripId: number;
  driverId: number;
  driverName: string;
  vehicleLabel: string;
  licensePlate: string | null;
  tripStatus: "accepted" | "in_progress";
  position: {
    lat: number;
    lng: number;
    accuracyM: number;
    headingDeg?: number;
    speedMps?: number;
    capturedAt: string;
    sequence?: number;
  };
  serverReceivedAt: string;
  stale: boolean;
};

type ConnectionState = "offline" | "connecting" | "live" | "reconnecting" | "forbidden";

const staleAfterMs = 60_000;

export function useAdminLiveTracking(enabled: boolean) {
  const [byDriver, setByDriver] = useState<Map<number, FleetMarker>>(new Map());
  const [connectionState, setConnectionState] = useState<ConnectionState>("offline");
  const [lastUpdateAt, setLastUpdateAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnectionState("offline");
      return;
    }

    setConnectionState("connecting");
    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    });

    const markFreshness = () => {
      const now = Date.now();
      setByDriver(previous => {
        let changed = false;
        const next = new Map(previous);
        for (const [driverId, marker] of Array.from(next.entries())) {
          const stale = now - Date.parse(marker.serverReceivedAt) > staleAfterMs;
          if (stale !== marker.stale) {
            changed = true;
            next.set(driverId, { ...marker, stale });
          }
        }
        return changed ? next : previous;
      });
    };

    socket.on("connect", () => {
      setConnectionState("live");
      socket.emit("join_operations_tracking");
    });
    socket.on("disconnect", () => setConnectionState("reconnecting"));
    socket.on("connect_error", () => setConnectionState("offline"));
    socket.on("operations_error", (event: { code?: string }) => {
      if (event?.code === "FORBIDDEN") setConnectionState("forbidden");
    });
    socket.on("fleet_location_snapshot", (event: { generatedAt?: string; vehicles?: FleetMarker[] }) => {
      const vehicles = Array.isArray(event.vehicles) ? event.vehicles : [];
      setByDriver(new Map(vehicles.map(item => [Number(item.driverId), item])));
      setLastUpdateAt(event.generatedAt ?? new Date().toISOString());
    });
    socket.on("fleet_location_update", (event: Partial<FleetMarker> & { driverId: number; tripId: number; position: FleetMarker["position"]; serverReceivedAt: string }) => {
      setByDriver(previous => {
        const previousMarker = previous.get(Number(event.driverId));
        // El snapshot aporta identidad del vehículo. Si aún no llegó, se conserva una etiqueta neutra.
        const nextMarker: FleetMarker = {
          tripId: Number(event.tripId),
          driverId: Number(event.driverId),
          driverName: previousMarker?.driverName ?? "Conductor activo",
          vehicleLabel: previousMarker?.vehicleLabel ?? "Vehículo en servicio",
          licensePlate: previousMarker?.licensePlate ?? null,
          tripStatus: event.tripStatus === "accepted" ? "accepted" : "in_progress",
          position: event.position,
          serverReceivedAt: event.serverReceivedAt,
          stale: false,
        };
        const next = new Map(previous);
        next.set(nextMarker.driverId, nextMarker);
        return next;
      });
      setLastUpdateAt(event.serverReceivedAt);
    });
    socket.on("fleet_tracking_ended", (event: { tripId: number }) => {
      setByDriver(previous => {
        const next = new Map(previous);
        for (const [driverId, marker] of Array.from(next.entries())) {
          if (marker.tripId === Number(event.tripId)) next.delete(driverId);
        }
        return next;
      });
      setLastUpdateAt(new Date().toISOString());
    });

    const freshnessTimer = window.setInterval(markFreshness, 5_000);
    return () => {
      window.clearInterval(freshnessTimer);
      socket.disconnect();
    };
  }, [enabled]);

  const markers = useMemo(() => Array.from(byDriver.values()).sort((a, b) => a.driverName.localeCompare(b.driverName)), [byDriver]);
  return { markers, connectionState, lastUpdateAt };
}

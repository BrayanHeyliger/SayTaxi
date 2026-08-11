import type { ParsedWhatsAppMessage } from "./parser";

export type ConversationStatus = "active" | "awaiting_route" | "awaiting_confirmation" | "completed" | "cancelled";

export type ConversationMessage = {
  sender: "user" | "bot";
  type: "text" | "location" | "media";
  body: string;
  timestamp: number;
};

export type WhatsAppConversation = {
  id: string;
  userId: string;
  phoneNumber: string;
  messages: ConversationMessage[];
  status: ConversationStatus;
  route?: {
    pickup?: { lat: number; lng: number };
    dropoff?: { lat: number; lng: number };
    estimateFare?: number;
    estimateMinutes?: number;
  };
  pendingTripId?: string;
  lastCompletedTripId?: string;
};

export type TripSummary = { id: string; date: string; status: string; fare: number };

export type FlowDependencies = {
  recentTrips?: TripSummary[];
};

export type FlowResult = {
  reply: string;
  status: ConversationStatus;
  conversation: WhatsAppConversation;
  createdTrip?: { id: string; fare: number; etaMinutes: number };
  ratedTrip?: { tripId: string; stars: number };
};

function estimateFromPoints(pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) {
  const km = Math.max(
    1,
    Math.sqrt(Math.pow(pickup.lat - dropoff.lat, 2) + Math.pow(pickup.lng - dropoff.lng, 2)) * 111,
  );
  const fare = Math.round((2.5 + km * 0.9) * 100) / 100;
  const etaMinutes = Math.round(5 + km * 2.5);
  return { fare, etaMinutes };
}

export function applyConversationFlow(
  conversation: WhatsAppConversation,
  message: ParsedWhatsAppMessage,
  deps: FlowDependencies = {},
): FlowResult {
  const next = { ...conversation, messages: [...conversation.messages] };

  if (message.text) {
    next.messages.push({ sender: "user", type: "text", body: message.text, timestamp: message.timestamp });
  } else if (message.location) {
    next.messages.push({
      sender: "user",
      type: "location",
      body: `${message.location.lat},${message.location.lng}`,
      timestamp: message.timestamp,
    });
  }

  if (message.intent === "cancel") {
    next.status = "cancelled";
    const reply = "Tu solicitud fue cancelada.";
    next.messages.push({ sender: "bot", type: "text", body: reply, timestamp: Date.now() });
    return { reply, status: next.status, conversation: next };
  }

  if (message.intent === "history") {
    const recent = deps.recentTrips?.slice(0, 5) ?? [];
    const reply =
      recent.length === 0
        ? "No encontré viajes recientes."
        : `Tus últimos viajes:\n${recent
            .map((trip, idx) => `${idx + 1}. ${trip.date} - ${trip.status} - $${trip.fare.toFixed(2)}`)
            .join("\n")}`;
    next.messages.push({ sender: "bot", type: "text", body: reply, timestamp: Date.now() });
    return { reply, status: next.status, conversation: next };
  }

  if (message.intent === "rate" && message.rating && next.lastCompletedTripId) {
    const reply = "¡Gracias! Tu calificación fue guardada.";
    next.messages.push({ sender: "bot", type: "text", body: reply, timestamp: Date.now() });
    return {
      reply,
      status: next.status,
      conversation: next,
      ratedTrip: { tripId: next.lastCompletedTripId, stars: message.rating },
    };
  }

  if (message.intent === "trip_request") {
    next.status = "awaiting_route";
    const reply = "¿De dónde a dónde? Envíame ubicación de origen y destino.";
    next.messages.push({ sender: "bot", type: "text", body: reply, timestamp: Date.now() });
    return { reply, status: next.status, conversation: next };
  }

  if (next.status === "awaiting_route" && message.location) {
    if (!next.route?.pickup) {
      next.route = { ...(next.route ?? {}), pickup: { lat: message.location.lat, lng: message.location.lng } };
      const reply = "Perfecto, ahora comparte la ubicación de destino.";
      next.messages.push({ sender: "bot", type: "text", body: reply, timestamp: Date.now() });
      return { reply, status: next.status, conversation: next };
    }

    const dropoff = { lat: message.location.lat, lng: message.location.lng };
    const pickup = next.route.pickup;
    const estimate = estimateFromPoints(pickup, dropoff);
    next.route = {
      ...next.route,
      dropoff,
      estimateFare: estimate.fare,
      estimateMinutes: estimate.etaMinutes,
    };
    next.status = "awaiting_confirmation";
    const reply = `Tarifa estimada: $${estimate.fare.toFixed(2)}. Tiempo estimado: ${estimate.etaMinutes} min. ¿Confirmas?`;
    next.messages.push({ sender: "bot", type: "text", body: reply, timestamp: Date.now() });
    return { reply, status: next.status, conversation: next };
  }

  if (next.status === "awaiting_confirmation" && message.intent === "confirm") {
    const createdTrip = {
      id: `trip_${Date.now()}`,
      fare: next.route?.estimateFare ?? 0,
      etaMinutes: next.route?.estimateMinutes ?? 0,
    };
    next.status = "active";
    next.pendingTripId = createdTrip.id;
    const reply = `✅ Viaje creado (${createdTrip.id}). Te asignaremos un conductor pronto.`;
    next.messages.push({ sender: "bot", type: "text", body: reply, timestamp: Date.now() });
    return { reply, status: next.status, conversation: next, createdTrip };
  }

  const fallback = "No entendí tu mensaje. Puedes escribir 'Quiero un viaje' o 'Mis viajes'.";
  next.messages.push({ sender: "bot", type: "text", body: fallback, timestamp: Date.now() });
  return { reply: fallback, status: next.status, conversation: next };
}

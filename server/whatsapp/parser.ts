import { z } from "zod";

export type ParsedIntent = "trip_request" | "cancel" | "history" | "rate" | "confirm" | "unknown";

export type ParsedWhatsAppMessage = {
  userId: string;
  phoneNumber: string;
  messageId: string;
  timestamp: number;
  text?: string;
  location?: { lat: number; lng: number; name?: string };
  media?: { id: string; mimeType?: string; kind: "image" | "audio" | "video" | "document" };
  intent: ParsedIntent;
  rating?: number;
};

const messageSchema = z.object({
  id: z.string().min(1),
  from: z.string().regex(/^\+?\d{5,20}$/),
  timestamp: z.string().regex(/^\d+$/),
  type: z.string(),
  text: z.object({ body: z.string().max(1000) }).optional(),
  location: z
    .object({
      latitude: z.union([z.number(), z.string()]),
      longitude: z.union([z.number(), z.string()]),
      name: z.string().optional(),
    })
    .optional(),
  image: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
  audio: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
  video: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
  document: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
});

function normalizeText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/\s+/g, " ");
}

function detectIntent(text?: string): ParsedIntent {
  if (!text) return "unknown";
  const normalized = text.toLowerCase();
  if (normalized.includes("cancel")) return "cancel";
  if (normalized.includes("historial") || normalized.includes("mis viajes")) return "history";
  if (normalized.includes("viaje") || normalized.includes("taxi")) return "trip_request";
  if (normalized === "si" || normalized === "sí" || normalized.includes("confirm")) return "confirm";
  if (/^[1-5]$/.test(normalized)) return "rate";
  return "unknown";
}

function parseMedia(message: z.infer<typeof messageSchema>) {
  if (message.image) return { id: message.image.id, mimeType: message.image.mime_type, kind: "image" as const };
  if (message.audio) return { id: message.audio.id, mimeType: message.audio.mime_type, kind: "audio" as const };
  if (message.video) return { id: message.video.id, mimeType: message.video.mime_type, kind: "video" as const };
  if (message.document) return { id: message.document.id, mimeType: message.document.mime_type, kind: "document" as const };
  return undefined;
}

export function parseWebhookPayload(payload: unknown): ParsedWhatsAppMessage[] {
  const entry = z.array(z.any()).safeParse((payload as any)?.entry);
  if (!entry.success) return [];

  const parsed: ParsedWhatsAppMessage[] = [];
  for (const item of entry.data) {
    const changes = Array.isArray(item?.changes) ? item.changes : [];
    for (const change of changes) {
      const messages = Array.isArray(change?.value?.messages) ? change.value.messages : [];
      for (const rawMessage of messages) {
        const result = messageSchema.safeParse(rawMessage);
        if (!result.success) continue;

        const message = result.data;
        const normalizedText = normalizeText(message.text?.body);
        const rating = normalizedText && /^[1-5]$/.test(normalizedText) ? Number(normalizedText) : undefined;

        parsed.push({
          userId: message.from,
          phoneNumber: message.from,
          messageId: message.id,
          timestamp: Number(message.timestamp) * 1000,
          text: normalizedText,
          location: message.location
            ? {
                lat: Number(message.location.latitude),
                lng: Number(message.location.longitude),
                name: message.location.name,
              }
            : undefined,
          media: parseMedia(message),
          intent: rating ? "rate" : detectIntent(normalizedText),
          rating,
        });
      }
    }
  }

  return parsed;
}

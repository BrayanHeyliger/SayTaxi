import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { rawMutate, rawQuery } from "../db";
import { WhatsAppClient, buildWhatsAppConfig } from "../whatsapp/client";
import { applyConversationFlow, type TripSummary, type WhatsAppConversation } from "../whatsapp/flows";
import { parseWebhookPayload } from "../whatsapp/parser";

const whatsappClient = new WhatsAppClient(buildWhatsAppConfig());
const inMemoryConversations = new Map<string, WhatsAppConversation>();
const rateLimitStore = new Map<string, number[]>();

function nowMs() {
  return Date.now();
}

function consumeRateLimit(userId: string): boolean {
  const windowMs = 60_000;
  const maxMessages = 10;
  const cutoff = nowMs() - windowMs;
  const history = (rateLimitStore.get(userId) ?? []).filter(time => time > cutoff);
  if (history.length >= maxMessages) {
    rateLimitStore.set(userId, history);
    return false;
  }
  history.push(nowMs());
  rateLimitStore.set(userId, history);
  return true;
}

function newConversation(userId: string, phoneNumber: string): WhatsAppConversation {
  return {
    id: `wa_${userId}`,
    userId,
    phoneNumber,
    messages: [],
    status: "active",
  };
}

async function getRecentTrips(userId: string): Promise<TripSummary[]> {
  const rows = await rawQuery<{ id: number; requestedAt: string; status: string; fare: string }>(
    `SELECT id, requestedAt, status, fare
     FROM trips
     WHERE clientId = ?
     ORDER BY requestedAt DESC
     LIMIT 5`,
    [Number(userId)],
  );
  return rows.map(row => ({
    id: String(row.id),
    date: row.requestedAt,
    status: row.status,
    fare: Number(row.fare) || 0,
  }));
}

async function persistConversation(conversation: WhatsAppConversation): Promise<void> {
  inMemoryConversations.set(conversation.userId, conversation);

  await rawMutate(
    `INSERT INTO whatsapp_conversations (userId, phoneNumber, messages, status)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       phoneNumber = VALUES(phoneNumber),
       messages = VALUES(messages),
       status = VALUES(status),
       updatedAt = CURRENT_TIMESTAMP`,
    [conversation.userId, conversation.phoneNumber, JSON.stringify(conversation.messages), conversation.status],
  );
}

export async function upsertConversationState(conversation: WhatsAppConversation): Promise<void> {
  await persistConversation(conversation);
}

export async function appendWhatsAppLog(event: string, data: unknown): Promise<void> {
  await rawMutate(`INSERT INTO whatsapp_logs (event, data) VALUES (?, ?)`, [event, JSON.stringify(data)]);
}

export async function getConversationState(userId: string, phoneNumber?: string): Promise<WhatsAppConversation> {
  const fromMemory = inMemoryConversations.get(userId);
  if (fromMemory) return fromMemory;

  const rows = await rawQuery<{ userId: string; phoneNumber: string; messages: string; status: WhatsAppConversation["status"] }>(
    `SELECT userId, phoneNumber, messages, status
     FROM whatsapp_conversations
     WHERE userId = ?
     ORDER BY updatedAt DESC
     LIMIT 1`,
    [userId],
  );

  if (rows.length === 0) {
    return newConversation(userId, phoneNumber ?? userId);
  }

  const row = rows[0];
  return {
    id: `wa_${row.userId}`,
    userId: row.userId,
    phoneNumber: row.phoneNumber,
    status: row.status,
    messages: JSON.parse(row.messages || "[]"),
  };
}

export async function processWebhookPayload(payload: unknown): Promise<{ processed: number; replies: string[] }> {
  const messages = parseWebhookPayload(payload);
  const replies: string[] = [];

  for (const message of messages) {
    if (!consumeRateLimit(message.userId)) {
      await appendWhatsAppLog("rate_limited", { userId: message.userId, messageId: message.messageId });
      continue;
    }

    const conversation = await getConversationState(message.userId, message.phoneNumber);
    const recentTrips = message.intent === "history" ? await getRecentTrips(message.userId) : [];
    const flow = applyConversationFlow(conversation, message, { recentTrips });

    await persistConversation(flow.conversation);

    if (flow.createdTrip) {
      await rawMutate(
        `INSERT INTO trips (clientId, pickupLocation, pickupLatLng, dropoffLocation, dropoffLatLng, fare, status)
         VALUES (?, ?, ?, ?, ?, ?, 'requested')`,
        [
          Number(message.userId),
          "WhatsApp pickup",
          JSON.stringify(flow.conversation.route?.pickup ?? {}),
          "WhatsApp dropoff",
          JSON.stringify(flow.conversation.route?.dropoff ?? {}),
          flow.createdTrip.fare,
        ],
      );
    }

    if (flow.ratedTrip) {
      const tripId = Number(flow.ratedTrip.tripId.replace(/\D/g, "")) || 0;
      const [trip] = await rawQuery<{ driverId: number | null }>(`SELECT driverId FROM trips WHERE id = ? LIMIT 1`, [tripId]);
      if (trip?.driverId && trip.driverId > 0) {
      await rawMutate(
        `INSERT INTO ratings (tripId, clientId, driverId, clientRating)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE clientRating = VALUES(clientRating), updatedAt = CURRENT_TIMESTAMP`,
          [tripId, Number(message.userId), trip.driverId, flow.ratedTrip.stars],
      );
      } else {
        await appendWhatsAppLog("rating_skipped_no_driver", { tripId, userId: message.userId });
      }
    }

    await appendWhatsAppLog("message_processed", {
      userId: message.userId,
      intent: message.intent,
      messageId: message.messageId,
    });

    replies.push(flow.reply);

    try {
      await whatsappClient.sendTextMessage(message.phoneNumber, flow.reply);
    } catch (error) {
      await appendWhatsAppLog("send_error", { userId: message.userId, error: String(error) });
    }
  }

  return { processed: messages.length, replies };
}

const sendMessageInput = z.object({
  userId: z.string().min(1),
  phoneNumber: z.string().min(5).max(20),
  message: z.string().min(1).max(1000),
});

export const whatsappRouter = router({
  sendMessage: protectedProcedure.input(sendMessageInput).mutation(async ({ input }) => {
    await whatsappClient.sendTextMessage(input.phoneNumber, input.message);
    const conversation = await getConversationState(input.userId, input.phoneNumber);
    conversation.messages.push({ sender: "bot", type: "text", body: input.message, timestamp: Date.now() });
    await persistConversation(conversation);
    await appendWhatsAppLog("manual_send", input);
    return { success: true } as const;
  }),

  getConversation: protectedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      return getConversationState(input.userId);
    }),

  logEvent: protectedProcedure
    .input(z.object({ type: z.string().min(1), data: z.any() }))
    .mutation(async ({ input }) => {
      await appendWhatsAppLog(input.type, input.data);
      return { success: true } as const;
    }),

  handleWebhook: protectedProcedure
    .input(z.object({ payload: z.any() }))
    .mutation(async ({ input }) => {
      return processWebhookPayload(input.payload);
    }),
});

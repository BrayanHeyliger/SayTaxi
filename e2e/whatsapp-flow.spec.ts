import { describe, expect, it } from "vitest";
import { getConversationState, processWebhookPayload, upsertConversationState } from "../server/routers/whatsapp";

function buildTextPayload(from: string, body: string, id = `msg_${Date.now()}`) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id,
                  from,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function buildLocationPayload(from: string, latitude: number, longitude: number, id = `msg_${Date.now()}`) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id,
                  from,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "location",
                  location: { latitude, longitude },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe("WhatsApp flow e2e (simulado)", () => {
  it("completa solicitud de viaje", async () => {
    const user = "18095550001";

    const first = await processWebhookPayload(buildTextPayload(user, "Quiero un viaje"));
    expect(first.replies[0]).toContain("¿De dónde a dónde?");

    const pickup = await processWebhookPayload(buildLocationPayload(user, 18.5, -69.9));
    expect(pickup.replies[0]).toContain("destino");

    const dropoff = await processWebhookPayload(buildLocationPayload(user, 18.48, -69.92));
    expect(dropoff.replies[0]).toContain("Tarifa estimada");

    const confirm = await processWebhookPayload(buildTextPayload(user, "sí"));
    expect(confirm.replies[0]).toContain("Viaje creado");

    const conversation = await getConversationState(user);
    expect(conversation.pendingTripId).toBeTruthy();
  });

  it("consulta historial y califica viaje", async () => {
    const user = "18095550002";

    const history = await processWebhookPayload(buildTextPayload(user, "Mis viajes"));
    expect(history.replies[0]).toContain("viajes");

    const conversation = await getConversationState(user);
    conversation.lastCompletedTripId = "trip_123";
    await upsertConversationState(conversation);

    const rating = await processWebhookPayload(buildTextPayload(user, "5"));
    expect(rating.replies[0]).toContain("calificación");
  });
});

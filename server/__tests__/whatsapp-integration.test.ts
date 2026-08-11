import { describe, expect, it } from "vitest";
import type { TrpcContext } from "../_core/context";
import { getConversationState, processWebhookPayload } from "../routers/whatsapp";
import { whatsappRouter } from "../routers/whatsapp";

function payload(from: string, body: string) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: `msg_${Math.random()}`,
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

const ctx: TrpcContext = {
  req: {} as TrpcContext["req"],
  res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  user: null,
};

describe("whatsapp integration", () => {
  it("procesa webhook y guarda conversación", async () => {
    const user = "18095550200";
    const result = await processWebhookPayload(payload(user, "Quiero un viaje"));

    expect(result.processed).toBe(1);
    expect(result.replies[0]).toContain("¿De dónde a dónde?");

    const conversation = await getConversationState(user);
    expect(conversation.messages.length).toBeGreaterThan(0);
  });

  it("expone operaciones trpc para whatsapp", async () => {
    const caller = whatsappRouter.createCaller(ctx);
    const user = "18095550201";

    const webhook = await caller.handleWebhook({ payload: payload(user, "Mis viajes") });
    expect(webhook.processed).toBe(1);

    const log = await caller.logEvent({ type: "integration_test", data: { ok: true } });
    expect(log.success).toBe(true);

    const send = await caller.sendMessage({
      userId: user,
      phoneNumber: user,
      message: "Mensaje manual",
    });
    expect(send.success).toBe(true);

    const conversation = await caller.getConversation({ userId: user });
    expect(conversation.userId).toBe(user);
  });
});

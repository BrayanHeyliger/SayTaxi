import { describe, expect, it } from "vitest";
import { processWebhookPayload } from "../routers/whatsapp";

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

describe("whatsapp flow", () => {
  it("inicia flujo de viaje", async () => {
    const result = await processWebhookPayload(payload("18095550300", "Quiero un viaje"));
    expect(result.replies[0]).toContain("¿De dónde a dónde?");
  });
});

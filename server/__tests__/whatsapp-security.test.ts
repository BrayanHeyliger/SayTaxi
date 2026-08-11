import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { parseWebhookPayload } from "../whatsapp/parser";
import { processWebhookPayload } from "../routers/whatsapp";
import { verifyMetaSignature, verifyWebhookToken } from "../whatsapp/client";

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

describe("whatsapp security", () => {
  it("valida signature de Meta", () => {
    const rawBody = JSON.stringify(payload("18095550100", "hola"));
    const secret = "secret_123";
    const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(verifyMetaSignature(rawBody, `sha256=${hash}`, secret)).toBe(true);
    expect(verifyMetaSignature(rawBody, "sha256=deadbeef", secret)).toBe(false);
  });

  it("valida token del webhook", () => {
    expect(verifyWebhookToken("subscribe", "token", "abc", "token")).toBe("abc");
    expect(verifyWebhookToken("subscribe", "bad", "abc", "token")).toBeNull();
  });

  it("aplica rate limit de 10 mensajes por minuto", async () => {
    const user = "18095550101";
    const responses = await Promise.all(
      Array.from({ length: 11 }, (_, index) => processWebhookPayload(payload(user, `mensaje ${index}`))),
    );

    const totalReplies = responses.reduce((sum, item) => sum + item.replies.length, 0);
    expect(totalReplies).toBe(10);
  });

  it("bloquea input con formato inválido (previene inyección)", () => {
    const parsed = parseWebhookPayload(payload("1 OR 1=1", "hola"));
    expect(parsed).toHaveLength(0);
  });

  it("rechaza texto excesivo", () => {
    const parsed = parseWebhookPayload(payload("18095550102", "a".repeat(1001)));
    expect(parsed).toHaveLength(0);
  });
});

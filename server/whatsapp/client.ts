import crypto from "crypto";

export type WhatsAppClientConfig = {
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  webhookToken: string;
  appSecret?: string;
};

export function buildWhatsAppConfig(env: NodeJS.ProcessEnv = process.env): WhatsAppClientConfig {
  return {
    apiVersion: env.WHATSAPP_API_VERSION ?? "v18.0",
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accessToken: env.WHATSAPP_ACCESS_TOKEN ?? "",
    webhookToken: env.WHATSAPP_WEBHOOK_TOKEN ?? "",
    appSecret: env.WHATSAPP_APP_SECRET,
  };
}

export function verifyWebhookToken(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  expectedToken: string,
): string | null {
  if (mode !== "subscribe" || !token || token !== expectedToken || !challenge) {
    return null;
  }
  return challenge;
}

export function verifyMetaSignature(rawBody: string, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export class WhatsAppClient {
  constructor(private readonly config: WhatsAppClientConfig) {}

  async sendTextMessage(to: string, message: string): Promise<{ id?: string; mocked: boolean }> {
    if (!this.config.accessToken || !this.config.phoneNumberId) {
      return { mocked: true };
    }

    const endpoint = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.config.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`WhatsApp send failed (${response.status}): ${error}`);
    }

    const payload = (await response.json()) as { messages?: Array<{ id?: string }> };
    return { id: payload.messages?.[0]?.id, mocked: false };
  }
}

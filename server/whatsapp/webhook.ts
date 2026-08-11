import express, { type Express } from "express";
import { processWebhookPayload } from "../routers/whatsapp";
import { buildWhatsAppConfig, verifyMetaSignature, verifyWebhookToken } from "./client";

export function registerWhatsAppWebhook(app: Express) {
  const config = buildWhatsAppConfig();

  app.get("/webhook/whatsapp", (req, res) => {
    const challenge = verifyWebhookToken(
      req.query["hub.mode"] as string | undefined,
      req.query["hub.verify_token"] as string | undefined,
      req.query["hub.challenge"] as string | undefined,
      config.webhookToken,
    );

    if (!challenge) {
      return res.status(403).send("Forbidden");
    }

    return res.status(200).send(challenge);
  });

  app.post("/webhook/whatsapp", express.raw({ type: "application/json" }), async (req, res) => {
    const rawBody = req.body?.toString("utf8") ?? "{}";
    const signature = req.header("x-hub-signature-256");

    if (config.appSecret && !verifyMetaSignature(rawBody, signature, config.appSecret)) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    const result = await processWebhookPayload(payload);
    return res.status(200).json({ ok: true, ...result });
  });
}

import type { Express } from "express";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function getContentType(filePath: string): string {
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export function registerStorageProxy(app: Express) {
  app.get("/assets-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const publicDir = path.resolve(process.cwd(), "client", "public", "assets-storage");
    const candidates = [
      path.join(publicDir, key),
      path.join(publicDir, `${key}.svg`),
      path.join(publicDir, `${key}.png`),
      path.join(publicDir, `${key}.jpg`),
      path.join(publicDir, `${key}.jpeg`),
      path.join(publicDir, "fallback-placeholder.svg"),
    ];

    const localFile = candidates.find((candidate) => existsSync(candidate));
    if (localFile) {
      res.set("Cache-Control", "no-store");
      res.type(getContentType(localFile));
      res.send(readFileSync(localFile));
      return;
    }

    res.status(404).send("Storage asset not found");
  });
}

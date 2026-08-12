import { promises as fs } from "node:fs";
import path from "node:path";

const STORAGE_ROOT = path.resolve(process.cwd(), "client", "public", "assets-storage");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

async function ensureParentDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const filePath = path.join(STORAGE_ROOT, key);
  await ensureParentDir(filePath);
  await fs.writeFile(filePath, data, {
    encoding: typeof data === "string" ? "utf-8" : undefined,
  });
  return { key, url: `/assets-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/assets-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/assets-storage/${key}`;
}

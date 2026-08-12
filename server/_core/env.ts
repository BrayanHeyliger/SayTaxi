const toBool = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
};

const toInt = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Codeium / other external LLM provider support
  codeiumApiUrl: process.env.CODEIUM_API_URL ?? process.env.BUILT_IN_CODEIUM_API_URL ?? "",
  codeiumApiKey: process.env.CODEIUM_API_KEY ?? process.env.BUILT_IN_CODEIUM_API_KEY ?? "",
  // Force Codeium usage by default to avoid using paid external providers
  useCodeium: toBool(process.env.USE_CODEIUM, true),
  // LocalAI support (self-hosted inference server)
  localaiUrl: process.env.LOCALAI_URL ?? process.env.LOCAL_AI_URL ?? "",
  useLocalAI: toBool(process.env.USE_LOCALAI, false),
  // Super admin credentials (use env vars; empty by default)
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  // Ollama/Qwen disabled by default; set OLLAMA_MODEL + OLLAMA_AUTOSTART=true to re-enable.
  ollamaModel: process.env.OLLAMA_MODEL ?? "",
  // Do not prefer local Ollama by default when forcing Codeium
  localLlmOnly: toBool(process.env.LOCAL_LLM_ONLY, false),
  ollamaAutoStart: toBool(process.env.OLLAMA_AUTOSTART, false),
  llmRequestTimeoutMs: toInt(process.env.LLM_REQUEST_TIMEOUT_MS, 45_000),
  ollamaBootTimeoutMs: toInt(process.env.OLLAMA_BOOT_TIMEOUT_MS, 20_000),
  ollamaKeepAliveMs: toInt(process.env.OLLAMA_KEEPALIVE_MS, 8 * 60_000),
};

// Safety: if local-only mode is enabled and Codeium is NOT explicitly used,
// make sure Forge config is ignored at runtime to prevent accidental external calls.
if (ENV.localLlmOnly && !ENV.useCodeium) {
  if (ENV.forgeApiKey || ENV.forgeApiUrl) {
    console.warn("ENV: LOCAL_LLM_ONLY is enabled — ignoring BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY to prevent external credit usage.");
  }
  // Explicitly blank them so other modules don't attempt external calls
  ENV.forgeApiKey = "";
  ENV.forgeApiUrl = "";
}

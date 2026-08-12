import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

describe("llm provider fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
    delete process.env.BUILT_IN_FORGE_API_URL;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
    // Ensure Codeium is disabled in tests unless explicitly set
    process.env.USE_CODEIUM = "0";
    process.env.CODEIUM_API_URL = "";
    delete process.env.CODEIUM_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it("uses Ollama locally when Forge credentials are not configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { role: "assistant", content: "Hola desde Ollama" },
        done: true,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { invokeLLM } = await import("./llm");

    const result = await invokeLLM({
      messages: [{ role: "user", content: "Hola" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/chat",
      expect.objectContaining({ method: "POST" })
    );

    const [, init] = fetchMock.mock.calls[1];
    expect(JSON.parse(init?.body as string)).toMatchObject({
      model: "qwen2.5-coder:1.5b-base",
      messages: [{ role: "user", content: "Hola" }],
    });

    expect(result.choices[0]?.message.content).toBe("Hola desde Ollama");
  });
});

import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () => {
  // If explicitly using Codeium, prefer it
  if (ENV.useCodeium && ENV.codeiumApiUrl && ENV.codeiumApiUrl.trim().length > 0) {
    return `${ENV.codeiumApiUrl.replace(/\/$/, "")}/v1/chat`;
  }

  // If LocalAI is configured, prefer it (local self-hosted server)
  if (ENV.useLocalAI && ENV.localaiUrl && ENV.localaiUrl.trim().length > 0) {
    return `${ENV.localaiUrl.replace(/\/$/, "")}/v1/chat`;
  }

  // Local Ollama only
  if (ENV.localLlmOnly && !ENV.useCodeium) {
    return `${ENV.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`;
  }

  // Forge (or other configured external provider)
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }

  // If Codeium configured (but not explicitly requested), use it as external default
  if (ENV.codeiumApiUrl && ENV.codeiumApiUrl.trim().length > 0) {
    return `${ENV.codeiumApiUrl.replace(/\/$/, "")}/v1/chat`;
  }

  // Fallback to Ollama
  return `${ENV.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`;
};

const assertApiKey = () => {
  if (ENV.forgeApiKey) {
    return;
  }

  if (!ENV.forgeApiUrl || ENV.forgeApiUrl.trim().length === 0) {
    return;
  }
};


const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const isOllamaReachable = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);
  try {
    const healthUrl = `${ENV.ollamaBaseUrl.replace(/\/$/, "")}/api/tags`;
    const response = await fetch(healthUrl, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(
        new Error(`LLM request timeout after ${ENV.llmRequestTimeoutMs}ms`)
      );
    }, ENV.llmRequestTimeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens,
  } = params;

  const useOllama = !ENV.useCodeium &&
    (ENV.localLlmOnly ||
      (!ENV.forgeApiKey &&
        (!ENV.forgeApiUrl || ENV.forgeApiUrl.trim().length === 0) &&
        (!ENV.codeiumApiUrl || ENV.codeiumApiUrl.trim().length === 0)));

  // Determine chosen provider for logging and validation
  const provider = ENV.useCodeium
    ? "codeium"
    : useOllama
    ? "ollama"
    : "forge";

  // If forcing Codeium, ensure configuration exists
  if (provider === "codeium") {
    if (!ENV.codeiumApiUrl || ENV.codeiumApiUrl.trim().length === 0) {
      throw new Error(
        "LLM invoke failed: USE_CODEIUM is enabled but CODEIUM_API_URL is not set. Please set CODEIUM_API_URL (and CODEIUM_API_KEY if required)."
      );
    }
  }

  if (provider === "ollama" && !(await isOllamaReachable())) {
    throw new Error(
      "LLM invoke failed: Ollama is not reachable. Start `ollama serve` and pull a model (for example `ollama pull qwen3:1.7b`), or configure an external LLM provider such as Codeium or Forge via environment variables."
    );
  }

  console.log(`[LLM] Provider selected: ${provider}; api=${resolveApiUrl()}`);

  const payload: Record<string, unknown> = {
    messages: messages.map(normalizeMessage),
  };

  if (useOllama) {
    payload.stream = false;
  }

  const preferredOllamaModels = [
    ENV.ollamaModel,
    "qwen2.5-coder:1.5b-base",
    "qwen3:1.7b",
    "qwen2.5:3b-instruct",
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  if (model) {
    payload.model = model;
  } else if (useOllama) {
    payload.model = preferredOllamaModels[0];
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }

  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  // Authorization: prefer Forge key, then Codeium key if present
  if (ENV.forgeApiKey) {
    headers.authorization = `Bearer ${ENV.forgeApiKey}`;
  } else if (ENV.codeiumApiKey) {
    headers.authorization = `Bearer ${ENV.codeiumApiKey}`;
  }

  const requestApi = resolveApiUrl();
  let response: Response | null = null;
  let responseErrorText = "";

  if (useOllama) {
    for (const candidateModel of preferredOllamaModels) {
      payload.model = candidateModel;
      const candidateResponse = await fetchWithBackoff(requestApi, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (candidateResponse.ok) {
        response = candidateResponse;
        break;
      }

      responseErrorText = await candidateResponse.text();
      const modelMissing =
        candidateResponse.status === 404 ||
        /model\s+['\"]?.+['\"]?\s+not\s+found/i.test(responseErrorText);

      if (!modelMissing) {
        response = candidateResponse;
        break;
      }

      console.warn(
        `[LLM] Ollama model '${candidateModel}' unavailable. Trying next fallback.`
      );
    }
  } else {
    response = await fetchWithBackoff(requestApi, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!response) {
    throw new Error("LLM invoke failed: no available Ollama model candidates");
  }

  if (!response.ok) {
    const errorText = responseErrorText || (await response.text());
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const body = await response.json();

  if (useOllama) {
    return {
      id: `ollama-${Date.now()}`,
      created: Date.now(),
      model: payload.model as string,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: body.message?.content ?? "",
          },
          finish_reason: body.done ? "stop" : null,
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    } as InvokeResult;
  }

  return body as InvokeResult;
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  if (ENV.localLlmOnly) {
    const tagsUrl = `${ENV.ollamaBaseUrl.replace(/\/$/, "")}/api/tags`;
    const response = await fetchWithBackoff(tagsUrl, {
      headers: { "content-type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `List Ollama models failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const body = (await response.json()) as {
      models?: Array<{ name?: string; modified_at?: string }>;
    };

    return {
      object: "list",
      data: (body.models ?? []).map(model => ({
        id: model.name ?? "unknown",
        object: "model",
        created: model.modified_at
          ? Math.floor(new Date(model.modified_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        owned_by: "ollama",
      })),
    };
  }

  assertApiKey();

  const url = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/models`
    : "https://forge.manus.im/v1/models";

  const response = await fetchWithBackoff(url, {
    headers: { authorization: `Bearer ${ENV.forgeApiKey}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as ModelsResponse;
}

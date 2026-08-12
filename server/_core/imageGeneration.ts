/**
 * Local image generation helper.
 *
 * Produces a branded SVG preview so the app stays self-contained without
 * depending on a remote image service.
 */
import { storagePut } from "server/storage";

const DEFAULT_IMAGE_MODEL = "LOCAL_SVG_PREVIEW";
const DEFAULT_IMAGE_QUALITY = "standard";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  /** Forge image model enum, e.g. "MODEL_GPT_IMAGE_2". Defaults to GPT Image 2. */
  model?: string;
  /** Generation quality, e.g. "medium" | "high". Defaults to "medium" for GPT Image 2. */
  quality?: string;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const model = options.model ?? DEFAULT_IMAGE_MODEL;
  const quality =
    options.quality ?? (model === DEFAULT_IMAGE_MODEL ? DEFAULT_IMAGE_QUALITY : undefined);

  const promptLines = wrapText(options.prompt || "Passenger preview", 28);
  const svg = buildPreviewSvg(promptLines, model, quality ?? "standard");
  const { url } = await storagePut(
    `generated/${Date.now()}.svg`,
    svg,
    "image/svg+xml"
  );
  return {
    url,
  };
}

export type ImageModelInfo = {
  /** Forge model enum, e.g. "MODEL_GPT_IMAGE_2". Pass into generateImage({ model }). */
  model?: string;
  /** Stable model id, e.g. "gpt-image-2". */
  id?: string;
};

export type ListImageModelsResponse = {
  models: ImageModelInfo[];
};

/**
 * List the image models the internal ImageService currently supports.
 * Feed a returned `model` value into generateImage({ model }).
 */
export async function listImageModels(): Promise<ListImageModelsResponse> {
  return {
    models: [
      { model: DEFAULT_IMAGE_MODEL, id: "passenger-local-preview" },
      { model: "LOCAL_SVG_SIMPLE", id: "passenger-local-simple" },
    ],
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Passenger preview"];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function buildPreviewSvg(lines: string[], model: string, quality: string): string {
  const yStart = 180;
  const lineHeight = 42;
  const textBlocks = lines
    .map((line, index) => {
      const y = yStart + index * lineHeight;
      return `<text x="72" y="${y}" fill="#effaf4" font-family="Sora, Inter, Arial, sans-serif" font-size="30" font-weight="700">${escapeXml(line)}</text>`;
    })
    .join("\n");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" fill="none">
  <defs>
    <linearGradient id="bg" x1="120" y1="0" x2="1080" y2="675" gradientUnits="userSpaceOnUse">
      <stop stop-color="#062018"/>
      <stop offset="0.52" stop-color="#0c2f24"/>
      <stop offset="1" stop-color="#07110f"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(330 210) rotate(32) scale(420 280)">
      <stop stop-color="#7ef2b1" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#7ef2b1" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" rx="48" fill="url(#bg)"/>
  <rect width="1200" height="675" rx="48" fill="url(#glow)"/>
  <circle cx="988" cy="132" r="126" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="1058" cy="534" r="170" fill="#7ef2b1" fill-opacity="0.08"/>
  <rect x="72" y="72" width="184" height="44" rx="22" fill="#ffffff" fill-opacity="0.08"/>
  <text x="96" y="101" fill="#a7f3c1" font-family="Sora, Inter, Arial, sans-serif" font-size="20" font-weight="700">Passenger local preview</text>
  ${textBlocks}
  <text x="72" y="420" fill="#c8ddd3" font-family="Inter, Arial, sans-serif" font-size="18" opacity="0.9">Model: ${escapeXml(model)} · Quality: ${escapeXml(quality)}</text>
  <text x="72" y="458" fill="#8fb3a4" font-family="Inter, Arial, sans-serif" font-size="16" opacity="0.8">Generated locally in the workspace</text>
</svg>`.trim();
}

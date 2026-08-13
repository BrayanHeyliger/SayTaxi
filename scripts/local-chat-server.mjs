import http from "node:http";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const PORT = 4891;
const WORKSPACE_DIR = "/workspaces/SayTaxi";
const NODE_BIN_DIR = path.dirname(process.execPath);
const MODEL_CANDIDATES = [
  "Xenova/Qwen2.5-Coder-0.5B-Instruct",
  "Xenova/SmolLM2-360M-Instruct",
];
const exec = promisify(execCb);

let transformersPromise;
let pipelinePromise;
// Keep heavy model loading disabled by default in this recovery container.
let disableTransformers = true;

async function runWhitelistedCommand(command, timeoutMs = 120000) {
  const { stdout, stderr } = await exec(command, {
    cwd: WORKSPACE_DIR,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      PATH: `${NODE_BIN_DIR}:${WORKSPACE_DIR}/node_modules/.bin:${process.env.PATH || ""}`,
      HOME: "/tmp/passenger-home",
      XDG_CONFIG_HOME: "/tmp/passenger-home/.config",
      XDG_DATA_HOME: "/tmp/passenger-home/.local/share",
      PNPM_HOME: "/tmp/passenger-home/.local/share/pnpm",
    },
  });

  const text = [stdout?.trim(), stderr?.trim()].filter(Boolean).join("\n").trim();
  return text || "Comando ejecutado sin salida.";
}

function ensureWorkspacePath(rawPath) {
  const trimmed = String(rawPath || "").trim();
  if (!trimmed) {
    throw new Error("ruta de archivo vacia");
  }
  const normalized = path.normalize(trimmed).replace(/^\/+/, "");
  const full = path.resolve(WORKSPACE_DIR, normalized);
  if (!full.startsWith(`${WORKSPACE_DIR}${path.sep}`) && full !== WORKSPACE_DIR) {
    throw new Error("ruta fuera del proyecto no permitida");
  }
  return { normalized, full };
}

async function runActionFromPrompt(userText, lower) {
  const createMatch = userText.match(/(?:crea|crear|create)\s+(?:archivo|file)\s+([^\s]+)(?:\s+(?:con|contenido|content)\s+([\s\S]+))?/i);
  if (createMatch) {
    const { normalized, full } = ensureWorkspacePath(createMatch[1]);
    const content = (createMatch[2] || "").trim();
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
    return `Accion ejecutada:\narchivo creado: ${normalized}`;
  }

  if (/(ab(r|re)|arran(c|q)|inici|levant).*(web|app|proyecto|frontend|vite)|\b(start|launch|open)\b.*\b(web|app|project)\b/.test(lower)) {
    const output = await runWhitelistedCommand(
      `bash -lc 'set -euo pipefail
      if [ ! -f "./node_modules/vite/bin/vite.js" ]; then
        echo "ERROR: no existe ./node_modules/vite/bin/vite.js (instala dependencias primero)"
        exit 127
      fi

      lsof -tiTCP:5173 -sTCP:LISTEN -n -P | xargs -r kill
      nohup "${process.execPath}" ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 >/tmp/passenger-web.log 2>&1 &

      sleep 2
      if lsof -iTCP:5173 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
        echo "web iniciada en puerto 5173"
      else
        echo "ERROR: comando lanzado pero 5173 no quedó escuchando"
        tail -n 20 /tmp/passenger-web.log 2>/dev/null || true
        exit 1
      fi'`,
      45000
    );
    return `Accion ejecutada:\n${output}`;
  }

  if (/(deten|para|apaga).*(web|app|servidor|vite)|\bstop\b.*\b(web|app|server)\b/.test(lower)) {
    const output = await runWhitelistedCommand(
      "lsof -tiTCP:5173 -sTCP:LISTEN -n -P | xargs -r kill && echo 'web detenida' || echo 'no habia servidor en 5173'",
      15000
    );
    return `Accion ejecutada:\n${output}`;
  }

  if (/\b(test|tests|prueba|pruebas)\b/.test(lower)) {
    const output = await runWhitelistedCommand(
      `bash -lc 'set -euo pipefail
      if [ ! -f "./node_modules/vitest/vitest.mjs" ]; then
        echo "ERROR: no existe ./node_modules/vitest/vitest.mjs (instala dependencias primero)"
        exit 127
      fi
      "${process.execPath}" ./node_modules/vitest/vitest.mjs --run'`,
      180000
    );
    return `Accion ejecutada (tests):\n${output}`;
  }

  if (/\b(build|compila|compilar)\b/.test(lower)) {
    const output = await runWhitelistedCommand(
      `bash -lc 'set -euo pipefail
      if [ ! -f "./node_modules/vite/bin/vite.js" ]; then
        echo "ERROR: no existe ./node_modules/vite/bin/vite.js (instala dependencias primero)"
        exit 127
      fi
      "${process.execPath}" ./node_modules/vite/bin/vite.js build'`,
      240000
    );
    return `Accion ejecutada (build):\n${output}`;
  }

  return null;
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = (async () => {
      globalThis.self = globalThis;
      globalThis.window = globalThis;
      if (!globalThis.navigator) {
        Object.defineProperty(globalThis, "navigator", {
          value: { userAgent: "node" },
          configurable: true,
        });
      }
      const response = await fetch("https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js");
      if (!response.ok) {
        throw new Error(`Unable to load transformers bundle: ${response.status}`);
      }
      const code = await response.text();
      const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
      return import(moduleUrl);
    })();
  }
  return transformersPromise;
}

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await loadTransformers();
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
      env.useBrowserCache = false;
      env.useFS = true;

      let lastError;
      for (const model of MODEL_CANDIDATES) {
        try {
          const generator = await pipeline("text-generation", model, { quantized: true });
          return { generator, model };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error("No model could be loaded");
    })();
  }
  return pipelinePromise;
}

function normalizeMessages(messages = []) {
  return messages
    .map((message) => {
      const role = message.role || "user";
      const content = Array.isArray(message.content)
        ? message.content.map((part) => part?.text || "").join(" ")
        : String(message.content || "");
      return `${role.toUpperCase()}: ${content}`;
    })
    .join("\n");
}

async function buildCompletion(messages, maxNewTokens, temperature) {
  const lastUserMessage = [...messages].reverse().find((message) => message?.role === "user");
  const lastAssistantMessage = [...messages].reverse().find((message) => message?.role === "assistant");
  const userText = Array.isArray(lastUserMessage?.content)
    ? lastUserMessage.content.map((part) => part?.text || "").join(" ")
    : String(lastUserMessage?.content || "");
  const lower = userText.toLowerCase();

  // Agent-like mode: execute known actions instead of only explaining.
  try {
    const actionResult = await runActionFromPrompt(userText, lower);
    if (actionResult) return actionResult;
  } catch (error) {
    return `Intenté ejecutar la acción pero falló:\n${error?.message || String(error)}`;
  }

  if (!disableTransformers) {
    try {
      const { generator } = await withTimeout(getPipeline(), 8000, "Pipeline load");
      const prompt = `${normalizeMessages(messages)}\nASSISTANT:`;
      const output = await withTimeout(
        generator(prompt, {
          max_new_tokens: maxNewTokens,
          temperature,
          do_sample: temperature > 0,
          return_full_text: false,
        }),
        12000,
        "Generation"
      );

      const generated = Array.isArray(output) ? output[0] : output;
      const text = generated?.generated_text || generated?.text || String(generated || "");
      if (text && text.trim()) return text.trim();
    } catch {
      // Avoid repeated long waits in restricted or unstable environments.
      disableTransformers = true;
    }
  }

  if (/(hola|buenas|hello|hi)\b/.test(lower)) {
    return "Hola. Puedo ayudarte a editar el panel, revisar errores o dejarte una guía local sin usar Copilot Pro.";
  }
  if (/(copilot|credit|crédit|pagar|cobrar)/.test(lower)) {
    return "Puedo ayudarte a apagar Copilot y usar un chat local sin créditos. Si quieres, sigo con esa configuración ahora.";
  }
  if (/(cliente|client|mobile|móvil|mobile)/.test(lower)) {
    return "Puedo ajustar la vista móvil del panel de cliente y comparar contra la muestra. Dime qué parte quieres que cambie primero.";
  }
  if (/(arran(c|q)|inici|levant|run).*(web|app|proyecto|codigo)|\b(start|launch)\b.*\b(web|app|project)\b/.test(lower)) {
    return [
      "Perfecto. Para arrancar la web en este workspace usa:",
      "1) cd /workspaces/SayTaxi",
      "2) pnpm dev",
      "3) abre el puerto que muestre Vite (normalmente 5173)",
      "Si te falla, dime \"reparar arranque\" y te guío paso a paso.",
    ].join("\n");
  }

  let fallback = userText
    ? "Listo. Dame una accion concreta y la ejecuto. Ejemplo: crea archivo notas.txt con hola"
    : "Listo. Dime que quieres que haga en el proyecto.";

  const lastAssistantText = Array.isArray(lastAssistantMessage?.content)
    ? lastAssistantMessage.content.map((part) => part?.text || "").join(" ").trim()
    : String(lastAssistantMessage?.content || "").trim();
  if (fallback === lastAssistantText) {
    fallback = "Entendido. Dame el siguiente comando en una sola linea.";
  }

  return fallback;
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function writeHtml(res, html) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function getChatPageHtml() {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Passenger Local Chat</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #07111a;
        --panel: rgba(11, 20, 31, 0.82);
        --panel-strong: rgba(8, 15, 24, 0.96);
        --card: rgba(255, 255, 255, 0.06);
        --card-strong: rgba(255, 255, 255, 0.1);
        --text: #ecf7f1;
        --muted: rgba(236, 247, 241, 0.72);
        --line: rgba(148, 191, 171, 0.18);
        --green: #42d392;
        --green-strong: #1ca36a;
        --lime: #c9f25d;
        --shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
        --radius: 28px;
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(66, 211, 146, 0.18), transparent 32%),
          radial-gradient(circle at 90% 8%, rgba(201, 242, 93, 0.14), transparent 24%),
          linear-gradient(180deg, #07111a 0%, #08131c 42%, #091721 100%);
        color: var(--text);
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 48px 48px;
        mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 92%);
      }
      .page {
        position: relative;
        min-height: 100%;
        padding: 18px;
      }
      .shell {
        max-width: 1280px;
        margin: 0 auto;
        min-height: calc(100vh - 36px);
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 18px;
      }
      .sidebar,
      .chat {
        border: 1px solid var(--line);
        background: var(--panel);
        backdrop-filter: blur(18px);
        box-shadow: var(--shadow);
        border-radius: var(--radius);
        overflow: hidden;
      }
      .sidebar {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(66, 211, 146, 0.12);
        color: var(--green);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .title {
        margin: 0;
        font-size: 40px;
        line-height: .96;
        letter-spacing: -0.05em;
      }
      .subtitle {
        margin: 0;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .meta {
        padding: 14px;
        border-radius: 18px;
        background: var(--card);
        border: 1px solid rgba(255,255,255,0.06);
      }
      .meta strong { display:block; font-size: 18px; margin-bottom: 3px; }
      .meta span { color: var(--muted); font-size: 12px; }
      .tip-list {
        display: grid;
        gap: 10px;
      }
      .tip {
        padding: 14px;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03));
        border: 1px solid rgba(255,255,255,0.06);
        color: var(--text);
        cursor: pointer;
        text-align: left;
      }
      .tip small { display:block; color: var(--muted); margin-top: 4px; }
      .footer-note {
        margin-top: auto;
        padding-top: 10px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.55;
      }
      .chat {
        display: grid;
        grid-template-rows: auto 1fr auto;
      }
      .chat-top {
        padding: 20px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        background: var(--panel-strong);
      }
      .chat-top h2 {
        margin: 0;
        font-size: 18px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--green);
        font-size: 13px;
        font-weight: 700;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--green);
        box-shadow: 0 0 0 6px rgba(66, 211, 146, 0.13);
      }
      .model-pill {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        color: var(--text);
        font-size: 12px;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .messages {
        padding: 22px;
        overflow: auto;
        display: grid;
        gap: 14px;
        align-content: start;
      }
      .bubble {
        max-width: min(720px, 100%);
        padding: 16px 18px;
        border-radius: 22px;
        line-height: 1.5;
        font-size: 15px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .bubble.user {
        margin-left: auto;
        background: linear-gradient(135deg, rgba(66,211,146,0.92), rgba(201,242,93,0.9));
        color: #04110c;
        border-bottom-right-radius: 8px;
      }
      .bubble.assistant {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.07);
        border-bottom-left-radius: 8px;
      }
      .bubble.system {
        margin: 0 auto;
        background: rgba(255,255,255,0.05);
        color: var(--muted);
        font-size: 13px;
      }
      .composer {
        padding: 18px;
        border-top: 1px solid rgba(255,255,255,0.06);
        background: var(--panel-strong);
      }
      .composer form {
        display: grid;
        gap: 12px;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        justify-content: space-between;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      select, textarea, button {
        font: inherit;
      }
      select, textarea {
        width: 100%;
        border: 1px solid rgba(255,255,255,0.09);
        background: rgba(255,255,255,0.06);
        color: var(--text);
        border-radius: 18px;
      }
      select {
        width: auto;
        padding: 10px 12px;
      }
      textarea {
        min-height: 116px;
        resize: vertical;
        padding: 16px 18px;
        outline: none;
      }
      textarea::placeholder { color: rgba(236,247,241,0.45); }
      .btn {
        border: 0;
        border-radius: 16px;
        padding: 12px 16px;
        font-weight: 700;
        transition: transform .15s ease, opacity .15s ease, background .15s ease;
      }
      .btn:hover { transform: translateY(-1px); }
      .btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
      .btn-primary {
        background: linear-gradient(135deg, var(--green), var(--lime));
        color: #03110b;
      }
      .btn-ghost {
        background: rgba(255,255,255,0.08);
        color: var(--text);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .composer-hint {
        color: var(--muted);
        font-size: 12px;
      }
      .typing {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: 13px;
      }
      .typing span {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: var(--green);
        animation: bounce 1s infinite ease-in-out;
      }
      .typing span:nth-child(2) { animation-delay: .15s; }
      .typing span:nth-child(3) { animation-delay: .3s; }
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: .35; }
        40% { transform: translateY(-4px); opacity: 1; }
      }
      @media (max-width: 1024px) {
        .shell { grid-template-columns: 1fr; }
        .sidebar { order: 2; }
      }
      @media (max-width: 640px) {
        .page { padding: 10px; }
        .shell { min-height: calc(100vh - 20px); }
        .sidebar, .chat { border-radius: 22px; }
        .title { font-size: 30px; }
        .chat-top { flex-direction: column; align-items: flex-start; }
        .meta-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="shell">
        <aside class="sidebar">
          <div class="eyebrow">Passenger local chat</div>
          <div>
            <h1 class="title">Chat gratis, limpio y listo.</h1>
            <p class="subtitle">Interfaz local tipo copiloto para escribir, probar prompts y seguir editando sin pagar.</p>
          </div>
          <div class="meta-grid">
            <div class="meta"><strong>100%</strong><span>Local</span></div>
            <div class="meta"><strong>0€</strong><span>Sin créditos</span></div>
          </div>
          <div class="tip-list">
            <button class="tip" data-prompt="Hazme un resumen corto de este chat local">Resumen corto<small>Convierte esta conversación en una respuesta breve.</small></button>
            <button class="tip" data-prompt="Dame ideas para mejorar esta interfaz de chat">Mejorar UI<small>Pide ajustes visuales o de layout.</small></button>
            <button class="tip" data-prompt="Explícame cómo conectar este chat con mi app">Conectar app<small>Obtén la ruta para integrarlo con el proyecto.</small></button>
          </div>
          <div class="footer-note">
            Modelo activo: <strong>local-node-chat</strong><br />
            Si más tarde quieres probar Qwen, puedo dejar el selector preparado.
          </div>
        </aside>

        <main class="chat">
          <div class="chat-top">
            <div>
              <h2>Local Chat</h2>
              <div class="status"><span class="dot"></span>en línea y gratis</div>
            </div>
            <div class="row">
              <span class="model-pill">local-node-chat</span>
              <span class="model-pill">qwen3:4b ready</span>
            </div>
          </div>

          <section class="messages" id="messages" aria-live="polite"></section>

          <div class="composer">
            <form id="chat-form">
              <textarea id="prompt" placeholder="Escribe aquí tu mensaje..." autocomplete="off"></textarea>
              <div class="controls">
                <div class="row">
                  <select id="model">
                    <option value="local-node-chat">local-node-chat</option>
                    <option value="qwen3:4b" selected>qwen3:4b</option>
                    <option value="qwen3:8b">qwen3:8b</option>
                    <option value="tinyllama:latest">tinyllama:latest</option>
                  </select>
                  <span class="composer-hint">Responde desde el chat local; sin pagos ni tokens externos.</span>
                </div>
                <div class="row">
                  <button class="btn btn-ghost" type="button" id="clear">Limpiar</button>
                  <button class="btn btn-primary" type="submit" id="send">Enviar</button>
                </div>
              </div>
              <div class="typing" id="typing" hidden><span></span><span></span><span></span>pensando localmente</div>
            </form>
          </div>
        </main>
      </div>
    </div>

    <script>
      const messagesEl = document.getElementById('messages');
      const promptEl = document.getElementById('prompt');
      const formEl = document.getElementById('chat-form');
      const sendEl = document.getElementById('send');
      const clearEl = document.getElementById('clear');
      const typingEl = document.getElementById('typing');
      const modelEl = document.getElementById('model');

      const historyKey = 'passenger-local-chat-history';
      const saved = (() => {
        try { return JSON.parse(localStorage.getItem(historyKey) || 'null'); } catch { return null; }
      })();

      const state = Array.isArray(saved) && saved.length ? saved : [
        { role: 'assistant', content: 'Hola. Este es tu chat local gratis. Escribe algo y te respondo sin pasar por Copilot.' }
      ];

      function persist() {
        try { localStorage.setItem(historyKey, JSON.stringify(state)); } catch {}
      }

      function esc(text) {
        return String(text)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      function render() {
        messagesEl.innerHTML = state.map((message) => {
          const klass = message.role === 'user' ? 'user' : message.role === 'system' ? 'system' : 'assistant';
          return '<article class="bubble ' + klass + '">' + esc(message.content) + '</article>';
        }).join('');
        messagesEl.scrollTop = messagesEl.scrollHeight;
        persist();
      }

      function setBusy(busy) {
        typingEl.hidden = !busy;
        sendEl.disabled = busy;
        promptEl.disabled = busy;
        modelEl.disabled = busy;
      }

      async function sendMessage(text) {
        const content = text.trim();
        if (!content) return;

        state.push({ role: 'user', content });
        render();
        promptEl.value = '';
        setBusy(true);
        let timeout;

        try {
          const controller = new AbortController();
          timeout = setTimeout(() => controller.abort(new Error('timeout')), 8000);
          const response = await fetch('/v1/chat/completions', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model: modelEl.value,
              messages: state.slice(-12).map((message) => ({ role: message.role, content: message.content })),
              stream: false,
              temperature: 0.2,
              max_tokens: 500,
            }),
          });
          clearTimeout(timeout);

          const data = await response.json();
          const answer = data?.choices?.[0]?.message?.content || data?.error?.message || 'Sin respuesta.';
          state.push({ role: 'assistant', content: answer });
        } catch (error) {
          const message = error?.name === 'AbortError'
            ? 'Tiempo de espera agotado. Intenta de nuevo con un mensaje más corto.'
            : 'Error local: ' + (error?.message || String(error));
          state.push({ role: 'assistant', content: message });
        } finally {
          if (timeout) clearTimeout(timeout);
          setBusy(false);
          render();
        }
      }

      formEl.addEventListener('submit', (event) => {
        event.preventDefault();
        sendMessage(promptEl.value);
      });

      clearEl.addEventListener('click', () => {
        state.splice(0, state.length, { role: 'assistant', content: 'Chat limpio. Escribe otro mensaje cuando quieras.' });
        render();
      });

      document.querySelectorAll('[data-prompt]').forEach((button) => {
        button.addEventListener('click', () => {
          promptEl.value = button.getAttribute('data-prompt') || '';
          promptEl.focus();
        });
      });

      promptEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          sendMessage(promptEl.value);
        }
      });

      render();
    </script>
  </body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    writeHtml(res, getChatPageHtml());
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    writeJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    try {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
      }

      const parsed = body ? JSON.parse(body) : {};
      const messages = parsed.messages || [];
      const temperature = typeof parsed.temperature === "number" ? parsed.temperature : 0.2;
      const maxTokens = typeof parsed.max_tokens === "number" ? parsed.max_tokens : 256;
      const stream = Boolean(parsed.stream);

      const text = await buildCompletion(messages, maxTokens, temperature);
      const id = `chatcmpl-${Date.now()}`;
      const created = Math.floor(Date.now() / 1000);

      if (stream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model: parsed.model || "local-node-chat", choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model: parsed.model || "local-node-chat", choices: [{ index: 0, delta: { content: text }, finish_reason: null }] })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
      }

      writeJson(res, 200, {
        id,
        object: "chat.completion",
        created,
        model: parsed.model || "local-node-chat",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: text },
            finish_reason: "stop",
          },
        ],
      });
      return;
    } catch (error) {
      writeJson(res, 500, { error: { message: error?.message || "Local model failed" } });
      return;
    }
  }

  writeJson(res, 404, { error: { message: "Not found" } });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Local chat server listening on http://127.0.0.1:${PORT}`);
});
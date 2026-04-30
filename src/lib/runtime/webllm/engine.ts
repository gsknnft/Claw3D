import { resolvePersistedModelId, persistModelId, WEBLLM_LAST_READY_KEY } from "./modelCatalog";

export type EngineStatus = "idle" | "loading" | "ready" | "error";

export type ProgressCallback = (progress: { text: string; progress: number }) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MLCEngine = any;

type WebLLMModule = {
  CreateMLCEngine: (
    modelId: string,
    options?: {
      initProgressCallback?: (info: { text: string; progress: number }) => void;
    }
  ) => Promise<MLCEngine>;
};

declare global {
  // Optional injection point for test/dev builds that intentionally bundle MLC.
  // Claw3D itself does not depend on @mlc-ai/web-llm.
  // eslint-disable-next-line no-var
  var __CLAW3D_WEBLLM_MODULE__: WebLLMModule | undefined;
}

let _engine: MLCEngine | null = null;
let _loadedModelId: string | null = null;
let _status: EngineStatus = "idle";
const _statusHandlers = new Set<(s: EngineStatus) => void>();

function notifyStatus(s: EngineStatus) {
  _status = s;
  for (const h of _statusHandlers) h(s);
}

export function getEngineStatus(): EngineStatus {
  return _status;
}

export function onEngineStatus(handler: (s: EngineStatus) => void): () => void {
  _statusHandlers.add(handler);
  return () => _statusHandlers.delete(handler);
}

async function loadWebLLMModule(): Promise<WebLLMModule> {
  const injected = globalThis.__CLAW3D_WEBLLM_MODULE__;
  if (injected?.CreateMLCEngine) return injected;

  throw new Error(
    "WebLLM runtime is not bundled in this Claw3D build. Use Demo, Hermes, OpenClaw, or a local gateway runtime.",
  );
}

export async function ensureEngine(
  modelId?: string,
  onProgress?: ProgressCallback
): Promise<MLCEngine> {
  const targetModel = modelId ?? resolvePersistedModelId();

  if (_engine && _loadedModelId === targetModel && _status === "ready") {
    return _engine;
  }

  notifyStatus("loading");
  try {
    const { CreateMLCEngine } = await loadWebLLMModule();
    _engine = await CreateMLCEngine(targetModel, {
      initProgressCallback: (info: { text: string; progress: number }) => {
        onProgress?.(info);
      },
    });
    _loadedModelId = targetModel;
    persistModelId(targetModel);
    try {
      localStorage.setItem(WEBLLM_LAST_READY_KEY, String(Date.now()));
    } catch {}
    notifyStatus("ready");
    return _engine;
  } catch (err) {
    _engine = null;
    _loadedModelId = null;
    notifyStatus("error");
    throw err;
  }
}

export async function* generateStream(
  messages: Array<{ role: string; content: string }>,
  modelId?: string,
  onProgress?: ProgressCallback
): AsyncGenerator<string> {
  const engine = await ensureEngine(modelId, onProgress);
  notifyStatus("ready"); // already ready, generation is separate status

  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.6,
    max_tokens: 512,
  });

  for await (const chunk of stream) {
    const delta: string | undefined = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export function isWebGPUSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

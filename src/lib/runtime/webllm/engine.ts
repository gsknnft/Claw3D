import { resolvePersistedModelId, persistModelId, WEBLLM_LAST_READY_KEY } from "./modelCatalog";

export type EngineStatus = "idle" | "loading" | "ready" | "error";

export type ProgressCallback = (progress: { text: string; progress: number }) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MLCEngine = any;

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
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
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

export type WebLLMModelEntry = {
  id: string;
  label: string;
  sizeMb: number;
  description: string;
  link?: string;
};

export const WEBLLM_MODELS: WebLLMModelEntry[] = [
  {
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    label: "SmolLM2 360M",
    sizeMb: 376,
    description: "Ultra-light demo — ~376 MB, fastest load",
    link: "https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC",
  },
  {
    id: "gemma3-1b-it-q4f16_1-MLC",
    label: "Gemma 3 1B",
    sizeMb: 711,
    description: "Google Gemma 3 compact — ~711 MB",
    link: "https://huggingface.co/mlc-ai/gemma3-1b-it-q4f16_1-MLC",
  },
  {
    id: "Qwen3-0.6B-q4f16_1-MLC",
    label: "Qwen3 0.6B",
    sizeMb: 1400,
    description: "Qwen3 tiny — ~1.4 GB",
    link: "https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC",
  },
  {
    id: "Qwen3-1.7B-q4f16_1-MLC",
    label: "Qwen3 1.7B",
    sizeMb: 2000,
    description: "Qwen3 balanced — ~2.0 GB, good quality",
    link: "https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 1B",
    sizeMb: 879,
    description: "Llama 3.2 compact — ~879 MB",
    link: "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 3B",
    sizeMb: 2300,
    description: "Llama 3.2 capable — ~2.3 GB, best compact quality",
    link: "https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC",
  },
];

export const DEFAULT_WEBLLM_MODEL_ID = WEBLLM_MODELS[0].id;

export const WEBLLM_MODEL_KEY = "claw3d:webllm:model";
export const WEBLLM_CONSENT_KEY = "claw3d:webllm:consent";
export const WEBLLM_LAST_READY_KEY = "claw3d:webllm:last-ready";

export function resolvePersistedModelId(): string {
  try {
    return localStorage.getItem(WEBLLM_MODEL_KEY) ?? DEFAULT_WEBLLM_MODEL_ID;
  } catch {
    return DEFAULT_WEBLLM_MODEL_ID;
  }
}

export function persistModelId(id: string): void {
  try {
    localStorage.setItem(WEBLLM_MODEL_KEY, id);
  } catch {}
}

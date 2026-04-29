// Ambient stub for @mlc-ai/web-llm — loaded at runtime via dynamic import.
// The real types are only available when the package is installed.
declare module "@mlc-ai/web-llm" {
  export interface InitProgressReport {
    progress: number;
    text: string;
    timeElapsed: number;
  }

  export interface ChatCompletionChunk {
    choices: Array<{
      delta: { content?: string | null };
      finish_reason: string | null;
    }>;
  }

  export interface MLCEngine {
    chat: {
      completions: {
        create(params: {
          messages: Array<{ role: string; content: string }>;
          stream?: boolean;
          temperature?: number;
          max_tokens?: number;
        }): Promise<AsyncIterable<ChatCompletionChunk>>;
      };
    };
  }

  export function CreateMLCEngine(
    modelId: string,
    options?: {
      initProgressCallback?: (report: InitProgressReport) => void;
    }
  ): Promise<MLCEngine>;
}

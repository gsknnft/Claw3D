import type {
  EventFrame,
  GatewayClient,
  GatewayConnectOptions,
  GatewayGapInfo,
  GatewayStatus,
} from "@/lib/gateway/GatewayClient";
import type {
  RuntimeCapability,
  RuntimeEvent,
  RuntimeProvider,
} from "@/lib/runtime/types";
import { buildLocalAgent, agentToGatewayShape, LOCAL_WEBLLM_AGENT_ID } from "./localAgent";
import { generateStream, isWebGPUSupported } from "./engine";
import { resolvePersistedModelId, WEBLLM_MODELS } from "./modelCatalog";

const WEBLLM_CAPABILITIES: ReadonlySet<RuntimeCapability> = new Set<RuntimeCapability>([
  "agents",
  "sessions",
  "chat",
  "streaming",
  "models",
]);

export class WebLLMRuntimeProvider implements RuntimeProvider {
  readonly id = "webllm" as const;
  readonly label = "On-Device AI";
  readonly metadata = {
    id: this.id,
    label: this.label,
    runtimeName: "On-Device AI (WebLLM)",
  } as const;
  readonly capabilities = WEBLLM_CAPABILITIES;

  // Held to satisfy the RuntimeProvider interface; not used for generation.
  readonly client: GatewayClient;

  private _statusHandlers = new Set<(s: GatewayStatus) => void>();
  private _status: GatewayStatus = "disconnected";

  constructor(client: GatewayClient) {
    this.client = client;
  }

  private _setStatus(s: GatewayStatus) {
    this._status = s;
    for (const h of this._statusHandlers) h(s);
  }

  async connect(_options: GatewayConnectOptions): Promise<void> {
    // No gateway to connect to — resolve immediately as connected.
    this._setStatus("connected");
  }

  disconnect(): void {
    this._setStatus("disconnected");
  }

  onStatus(handler: (status: GatewayStatus) => void): () => void {
    this._statusHandlers.add(handler);
    // Fire current status so subscriber gets initial value.
    handler(this._status);
    return () => this._statusHandlers.delete(handler);
  }

  onGap(_handler: (info: GatewayGapInfo) => void): () => void {
    return () => {};
  }

  onEvent(_handler: (event: EventFrame) => void): () => void {
    return () => {};
  }

  onRuntimeEvent(_handler: (event: RuntimeEvent) => void): () => void {
    return () => {};
  }

  async call<T = unknown>(method: string, params: unknown): Promise<T> {
    switch (method) {
      case "agents.list":
        return this._agentsList() as T;

      case "models.list":
        return this._modelsList() as T;

      case "sessions.preview":
        return this._sessionsPreview(params as { agentId: string }) as T;

      case "agents.message":
        return this._agentsMessage(params as AgentMessageParams) as T;

      default:
        throw new Error(`WebLLMRuntimeProvider: unsupported method "${method}"`);
    }
  }

  private _agentsList() {
    const modelId = resolvePersistedModelId();
    const agent = buildLocalAgent(modelId);
    return { agents: [agentToGatewayShape(agent)] };
  }

  private _modelsList() {
    return {
      models: WEBLLM_MODELS.map((m) => ({
        id: m.id,
        label: m.label,
        sizeMb: m.sizeMb,
        description: m.description,
      })),
    };
  }

  private _sessionsPreview(_params: { agentId: string }) {
    return { sessions: [] };
  }

  private async _agentsMessage(params: AgentMessageParams): Promise<unknown> {
    if (!isWebGPUSupported()) {
      throw new Error("WebGPU is not supported in this browser. Try Chrome or Edge on a modern device.");
    }

    const modelId = resolvePersistedModelId();
    const messages = params.messages ?? [{ role: "user", content: params.content ?? "" }];
    const chunks: string[] = [];

    for await (const delta of generateStream(messages, modelId)) {
      chunks.push(delta);
    }

    return {
      id: LOCAL_WEBLLM_AGENT_ID,
      role: "assistant",
      content: chunks.join(""),
      model: modelId,
    };
  }
}

type AgentMessageParams = {
  agentId?: string;
  content?: string;
  messages?: Array<{ role: string; content: string }>;
};

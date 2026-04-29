export type WebLLMLocalAgent = {
  id: string;
  name: string;
  provider: "webllm";
  model: string;
  status: "idle" | "loading" | "ready" | "generating" | "error";
};

export const LOCAL_WEBLLM_AGENT_ID = "local-webllm-main";

export function buildLocalAgent(modelId: string, status: WebLLMLocalAgent["status"] = "idle"): WebLLMLocalAgent {
  return {
    id: LOCAL_WEBLLM_AGENT_ID,
    name: "Claw Demo Agent",
    provider: "webllm",
    model: modelId,
    status,
  };
}

export function agentToGatewayShape(agent: WebLLMLocalAgent) {
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status === "ready" || agent.status === "idle" ? "idle" : agent.status,
    model: agent.model,
    provider: "webllm",
  };
}

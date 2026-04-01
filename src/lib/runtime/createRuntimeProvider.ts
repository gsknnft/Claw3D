import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import { DemoRuntimeProvider } from "@/lib/runtime/demo/provider";
import { HermesRuntimeProvider } from "@/lib/runtime/hermes/provider";
import { OpenClawRuntimeProvider } from "@/lib/runtime/openclaw/provider";
import type { RuntimeProvider } from "@/lib/runtime/types";

export const createRuntimeProvider = (
  providerId: RuntimeProvider["id"],
  client: GatewayClient
): RuntimeProvider => {
  switch (providerId) {
    case "demo":
      return new DemoRuntimeProvider(client);
    case "hermes":
      return new HermesRuntimeProvider(client);
    case "openclaw":
    default:
      return new OpenClawRuntimeProvider(client);
  }
};

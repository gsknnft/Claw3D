/**
 * Resolves the WebSocket URL for the gateway connection.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

// Detection for Capacitor/Android environment
const isMobileApp = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;

export const resolveStudioProxyGatewayUrl = (upstreamGatewayUrl?: string): string => {
  const raw = typeof upstreamGatewayUrl === "string" ? upstreamGatewayUrl.trim() : "";

  // On Mobile, we ALWAYS connect directly to the upstream URL because there is no local proxy.
  if (isMobileApp && raw) {
    return raw;
  }

  if (raw) {
    try {
      const parsed = new URL(raw);
      if (LOOPBACK_HOSTS.has(parsed.hostname)) {
        return raw;
      }
    } catch {
      // Fall through
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  return `${protocol}://${host}/api/gateway/ws`;
};

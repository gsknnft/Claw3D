/**
 * Resolves the WebSocket URL for the gateway connection.
 *
 * Returns the upstream URL directly when it is a loopback address (no proxy
 * needed). For all other URLs the Studio proxy at /api/gateway/ws is used —
 * it injects auth tokens server-side and forwards to the real gateway.
 *
 * On native Capacitor builds, GatewayClient bypasses this function entirely
 * and connects directly to the configured gateway URL (no server-side proxy
 * exists in a standalone APK). See useGatewayConnection in GatewayClient.ts.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const resolveStudioProxyGatewayUrl = (upstreamGatewayUrl?: string): string => {
  const raw = typeof upstreamGatewayUrl === "string" ? upstreamGatewayUrl.trim() : "";

  if (raw) {
    try {
      const parsed = new URL(raw);
      if (LOOPBACK_HOSTS.has(parsed.hostname)) {
        return raw;
      }
    } catch {
      // Fall through to proxy for malformed values.
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  return `${protocol}://${host}/api/gateway/ws`;
};

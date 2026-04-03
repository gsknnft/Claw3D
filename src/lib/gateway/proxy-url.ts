/**
 * Resolves the WebSocket URL for the gateway connection.
 *
 * In a standard web browser, we connect to the Studio proxy at /api/gateway/ws.
 * In a native mobile environment (Capacitor), there is no local proxy, so we
 * return a placeholder or allow the caller to use the direct upstream URL.
 */
export const resolveStudioProxyGatewayUrl = (): string => {
  // Check if we are running in a Capacitor/native environment
  const isNative = (window as any).Capacitor?.isNative;

  if (isNative) {
    // When native, we don't have a relative proxy.
    // The connection logic in useGatewayConnection should be updated
    // to use the direct upstream URL instead of this proxy URL.
    return "NATIVE_DIRECT_CONNECTION";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  return `${protocol}://${host}/api/gateway/ws`;
};

export const normalizeCustomBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "ws:") {
      parsed.protocol = "http:";
    } else if (parsed.protocol === "wss:") {
      parsed.protocol = "https:";
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
};

type CustomRuntimeProxyInput = {
  runtimeUrl: string;
  pathname: string;
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_CUSTOM_RUNTIME_TIMEOUT_MS = 6_000;

const createTimeoutSignal = (
  signal: AbortSignal | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(new DOMException("Custom runtime request timed out.", "TimeoutError"));
  }, timeoutMs);
  const abortFromParent = () => {
    controller.abort(signal?.reason);
  };
  if (signal) {
    if (signal.aborted) {
      abortFromParent();
    } else {
      signal.addEventListener("abort", abortFromParent, { once: true });
    }
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortFromParent);
    },
  };
};

export async function requestCustomRuntime<T = unknown>({
  runtimeUrl,
  pathname,
  method = "GET",
  body,
  signal,
  timeoutMs = DEFAULT_CUSTOM_RUNTIME_TIMEOUT_MS,
}: CustomRuntimeProxyInput): Promise<T> {
  const normalizedRuntimeUrl = normalizeCustomBaseUrl(runtimeUrl);
  if (!normalizedRuntimeUrl) {
    throw new Error("Custom runtime URL is not configured.");
  }
  const timeout = createTimeoutSignal(signal, timeoutMs);
  let response: Response;
  try {
    response = await fetch("/api/runtime/custom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: timeout.signal,
      body: JSON.stringify({
        runtimeUrl: normalizedRuntimeUrl,
        pathname,
        method,
        body,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Custom runtime request timed out.");
    }
    throw error;
  } finally {
    timeout.cleanup();
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      text.trim() || `Custom runtime request failed (${response.status}) for ${pathname}.`
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // Non-JSON success response (e.g. plain-text /health "OK") — return as-is.
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}

export async function fetchCustomRuntimeJson<T = unknown>(
  runtimeUrl: string,
  pathname: string
): Promise<T> {
  return requestCustomRuntime<T>({ runtimeUrl, pathname, method: "GET" });
}

export async function probeCustomRuntime(runtimeUrl: string): Promise<void> {
  await requestCustomRuntime({ runtimeUrl, pathname: "/health", method: "GET", timeoutMs: 4_000 });
}

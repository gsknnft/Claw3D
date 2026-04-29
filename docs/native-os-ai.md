# Native OS AI

This doc covers the question: can Claw3D use the AI already built into a phone?

Short answer: yes eventually, but it should be treated as a platform adapter
lane, not the first portable demo lane.

## Where This Fits

Claw3D has four local/near-local AI paths:

| Path | Best For | Portability |
| --- | --- | --- |
| WebLLM | shippable no-backend web/Android demo | medium |
| LAN/Tailscale runtime | users who already have OpenClaw, Hermes, Vera, Ollama, BitNet, etc. | high |
| Native OS AI | phones with vendor/system AI APIs | low/medium |
| BitNet native plugin | serious offline Android runtime | medium after build work |

Native OS AI is attractive because it could avoid model downloads and use
hardware/vendor acceleration. The problem is that the API surface is not uniform
across Android devices.

## Why Not Start Here

Different devices expose different capabilities:

- Some expose local text summarization or rewrite APIs.
- Some expose only image/vision features.
- Some require vendor SDKs.
- Some require Google Play Services or model downloads.
- Some have no public general chat/completions API at all.

Claw3D needs a dependable public demo path. WebLLM is easier to reason about
because Claw3D controls the model choice and runtime behavior.

## Recommended Shape

If Claw3D adds native OS AI, do it as a provider capability probe:

```txt
On-Device AI
  -> WebLLM provider when WebGPU/model runtime is available
  -> Native OS AI provider when a supported platform API is available
  -> scripted Demo fallback
```

Do not make native OS AI replace WebLLM. Treat it as an acceleration or
zero-download option when available.

## Provider Contract

The provider should implement the same runtime-provider seam:

- `agents.list`
- `models.list`
- `sessions.preview`
- `chat.history`
- `chat.send`

Internally, it may call a Capacitor plugin:

```txt
src/lib/runtime/native-ai/
  provider.ts
  capability.ts
  plugin.ts
```

Potential native bridge:

```ts
type NativeAiGenerateRequest = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
};

type NativeAiGenerateResponse = {
  text: string;
  model?: string;
  provider?: string;
};
```

## UX

The connect screen should not expose five confusing on-device choices.

Use one label:

```txt
On-Device AI
```

Then pick the best available implementation:

1. Native OS AI, if supported and enabled.
2. WebLLM, if WebGPU/WebLLM is supported.
3. Scripted Demo fallback.

Advanced users can still choose `Local runtime` and point Claw3D at their own
phone/PC/server runtime.

## Security Notes

Native OS AI may send data to vendor services depending on device settings and
SDK behavior. Claw3D should not present it as private/offline unless the API
guarantees local execution.

The provider must expose a clear runtime status:

```txt
local-only | vendor-managed | unknown
```

For sensitive user data, prefer:

- WebLLM local model
- BitNet native plugin
- self-hosted LAN/Tailscale runtime

## Recommendation

Do not block the Android app on native OS AI.

Build order:

1. WebLLM provider for a controlled no-backend demo.
2. Better local/custom runtime presets for people who already have models.
3. Native OS AI capability probe as an optional fast path.
4. BitNet native plugin when the product needs serious offline performance.

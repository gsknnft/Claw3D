# On-Device AI

## Shippable Web Demo: WebLLM Directly In Claw3D

The Android/BitNet path and the shippable demo path should not be the same
implementation.

BitNet native is the long-term high-performance/offline lane. It needs
`bitnet.cpp`, Android NDK, JNI, a Capacitor plugin, model download/cache
management, and a stable native inference boundary.

The shippable Claw3D demo should be simpler:

```txt
Claw3D Web UI
  -> local WebLLM runtime provider
  -> browser/WebView WebGPU/WASM model
  -> same chat/session surface as Demo/OpenClaw/Hermes
```

That gives the product a real LLM in demo mode without requiring OpenClaw,
Hermes, Vera, Tailscale, a PC gateway, or a native Android inference plugin.

### Why WebLLM Fits The Demo Lane

- Claw3D is already a web app and Capacitor WebView app.
- It can run in the browser/WebView without a local server process.
- It lets the "Demo" path become a real local agent instead of only scripted
  replies.
- It avoids bundling a 1GB model in the APK.
- It keeps native BitNet work optional and later.

The limitation is device/runtime support:

- desktop Chrome/Edge: best target
- Android Chrome/WebView: viable on modern devices, but WebGPU support varies
- iOS: weaker target for now
- low-end devices: need a tiny model fallback or scripted demo fallback

### Recommended UX

Add a new connect option:

```txt
On-Device AI
```

It should sit beside:

- Demo backend
- OpenClaw backend
- Hermes backend
- Local runtime
- Custom backend

The flow:

1. User chooses **On-Device AI**.
2. Claw3D checks WebGPU/WebLLM support.
3. If supported, show model choices and estimated download size.
4. User downloads/caches one model.
5. Claw3D creates a local "Main Demo Agent".
6. Chat routes to WebLLM while the office/runtime UI behaves like a real agent
   session.

If unsupported, fall back to:

- current scripted Demo backend
- remote gateway
- local OpenAI-compatible endpoint

On Android, a future native OS AI provider can sit behind the same
**On-Device AI** option when the device exposes a usable platform API. That
provider must identify whether it is truly `local-only`, `vendor-managed`, or
`unknown` before presenting itself as private/offline.

See [native-os-ai.md](native-os-ai.md).

### Model Defaults

Use one small default and one better optional model.

```txt
Default:
  Qwen2.5-0.5B-Instruct / equivalent MLC build
  Target: ~300-500 MB
  Role: fast shippable demo, good enough for short chat

Optional:
  Qwen3.x / Llama 3.2 1B class model when WebLLM has a stable build
  Target: ~700-1000 MB
  Role: better visible quality
```

Do not start with Phi for this lane. It has been less reliable in this stack.
Do not start with BitNet here. BitNet is a native/runtime lane, not the browser
demo lane.

### Implementation Shape

Add a browser-only runtime provider:

```txt
src/lib/runtime/webllm/
  provider.ts
  engine.ts
  modelCatalog.ts
  localAgent.ts
```

Provider identity:

```ts
RuntimeProviderId: "webllm"
label: "On-Device AI"
capabilities:
  agents
  sessions
  chat
  streaming
  models
```

The provider should not use `GatewayClient` for generation. It should implement
the same `RuntimeProvider` shape, but handle these methods locally:

- `agents.list`
- `sessions.preview`
- `agents.message`
- `models.list`

For unsupported gateway-only methods, return a clear unsupported response.

### Why Not Force It Through The WebSocket Gateway?

For the web demo, forcing WebLLM through a WebSocket gateway adds a fake server
boundary for no benefit. The runtime provider abstraction already exists in
Claw3D. Use it.

If a future host needs WebLLM to expose the OpenClaw gateway protocol, that can
be a separate `webllm-gateway-adapter` later.

### Data Model

Minimal local agent:

```ts
{
  id: "local-webllm-main",
  name: "Claw Demo Agent",
  provider: "webllm",
  model: selectedModelId,
  status: "idle" | "loading" | "ready" | "generating" | "error"
}
```

Persist locally:

```txt
localStorage["claw3d:webllm:model"]
localStorage["claw3d:webllm:consent"]
localStorage["claw3d:webllm:last-ready"]
```

Model bytes should use the browser cache/IndexedDB path managed by WebLLM. Do
not invent custom model storage unless WebLLM needs help.

### Build / Bundle Rule

WebLLM must be lazy-loaded.

Do not include the WebLLM engine in the default Claw3D bundle. Import it only
after the user selects **On-Device AI**:

```ts
const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
```

This keeps the normal app light and avoids breaking unsupported browsers at
startup.

### Release Positioning

This should become the public demo story:

```txt
Claw3D can run with:
  - no backend: scripted demo
  - no backend + WebGPU: real local LLM demo
  - local PC gateway: OpenClaw/Hermes/BitNet/Vera
  - remote/Tailscale gateway: full multi-agent runtime
```

That is better than a fake demo because "demo" can actually reason, while still
keeping the serious runtime paths intact.

### First Implementation Slice

1. Add `webllm` to `RuntimeProviderId` / adapter type.
2. Add connect-screen button: **On-Device AI**.
3. Add lazy WebLLM support check.
4. Add model catalog with one default small model.
5. Implement `agents.list`, `models.list`, and `agents.message`.
6. Stream text deltas into the existing chat flow.
7. Keep scripted Demo as fallback.

Do this before BitNet native. It proves the product idea quickly and gives the
APK/web demo a real local agent.

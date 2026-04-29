# Mobile LLM Strategy

This doc covers Claw3D's Android/mobile LLM options. It separates the shippable
demo path from the heavier native inference path.

## Goals

- Keep the Android APK usable without a required backend.
- Preserve the existing gateway/runtime profile model.
- Avoid bundling very large model files into the APK.
- Let advanced users connect to their own runtime over LAN or Tailscale.
- Leave room for true native/offline inference later.

## Current Native Connection State

Native builds should use direct connections instead of the web proxy path.

Known fixed behavior:

- Studio settings persist through `localStorage` in Capacitor/native builds.
- Last-known-good gateway URL, token, and adapter type are remembered.
- Native OpenClaw identifies as `openclaw-control-ui`, not `webchat-ui`.
- `proxy-url.ts` is bypassed by native GatewayClient connection logic.

Native-friendly runtime connection examples:

| Adapter | URL Pattern | Native Status |
| --- | --- | --- |
| Demo gateway | `ws://<pc-ip>:18789` | Works if PC is reachable |
| OpenClaw | `wss://<device>.ts.net:18789` or LAN IP | Direct connection |
| Hermes | `ws://<pc-ip>:18789` | Direct connection |
| Paperclip | `ws://<pc-ip>:18791` | Direct connection |
| Local/custom HTTP | `http://<pc-ip>:7770` | Direct HTTP runtime |

Tailscale is the cleanest development path: install Tailscale on Android and
the gateway machine, then use the `.ts.net` address in Claw3D.

## Option 1: WebLLM In The WebView

This is the first shippable local LLM path.

What it gives:

- no backend required
- no Android native code
- model download/cache managed by the web runtime
- a real local "demo" agent in the Claw3D surface

Constraints:

- WebGPU/WebView support varies by device.
- Model size still matters.
- Low-end phones need a fallback.

See [on-device-ai.md](on-device-ai.md).

## Option 2: Companion Runtime Over LAN/Tailscale

This is already aligned with the current architecture.

Examples:

- OpenClaw gateway running on a PC
- Hermes adapter running on a PC
- Vera-Torch running on a PC
- BitNet server running on a PC

Claw3D mobile connects to the runtime by IP or Tailscale address. This is the
best power-user path and requires no APK-native inference work.

## Option 3: BitNet Native Plugin

This is the long-term offline Android lane.

Requirements:

- `bitnet.cpp` cross-compiled for Android ARM64
- Android NDK/CMake setup
- JNI bridge
- Capacitor plugin
- model download and app-private cache
- runtime provider or local gateway adapter

This is valuable, but it should not block the app or the WebLLM demo path.

See [bitnet-vera-torch.md](bitnet-vera-torch.md).

## Rollout Order

1. **WebLLM / On-Device AI**
   - fastest route to a real no-backend demo
   - proves product value

2. **Companion runtime presets**
   - document LAN/Tailscale flows for OpenClaw, Hermes, Vera-Torch, and BitNet
   - polish the connect UI around saved profiles

3. **Remote office native fix**
   - separate from LLM work
   - make gateway mode use direct client-side connection on native

4. **BitNet native**
   - only after the runtime and UX story is stable

## Non-Goals For The First Android Pass

- Bundling a 1GB model into the APK.
- Making BitNet native mandatory.
- Replacing OpenClaw/Hermes/Vera-Torch.
- Building a second runtime abstraction beside the existing provider seam.

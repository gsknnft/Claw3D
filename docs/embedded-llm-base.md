# Embedded LLM Base

This file is now an index for the Claw3D embedded/local LLM work.

The original note was a long scratchpad from Android app work and mixed several
separate concerns:

- native Android connection persistence
- remote office behavior on native builds
- WebLLM as a shippable in-browser demo
- BitNet as a native/on-device runtime target
- Custom Stack as the server-side/local stack integration point

Those lanes are now split into focused docs.

## Read These Instead

| Doc | Scope |
| --- | --- |
| [on-device-ai.md](on-device-ai.md) | WebLLM directly in Claw3D for a shippable no-backend demo |
| [mobile-llm-strategy.md](mobile-llm-strategy.md) | Android app LLM options and recommended rollout order |
| [bitnet-custom.md](bitnet-custom.md) | BitNet model/runtime notes and how it should route through custom runtimes |
| [native-os-ai.md](native-os-ai.md) | Phone/vendor/system AI as a later platform adapter lane |
| [remote-office-native.md](remote-office-native.md) | Remote office modes and native APK constraints |
| [runtime-profiles.md](runtime-profiles.md) | Existing Claw3D runtime profile model |

## Current Decision

Use two separate implementation lanes:

1. **WebLLM / On-Device AI**
   - first shippable local LLM demo
   - browser/WebView only
   - lazy-loaded
   - no native Android plugin

2. **BitNet Native / Custom Server/Proxy**
   - long-term higher-performance local/offline lane
   - `bitnet.cpp` runtime
   - Android NDK/JNI/Capacitor work for true on-device
   - Custom server/proxy work for stack integration

Do not force the WebLLM demo through the BitNet/native path. Do not block the
Android app on BitNet native work.

## Immediate Next Implementation Slice

For the public/demo path:

1. Add `webllm` / **On-Device AI** as a runtime profile.
2. Lazy-load WebLLM only after the user selects it.
3. Add one small model default.
4. Expose one local demo agent.
5. Route chat through the existing runtime provider seam.
6. Keep scripted Demo as fallback.

For the Android runtime path:

1. Keep gateway settings persistence stable on native.
2. Keep direct OpenClaw/Hermes/Paperclip/custom connections working by LAN or
   Tailscale.
3. Treat remote office server-proxy gaps separately.
4. Treat BitNet native as a later runtime plugin, not a prerequisite for the APK.

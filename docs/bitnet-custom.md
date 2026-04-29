# BitNet And Custom Integration

This doc captures the BitNet lane for Claw3D and the broader SigilNet stack.

## Known Model

Current local model:

```txt
sigilnet/models/bitnet/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf
```

Observed size:

```txt
1.13 GB
```

This is already the production-oriented BitNet artifact. The raw/full-precision
model would be much larger. The `i2_s` format is BitNet-specific and requires
`bitnet.cpp` kernels for the intended performance path.

## Important Runtime Constraint

Do not assume this model is a normal llama.cpp GGUF model.

BitNet's `i2_s` format needs the BitNet runtime path. Standard llama.cpp may not
load or accelerate it correctly without the BitNet-specific kernels.

## Practical Integration Paths

### 1. Companion BitNet Server

Best near-term route.

```txt
bitnet.cpp server on PC
  -> OpenAI-compatible HTTP endpoint
  -> Claw3D local/custom runtime profile
  -> mobile via LAN/Tailscale
```

This requires no native Android plugin. It also matches the existing Claw3D
runtime profile model.

### 2. Custom Proxy / Router

Best stack integration route.

```txt
Claw3D / Custom UI
  -> Custom API
  -> model router
  -> BitNet backend when model format is i2_s
```

Custom should not try to treat BitNet as a normal llama.cpp model. It should
route BitNet models to a BitNet backend:

- spawn/manage a `bitnet.cpp` server subprocess, or
- proxy to a configured external BitNet server, or
- later call a native/Python binding if one exists and is stable.

The clean contract is OpenAI-compatible HTTP. Custom can keep exposing its
normal chat/completions surface while selecting the backend internally.

### 3. Android Native BitNet

Best long-term offline route.

```txt
bitnet.cpp
  -> Android ARM64 build
  -> JNI bridge
  -> Capacitor plugin
  -> Claw3D runtime provider
```

This requires model download/cache management. The 1.13 GB model should not be
bundled inside the APK.

## Recommended Custom Shape

Add a model runtime descriptor:

```json
{
  "id": "bitnet-b1.58-2b-4t",
  "family": "bitnet",
  "format": "i2_s",
  "path": "models/bitnet/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf",
  "backend": "bitnet-server",
  "endpoint": "http://localhost:7770"
}
```

Then route by backend:

```txt
backend: llama-cpp       -> existing GGUF path
backend: bitnet-server   -> OpenAI-compatible BitNet server
backend: remote-openai   -> hosted/provider path
```

## How Claw3D Should See It

Claw3D should not need to know BitNet internals.

For Claw3D, BitNet should appear as one of:

- `local` runtime profile pointing at Custom
- `custom` runtime profile pointing at a BitNet OpenAI-compatible server
- future native `bitnet` or `on-device` runtime provider

That keeps Claw3D clean and avoids leaking model/runtime details into UI state.

## Open Questions

- Is the BitNet server endpoint stable enough to use as the first Custom
  backend?
- Should Custom own the BitNet subprocess lifecycle, or only proxy to an
  externally managed server first?
- Do we want a smaller BitNet model for Android-first testing before the 2B
  model?
- What minimum Android device class is acceptable for native BitNet?

## Recommendation

Use the BitNet server path first:

1. Start BitNet on the workstation/server.
2. Point Custom or Claw3D `local/custom` profile at it.
3. Confirm chat quality and latency through the normal UI.
4. Only then build the Android native plugin.

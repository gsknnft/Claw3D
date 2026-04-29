# Remote Office On Native Builds

This doc captures the remote-office behavior discovered during Android work.

## Current Feature

Remote office lets one Claw3D instance display agents from another runtime or
office.

Configured through:

```txt
Settings Panel -> Remote Office
```

Settings live under the Studio office preference state:

- `remoteOfficeEnabled`
- `remoteOfficeSourceKind`
- `remoteOfficePresenceUrl`
- `remoteOfficeGatewayUrl`
- `remoteOfficeToken`

## Source Modes

| Mode | Meaning |
| --- | --- |
| `presence_endpoint` | Poll an HTTP endpoint that returns a presence snapshot |
| `openclaw_gateway` | Use a remote OpenClaw gateway as the source |

On the web/Next server path, both modes currently depend on server-side API
routes such as:

```txt
/api/office/presence
/api/office/layout
/api/office/remote-message
/api/office/remote-handoff
```

## Native APK Constraint

A standalone Capacitor APK does not have the Next API server available.

That means any mode that depends on `/api/office/...` will fail unless the app
is connected to a hosted Studio server.

## Important Distinction

The app has enough client-side gateway infrastructure to support direct
WebSocket connections on native builds. The remote-office path should use that
for `openclaw_gateway` on native, instead of routing through a server API.

`presence_endpoint` is different: it is HTTP polling and can work only if the
URL is directly reachable from the device and the implementation does not rely
on a server-side proxy.

## Recommended Native Behavior

For native builds:

```txt
sourceKind = openclaw_gateway
  -> connect directly to remote gateway from the device
  -> use GatewayClient in-browser/native
  -> list agents / status / sessions preview client-side

sourceKind = presence_endpoint
  -> fetch the provided endpoint directly if CORS/auth allows
  -> otherwise show a clear unsupported-on-native message
```

Do not silently call `/api/office/presence` in a static APK and leave the user
with an empty remote office.

## Implementation Notes

Target file:

```txt
src/features/office/hooks/useRemoteOfficePresence.ts
```

Expected fix shape:

1. Detect Capacitor/native.
2. If native and `sourceKind === "openclaw_gateway"`, use the direct gateway
   loader.
3. If native and `sourceKind === "presence_endpoint"`, fetch directly or return
   a clear error if direct fetch is not supported.
4. Keep web behavior unchanged.

## UX Copy

When unsupported:

```txt
Remote office presence endpoints require a reachable HTTP endpoint on native.
Use Remote OpenClaw Gateway mode for direct device-to-gateway connections.
```

## Relationship To LLM Work

Remote office is not an embedded LLM feature. It is a transport/presence issue
that surfaced during Android testing. Keep it separate from WebLLM and BitNet
work.

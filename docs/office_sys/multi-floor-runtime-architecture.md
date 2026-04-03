# Multi-Floor Runtime Architecture

> Architecture note for evolving Claw3D from single-runtime switching into one persistent building with multiple runtime-backed floors.

## Goal

Claw3D should move from:

- one selected runtime at a time

to:

- one building shell
- multiple floors
- one runtime binding per floor
- one or more floors active in the same session
- persistent roster/state per floor
- controlled cross-floor interaction

This is the bridge from the merged runtime seam work into Office Systems.

## Product Model

The user should think in places, not provider toggles.

Examples:

- `Lobby`
  - onboarding, demo, reception, visitor flow
- `OpenClaw Floor`
  - default upstream team
- `Hermes Floor`
  - supervisor / orchestration team
- `Custom Floor`
  - downstream/orchestrator/runtime experiments
- `Training Floor`
  - classrooms, auditorium, distillation labs, evals, coaching, simulations
- `Trader's Floor`
  - event streams, signals, analyst desks, execution pits
- `Outside / Campus`
  - stadium, events, unlockables, public scenes

Additional future departments:

- `War Room`
  - incident response, debugging, approvals, ops escalation
- `R&D Lab`
  - prompt experiments, model comparisons, benchmarks
- `Legal / Compliance`
  - permissions, policies, audit trails
- `Studio / Broadcast Room`
  - demos, presentations, voice/video outputs
- `Watercooler / Commons`
  - intentional cross-agent cross-talk space

## Core Principles

- One runtime per floor.
- One shared building shell above all floors.
- Floor state is persistent and local to that floor.
- Building systems are shared and runtime-neutral.
- Cross-floor coordination is explicit, not accidental.
- The gateway/runtime remains the source of truth for runtime-owned data.

## Why Floors

Floors solve several problems at once:

- they preserve backend neutrality
- they prevent multi-runtime support from flattening into one undifferentiated roster
- they make agent origin legible to the user
- they let Office Systems map naturally onto place
- they create a clean future path for cross-runtime coordination

Instead of "choose one provider", the user can think:

- OpenClaw is downstairs
- Hermes is on the first floor
- Custom is upstairs
- Demo starts in the lobby

## Building Layers

### 1. Building Shell

Persistent across the whole app:

- top-level navigation
- player identity
- building map / floor switcher
- building-wide settings
- shared event feed
- shared progression/unlocks
- common Office Systems surfaces

This layer should not depend on one runtime being selected.

### 2. Floor Runtime Surface

Owned per floor:

- provider binding
- runtime profile and connection settings
- connection status and error state
- hydrated roster for that floor
- floor-local room state
- floor signage / presentation metadata

### 3. Shared Building Systems

Runtime-neutral systems that can reference one or many floors:

- bulletin board
- whiteboard
- meeting rooms
- QA systems
- approvals
- shared announcements
- watercooler / commons

### 4. Cross-Floor Coordination

Later-phase systems:

- cross-floor messaging
- supervisor handoff chains
- dispatch boards
- agent encounter rules
- multi-floor meetings

## Runtime Rules

Each floor has exactly one runtime binding at a time.

Examples:

- `openclaw-ground`
  - provider: `openclaw`
- `hermes-first`
  - provider: `hermes`
- `custom-second`
  - provider: `custom`
- `demo-lobby`
  - provider: `demo`

A floor can be:

- configured but disconnected
- connecting
- connected
- errored

Multiple floors may be loaded in the same session, but they should not share runtime connection state.

## State Ownership

### Runtime-owned

Still owned by the runtime/gateway:

- agent records
- sessions
- approvals
- runtime files
- runtime event streams

### Studio-owned

Local Claw3D state should own:

- floor registry
- active floor
- saved runtime profile per floor
- last-known-good profile per floor
- floor-local presentation preferences
- building-level Office Systems state

This follows the existing architecture boundary in [ARCHITECTURE.md](/c:/Users/G/Desktop/Builds/sigilnet/isolation/Claw3D/ARCHITECTURE.md): Claw3D should not become the system of record for runtime agent state.

## Floor Registry

The first concrete implementation step should be a floor registry.

Required fields:

- floor id
- label
- provider
- zone / level kind
- connection profile key
- whether the floor is enabled

Suggested shape:

```ts
type FloorProvider = "openclaw" | "hermes" | "custom" | "demo";

type FloorId =
  | "lobby"
  | "openclaw-ground"
  | "hermes-first"
  | "custom-second"
  | "training"
  | "traders-floor"
  | "campus";

type FloorDefinition = {
  id: FloorId;
  label: string;
  provider: FloorProvider;
  kind: "core" | "support" | "simulation" | "outside";
  enabled: boolean;
  runtimeProfileId: string | null;
};
```

## Persistent Per-Floor Runtime State

This should be the first real implementation slice after the doc.

Each floor needs persistent local state for:

- selected runtime profile
- last-known-good connection profile
- connection status
- recent connect error
- last successful roster snapshot metadata

Suggested shape:

```ts
type FloorRuntimeState = {
  floorId: FloorId;
  provider: FloorProvider;
  runtimeProfileId: string | null;
  gatewayUrl: string | null;
  status: "disconnected" | "connecting" | "connected" | "error";
  lastKnownGoodAt: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};
```

Important rule:

- floor-local runtime state should not be overwritten by switching to another floor

## Multi-Provider Roster Loading

Today Claw3D mostly thinks in one active roster.

The next model should be:

- one roster per floor
- one hydration pipeline per floor
- one selected active floor in the UI

Suggested shape:

```ts
type FloorRosterEntry = {
  id: string;
  displayName: string;
  runtimeName: string | null;
  identityName: string | null;
  sessionDisplayName: string | null;
  role?: string | null;
  status: "idle" | "running" | "error";
};

type FloorRosterState = {
  floorId: FloorId;
  loadedAt: number | null;
  entries: FloorRosterEntry[];
};
```

This matches recent runtime work:

- preserve useful runtime and identity metadata
- do not throw away `runtimeName`, `identityName`, or `sessionDisplayName`

## Building Shell vs Floor Scene

The office should split into:

### Building shell

- navigation
- floor switcher
- global overlays
- building systems surfaces

### Floor scene

- runtime-backed roster
- room layout for that floor
- floor-local devices and props
- floor-local agent simulation

That prevents reconnecting or swapping floors from feeling like the whole app is remounting.

## Cross-Floor Messaging Model

Cross-floor coordination should be explicit.

Do not infer it from raw runtime adjacency.

Recommended primitives:

- handoff board
- floor inbox
- supervisor dispatch
- meeting invite
- commons encounter

Minimal event shape:

```ts
type CrossFloorMessage = {
  id: string;
  fromFloorId: FloorId;
  fromAgentId: string;
  toFloorId: FloorId;
  toAgentId: string | null;
  kind: "handoff" | "request" | "broadcast" | "meeting-invite";
  subject: string;
  body: string;
  createdAt: number;
};
```

Important rule:

- cross-floor messaging is a building system
- it should not require editing runtime config files directly

## Office Systems Fit

This architecture is meant to support the Office Systems roadmap, not compete with it.

Good examples:

- `Lobby`
  - onboarding, demo, reception
- `Training Floor`
  - classrooms, evals, replay, distillation
- `Trader's Floor`
  - feeds, signals, alerts, analyst desks
- `Outside / Campus`
  - stadium and event spaces

The pending stadium PR [#88](https://github.com/iamlukethedev/Claw3D/pull/88) should be treated as a future `Outside / Campus` scene, not as a blocker for the core floor/runtime model.

## Progression / Unlocks

Possible progression model:

- first login
  - lobby only
- after first runtime setup
  - OpenClaw floor
- after multi-runtime setup
  - Hermes floor
- after usage thresholds
  - Training floor
- later milestones
  - Trader's floor
  - Campus / stadium

Possible unlock outputs:

- floor access
- room access
- signage themes
- team/floor colors
- props and trophies

## Recommended Implementation Order

1. Finalize multi-floor architecture doc
2. Add floor registry model
3. Add persistent per-floor runtime state
4. Add multi-provider roster loading
5. Add building shell + floor switcher
6. Add cross-floor messaging primitives
7. Build Office Systems on top

This keeps floors foundational, and avoids building bulletin boards / meetings / QA on top of a single-runtime assumption that will just need to be broken later.

## Immediate Non-Goals

Not for the first slice:

- full cross-floor conversation simulation
- automatic agent movement across floors
- deep unlock/economy system
- multi-user tenancy
- replacing the runtime as system of record

## Summary

Claw3D should evolve into:

- one building shell
- multiple runtime-backed floors
- one roster per floor
- persistent floor-local state
- shared building-native Office Systems

That gives the project a clean path from merged runtime support into real Office Systems without collapsing everything back into one flat provider toggle.

"use client";

import type { ClawFCMatchEvent } from "@/lib/clawfc/types";

const STANDARD_MATCH_MINUTES = [15, 30, 45, 60, 90] as const;

export function deriveMatchDurationMinutes(
  events: ClawFCMatchEvent[],
  fallback = 90,
): number {
  const maxMinute = events.reduce(
    (max, event) => Math.max(max, Math.ceil(event.minute ?? 0)),
    0,
  );

  if (maxMinute <= 0) return fallback;

  for (const duration of STANDARD_MATCH_MINUTES) {
    if (maxMinute <= duration) return duration;
  }

  return Math.max(fallback, maxMinute);
}

export function getMatchRealtimeSeconds(durationMinutes: number): number {
  return durationMinutes * 60;
}

export function getReplayMinute(
  elapsedSeconds: number,
  durationMinutes: number,
): number {
  const realtimeSeconds = getMatchRealtimeSeconds(durationMinutes);
  return Math.min(
    durationMinutes,
    Math.floor(
      ((elapsedSeconds % realtimeSeconds) / realtimeSeconds) * durationMinutes,
    ) + 1,
  );
}

export function getReplayMinuteFrac(
  elapsedSeconds: number,
  durationMinutes: number,
): number {
  const realtimeSeconds = getMatchRealtimeSeconds(durationMinutes);
  return Math.min(
    durationMinutes,
    ((elapsedSeconds % realtimeSeconds) / realtimeSeconds) * durationMinutes +
      1,
  );
}

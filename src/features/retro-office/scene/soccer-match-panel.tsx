"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClawFC } from "@/lib/clawfc/context";
import {
  deriveMatchDurationMinutes,
  getReplayMinute,
} from "@/lib/clawfc/match-timing";
import type { ClawFCMatchEvent } from "@/lib/clawfc/types";

const GOAL_TYPES = new Set(["goal", "penalty_goal"]);

const eventIcon = (type: ClawFCMatchEvent["type"]): string => {
  switch (type) {
    case "goal":
      return "\u26BD";
    case "yellow_card":
      return "\uD83D\uDFE8";
    case "red_card":
      return "\uD83D\uDFE5";
    case "substitution":
      return "\uD83D\uDD04";
    default:
      return "\u2022";
  }
};

const resolveEventPlayerName = (event: ClawFCMatchEvent): string =>
  event.scorer_name ?? event.player ?? "Unknown";

export function SoccerMatchPanelCard() {
  const {
    configured,
    loading,
    clubs,
    standings,
    selectedClubId,
    matchContext,
    selectClub,
  } = useClawFC();
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleClubSelect = useCallback(
    (clubId: string) => {
      selectClub(clubId);
      setSelectorOpen(false);
    },
    [selectClub],
  );

  const match = matchContext?.match;
  const sortedEvents = useMemo(
    () => [...(match?.events ?? [])].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0)),
    [match?.events],
  );
  const matchDurationMinutes = useMemo(
    () => deriveMatchDurationMinutes(sortedEvents),
    [sortedEvents],
  );

  const isLive =
    match?.status === "live" ||
    match?.status === "played" ||
    match?.status === "finished";

  const [liveMinute, setLiveMinute] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    setLiveMinute(0);
  }, [match?.id, matchDurationMinutes]);

  useEffect(() => {
    if (!isLive) return;
    if (!startTimeRef.current) startTimeRef.current = Date.now();
    const start = startTimeRef.current;
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const m = getReplayMinute(elapsed, matchDurationMinutes);
      setLiveMinute(m);
    }, 1000);
    return () => clearInterval(id);
  }, [isLive, matchDurationMinutes]);

  const liveScore = useMemo(() => {
    let h = 0;
    let a = 0;
    for (const evt of sortedEvents) {
      if (evt.minute > liveMinute) break;
      if (GOAL_TYPES.has(evt.type)) {
        if (evt.team === "home") h++;
        else if (evt.team === "away") a++;
      } else if (evt.type === "own_goal") {
        if (evt.team === "home") a++;
        else if (evt.team === "away") h++;
      }
    }
    return { home: h, away: a };
  }, [sortedEvents, liveMinute]);

  const displayHome = isLive ? liveScore.home : (match?.home_goals ?? 0);
  const displayAway = isLive ? liveScore.away : (match?.away_goals ?? 0);

  if (!configured) return null;

  return (
    <div
      style={{
        width: 260,
        background: "rgba(15, 23, 42, 0.92)",
        borderRadius: 8,
        padding: 12,
        color: "#f8fafc",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        lineHeight: 1.4,
        pointerEvents: "auto",
        userSelect: "none",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
      }}
    >
      {/* Header with club selector. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            color: "#fbbf24",
            letterSpacing: 0.5,
          }}
        >
          ClawFC
        </span>
        <button
          type="button"
          onClick={() => setSelectorOpen(!selectorOpen)}
          style={{
            background: "rgba(71, 85, 105, 0.6)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: 4,
            color: "#cbd5e1",
            fontSize: 10,
            padding: "2px 8px",
            cursor: "pointer",
          }}
        >
          {selectorOpen ? "Close" : "Switch Club"}
        </button>
      </div>

      {/* Club selector dropdown. */}
      {selectorOpen ? (
        <div
          style={{
            maxHeight: 140,
            overflowY: "auto",
            marginBottom: 8,
            borderRadius: 4,
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => handleClubSelect(club.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "4px 8px",
                background:
                  selectedClubId === club.id
                    ? "rgba(251, 191, 36, 0.15)"
                    : "transparent",
                border: "none",
                borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                color: "#e2e8f0",
                fontSize: 10,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: club.primary_color,
                  flexShrink: 0,
                  border: `1px solid ${club.secondary_color}`,
                }}
              />
              {club.name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div style={{ color: "#94a3b8", textAlign: "center", padding: 12 }}>
          Loading...
        </div>
      ) : match ? (
        <>
          {/* Match header. */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
              padding: "6px 0",
              borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    matchContext?.homeClub.primary_color ?? "#2563eb",
                }}
              />
              <span style={{ fontWeight: 600, fontSize: 11 }}>
                {matchContext?.homeClub.name ?? "Home"}
              </span>
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#fbbf24",
                padding: "0 8px",
              }}
            >
              {displayHome} - {displayAway}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 11 }}>
                {matchContext?.awayClub.name ?? "Away"}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    matchContext?.awayClub.primary_color ?? "#dc2626",
                }}
              />
            </div>
          </div>

          {/* Match status. */}
          <div
            style={{
              fontSize: 9,
              color: "#94a3b8",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {isLive
              ? `\uD83D\uDD34 LIVE — ${liveMinute}'`
              : match.status === "scheduled"
                ? "Scheduled"
                : `Played${match.matchweek ? ` \u2022 Week ${match.matchweek}` : ""}`}
          </div>

          {/* League table snapshot. */}
          {standings.length > 0 ? (
            <div
              style={{
                marginBottom: 6,
                borderRadius: 4,
                background: "rgba(30, 41, 59, 0.5)",
                padding: 6,
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 9,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                League Table
              </div>
              {standings.slice(0, 6).map((row, index) => {
                const club = clubs.find((c) => c.id === row.club_id);
                const isHighlighted = row.club_id === selectedClubId;
                return (
                  <div
                    key={row.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "2px 0",
                      color: isHighlighted ? "#fbbf24" : "#e2e8f0",
                      fontSize: 10,
                      borderBottom:
                        index < Math.min(standings.length, 6) - 1
                          ? "1px solid rgba(148, 163, 184, 0.08)"
                          : "none",
                    }}
                  >
                    <span style={{ width: 14, textAlign: "right", color: "#94a3b8" }}>
                      {index + 1}
                    </span>
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {club?.name ?? "Unknown Club"}
                    </span>
                    <span style={{ width: 16, textAlign: "right", color: "#cbd5e1" }}>
                      {row.points}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Events timeline (significant events only, up to current minute). */}
          {(() => {
            const DISPLAY_TYPES = new Set([
              "goal", "penalty_goal", "own_goal", "penalty_miss",
              "yellow_card", "red_card", "substitution",
            ]);
            const visibleEvents = sortedEvents.filter(
              (e) => DISPLAY_TYPES.has(e.type) && (!isLive || e.minute <= liveMinute),
            );
            if (visibleEvents.length === 0) {
              return (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    textAlign: "center",
                    padding: 8,
                  }}
                >
                  {isLive && liveMinute < 5
                    ? `Match underway — ${liveMinute}'`
                    : "No events recorded."}
                </div>
              );
            }
            return (
              <div
                style={{
                  maxHeight: 100,
                  overflowY: "auto",
                  borderRadius: 4,
                  background: "rgba(30, 41, 59, 0.5)",
                  padding: 6,
                }}
              >
                {visibleEvents.map((event, index) => (
                  <div
                    key={`event-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "2px 0",
                      borderBottom:
                        index < visibleEvents.length - 1
                          ? "1px solid rgba(148, 163, 184, 0.08)"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: 9,
                        minWidth: 20,
                        textAlign: "right",
                      }}
                    >
                      {event.minute}&apos;
                    </span>
                    <span style={{ fontSize: 11 }}>
                      {eventIcon(event.type)}
                    </span>
                    <span style={{ color: "#e2e8f0", fontSize: 10 }}>
                      {resolveEventPlayerName(event)}
                      {event.assist_name ? (
                        <span style={{ color: "#94a3b8" }}>
                          {" "}
                          (ast. {event.assist_name})
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Match report preview. */}
          {match.match_report ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 9,
                color: "#94a3b8",
                borderTop: "1px solid rgba(148, 163, 184, 0.15)",
                paddingTop: 6,
                maxHeight: 60,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              {match.match_report.slice(0, 300)}
              {match.match_report.length > 300 ? "..." : ""}
            </div>
          ) : null}
        </>
      ) : (
        <div
          style={{
            color: "#64748b",
            textAlign: "center",
            padding: 16,
            fontSize: 10,
          }}
        >
          No match data available.
          <br />
          Select a club to view their latest match.
        </div>
      )}
    </div>
  );
}

export const SoccerMatchPanel = memo(function SoccerMatchPanel() {
  return (
    <SoccerMatchPanelCard />
  );
});

"use client";

import {
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import type { AgentState } from "@/features/agents/state/store";
import type { CronJobSummary } from "@/lib/cron/types";
import { formatCronSchedule } from "@/lib/cron/types";
import type { TaskBoardCard, TaskBoardStatus } from "@/features/office/tasks/types";

const STATUS_LABELS: Record<TaskBoardStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
};

const STATUS_ORDER: TaskBoardStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "review",
  "done",
];

const formatRelativeTime = (value: string | null) => {
  if (!value) return "No activity";
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return "No activity";
  const delta = Math.max(0, Date.now() - at);
  if (delta < 60_000) return "Just now";
  if (delta < 3_600_000) return `${Math.max(1, Math.floor(delta / 60_000))}m ago`;
  if (delta < 86_400_000) return `${Math.max(1, Math.floor(delta / 3_600_000))}h ago`;
  return `${Math.max(1, Math.floor(delta / 86_400_000))}d ago`;
};

const formatMs = (ms: number | undefined) => {
  if (!ms) return null;
  return new Date(ms).toLocaleString();
};

const stopAndGetCardId = (event: DragEvent<HTMLElement>) => {
  event.preventDefault();
  event.stopPropagation();
  return event.dataTransfer.getData("text/task-card-id").trim();
};

type CronAlert = { jobId: string; name: string; status: "ok" | "error"; at: number };

export function TaskBoardView({
  title,
  subtitle,
  agents,
  cardsByStatus,
  selectedCard,
  activeRuns,
  cronJobs,
  cronLoading,
  cronError,
  taskCaptureDebug,
  onCreateCard,
  onMoveCard,
  onSelectCard,
  onUpdateCard,
  onDeleteCard,
  onRefreshCronJobs,
}: {
  title: string;
  subtitle: string;
  agents: AgentState[];
  cardsByStatus: Record<TaskBoardStatus, TaskBoardCard[]>;
  selectedCard: TaskBoardCard | null;
  activeRuns: Array<{ runId: string; agentId: string; label: string }>;
  cronJobs: CronJobSummary[];
  cronLoading: boolean;
  cronError: string | null;
  taskCaptureDebug?: {
    lastStatus: "idle" | "detected" | "persisted" | "failed" | "unsupported";
    lastUpdatedAt: string | null;
    lastTitle: string | null;
    lastTaskId: string | null;
    lastSessionKey: string | null;
    lastMessage: string | null;
    detectedCount: number;
    visibleCardCount: number;
    totalCardCount: number;
    sharedTasksSupported: boolean;
    sharedTasksLoading: boolean;
    sharedTasksError: string | null;
  };
  onCreateCard: () => void;
  onMoveCard: (cardId: string, status: TaskBoardStatus) => void;
  onSelectCard: (cardId: string | null) => void;
  onUpdateCard: (cardId: string, patch: Partial<TaskBoardCard>) => void;
  onDeleteCard: (cardId: string) => void;
  onRefreshCronJobs: () => void;
}) {
  const [hideSystemTasks, setHideSystemTasks] = useState(true);
  const [clearPending, setClearPending] = useState<"system" | "all" | null>(null);
  const [cronExpanded, setCronExpanded] = useState(false);
  const [cronAlerts, setCronAlerts] = useState<CronAlert[]>([]);

  // Track running jobs to detect completions and fire alerts
  const prevRunningRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    const prev = prevRunningRef.current;
    const next = new Map<string, boolean>();
    const newAlerts: CronAlert[] = [];

    for (const job of cronJobs) {
      const isRunning = Boolean(job.state.runningAtMs);
      next.set(job.id, isRunning);
      const wasRunning = prev.get(job.id);
      if (wasRunning && !isRunning && job.state.lastStatus) {
        newAlerts.push({
          jobId: job.id,
          name: job.name,
          status: job.state.lastStatus === "ok" ? "ok" : "error",
          at: Date.now(),
        });
      }
    }

    prevRunningRef.current = next;
    if (newAlerts.length > 0) {
      setCronAlerts((prev) => [...prev, ...newAlerts]);
      // Auto-dismiss after 30 seconds
      const ids = newAlerts.map((a) => a.jobId);
      setTimeout(() => {
        setCronAlerts((prev) => prev.filter((a) => !ids.includes(a.jobId)));
      }, 30_000);
    }
  }, [cronJobs]);

  const allCards = STATUS_ORDER.flatMap((s) => cardsByStatus[s]);
  const systemCards = allCards.filter((c) => c.isInferred);
  const systemCardCount = systemCards.length;

  const filteredCardsByStatus: Record<TaskBoardStatus, TaskBoardCard[]> = hideSystemTasks
    ? Object.fromEntries(
        STATUS_ORDER.map((s) => [s, cardsByStatus[s].filter((c) => !c.isInferred)]),
      ) as Record<TaskBoardStatus, TaskBoardCard[]>
    : cardsByStatus;

  const handleClearConfirm = () => {
    if (clearPending === "system") {
      for (const card of systemCards) {
        onDeleteCard(card.id);
      }
    } else if (clearPending === "all") {
      for (const card of allCards) {
        onDeleteCard(card.id);
      }
    }
    setClearPending(null);
  };

  const runningJobs = cronJobs.filter((j) => j.state.runningAtMs);

  return (
    <section className="flex h-full min-h-0 flex-col bg-transparent text-white">
      {/* Header */}
      <div className="border-b border-cyan-500/10 bg-[#070b11]/22 px-4 py-3 backdrop-blur-[1px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
              {title}
            </div>
            <div className="mt-1 font-mono text-[11px] text-white/40">{subtitle}</div>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setHideSystemTasks((v) => !v)}
              title={hideSystemTasks ? "Show system tasks" : "Hide system tasks"}
              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              {hideSystemTasks ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {hideSystemTasks ? `System (${systemCardCount})` : "Hide system"}
            </button>

            {/* Bulk clear */}
            {clearPending ? (
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-rose-200/80">
                  Clear {clearPending === "all" ? "all" : "system"} tasks?
                </span>
                <button
                  type="button"
                  onClick={handleClearConfirm}
                  className="rounded border border-rose-500/40 bg-rose-500/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-rose-100 hover:border-rose-400/60"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setClearPending(null)}
                  className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/50 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {systemCardCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setClearPending("system")}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-rose-400/30 hover:text-rose-200"
                  >
                    Clear system ({systemCardCount})
                  </button>
                )}
                {allCards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setClearPending("all")}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-rose-400/30 hover:text-rose-200"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onRefreshCronJobs}
              className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              {cronLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
            </button>
            <button
              type="button"
              onClick={onCreateCard}
              className="inline-flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition-colors hover:border-cyan-400/50 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </button>
          </div>
        </div>

        {/* Cron job completion alerts */}
        {cronAlerts.map((alert) => (
          <div
            key={`${alert.jobId}-${alert.at}`}
            className={`mt-2 flex items-center justify-between gap-2 rounded border px-3 py-2 font-mono text-[11px] ${
              alert.status === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/30 bg-rose-500/10 text-rose-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {alert.status === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                Job &ldquo;{alert.name}&rdquo; {alert.status === "ok" ? "completed." : "failed."}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setCronAlerts((prev) => prev.filter((a) => a.jobId !== alert.jobId))
              }
              className="text-white/40 hover:text-white/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {cronError ? (
          <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-[11px] text-rose-100">
            {cronError}
          </div>
        ) : null}

        {/* Cron jobs panel */}
        {cronJobs.length > 0 ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setCronExpanded((v) => !v)}
              className="flex w-full items-center gap-2 rounded border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50 hover:text-white/75"
            >
              {cronExpanded ? (
                <ChevronUp className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 shrink-0" />
              )}
              <span>Scheduled jobs ({cronJobs.length})</span>
              {runningJobs.length > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-cyan-200">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                  {runningJobs.length} running
                </span>
              )}
            </button>
            {cronExpanded && (
              <div className="mt-1 space-y-1.5 rounded border border-white/8 bg-white/[0.02] px-3 py-3">
                {cronJobs.map((job) => {
                  const isRunning = Boolean(job.state.runningAtMs);
                  const lastStatus = job.state.lastStatus;
                  return (
                    <div
                      key={job.id}
                      className="flex items-start justify-between gap-3 rounded border border-white/6 bg-black/10 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isRunning ? (
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-400" />
                          ) : lastStatus === "ok" ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                          ) : lastStatus === "error" ? (
                            <AlertCircle className="h-3 w-3 shrink-0 text-rose-400" />
                          ) : (
                            <Clock className="h-3 w-3 shrink-0 text-white/30" />
                          )}
                          <span className="truncate text-[11px] font-medium text-white/80">
                            {job.name}
                          </span>
                          {!job.enabled && (
                            <span className="rounded bg-white/8 px-1 py-0.5 font-mono text-[9px] uppercase text-white/30">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-white/35">
                          {formatCronSchedule(job.schedule)}
                          {job.agentId ? ` · ${job.agentId}` : ""}
                        </div>
                        {job.state.lastError && (
                          <div className="mt-1 truncate font-mono text-[10px] text-rose-300/70">
                            {job.state.lastError}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right font-mono text-[10px] text-white/30">
                        {isRunning ? (
                          <div className="text-cyan-300/70">Running…</div>
                        ) : job.state.nextRunAtMs ? (
                          <div>Next: {formatMs(job.state.nextRunAtMs)}</div>
                        ) : null}
                        {job.state.lastRunAtMs ? (
                          <div>Last: {formatRelativeTime(new Date(job.state.lastRunAtMs).toISOString())}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {taskCaptureDebug ? (
          <details className="mt-2 rounded border border-amber-400/20 bg-amber-400/5 px-3 py-2 font-mono text-[11px] text-amber-50">
            <summary className="cursor-pointer list-none select-none">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-amber-100/75">
                <span>Capture debug</span>
                <span>Status: {taskCaptureDebug.lastStatus}</span>
                <span>Visible cards: {taskCaptureDebug.visibleCardCount}</span>
                <span>Tracked cards: {taskCaptureDebug.totalCardCount}</span>
                <span>Detected: {taskCaptureDebug.detectedCount}</span>
              </div>
            </summary>
            <div className="mt-2 grid gap-1 text-white/80">
              <div>Last request: {taskCaptureDebug.lastTitle ?? "None yet."}</div>
              <div>Last task id: {taskCaptureDebug.lastTaskId ?? "-"}</div>
              <div>Session/thread: {taskCaptureDebug.lastSessionKey ?? "-"}</div>
              <div>Last update: {formatRelativeTime(taskCaptureDebug.lastUpdatedAt)}</div>
              <div>
                Shared store:{" "}
                {taskCaptureDebug.sharedTasksSupported
                  ? taskCaptureDebug.sharedTasksLoading
                    ? "Syncing."
                    : "Available."
                  : "Unavailable."}
              </div>
              <div>
                Note:{" "}
                {taskCaptureDebug.lastMessage ?? "Waiting for inbound request detection."}
              </div>
              {taskCaptureDebug.sharedTasksError ? (
                <div className="text-rose-200">
                  Store error: {taskCaptureDebug.sharedTasksError}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>

      {/* Board */}
      <div
        className={`grid min-h-0 flex-1 overflow-hidden ${selectedCard ? "grid-cols-[minmax(0,1fr)_300px]" : "grid-cols-1"}`}
      >
        <div className="min-h-0 overflow-auto px-4 py-4">
          <div className="grid min-w-[700px] grid-cols-5 gap-3">
            {STATUS_ORDER.map((status) => {
              const cards = filteredCardsByStatus[status];
              return (
                <div
                  key={status}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    const cardId = stopAndGetCardId(event);
                    if (!cardId) return;
                    onMoveCard(cardId, status);
                  }}
                  className="flex min-h-[420px] flex-col rounded-xl border border-white/10 bg-black/14 backdrop-blur-[1px]"
                >
                  <div className="border-b border-white/8 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
                        {STATUS_LABELS[status]}
                      </div>
                      <div className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                        {cards.length}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {cards.length === 0 ? (
                      <div className="rounded border border-dashed border-white/10 px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">
                        Drop a card here.
                      </div>
                    ) : (
                      cards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          draggable
                          aria-label={`${card.title} — ${STATUS_LABELS[card.status]}. Arrow keys to move between columns.`}
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/task-card-id", card.id);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() =>
                            onSelectCard(selectedCard?.id === card.id ? null : card.id)
                          }
                          onKeyDown={(event: ReactKeyboardEvent) => {
                            const currentIdx = STATUS_ORDER.indexOf(card.status);
                            if (
                              event.key === "ArrowRight" &&
                              currentIdx < STATUS_ORDER.length - 1
                            ) {
                              event.preventDefault();
                              onMoveCard(card.id, STATUS_ORDER[currentIdx + 1]!);
                            } else if (event.key === "ArrowLeft" && currentIdx > 0) {
                              event.preventDefault();
                              onMoveCard(card.id, STATUS_ORDER[currentIdx - 1]!);
                            }
                          }}
                          className={`flex w-full flex-col rounded-lg border px-3 py-3 text-left transition-colors ${
                            selectedCard?.id === card.id
                              ? "border-cyan-400/35 bg-cyan-500/[0.10]"
                              : "border-white/8 bg-black/12 hover:border-cyan-400/20 hover:bg-cyan-500/[0.04]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="line-clamp-2 text-sm font-medium text-white/90">
                              {card.title}
                            </div>
                            <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
                              {card.source.replaceAll("_", " ")}
                            </span>
                          </div>
                          {card.description ? (
                            <div className="mt-2 line-clamp-3 text-[12px] leading-5 text-white/55">
                              {card.description}
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/38">
                            <span>{card.assignedAgentId ?? "Unassigned"}</span>
                            {card.runId ? <span>Run linked.</span> : null}
                            {card.playbookJobId ? <span>Playbook linked.</span> : null}
                          </div>
                          <div className="mt-2 font-mono text-[10px] text-white/32">
                            {formatRelativeTime(card.lastActivityAt ?? card.updatedAt)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedCard ? (
          <aside className="flex min-h-0 flex-col border-l border-white/8 bg-black/25">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                Task Details
              </div>
              <button
                type="button"
                onClick={() => onSelectCard(null)}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 hover:text-white/70"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Title
                </span>
                <input
                  value={selectedCard.title}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, { title: event.target.value })
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Description
                </span>
                <textarea
                  rows={4}
                  value={selectedCard.description}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, { description: event.target.value })
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Status
                </span>
                <select
                  value={selectedCard.status}
                  onChange={(event) =>
                    onMoveCard(selectedCard.id, event.target.value as TaskBoardStatus)
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                >
                  {STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Assigned agent
                </span>
                <select
                  value={selectedCard.assignedAgentId ?? ""}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      assignedAgentId: event.target.value || null,
                    })
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.agentId} value={agent.agentId}>
                      {agent.name || agent.agentId}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Linked active run
                </span>
                <select
                  value={selectedCard.runId ?? ""}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, { runId: event.target.value || null })
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">No linked run</option>
                  {activeRuns.map((run) => (
                    <option key={run.runId} value={run.runId}>
                      {run.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Linked playbook
                </span>
                <select
                  value={selectedCard.playbookJobId ?? ""}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      playbookJobId: event.target.value || null,
                    })
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">No linked playbook</option>
                  {cronJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Channel
                </span>
                <input
                  value={selectedCard.channel ?? ""}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      channel: event.target.value || null,
                    })
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  Notes
                </span>
                <textarea
                  rows={3}
                  value={selectedCard.notes.join("\n")}
                  onChange={(event) =>
                    onUpdateCard(selectedCard.id, {
                      notes: event.target.value
                        .split("\n")
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    })
                  }
                  className="rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                />
              </label>

              <div className="space-y-2 rounded border border-white/8 bg-white/[0.03] px-3 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/38">
                <div>Source: {selectedCard.source.replaceAll("_", " ")}.</div>
                <div>Created: {new Date(selectedCard.createdAt).toLocaleString()}.</div>
                <div>Updated: {new Date(selectedCard.updatedAt).toLocaleString()}.</div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteCard(selectedCard.id)}
                className="inline-flex items-center gap-2 rounded border border-rose-500/25 bg-rose-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-100 transition-colors hover:border-rose-400/50 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Task
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

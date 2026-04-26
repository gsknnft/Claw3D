"use client";

import type { ComponentProps } from "react";
import type { AgentState } from "@/features/agents/state/store";
import { TaskBoardView } from "@/features/office/tasks/TaskBoardView";
import type { TaskBoardCard, TaskBoardStatus } from "@/features/office/tasks/types";
import type { CronJobSummary } from "@/lib/cron/types";
import type { AgentLogEntry } from "@/features/office/tasks/AgentLogsPanel";

export function TaskBoardPanel({
  agents,
  cardsByStatus,
  selectedCard,
  activeRuns,
  cronJobs,
  cronLoading,
  cronError,
  taskCaptureDebug,
  logEntries,
  onCreateCardAction,
  onMoveCardAction,
  onSelectCardAction,
  onUpdateCardAction,
  onDeleteCardAction,
  onRefreshCronJobsAction,
  onClearLogsAction,
}: {
  agents: AgentState[];
  cardsByStatus: Record<TaskBoardStatus, TaskBoardCard[]>;
  selectedCard: TaskBoardCard | null;
  activeRuns: Array<{ runId: string; agentId: string; label: string }>;
  cronJobs: CronJobSummary[];
  cronLoading: boolean;
  cronError: string | null;
  taskCaptureDebug?: ComponentProps<typeof TaskBoardView>["taskCaptureDebug"];
  logEntries?: AgentLogEntry[];
  onCreateCardAction: () => void;
  onMoveCardAction: (cardId: string, status: TaskBoardStatus) => void;
  onSelectCardAction: (cardId: string | null) => void;
  onUpdateCardAction: (cardId: string, patch: Partial<TaskBoardCard>) => void;
  onDeleteCardAction: (cardId: string) => void;
  onRefreshCronJobsAction: () => void;
  onClearLogsAction?: () => void;
}) {
  return (
    <TaskBoardView
      title="Kanban"
      subtitle="Manual tasks, inferred requests, and scheduled playbooks."
      agents={agents}
      cardsByStatus={cardsByStatus}
      selectedCard={selectedCard}
      activeRuns={activeRuns}
      cronJobs={cronJobs}
      cronLoading={cronLoading}
      cronError={cronError}
      taskCaptureDebug={taskCaptureDebug}
      logEntries={logEntries}
      onCreateCardAction={onCreateCardAction}
      onMoveCardAction={onMoveCardAction}
      onSelectCardAction={onSelectCardAction}
      onUpdateCardAction={onUpdateCardAction}
      onDeleteCardAction={onDeleteCardAction}
      onRefreshCronJobsAction={onRefreshCronJobsAction}
      onClearLogsAction={onClearLogsAction}
    />
  );
}

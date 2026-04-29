import type { SharedTaskRecord } from "@/lib/tasks/shared-store";

const TASK_STORE_ROUTE = "/api/task-store";
const LOCAL_STORAGE_KEY = "claw3d_local_tasks";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

// Detection for Capacitor/Android environment
const isMobileApp = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;

export class TaskStoreRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TaskStoreRequestError";
    this.status = status;
  }
}

// Local Storage Fallback Implementation
const getLocalTasks = (): SharedTaskRecord[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveLocalTasks = (tasks: SharedTaskRecord[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
};

export const listSharedTaskRecords = async (): Promise<SharedTaskRecord[]> => {
  if (isMobileApp) {
    return getLocalTasks();
  }

  return withRetry(async () => {
    const response = await fetchWithTimeout(TASK_STORE_ROUTE, {
      method: "GET",
      cache: "no-store",
    });
    const body = await parseResponse<{ tasks: SharedTaskRecord[] }>(response);
    return Array.isArray(body.tasks) ? body.tasks : [];
  });
};

export const upsertSharedTaskRecord = async (
  task: Partial<SharedTaskRecord> & Pick<SharedTaskRecord, "id" | "title">
): Promise<SharedTaskRecord> => {
  if (isMobileApp) {
    const tasks = getLocalTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    const existing = index >= 0 ? tasks[index] : null;
    const nowIso = new Date().toISOString();

    const updatedTask: SharedTaskRecord = {
       id: task.id,
       title: task.title,
       description: task.description ?? existing?.description ?? "",
       status: task.status ?? existing?.status ?? 'todo',
       source: task.source ?? existing?.source ?? 'claw3d_manual',
       isArchived: task.isArchived ?? existing?.isArchived ?? false,
       isInferred: task.isInferred ?? existing?.isInferred ?? false,
       createdAt: task.createdAt ?? existing?.createdAt ?? nowIso,
       updatedAt: nowIso,
       sourceEventId: task.sourceEventId ?? existing?.sourceEventId ?? null,
       assignedAgentId: task.assignedAgentId ?? existing?.assignedAgentId ?? null,
       playbookJobId: task.playbookJobId ?? existing?.playbookJobId ?? null,
       runId: task.runId ?? existing?.runId ?? null,
       channel: task.channel ?? existing?.channel ?? null,
       externalThreadId: task.externalThreadId ?? existing?.externalThreadId ?? null,
       lastActivityAt: task.lastActivityAt ?? existing?.lastActivityAt ?? nowIso,
       notes: task.notes ?? existing?.notes ?? [],
       history: task.history ?? existing?.history ?? []
    };

    if (index >= 0) tasks[index] = updatedTask;
    else tasks.push(updatedTask);

    saveLocalTasks(tasks);
    return updatedTask;
  }

  return withRetry(async () => {
    const response = await fetchWithTimeout(TASK_STORE_ROUTE, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task }),
    });
    const body = await parseResponse<{ task: SharedTaskRecord }>(response);
    return body.task;
  });
};

export const archiveSharedTaskRecord = async (
  taskId: string
): Promise<SharedTaskRecord> => {
  if (isMobileApp) {
    const tasks = getLocalTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new TaskStoreRequestError("Task not found", 404);
    task.isArchived = true;
    task.updatedAt = new Date().toISOString();
    saveLocalTasks(tasks);
    return task;
  }

  return withRetry(async () => {
    const response = await fetchWithTimeout(TASK_STORE_ROUTE, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: taskId }),
    });
    const body = await parseResponse<{ task: SharedTaskRecord }>(response);
    return body.task;
  });
};

const isRetryable = (error: unknown): boolean => {
  if (error instanceof TaskStoreRequestError) {
    return error.status >= 500 || error.status === 429;
  }
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return error instanceof TypeError;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = (
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as { error?: string } & T;
  if (!response.ok) {
    throw new TaskStoreRequestError(
      body?.error || "Task store request failed.",
      response.status,
    );
  }
  return body;
};

const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_RETRIES) break;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
};

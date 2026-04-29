import { isTaskBoardSource, isTaskBoardStatus } from "@/features/office/tasks/types";
import { archiveSharedTask, listSharedTasks, upsertSharedTask } from "@/lib/tasks/shared-store";

// Required for Next.js static export compatibility
export const dynamic = 'force-static';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });

const errorJson = (message: string, status: number) =>
  json({ error: message }, status);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export async function GET() {
  try {
    // In static export mode, this returns an empty list or build-time data
    const tasks = typeof window === 'undefined' ? [] : listSharedTasks();
    return json({ tasks });
  } catch (error) {
    console.error("[task-store] GET failed:", error);
    return errorJson("Internal error reading task store.", 500);
  }
}

export async function PUT(request: Request) {
  return errorJson("API not available in static export mode.", 405);
}

export async function DELETE(request: Request) {
  return errorJson("API not available in static export mode.", 405);
}

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  provider: z.enum(["OPENAI", "ANTHROPIC"]),
  value: z.string().min(1),
});

function getManagedControlPlaneConfig() {
  const controlPlaneUrl = process.env.CLAW3D_CONTROL_PLANE_URL?.trim() ?? "";
  const workspaceId = process.env.CLAW3D_WORKSPACE_ID?.trim() ?? "";
  const token = process.env.CLAW3D_CONTROL_PLANE_TOKEN?.trim() ?? "";

  if (!controlPlaneUrl || !workspaceId || !token) {
    throw new Error("Managed control plane configuration is missing.");
  }

  return {
    controlPlaneUrl: controlPlaneUrl.replace(/\/+$/, ""),
    workspaceId,
    token,
  };
}

async function forwardManagedRequest(pathname: string, init?: RequestInit) {
  const { controlPlaneUrl, token } = getManagedControlPlaneConfig();

  const response = await fetch(`${controlPlaneUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export async function GET() {
  try {
    const { workspaceId } = getManagedControlPlaneConfig();
    return await forwardManagedRequest(`/api/managed/workspaces/${workspaceId}/secrets`, {
      method: "GET",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Managed BYOK is unavailable." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { workspaceId } = getManagedControlPlaneConfig();

    return await forwardManagedRequest(`/api/managed/workspaces/${workspaceId}/secrets`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save BYOK credentials." },
      { status: 500 },
    );
  }
}

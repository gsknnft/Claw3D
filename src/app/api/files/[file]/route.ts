import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { resolveStateDir } from "@/lib/clawdbot/paths";

// Required for Next.js static export compatibility
export const dynamic = 'force-static';

export async function generateStaticParams() {
  return []; // No files at build time
}

const uploadsDir = () => path.join(resolveStateDir(), "claw3d", "uploads");

const contentTypeFromName = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    case ".md":
    case ".markdown":
      return "text/markdown; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".csv":
      return "text/csv; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> }
) {
  // In static export, this function is called at build time.
  // On the device, this code never runs.
  try {
    const { file } = await context.params;
    if (!file) return NextResponse.json({ error: "Missing file." }, { status: 400 });

    const safeFile = path.basename(file);
    const targetPath = path.join(uploadsDir(), safeFile);
    const bytes = await fs.readFile(targetPath);

    return new Response(new Blob([Uint8Array.from(bytes)], { type: contentTypeFromName(safeFile) }), {
      headers: {
        "Content-Type": contentTypeFromName(safeFile),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

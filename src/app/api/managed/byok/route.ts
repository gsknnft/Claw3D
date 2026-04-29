import { NextResponse } from "next/server";

// Required for Next.js static export compatibility
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ enabled: false });
}

export async function POST() {
  return NextResponse.json({ error: "Not available" }, { status: 405 });
}

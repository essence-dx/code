import { NextResponse } from "next/server";
import { getAiStatus } from "@/lib/ai/config";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getAiStatus());
}

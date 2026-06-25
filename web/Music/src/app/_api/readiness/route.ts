import { NextResponse } from "next/server";
import { getReadinessChecks, summarizeReadiness } from "@/lib/readiness";

export const runtime = "nodejs";

export function GET() {
  const checks = getReadinessChecks();

  return NextResponse.json({
    checks,
    summary: summarizeReadiness(checks),
  });
}

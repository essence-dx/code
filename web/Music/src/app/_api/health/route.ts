import { NextResponse } from "next/server";
import { getReadinessChecks, summarizeReadiness } from "@/lib/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEnv(name: string) {
  return (process.env[name] || "").trim();
}

function shortRevision(value: string) {
  return value ? value.slice(0, 12) : "";
}

export function GET() {
  const checks = getReadinessChecks();
  const summary = summarizeReadiness(checks);
  const ok = summary.coreBlocked === 0;
  const status = !ok ? "blocked" : summary.warning > 0 ? "degraded" : "ok";

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      deployment: {
        environment: safeEnv("VERCEL_ENV") || "local",
        region: safeEnv("VERCEL_REGION"),
        revision: shortRevision(safeEnv("VERCEL_GIT_COMMIT_SHA")),
      },
      ok,
      readiness: {
        blocked: summary.blocked,
        coreBlocked: summary.coreBlocked,
        coreScore: summary.coreScore,
        fullScore: summary.fullScore,
        warning: summary.warning,
      },
      service: "essence-suno",
      status,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: ok ? 200 : 503,
    },
  );
}

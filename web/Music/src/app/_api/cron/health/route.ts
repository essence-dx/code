import { NextResponse } from "next/server";
import { envValue } from "@/lib/env";
import { runProductionHealthMonitor } from "@/lib/system/production-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function configuredCronSecret() {
  return envValue("CRON_SECRET");
}

function isCronAuthorized(request: Request) {
  const secret = configuredCronSecret();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 401,
      },
    );
  }

  const result = await runProductionHealthMonitor();

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
    status: result.httpStatus,
  });
}

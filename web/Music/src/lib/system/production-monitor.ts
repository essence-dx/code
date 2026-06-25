import { getAiRuntimeConfig } from "@/lib/ai/config";
import { tryRecordProviderEvent } from "@/lib/ai/jobs";
import { getReadinessChecks, summarizeReadiness } from "@/lib/readiness";

type ProviderHealthState = "not-configured" | "ready" | "failed";
type MonitorStatus = "ok" | "degraded" | "blocked";

type ProviderHealth = {
  checked: boolean;
  state: ProviderHealthState;
  status?: number;
  statusText?: string;
};

export type ProductionHealthMonitorResult = {
  audioProvider: ProviderHealth;
  checkedAt: string;
  httpStatus: number;
  ok: boolean;
  readiness: ReturnType<typeof summarizeReadiness>;
  status: MonitorStatus;
};

export async function runProductionHealthMonitor(): Promise<ProductionHealthMonitorResult> {
  const checks = getReadinessChecks();
  const readiness = summarizeReadiness(checks);
  const aiConfig = getAiRuntimeConfig();
  const audioProvider = await checkAudioProvider(aiConfig.audioProviderHealthUrl);
  const status = getMonitorStatus(
    readiness.coreBlocked,
    readiness.warning,
    audioProvider,
  );
  const ok = status !== "blocked" && audioProvider.state !== "failed";
  const result = {
    audioProvider,
    checkedAt: new Date().toISOString(),
    httpStatus:
      status === "blocked" ? 503 : audioProvider.state === "failed" ? 502 : 200,
    ok,
    readiness,
    status,
  };

  await tryRecordProviderEvent({
    provider: "essence-suno",
    eventType: "production-health-monitor",
    payload: {
      audioProvider: result.audioProvider,
      checkedAt: result.checkedAt,
      ok: result.ok,
      readiness: {
        blocked: readiness.blocked,
        coreBlocked: readiness.coreBlocked,
        coreScore: readiness.coreScore,
        fullScore: readiness.fullScore,
        warning: readiness.warning,
      },
      status: result.status,
    },
  });

  return result;
}

async function checkAudioProvider(url: string): Promise<ProviderHealth> {
  if (!url) {
    return {
      checked: false,
      state: "not-configured",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    return {
      checked: true,
      state: response.ok ? "ready" : "failed",
      status: response.status,
      statusText: response.statusText,
    };
  } catch {
    return {
      checked: true,
      state: "failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getMonitorStatus(
  coreBlocked: number,
  warnings: number,
  audioProvider: ProviderHealth,
): MonitorStatus {
  if (coreBlocked > 0) {
    return "blocked";
  }

  if (warnings > 0 || audioProvider.state === "failed") {
    return "degraded";
  }

  return "ok";
}

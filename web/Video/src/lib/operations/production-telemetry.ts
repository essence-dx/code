import type { PublicAiGenerationRecord } from "@/lib/ai/generation-records";
import type { PublicAiUsageEvent } from "@/lib/ai/usage-review";

export type ProductionTelemetryStatus = "ready" | "attention" | "blocked";

export interface ProductionTelemetrySignal {
  id: "activity" | "generation-failures" | "rate-limits" | "safety-review" | "asset-output";
  label: string;
  status: ProductionTelemetryStatus;
  detail: string;
  count?: number;
}

export interface ProductionTelemetryUsage {
  dailyRemaining: number | null;
  summary: {
    total: number;
    complete: number;
    failed: number;
    rate_limited: number;
  };
  events: PublicAiUsageEvent[];
}

export interface ProductionTelemetryInput {
  isSignedIn: boolean;
  aiConfigured: boolean;
  usage: ProductionTelemetryUsage | null;
  generations: PublicAiGenerationRecord[];
}

export interface ProductionTelemetryReport {
  score: number;
  status: ProductionTelemetryStatus;
  label: string;
  signals: ProductionTelemetrySignal[];
}

export function createProductionTelemetryReport(input: ProductionTelemetryInput): ProductionTelemetryReport {
  const signals: ProductionTelemetrySignal[] = [
    activitySignal(input),
    generationFailureSignal(input.generations),
    rateLimitSignal(input.usage),
    safetyReviewSignal(input.generations),
    assetOutputSignal(input.generations),
  ];
  const blocked = signals.filter((signal) => signal.status === "blocked").length;
  const attention = signals.filter((signal) => signal.status === "attention").length;
  const score = Math.round((signals.reduce((sum, signal) => sum + telemetryWeight(signal.status), 0) / signals.length) * 100);

  return {
    score,
    status: blocked > 0 ? "blocked" : attention > 0 ? "attention" : "ready",
    label: blocked > 0 ? "Blocked" : attention > 0 ? "Attention" : "Ready",
    signals,
  };
}

function activitySignal(input: ProductionTelemetryInput): ProductionTelemetrySignal {
  if (!input.isSignedIn) {
    return {
      id: "activity",
      label: "Activity review",
      status: "attention",
      detail: "Sign in to review recent generation activity and retry state.",
    };
  }

  if (!input.aiConfigured) {
    return {
      id: "activity",
      label: "Activity review",
      status: "blocked",
      detail: "Creative actions need setup before production activity can be reviewed.",
    };
  }

  const total = input.usage?.summary.total ?? 0;
  return {
    id: "activity",
    label: "Activity review",
    status: "ready",
    detail: total > 0 ? `${total} recent AI actions are available for review.` : "No recent AI actions need review.",
    count: total || undefined,
  };
}

function generationFailureSignal(generations: PublicAiGenerationRecord[]): ProductionTelemetrySignal {
  const failures = generations.filter((record) => record.status === "failed").length;

  if (failures > 0) {
    return {
      id: "generation-failures",
      label: "Generation failures",
      status: "blocked",
      detail: `${failures} recent ${failures === 1 ? "generation needs" : "generations need"} retry or cleanup review.`,
      count: failures,
    };
  }

  return {
    id: "generation-failures",
    label: "Generation failures",
    status: "ready",
    detail: generations.length > 0 ? "No recent generation failures." : "No generation failure history yet.",
  };
}

function rateLimitSignal(usage: ProductionTelemetryUsage | null): ProductionTelemetrySignal {
  if (!usage) {
    return {
      id: "rate-limits",
      label: "Rate limits",
      status: "attention",
      detail: "Sign in to review remaining daily usage and rate-limit history.",
    };
  }

  if (usage.summary.rate_limited > 0 || usage.dailyRemaining === 0) {
    return {
      id: "rate-limits",
      label: "Rate limits",
      status: "attention",
      detail:
        usage.dailyRemaining === 0
          ? "Daily AI usage is used up."
          : `${usage.summary.rate_limited} recent ${usage.summary.rate_limited === 1 ? "action was" : "actions were"} rate limited.`,
      count: usage.summary.rate_limited || undefined,
    };
  }

  return {
    id: "rate-limits",
    label: "Rate limits",
    status: "ready",
    detail: usage.dailyRemaining === null ? "Usage is available for signed-in review." : `${usage.dailyRemaining} daily actions remain.`,
    count: usage.dailyRemaining ?? undefined,
  };
}

function safetyReviewSignal(generations: PublicAiGenerationRecord[]): ProductionTelemetrySignal {
  const blocked = generations.filter((record) => record.safetyStatus === "blocked").length;
  const flagged = generations.filter((record) => record.safetyStatus === "flagged").length;

  if (blocked > 0) {
    return {
      id: "safety-review",
      label: "Safety review",
      status: "blocked",
      detail: `${blocked} recent ${blocked === 1 ? "generation was" : "generations were"} blocked by safety review.`,
      count: blocked,
    };
  }

  if (flagged > 0) {
    return {
      id: "safety-review",
      label: "Safety review",
      status: "attention",
      detail: `${flagged} recent ${flagged === 1 ? "generation needs" : "generations need"} review before handoff.`,
      count: flagged,
    };
  }

  return {
    id: "safety-review",
    label: "Safety review",
    status: "ready",
    detail: generations.length > 0 ? "No recent safety blockers." : "No safety review history yet.",
  };
}

function assetOutputSignal(generations: PublicAiGenerationRecord[]): ProductionTelemetrySignal {
  const assets = generations.filter((record) => record.outputAssetKind !== "none").length;

  if (!generations.length) {
    return {
      id: "asset-output",
      label: "Generated outputs",
      status: "attention",
      detail: "Generated assets will appear here after signed-in creative actions run.",
    };
  }

  return {
    id: "asset-output",
    label: "Generated outputs",
    status: "ready",
    detail: `${assets}/${generations.length} recent ${generations.length === 1 ? "generation has" : "generations have"} saved output metadata.`,
    count: assets,
  };
}

function telemetryWeight(status: ProductionTelemetryStatus) {
  if (status === "ready") return 1;
  if (status === "attention") return 0.55;
  return 0;
}

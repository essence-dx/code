import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { PublicAiGenerationRecord } from "../src/lib/ai/generation-records";
import type { PublicAiUsageEvent } from "../src/lib/ai/usage-review";
import { createProductionTelemetryReport } from "../src/lib/operations/production-telemetry";

const usageEvents: PublicAiUsageEvent[] = [
  {
    action: "image",
    status: "complete",
    result: "Completed",
    promptChars: 120,
    outputChars: 40,
    createdAt: "2026-05-16T00:00:00.000Z",
  },
];
const generationRecords: PublicAiGenerationRecord[] = [
  {
    action: "image",
    provider: "internal-provider",
    model: "internal-model",
    status: "complete",
    safetyStatus: "allowed",
    promptPreview: "Create a thumbnail.",
    outputAssetKind: "image",
    outputAssetName: "thumbnail.png",
    createdAt: "2026-05-16T00:00:00.000Z",
  },
];

const readyReport = createProductionTelemetryReport({
  isSignedIn: true,
  aiConfigured: true,
  usage: {
    dailyRemaining: 12,
    summary: { total: 1, complete: 1, failed: 0, rate_limited: 0 },
    events: usageEvents,
  },
  generations: generationRecords,
});
assert.equal(readyReport.status, "ready");
assert.equal(readyReport.score, 100);

const blockedReport = createProductionTelemetryReport({
  isSignedIn: true,
  aiConfigured: true,
  usage: {
    dailyRemaining: 0,
    summary: { total: 3, complete: 1, failed: 1, rate_limited: 1 },
    events: usageEvents,
  },
  generations: [
    {
      ...generationRecords[0],
      status: "failed",
      safetyStatus: "blocked",
    },
  ],
});
assert.equal(blockedReport.status, "blocked");
assert.equal(blockedReport.signals.some((signal) => signal.id === "generation-failures" && signal.status === "blocked"), true);
assert.equal(blockedReport.signals.some((signal) => signal.id === "safety-review" && signal.status === "blocked"), true);

const privateReport = createProductionTelemetryReport({
  isSignedIn: false,
  aiConfigured: true,
  usage: null,
  generations: [],
});
assert.equal(privateReport.status, "attention");
assert.equal(privateReport.signals.some((signal) => signal.id === "activity" && signal.status === "attention"), true);

const settingsPage = read("src/app/settings/page.tsx");
assert.match(settingsPage, /ProductionTelemetryCard/);
assert.doesNotMatch(settingsPage, /record\.provider/);
assert.doesNotMatch(settingsPage, /record\.model/);

const telemetryCard = read("src/features/settings/components/production-telemetry-card.tsx");
assert.match(telemetryCard, /Production telemetry/);
assert.doesNotMatch(telemetryCard, /provider|model/i);

const telemetryModule = read("src/lib/operations/production-telemetry.ts");
assert.match(telemetryModule, /generation-failures/);
assert.match(telemetryModule, /rate-limits/);
assert.match(telemetryModule, /safety-review/);
assert.match(telemetryModule, /asset-output/);

const capabilities = read("src/lib/product/capabilities/platform.ts");
assert.match(capabilities, /provider-neutral production telemetry/);

console.log("Production telemetry workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

import { strict as assert } from "node:assert";
import {
  createReleaseEvidenceDiffBaseline,
  createReleaseEvidenceDiffBaselineBody,
  createReleaseEvidenceDiffBaselineFileName,
  createReleaseEvidenceDiffReport,
  parseReleaseEvidenceDiffBaseline,
  type ReleaseEvidenceDiffCurrentState,
} from "@/features/projects/release-evidence-diff";
import type { OfflineDesktopHandoffKitSummary } from "@/features/projects/offline-desktop-handoff-kit";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";

const workspace = {
  id: "workspace-diff",
  name: "Launch Diff Workspace",
  role: "owner" as const,
};

function releaseSummary(input: Partial<ReleaseEvidenceBundleSummary>): ReleaseEvidenceBundleSummary {
  return {
    auditEventCount: 24,
    cadJobCount: 2,
    certificateRecordCount: 3,
    complianceReportCount: 2,
    fileCount: 8,
    highPriorityActionCount: 2,
    projectCount: 2,
    publicSurfaceSnapshotCount: 6,
    releaseBlockerCount: 4,
    riskLevel: "watch",
    riskScore: 72,
    runbookRecordCount: 3,
    totalByteSize: 12000,
    ...input,
  };
}

function handoffSummary(input: Partial<OfflineDesktopHandoffKitSummary>): OfflineDesktopHandoffKitSummary {
  return {
    appPackageBlockedCount: 1,
    cadUnresolvedCount: 1,
    contentHash: "sha256:desktop",
    desktopBlockedChannelCount: 0,
    fileCount: 10,
    generatedAt: "2026-05-16T10:00:00.000Z",
    handoffScore: 88,
    releaseBlockerCount: 3,
    selectedDesktopArtifactCount: 3,
    signingMissingSecretCount: 1,
    signingReadyPlatformCount: 2,
    totalByteSize: 42000,
    unsignedDesktopArtifactCount: 0,
    ...input,
  };
}

const savedState: ReleaseEvidenceDiffCurrentState = {
  generatedAt: "2026-05-16T09:00:00.000Z",
  offlineDesktopHandoffSummary: handoffSummary({
    generatedAt: "2026-05-16T09:00:00.000Z",
    handoffScore: 93,
    releaseBlockerCount: 1,
    signingMissingSecretCount: 0,
  }),
  releaseEvidenceSummary: releaseSummary({
    highPriorityActionCount: 2,
    releaseBlockerCount: 4,
    riskScore: 72,
  }),
  workspace,
};
const currentState: ReleaseEvidenceDiffCurrentState = {
  generatedAt: "2026-05-16T11:00:00.000Z",
  offlineDesktopHandoffSummary: handoffSummary({
    cadUnresolvedCount: 3,
    generatedAt: "2026-05-16T11:00:00.000Z",
    handoffScore: 81,
    releaseBlockerCount: 4,
    signingMissingSecretCount: 1,
  }),
  releaseEvidenceSummary: releaseSummary({
    highPriorityActionCount: 1,
    publicSurfaceSnapshotCount: 8,
    releaseBlockerCount: 2,
    riskScore: 84,
  }),
  workspace,
};

const savedBaseline = createReleaseEvidenceDiffBaseline(savedState);
const currentBaseline = createReleaseEvidenceDiffBaseline(currentState);
const report = createReleaseEvidenceDiffReport({
  baseline: savedBaseline,
  current: currentBaseline,
});

assert.equal(report.summary.status, "regressed");
assert.equal(report.summary.previousBlockerCount, 5);
assert.equal(report.summary.currentBlockerCount, 6);
assert.equal(report.summary.netBlockerDelta, 1);
assert.equal(report.summary.previousReadinessScore, 83);
assert.equal(report.summary.currentReadinessScore, 83);
assert.ok(report.summary.improvedCount >= 2);
assert.ok(report.summary.regressedCount >= 2);
assert.ok(report.rows.some((row) => row.id === "release:risk-score" && row.status === "improved"));
assert.ok(report.rows.some((row) => row.id === "desktop:blockers" && row.status === "regressed"));

const baselineBody = createReleaseEvidenceDiffBaselineBody(currentBaseline);
const baselineFileName = createReleaseEvidenceDiffBaselineFileName(currentBaseline);

assert.match(baselineBody, /release-evidence-diff-baseline/);
assert.equal(baselineFileName, "release-evidence-diff-baseline-launch-diff-workspace-workspace-diff-20260516.json");

const parsedCombined = parseReleaseEvidenceDiffBaseline(JSON.parse(baselineBody), baselineFileName);

assert.equal(parsedCombined.sourceFileName, baselineFileName);
assert.equal(parsedCombined.releaseEvidenceSummary?.riskScore, 84);
assert.equal(parsedCombined.offlineDesktopHandoffSummary?.handoffScore, 81);

const parsedReleaseBundle = parseReleaseEvidenceDiffBaseline(
  {
    generatedAt: savedState.generatedAt,
    schemaVersion: 1,
    summary: savedState.releaseEvidenceSummary,
    workspace,
  },
  "release-evidence.json",
);

assert.equal(parsedReleaseBundle.sourceKind, "release-evidence-bundle");
assert.equal(parsedReleaseBundle.offlineDesktopHandoffSummary, null);
assert.equal(parsedReleaseBundle.releaseEvidenceSummary?.releaseBlockerCount, 4);

const parsedHandoffKit = parseReleaseEvidenceDiffBaseline(
  {
    schemaVersion: 1,
    summary: savedState.offlineDesktopHandoffSummary,
    workspace,
  },
  "offline-handoff.json",
);

assert.equal(parsedHandoffKit.sourceKind, "offline-desktop-handoff-kit");
assert.equal(parsedHandoffKit.releaseEvidenceSummary, null);
assert.equal(parsedHandoffKit.offlineDesktopHandoffSummary?.releaseBlockerCount, 1);

assert.throws(() => parseReleaseEvidenceDiffBaseline({ summary: {} }), /release evidence bundle/);

console.log("release evidence diff smoke passed");

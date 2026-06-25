import { readFileSync } from "node:fs";
import type { EnterpriseDesktopReleaseOperationsSynthesisReport } from "../src/features/editor/enterprise-desktop-release-operations-synthesis";
import type { TauriDesktopPackagingReadinessReport } from "../src/features/editor/tauri-desktop-packaging-readiness";
import {
  getDesktopUpdateCohortObservabilityCsv,
  getDesktopUpdateCohortObservabilityJson,
  getDesktopUpdateCohortObservabilityMarkdown,
  getDesktopUpdateCohortObservabilityReport,
  type DesktopUpdateCohortSnapshot,
} from "../src/features/editor/desktop-update-cohort-observability";

const generatedAt = "2026-05-20T00:00:00.000Z";

const blockedReport = getDesktopUpdateCohortObservabilityReport({
  cohorts: [
    cohort({
      channel: "stable",
      failedUpdateCount: 14,
      rollbackDeviceCount: 18,
      signatureVerifiedCount: 68,
      totalDevices: 100,
      updatedDevices: 72,
    }),
    cohort({
      channel: "beta",
      failedUpdateCount: 4,
      rollbackDeviceCount: 2,
      signatureVerifiedCount: 20,
      totalDevices: 32,
      updatedDevices: 18,
    }),
    cohort({
      channel: "canary",
      failedUpdateCount: 0,
      rollbackDeviceCount: 0,
      signatureVerifiedCount: 6,
      totalDevices: 8,
      updatedDevices: 7,
    }),
  ],
  enterpriseReleaseOperations: enterpriseRelease({
    desktopReleaseDecision: "do-not-ship",
    score: 66,
    status: "blocked",
  }),
  generatedAt,
  tauriDesktopPackaging: tauriPackaging({
    score: 61,
    status: "blocked",
    updaterStatus: "blocked",
  }),
});
const readyReport = getDesktopUpdateCohortObservabilityReport({
  cohorts: [
    cohort({
      channel: "stable",
      totalDevices: 100,
      updatedDevices: 96,
      signatureVerifiedCount: 100,
    }),
    cohort({
      channel: "beta",
      totalDevices: 36,
      updatedDevices: 34,
      signatureVerifiedCount: 36,
    }),
    cohort({
      channel: "canary",
      totalDevices: 12,
      updatedDevices: 12,
      signatureVerifiedCount: 12,
    }),
  ],
  enterpriseReleaseOperations: enterpriseRelease({
    score: 94,
    status: "ready",
  }),
  generatedAt,
  tauriDesktopPackaging: tauriPackaging({
    score: 96,
    status: "ready",
    updaterStatus: "ready",
  }),
});

const markdown = getDesktopUpdateCohortObservabilityMarkdown(blockedReport);
const csv = getDesktopUpdateCohortObservabilityCsv(blockedReport);
const json = JSON.parse(
  getDesktopUpdateCohortObservabilityJson(blockedReport),
) as {
  cohorts: unknown[];
  rows: unknown[];
  signedEvidenceExports: unknown[];
  summary: {
    rollbackCohortCount: number;
    signedEvidenceCount: number;
    status: string;
    updaterFailureCount: number;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(blockedReport.status === "blocked", "Failed updates, rollback cohorts, and unsigned devices should block update cohort observability.");
assert(blockedReport.channelCount === 3, "Stable, beta, and canary channels should be represented.");
assert(blockedReport.stableCohortCount === 1, "Stable cohort should be counted.");
assert(blockedReport.betaCohortCount === 1, "Beta cohort should be counted.");
assert(blockedReport.canaryCohortCount === 1, "Canary cohort should be counted.");
assert(blockedReport.updaterFailureCount === 18, "Updater failures should aggregate across cohorts.");
assert(blockedReport.rollbackCohortCount === 2, "Rollback cohorts should be counted when devices roll back.");
assert(blockedReport.unsignedDeviceCount > 0, "Unsigned or unverified devices should be surfaced.");
assert(blockedReport.signedEvidenceCount >= 5, "Signed evidence exports should be available for release owners.");
assert(blockedReport.rows.some((row) => row.category === "channel-health"), "Rows should include channel health.");
assert(blockedReport.rows.some((row) => row.category === "updater-failures"), "Rows should include updater failures.");
assert(blockedReport.rows.some((row) => row.category === "rollback-cohorts"), "Rows should include rollback cohorts.");
assert(blockedReport.rows.some((row) => row.category === "signed-evidence"), "Rows should include signed evidence.");
assert(blockedReport.rows.some((row) => row.category === "release-gate"), "Rows should include release gate.");
assert(readyReport.status === "ready", "Ready cohorts and release evidence should pass.");
assert(readyReport.score === 94, "Ready score should honor the weakest source score.");
assert(readyReport.updaterFailureCount === 0, "Ready cohorts should have no updater failures.");
assert(readyReport.rollbackCohortCount === 0, "Ready cohorts should have no rollback cohorts.");
assert(readyReport.unsignedDeviceCount === 0, "Ready cohorts should have full signature coverage.");
assert(markdown.includes("Desktop Update Cohort Observability"), "Markdown should include a clear title.");
assert(markdown.includes("stable"), "Markdown should include stable channel evidence.");
assert(markdown.includes("rollback cohorts"), "Markdown should include rollback cohort language.");
assert(csv.includes("updater-failures"), "CSV should include updater failure rows.");
assert(json.cohorts.length === blockedReport.cohorts.length, "JSON should preserve cohorts.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve rows.");
assert(json.signedEvidenceExports.length === blockedReport.signedEvidenceExports.length, "JSON should preserve signed evidence exports.");
assert(json.summary.status === blockedReport.status, "JSON should preserve status.");
assert(json.summary.updaterFailureCount === blockedReport.updaterFailureCount, "JSON should preserve updater failure count.");
assert(json.summary.rollbackCohortCount === blockedReport.rollbackCohortCount, "JSON should preserve rollback cohort count.");
assert(json.summary.signedEvidenceCount === blockedReport.signedEvidenceCount, "JSON should preserve signed evidence count.");
assert(
  /DesktopUpdateCohortObservabilityPanel/.test(extensionsSource) &&
    /getDesktopUpdateCohortObservabilityReport/.test(extensionsSource),
  "Extensions should wire the desktop update cohort observability panel and report.",
);
assert(
  packageJson.scripts["editor:desktop-update-cohort-observability-smoke"]?.includes(
    "desktop-update-cohort-observability-smoke",
  ),
  "Targeted desktop update cohort observability smoke command should be listed.",
);

console.log(
  `Desktop update cohort observability smoke passed: ${blockedReport.status}, ${blockedReport.updaterFailureCount} failures.`,
);

function cohort(
  patch: Partial<DesktopUpdateCohortSnapshot> & {
    channel: DesktopUpdateCohortSnapshot["channel"];
  },
): DesktopUpdateCohortSnapshot {
  const totalDevices = patch.totalDevices ?? 10;

  return {
    id: `${patch.channel}-cohort`,
    channel: patch.channel,
    label: `${patch.channel} desktop cohort`,
    currentVersion: patch.currentVersion ?? "0.1.0",
    targetVersion: patch.targetVersion ?? "0.1.1",
    rolloutPercent: patch.rolloutPercent ?? 100,
    totalDevices,
    updatedDevices: patch.updatedDevices ?? totalDevices,
    failedUpdateCount: patch.failedUpdateCount ?? 0,
    rollbackDeviceCount: patch.rollbackDeviceCount ?? 0,
    signatureVerifiedCount: patch.signatureVerifiedCount ?? totalDevices,
    latestSignalAt: patch.latestSignalAt ?? generatedAt,
    evidenceIds: patch.evidenceIds ?? [
      `${patch.channel}-signed-manifest`,
      `${patch.channel}-rollout-report`,
    ],
  };
}

function tauriPackaging(
  patch: Partial<TauriDesktopPackagingReadinessReport>,
): TauriDesktopPackagingReadinessReport {
  const status = patch.status ?? "ready";

  return {
    generatedAt,
    status,
    score: patch.score ?? 100,
    productName: "Essence Figma",
    appIdentifier: "com.essencefromexistence.essencefigma",
    appVersion: "0.1.1",
    tauriVersion: "2.11.1",
    rustCommandStatus: "ready",
    filesystemPermissionStatus: "ready",
    offlineBundleStatus: "ready",
    updaterStatus: patch.updaterStatus ?? "ready",
    releasePacketStatus: "ready",
    commandHandlerCount: 3,
    filesystemPermissionCount: 1,
    iconCount: 5,
    releasePacketEvidenceCount: 5,
    readyCount: status === "ready" ? 5 : 3,
    reviewCount: status === "review" ? 1 : 0,
    blockedCount: status === "blocked" ? 1 : 0,
    rows: [],
    releasePacketEvidence: [
      "Signed desktop updater manifest exported.",
      "Stable channel signature bundle archived.",
      "Beta channel signature bundle archived.",
      "Canary channel signature bundle archived.",
      "Desktop updater rollback manifest archived.",
    ],
    ...patch,
  };
}

function enterpriseRelease(
  patch: Partial<EnterpriseDesktopReleaseOperationsSynthesisReport>,
): EnterpriseDesktopReleaseOperationsSynthesisReport {
  const status = patch.status ?? "ready";

  return {
    generatedAt,
    status,
    desktopReleaseDecision: patch.desktopReleaseDecision ?? "ship",
    score: patch.score ?? 100,
    sourceCount: 5,
    readyCount: status === "ready" ? 6 : 3,
    reviewCount: status === "review" ? 1 : 0,
    blockedCount: status === "blocked" ? 1 : 0,
    blockerCount: status === "blocked" ? 2 : 0,
    reviewItemCount: status === "review" ? 2 : 0,
    evidenceCount: 16,
    releasePacketCount: 6,
    offlineReadinessEvidenceCount: 8,
    adminEvidenceCount: 10,
    rollbackEvidenceCount: 4,
    minimumScoreCategory: "ship-gate",
    sourceScores: {
      "collaboration-recovery": 96,
      "plugin-sandbox": 96,
      "production-evidence": patch.score ?? 100,
      "restore-drills": 98,
      "ship-gate": patch.score ?? 100,
      "workspace-operations": 95,
    },
    executiveSummary: ["Enterprise release evidence is ready for update cohort review."],
    signoffChecklist: ["Export release operations packet before increasing rollout."],
    rows: [],
    releasePackets: [
      {
        id: "ship-gate-packet",
        kind: "ship-gate",
        category: "ship-gate",
        status,
        label: "Release ship gate",
        detail: "Desktop release packet is available.",
        source: "Enterprise desktop release operations",
        evidence: ["Signed release packet.", "Rollback packet."],
        evidenceCount: 2,
      },
    ],
    ...patch,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

import { readFileSync } from "node:fs";
import type { DesktopCollaborationRecoveryBridgeReport } from "../src/features/editor/desktop-collaboration-recovery-bridge";
import type { NativePluginSandboxOperationsReport } from "../src/features/editor/native-plugin-sandbox-operations";
import type { ProductionReadinessSynthesisPacket } from "../src/features/editor/production-readiness-synthesis";
import type { WorkspaceFileOperationsReviewReport } from "../src/features/editor/workspace-file-operations-review";
import type { WorkspaceRestoreDrillsReport } from "../src/features/editor/workspace-restore-drills";
import {
  getEnterpriseDesktopReleaseOperationsSynthesisCsv,
  getEnterpriseDesktopReleaseOperationsSynthesisJson,
  getEnterpriseDesktopReleaseOperationsSynthesisMarkdown,
  getEnterpriseDesktopReleaseOperationsSynthesisReport,
} from "../src/features/editor/enterprise-desktop-release-operations-synthesis";

const generatedAt = "2026-05-19T23:00:00.000Z";

const blockedReport = getEnterpriseDesktopReleaseOperationsSynthesisReport({
  desktopCollaborationRecovery: collaborationRecovery({
    adminEvidenceCount: 7,
    blockedCount: 2,
    cursorChatBlockedCount: 1,
    failedOfflineSaveCount: 1,
    offlineReplayQueueCount: 5,
    reconnectHandoffBlockedCount: 1,
    score: 62,
    status: "blocked",
  }),
  generatedAt,
  nativePluginSandbox: pluginSandbox({
    blockedCount: 3,
    crashIsolationBlockedCount: 1,
    offlinePolicyBlockedCount: 1,
    permissionPromptBlockedCount: 1,
    score: 58,
    status: "blocked",
  }),
  productionReadiness: productionReadiness({
    blockerCount: 2,
    blockedCount: 2,
    score: 66,
    shipDecision: "do-not-ship",
    status: "blocked",
  }),
  workspaceFileOperations: workspaceFileOperations({
    blockedCount: 1,
    failedOfflineSaveCount: 1,
    offlineOpenBlockedCount: 1,
    permissionDriftCount: 2,
    score: 70,
    status: "blocked",
  }),
  workspaceRestoreDrills: workspaceRestore({
    blockedCount: 1,
    corruptedArtifactCount: 1,
    failedSaveCount: 1,
    score: 72,
    status: "blocked",
  }),
});
const readyReport = getEnterpriseDesktopReleaseOperationsSynthesisReport({
  desktopCollaborationRecovery: collaborationRecovery({
    score: 96,
    status: "ready",
  }),
  generatedAt,
  nativePluginSandbox: pluginSandbox({
    score: 97,
    status: "ready",
  }),
  productionReadiness: productionReadiness({
    score: 92,
    status: "ready",
  }),
  workspaceFileOperations: workspaceFileOperations({
    score: 95,
    status: "ready",
  }),
  workspaceRestoreDrills: workspaceRestore({
    score: 98,
    status: "ready",
  }),
});

const markdown = getEnterpriseDesktopReleaseOperationsSynthesisMarkdown(blockedReport);
const csv = getEnterpriseDesktopReleaseOperationsSynthesisCsv(blockedReport);
const json = JSON.parse(
  getEnterpriseDesktopReleaseOperationsSynthesisJson(blockedReport),
) as {
  releasePackets: unknown[];
  rows: unknown[];
  summary: {
    adminEvidenceCount: number;
    desktopReleaseDecision: string;
    offlineReadinessEvidenceCount: number;
    releasePacketCount: number;
    rollbackEvidenceCount: number;
    status: string;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(blockedReport.status === "blocked", "Blocked source systems should block enterprise desktop release operations.");
assert(blockedReport.desktopReleaseDecision === "do-not-ship", "Blocked source systems should produce a do-not-ship decision.");
assert(blockedReport.rows.some((row) => row.category === "restore-drills"), "Rows should include restore drills.");
assert(blockedReport.rows.some((row) => row.category === "workspace-operations"), "Rows should include workspace operations.");
assert(blockedReport.rows.some((row) => row.category === "plugin-sandbox"), "Rows should include plugin sandboxing.");
assert(blockedReport.rows.some((row) => row.category === "collaboration-recovery"), "Rows should include collaboration recovery.");
assert(blockedReport.rows.some((row) => row.category === "production-evidence"), "Rows should include production evidence.");
assert(blockedReport.rows.some((row) => row.category === "ship-gate"), "Rows should include the aggregate ship gate.");
assert(blockedReport.releasePacketCount >= 6, "Synthesis should retain release packets from each source plus the ship gate.");
assert(blockedReport.offlineReadinessEvidenceCount >= 5, "Synthesis should expose offline release readiness evidence.");
assert(blockedReport.adminEvidenceCount >= 10, "Synthesis should expose admin and operator evidence.");
assert(blockedReport.rollbackEvidenceCount >= 2, "Synthesis should expose rollback and no-ship evidence.");
assert(readyReport.status === "ready", "Ready source systems should pass enterprise desktop release operations.");
assert(readyReport.desktopReleaseDecision === "ship", "Ready source systems should produce a ship decision.");
assert(readyReport.score === 92, "Synthesis score should use the weakest source score.");
assert(readyReport.readyCount === readyReport.rows.length, "Ready report should mark every row ready.");
assert(markdown.includes("Enterprise Desktop Release Operations Synthesis"), "Markdown should include a clear title.");
assert(markdown.includes("restore drills"), "Markdown should include restore drill evidence.");
assert(markdown.includes("ship gate"), "Markdown should include ship gate language.");
assert(csv.includes("workspace-operations"), "CSV should include workspace operations rows.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve rows.");
assert(json.releasePackets.length === blockedReport.releasePackets.length, "JSON should preserve release packets.");
assert(json.summary.status === blockedReport.status, "JSON summary should preserve status.");
assert(json.summary.desktopReleaseDecision === blockedReport.desktopReleaseDecision, "JSON summary should preserve release decision.");
assert(json.summary.releasePacketCount === blockedReport.releasePacketCount, "JSON summary should preserve packet count.");
assert(json.summary.offlineReadinessEvidenceCount === blockedReport.offlineReadinessEvidenceCount, "JSON summary should preserve offline readiness evidence.");
assert(json.summary.adminEvidenceCount === blockedReport.adminEvidenceCount, "JSON summary should preserve admin evidence.");
assert(json.summary.rollbackEvidenceCount === blockedReport.rollbackEvidenceCount, "JSON summary should preserve rollback evidence.");
assert(
  /EnterpriseDesktopReleaseOperationsSynthesisPanel/.test(extensionsSource) &&
    /getEnterpriseDesktopReleaseOperationsSynthesisReport/.test(extensionsSource),
  "Extensions should wire the enterprise desktop release operations synthesis panel and report.",
);
assert(
  packageJson.scripts["editor:enterprise-desktop-release-operations-synthesis-smoke"]?.includes(
    "enterprise-desktop-release-operations-synthesis-smoke",
  ),
  "Targeted enterprise desktop release operations synthesis smoke command should be listed.",
);

console.log(
  `Enterprise desktop release operations synthesis smoke passed: ${blockedReport.desktopReleaseDecision}, ${blockedReport.releasePacketCount} packets.`,
);

function workspaceRestore(
  patch: Partial<WorkspaceRestoreDrillsReport>,
): WorkspaceRestoreDrillsReport {
  const status = patch.status ?? "ready";
  return {
    generatedAt,
    fileId: "file-release",
    fileName: "Desktop release workspace",
    score: patch.score ?? 100,
    status,
    autosaveSnapshotCount: 4,
    staleSnapshotCount: status === "ready" ? 0 : 1,
    namedVersionCount: 3,
    conflictPreviewCount: status === "ready" ? 2 : 4,
    corruptedArtifactCount: patch.corruptedArtifactCount ?? 0,
    retryableSaveCount: status === "ready" ? 0 : 2,
    failedSaveCount: patch.failedSaveCount ?? 0,
    staleSaveCount: status === "ready" ? 0 : 1,
    operatorEvidenceCount: 6,
    latestSnapshotAt: generatedAt,
    latestVersionAt: generatedAt,
    blockedCount: patch.blockedCount ?? 0,
    reviewCount: patch.reviewCount ?? 0,
    readyCount: patch.readyCount ?? 5,
    rows: [],
    drillPackets: [
      {
        id: "restore-packet",
        kind: "operator-export",
        status,
        label: "Restore drill evidence",
        detail: "Restore drill evidence is available.",
        artifactIds: ["restore-json", "restore-csv", "restore-md"],
        steps: ["Export restore drill evidence."],
        evidenceCount: 3,
      },
    ],
    operatorEvidence: [
      "Export restore drill JSON.",
      "Export restore drill CSV.",
      "Export restore drill Markdown.",
      "Attach offline replay restore evidence.",
      "Attach rollback preview evidence.",
      "Archive local autosave snapshot evidence.",
    ],
    corruptionIssues: status === "ready" ? [] : ["Version artifact mismatch."],
    ...patch,
  };
}

function workspaceFileOperations(
  patch: Partial<WorkspaceFileOperationsReviewReport>,
): WorkspaceFileOperationsReviewReport {
  const status = patch.status ?? "ready";
  return {
    generatedAt,
    status,
    score: patch.score ?? 100,
    fileCount: 5,
    activeFileCount: 4,
    recentFileCount: 4,
    staleRecentFileCount: status === "ready" ? 0 : 1,
    teamScopeCount: 2,
    projectScopeCount: 2,
    unscopedFileCount: 0,
    permissionDriftCount: patch.permissionDriftCount ?? 0,
    blockedPermissionDriftCount: status === "ready" ? 0 : 1,
    offlineOpenReadyCount: status === "ready" ? 5 : 3,
    offlineOpenReviewCount: status === "ready" ? 0 : 1,
    offlineOpenBlockedCount: patch.offlineOpenBlockedCount ?? 0,
    failedOfflineSaveCount: patch.failedOfflineSaveCount ?? 0,
    retryableOfflineSaveCount: status === "ready" ? 0 : 2,
    operatorEvidenceCount: 6,
    readyCount: patch.readyCount ?? 5,
    reviewCount: patch.reviewCount ?? 0,
    blockedCount: patch.blockedCount ?? 0,
    rows: [],
    operationPackets: [
      {
        id: "workspace-file-ops-packet",
        kind: "operator-export",
        status,
        label: "Workspace file operations",
        detail: "Workspace file operation evidence is ready.",
        fileIds: ["file-release"],
        steps: ["Export workspace operations evidence."],
        evidenceCount: 4,
      },
    ],
    permissionDriftQueue: [],
    offlineOpenQueue: [],
    operatorEvidence: [
      "Export workspace file operations JSON.",
      "Export workspace file operations CSV.",
      "Export workspace file operations Markdown.",
      "Attach recent-file queue evidence.",
      "Attach permission drift evidence.",
      "Attach offline-open rehearsal evidence.",
    ],
    ...patch,
  };
}

function pluginSandbox(
  patch: Partial<NativePluginSandboxOperationsReport>,
): NativePluginSandboxOperationsReport {
  const status = patch.status ?? "ready";
  return {
    generatedAt,
    status,
    score: patch.score ?? 100,
    manifestCount: 3,
    widgetManifestCount: 2,
    permissionPromptCount: 3,
    permissionPromptBlockedCount: patch.permissionPromptBlockedCount ?? 0,
    offlinePolicyReadyCount: status === "ready" ? 3 : 1,
    offlinePolicyBlockedCount: patch.offlinePolicyBlockedCount ?? 0,
    crashIsolationReadyCount: status === "ready" ? 3 : 2,
    crashIsolationBlockedCount: patch.crashIsolationBlockedCount ?? 0,
    replayEvidenceReadyCount: status === "ready" ? 3 : 1,
    replayEvidenceBlockedCount: status === "ready" ? 0 : 1,
    crashLikeRunCount: status === "ready" ? 0 : 1,
    blockedRunCount: status === "ready" ? 0 : 2,
    operatorEvidenceCount: 6,
    readyCount: patch.readyCount ?? 5,
    reviewCount: patch.reviewCount ?? 0,
    blockedCount: patch.blockedCount ?? 0,
    permissionPrompts: [],
    offlinePolicies: [],
    crashIsolation: [],
    replayEvidence: [],
    rows: [],
    operationPackets: [
      {
        id: "plugin-sandbox-release-packet",
        kind: "operator-export",
        status,
        label: "Plugin sandbox release evidence",
        detail: "Plugin sandbox operations evidence is available.",
        pluginIds: ["accessibility-auditor"],
        steps: ["Export plugin sandbox operations evidence."],
        evidenceCount: 5,
      },
    ],
    operatorEvidence: [
      "Export native plugin sandbox JSON.",
      "Export native plugin sandbox CSV.",
      "Export native plugin sandbox Markdown.",
      "Attach permission prompt evidence.",
      "Attach offline execution policy evidence.",
      "Attach crash isolation rehearsal evidence.",
    ],
    ...patch,
  };
}

function collaborationRecovery(
  patch: Partial<DesktopCollaborationRecoveryBridgeReport>,
): DesktopCollaborationRecoveryBridgeReport {
  const status = patch.status ?? "ready";
  return {
    generatedAt,
    fileId: "file-release",
    fileName: "Desktop release workspace",
    status,
    score: patch.score ?? 100,
    activePeerCount: 2,
    chatEventCount: status === "ready" ? 1 : 4,
    presenceEventCount: status === "ready" ? 4 : 12,
    reconnectHandoffCount: 3,
    reconnectHandoffBlockedCount: patch.reconnectHandoffBlockedCount ?? 0,
    offlineReplayQueueCount: patch.offlineReplayQueueCount ?? 0,
    failedOfflineSaveCount: patch.failedOfflineSaveCount ?? 0,
    staleOfflineSaveCount: status === "ready" ? 0 : 1,
    eventDriftCount: status === "ready" ? 0 : 2,
    cursorChatQueueCount: 2,
    cursorChatBlockedCount: patch.cursorChatBlockedCount ?? 0,
    adminEvidenceCount: patch.adminEvidenceCount ?? 7,
    readyCount: patch.readyCount ?? 4,
    reviewCount: patch.reviewCount ?? 0,
    blockedCount: patch.blockedCount ?? 0,
    reconnectHandoffs: [],
    offlineReplayItems: [],
    cursorChatQueue: [],
    adminEvidence: [
      "Export desktop collaboration recovery JSON.",
      "Export desktop collaboration recovery CSV.",
      "Export desktop collaboration recovery Markdown.",
      "Export sync replay JSON.",
      "Export multiplayer follow evidence.",
      "Export admin collaboration recovery packets.",
      "Attach offline queue evidence.",
    ],
    rows: [],
    recoveryPackets: [
      {
        id: "collaboration-recovery-release-packet",
        kind: "admin-evidence-export",
        status,
        label: "Collaboration recovery evidence",
        detail: "Collaboration recovery packet is available.",
        evidenceCount: 7,
        steps: ["Export collaboration recovery evidence."],
      },
    ],
    ...patch,
  };
}

function productionReadiness(
  patch: Partial<ProductionReadinessSynthesisPacket>,
): ProductionReadinessSynthesisPacket {
  const status = patch.status ?? "ready";
  return {
    generatedAt,
    status,
    shipDecision: patch.shipDecision ?? "ship",
    score: patch.score ?? 100,
    sectionCount: 5,
    readyCount: patch.readyCount ?? 5,
    reviewCount: patch.reviewCount ?? 0,
    blockedCount: patch.blockedCount ?? 0,
    blockerCount: patch.blockerCount ?? 0,
    reviewItemCount: status === "ready" ? 0 : 3,
    evidenceCount: 6,
    minimumScoreArea: "ship-gate",
    releaseEvidenceBundle: [
      "Export production readiness synthesis JSON.",
      "Export production readiness synthesis CSV.",
      "Export production readiness synthesis Markdown.",
      "Attach release readiness bundle.",
      "Attach rollback evidence.",
      "Attach no-ship evidence.",
    ],
    signoffChecklist: ["Review source blockers.", "Export release packets."],
    executiveSummary: ["Production readiness evidence is included."],
    rows: [],
    ...patch,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

import type {
  EnterpriseDesktopReleaseDecision,
  EnterpriseDesktopReleaseOperationsRow,
  EnterpriseDesktopReleaseOperationsStatus,
  EnterpriseDesktopReleaseOperationsSynthesisInput,
  EnterpriseDesktopReleaseOperationsSynthesisReport,
  EnterpriseDesktopReleasePacket,
} from "@/features/editor/enterprise-desktop-release-operations-synthesis-types";

export {
  getEnterpriseDesktopReleaseOperationsSynthesisCsv,
  getEnterpriseDesktopReleaseOperationsSynthesisJson,
  getEnterpriseDesktopReleaseOperationsSynthesisMarkdown,
} from "@/features/editor/enterprise-desktop-release-operations-synthesis-export";
export type {
  EnterpriseDesktopReleaseDecision,
  EnterpriseDesktopReleaseOperationsCategory,
  EnterpriseDesktopReleaseOperationsRow,
  EnterpriseDesktopReleaseOperationsStatus,
  EnterpriseDesktopReleaseOperationsSynthesisInput,
  EnterpriseDesktopReleaseOperationsSynthesisReport,
  EnterpriseDesktopReleasePacket,
  EnterpriseDesktopReleasePacketKind,
} from "@/features/editor/enterprise-desktop-release-operations-synthesis-types";

export function getEnterpriseDesktopReleaseOperationsSynthesisReport({
  desktopCollaborationRecovery,
  generatedAt = new Date().toISOString(),
  nativePluginSandbox,
  productionReadiness,
  workspaceFileOperations,
  workspaceRestoreDrills,
}: EnterpriseDesktopReleaseOperationsSynthesisInput): EnterpriseDesktopReleaseOperationsSynthesisReport {
  const sourceRows = [
    getRestoreDrillsRow(workspaceRestoreDrills),
    getWorkspaceOperationsRow(workspaceFileOperations),
    getPluginSandboxRow(nativePluginSandbox),
    getCollaborationRecoveryRow(desktopCollaborationRecovery),
    getProductionEvidenceRow(productionReadiness),
  ];
  const sourcePackets = [
    getRestoreDrillsPacket(workspaceRestoreDrills),
    getWorkspaceOperationsPacket(workspaceFileOperations),
    getPluginSandboxPacket(nativePluginSandbox),
    getCollaborationRecoveryPacket(desktopCollaborationRecovery),
    getProductionEvidencePacket(productionReadiness),
  ];
  const blockerCount = sourceRows.reduce(
    (total, row) => total + row.blockerCount,
    0,
  );
  const reviewItemCount = sourceRows.reduce(
    (total, row) => total + row.reviewCount,
    0,
  );
  const status = getAggregateStatus(sourceRows);
  const desktopReleaseDecision = getReleaseDecision(status);
  const score = Math.min(...sourceRows.map((row) => row.sourceScore));
  const shipGatePacket = getShipGatePacket({
    blockerCount,
    desktopReleaseDecision,
    reviewItemCount,
    sourceCount: sourceRows.length,
    status,
  });
  const finalPackets = [...sourcePackets, shipGatePacket];
  const shipGateRow = getShipGateRow({
    blockerCount,
    desktopReleaseDecision,
    releasePackets: finalPackets,
    reviewItemCount,
    score,
    sourceRows,
    status,
  });
  const rows = [...sourceRows, shipGateRow].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const evidenceCount = finalPackets.reduce(
    (total, packet) => total + packet.evidenceCount,
    0,
  );
  const minimumScoreCategory = rows.reduce((minimum, row) =>
    row.sourceScore < minimum.sourceScore ? row : minimum,
  ).category;

  return {
    generatedAt,
    status,
    desktopReleaseDecision,
    score,
    sourceCount: sourceRows.length,
    readyCount,
    reviewCount,
    blockedCount,
    blockerCount,
    reviewItemCount,
    evidenceCount,
    releasePacketCount: finalPackets.length,
    offlineReadinessEvidenceCount: getEvidenceMatchCount(
      finalPackets,
      /offline|autosave|snapshot|restore|queue|replay|local|bundle|open/i,
    ),
    adminEvidenceCount: getEvidenceMatchCount(
      finalPackets,
      /admin|operator|export|evidence|release owner/i,
    ),
    rollbackEvidenceCount: getEvidenceMatchCount(
      finalPackets,
      /rollback|do-?not-ship|do not ship|no-ship|restore|replay/i,
    ),
    minimumScoreCategory,
    sourceScores: {
      "collaboration-recovery": desktopCollaborationRecovery.score,
      "plugin-sandbox": nativePluginSandbox.score,
      "production-evidence": productionReadiness.score,
      "restore-drills": workspaceRestoreDrills.score,
      "ship-gate": score,
      "workspace-operations": workspaceFileOperations.score,
    },
    executiveSummary: getExecutiveSummary({
      blockerCount,
      desktopReleaseDecision,
      evidenceCount,
      releasePacketCount: finalPackets.length,
      reviewItemCount,
      score,
      sourceRows,
    }),
    signoffChecklist: getSignoffChecklist(status, sourceRows),
    rows,
    releasePackets: finalPackets,
  };
}

function getRestoreDrillsRow(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["workspaceRestoreDrills"],
): EnterpriseDesktopReleaseOperationsRow {
  const blockerCount =
    report.blockedCount + report.corruptedArtifactCount + report.failedSaveCount;
  const reviewCount =
    report.reviewCount + report.staleSnapshotCount + report.staleSaveCount;

  return {
    id: "enterprise-desktop-restore-drills",
    status: report.status,
    category: "restore-drills",
    label: "Local-first restore drills",
    detail: `${report.fileName} has ${report.autosaveSnapshotCount} autosave snapshots, ${report.namedVersionCount} named versions, ${report.conflictPreviewCount} restore previews, ${report.retryableSaveCount} retryable saves, and ${report.failedSaveCount} failed saves.`,
    sourceScore: report.score,
    blockerCount,
    reviewCount,
    evidenceCount: report.operatorEvidenceCount + report.drillPackets.length,
    releasePacketIds: ["enterprise-desktop-restore-drills-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach restore drill exports and rollback previews to the desktop release packet."
        : "Clear corruption, stale snapshots, and failed offline saves before desktop release approval.",
  };
}

function getWorkspaceOperationsRow(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["workspaceFileOperations"],
): EnterpriseDesktopReleaseOperationsRow {
  const blockerCount =
    report.blockedCount +
    report.blockedPermissionDriftCount +
    report.offlineOpenBlockedCount +
    report.failedOfflineSaveCount;
  const reviewCount =
    report.reviewCount +
    report.offlineOpenReviewCount +
    report.retryableOfflineSaveCount +
    report.permissionDriftCount;

  return {
    id: "enterprise-desktop-workspace-operations",
    status: report.status,
    category: "workspace-operations",
    label: "Desktop workspace file operations",
    detail: `${report.fileCount} files include ${report.recentFileCount} recent files, ${report.teamScopeCount} team scopes, ${report.projectScopeCount} project scopes, ${report.permissionDriftCount} permission drift signals, and ${report.offlineOpenReadyCount} offline-open ready files.`,
    sourceScore: report.score,
    blockerCount,
    reviewCount,
    evidenceCount: report.operatorEvidenceCount + report.operationPackets.length,
    releasePacketIds: ["enterprise-desktop-workspace-operations-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach workspace operation exports and offline-open evidence."
        : "Resolve permission drift, stale recents, and offline-open blockers before release signoff.",
  };
}

function getPluginSandboxRow(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["nativePluginSandbox"],
): EnterpriseDesktopReleaseOperationsRow {
  const blockerCount =
    report.blockedCount +
    report.permissionPromptBlockedCount +
    report.offlinePolicyBlockedCount +
    report.crashIsolationBlockedCount +
    report.replayEvidenceBlockedCount;
  const reviewCount =
    report.reviewCount + report.blockedRunCount + report.crashLikeRunCount;

  return {
    id: "enterprise-desktop-plugin-sandbox",
    status: report.status,
    category: "plugin-sandbox",
    label: "Native plugin/widget sandboxing",
    detail: `${report.manifestCount} manifests include ${report.widgetManifestCount} widgets, ${report.permissionPromptCount} permission prompts, ${report.offlinePolicyReadyCount} offline policies ready, ${report.crashIsolationReadyCount} crash isolation checks ready, and ${report.replayEvidenceReadyCount} replay checks ready.`,
    sourceScore: report.score,
    blockerCount,
    reviewCount,
    evidenceCount: report.operatorEvidenceCount + report.operationPackets.length,
    releasePacketIds: ["enterprise-desktop-plugin-sandbox-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach permission prompt, offline execution, crash isolation, and replay evidence."
        : "Clear plugin permission, offline execution, crash isolation, and replay blockers before shipping.",
  };
}

function getCollaborationRecoveryRow(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["desktopCollaborationRecovery"],
): EnterpriseDesktopReleaseOperationsRow {
  const blockerCount =
    report.blockedCount +
    report.reconnectHandoffBlockedCount +
    report.cursorChatBlockedCount +
    report.failedOfflineSaveCount;
  const reviewCount =
    report.reviewCount +
    report.offlineReplayQueueCount +
    report.staleOfflineSaveCount +
    report.eventDriftCount;

  return {
    id: "enterprise-desktop-collaboration-recovery",
    status: report.status,
    category: "collaboration-recovery",
    label: "Desktop collaboration recovery bridge",
    detail: `${report.fileName} has ${report.reconnectHandoffCount} handoff checks, ${report.offlineReplayQueueCount} offline replay signals, ${report.cursorChatBlockedCount} cursor/chat blockers, and ${report.adminEvidenceCount} admin evidence artifacts.`,
    sourceScore: report.score,
    blockerCount,
    reviewCount,
    evidenceCount: report.adminEvidenceCount + report.recoveryPackets.length,
    releasePacketIds: ["enterprise-desktop-collaboration-recovery-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach collaboration recovery exports and admin evidence packets."
        : "Resolve reconnect handoff, offline replay, cursor/chat, or failed-save blockers before release.",
  };
}

function getProductionEvidenceRow(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["productionReadiness"],
): EnterpriseDesktopReleaseOperationsRow {
  return {
    id: "enterprise-desktop-production-evidence",
    status: report.status,
    category: "production-evidence",
    label: "Production release evidence",
    detail: `${report.sectionCount} production sections roll up to ${report.shipDecision} with ${report.blockerCount} blockers, ${report.reviewItemCount} review items, ${report.evidenceCount} evidence artifacts, and minimum area ${report.minimumScoreArea}.`,
    sourceScore: report.score,
    blockerCount: report.blockerCount,
    reviewCount: report.reviewItemCount,
    evidenceCount: report.evidenceCount,
    releasePacketIds: ["enterprise-desktop-production-evidence-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach production readiness synthesis and release evidence bundle."
        : "Resolve production blockers or route review items before desktop release approval.",
  };
}

function getShipGateRow({
  blockerCount,
  desktopReleaseDecision,
  releasePackets,
  reviewItemCount,
  score,
  sourceRows,
  status,
}: {
  blockerCount: number;
  desktopReleaseDecision: EnterpriseDesktopReleaseDecision;
  releasePackets: EnterpriseDesktopReleasePacket[];
  reviewItemCount: number;
  score: number;
  sourceRows: EnterpriseDesktopReleaseOperationsRow[];
  status: EnterpriseDesktopReleaseOperationsStatus;
}): EnterpriseDesktopReleaseOperationsRow {
  return {
    id: "enterprise-desktop-release-ship-gate",
    status,
    category: "ship-gate",
    label: "Enterprise desktop ship gate",
    detail: `${sourceRows.length} source systems roll up to ${desktopReleaseDecision} with ${blockerCount} blockers, ${reviewItemCount} review items, and ${releasePackets.length} release packets.`,
    sourceScore: score,
    blockerCount,
    reviewCount: reviewItemCount,
    evidenceCount: releasePackets.reduce(
      (total, packet) => total + packet.evidenceCount,
      0,
    ),
    releasePacketIds: releasePackets.map((packet) => packet.id),
    recommendation:
      status === "ready"
        ? "Ship with enterprise desktop release operations JSON, CSV, Markdown, and source packets attached."
        : status === "blocked"
          ? "Do not ship until every blocked desktop release source is cleared and re-exported."
          : "Route review items to the desktop release owner before final approval.",
  };
}

function getRestoreDrillsPacket(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["workspaceRestoreDrills"],
): EnterpriseDesktopReleasePacket {
  return {
    id: "enterprise-desktop-restore-drills-packet",
    kind: "restore-drill",
    category: "restore-drills",
    status: report.status,
    label: "Restore drills and rollback packet",
    detail: `${report.autosaveSnapshotCount} autosave snapshots, ${report.conflictPreviewCount} conflict-safe restore previews, and ${report.operatorEvidenceCount} operator evidence items.`,
    source: "Workspace restore drills",
    evidence: [
      `Latest autosave snapshot: ${report.latestSnapshotAt ?? "not captured"}.`,
      `Latest named version: ${report.latestVersionAt ?? "not captured"}.`,
      `Failed offline saves: ${report.failedSaveCount}.`,
      `Corruption issues: ${report.corruptedArtifactCount}.`,
      ...report.operatorEvidence,
    ],
    evidenceCount: 4 + report.operatorEvidenceCount,
  };
}

function getWorkspaceOperationsPacket(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["workspaceFileOperations"],
): EnterpriseDesktopReleasePacket {
  return {
    id: "enterprise-desktop-workspace-operations-packet",
    kind: "workspace-operations",
    category: "workspace-operations",
    status: report.status,
    label: "Workspace file operations packet",
    detail: `${report.fileCount} files, ${report.permissionDriftCount} permission drift signals, and ${report.offlineOpenReadyCount} offline-open ready files.`,
    source: "Workspace file operations review",
    evidence: [
      `Recent file count: ${report.recentFileCount}.`,
      `Offline-open ready count: ${report.offlineOpenReadyCount}.`,
      `Failed offline saves: ${report.failedOfflineSaveCount}.`,
      `Permission drift count: ${report.permissionDriftCount}.`,
      ...report.operatorEvidence,
    ],
    evidenceCount: 4 + report.operatorEvidenceCount,
  };
}

function getPluginSandboxPacket(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["nativePluginSandbox"],
): EnterpriseDesktopReleasePacket {
  return {
    id: "enterprise-desktop-plugin-sandbox-packet",
    kind: "plugin-sandbox",
    category: "plugin-sandbox",
    status: report.status,
    label: "Plugin sandbox operations packet",
    detail: `${report.manifestCount} manifests, ${report.permissionPromptCount} permission prompt checks, ${report.offlinePolicyReadyCount} offline policies ready, and ${report.replayEvidenceReadyCount} replay evidence checks ready.`,
    source: "Native plugin sandbox operations",
    evidence: [
      `Permission prompt blockers: ${report.permissionPromptBlockedCount}.`,
      `Offline execution blockers: ${report.offlinePolicyBlockedCount}.`,
      `Crash isolation blockers: ${report.crashIsolationBlockedCount}.`,
      `Replay evidence blockers: ${report.replayEvidenceBlockedCount}.`,
      ...report.operatorEvidence,
    ],
    evidenceCount: 4 + report.operatorEvidenceCount,
  };
}

function getCollaborationRecoveryPacket(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["desktopCollaborationRecovery"],
): EnterpriseDesktopReleasePacket {
  return {
    id: "enterprise-desktop-collaboration-recovery-packet",
    kind: "collaboration-recovery",
    category: "collaboration-recovery",
    status: report.status,
    label: "Collaboration recovery packet",
    detail: `${report.reconnectHandoffBlockedCount} handoff blockers, ${report.offlineReplayQueueCount} offline replay signals, ${report.cursorChatBlockedCount} cursor/chat blockers, and ${report.adminEvidenceCount} admin evidence artifacts.`,
    source: "Desktop collaboration recovery bridge",
    evidence: [
      `Reconnect handoff blockers: ${report.reconnectHandoffBlockedCount}.`,
      `Offline replay queue: ${report.offlineReplayQueueCount}.`,
      `Cursor/chat blockers: ${report.cursorChatBlockedCount}.`,
      `Failed offline saves: ${report.failedOfflineSaveCount}.`,
      ...report.adminEvidence,
    ],
    evidenceCount: 4 + report.adminEvidenceCount,
  };
}

function getProductionEvidencePacket(
  report: EnterpriseDesktopReleaseOperationsSynthesisInput["productionReadiness"],
): EnterpriseDesktopReleasePacket {
  return {
    id: "enterprise-desktop-production-evidence-packet",
    kind: "production-evidence",
    category: "production-evidence",
    status: report.status,
    label: "Production evidence packet",
    detail: `${report.sectionCount} sections, ${report.blockerCount} blockers, ${report.reviewItemCount} review items, and ${report.shipDecision} production decision.`,
    source: "Production readiness synthesis",
    evidence: [
      `Production ship decision: ${report.shipDecision}.`,
      `Minimum production area: ${report.minimumScoreArea}.`,
      ...report.releaseEvidenceBundle,
      ...report.signoffChecklist,
    ],
    evidenceCount:
      2 + report.releaseEvidenceBundle.length + report.signoffChecklist.length,
  };
}

function getShipGatePacket({
  blockerCount,
  desktopReleaseDecision,
  reviewItemCount,
  sourceCount,
  status,
}: {
  blockerCount: number;
  desktopReleaseDecision: EnterpriseDesktopReleaseDecision;
  reviewItemCount: number;
  sourceCount: number;
  status: EnterpriseDesktopReleaseOperationsStatus;
}): EnterpriseDesktopReleasePacket {
  return {
    id: "enterprise-desktop-release-ship-gate-packet",
    kind: status === "blocked" ? "rollback" : "ship-gate",
    category: "ship-gate",
    status,
    label: "Enterprise desktop release ship gate",
    detail: `${sourceCount} source systems produce ${desktopReleaseDecision} with ${blockerCount} blockers and ${reviewItemCount} review items.`,
    source: "Enterprise desktop release operations synthesis",
    evidence: [
      `Desktop release decision: ${desktopReleaseDecision}.`,
      `Source systems: ${sourceCount}.`,
      `Blockers: ${blockerCount}.`,
      `Review items: ${reviewItemCount}.`,
      status === "blocked"
        ? "Do-not-ship rollback evidence is required before release approval."
        : "Ship gate source evidence is attached.",
    ],
    evidenceCount: 5,
  };
}

function getExecutiveSummary({
  blockerCount,
  desktopReleaseDecision,
  evidenceCount,
  releasePacketCount,
  reviewItemCount,
  score,
  sourceRows,
}: {
  blockerCount: number;
  desktopReleaseDecision: EnterpriseDesktopReleaseDecision;
  evidenceCount: number;
  releasePacketCount: number;
  reviewItemCount: number;
  score: number;
  sourceRows: EnterpriseDesktopReleaseOperationsRow[];
}) {
  const weakest = sourceRows.reduce((minimum, row) =>
    row.sourceScore < minimum.sourceScore ? row : minimum,
  );

  return [
    `${sourceRows.length} enterprise desktop release sources roll up to ${desktopReleaseDecision}.`,
    `The release score is ${score}; weakest category is ${weakest.category} at ${weakest.sourceScore}.`,
    `${blockerCount} blockers, ${reviewItemCount} review items, ${evidenceCount} evidence artifacts, and ${releasePacketCount} release packets are captured.`,
  ];
}

function getSignoffChecklist(
  status: EnterpriseDesktopReleaseOperationsStatus,
  rows: EnterpriseDesktopReleaseOperationsRow[],
) {
  const blockedRows = rows.filter((row) => row.status === "blocked");
  const reviewRows = rows.filter((row) => row.status === "review");

  if (status === "ready") {
    return [
      "Export enterprise desktop release operations JSON.",
      "Export enterprise desktop release operations CSV.",
      "Export enterprise desktop release operations Markdown.",
      "Attach restore, workspace, plugin, collaboration, and production source packets.",
    ];
  }

  return [
    ...blockedRows.map((row) => `Clear blocked ${row.category}: ${row.label}.`),
    ...reviewRows.map((row) => `Route ${row.category} review to release owner.`),
    "Re-export the enterprise desktop release operations synthesis after fixes.",
  ];
}

function getAggregateStatus(
  rows: EnterpriseDesktopReleaseOperationsRow[],
): EnterpriseDesktopReleaseOperationsStatus {
  if (rows.some((row) => row.status === "blocked")) {
    return "blocked";
  }

  if (rows.some((row) => row.status === "review")) {
    return "review";
  }

  return "ready";
}

function getReleaseDecision(
  status: EnterpriseDesktopReleaseOperationsStatus,
): EnterpriseDesktopReleaseDecision {
  if (status === "blocked") {
    return "do-not-ship";
  }

  if (status === "review") {
    return "review-required";
  }

  return "ship";
}

function getEvidenceMatchCount(
  packets: EnterpriseDesktopReleasePacket[],
  pattern: RegExp,
) {
  return packets.reduce(
    (total, packet) =>
      total +
      packet.evidence.filter((item) => pattern.test(item)).length +
      (pattern.test(packet.detail) ? 1 : 0) +
      (pattern.test(packet.label) ? 1 : 0),
    0,
  );
}

function sortRows(
  left: EnterpriseDesktopReleaseOperationsRow,
  right: EnterpriseDesktopReleaseOperationsRow,
) {
  const rank: Record<EnterpriseDesktopReleaseOperationsStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}

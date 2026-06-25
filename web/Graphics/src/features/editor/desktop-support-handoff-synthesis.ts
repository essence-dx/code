import type {
  DesktopSupportEscalation,
  DesktopSupportHandoffCategory,
  DesktopSupportHandoffDecision,
  DesktopSupportHandoffPacket,
  DesktopSupportHandoffRow,
  DesktopSupportHandoffStatus,
  DesktopSupportHandoffSynthesisInput,
  DesktopSupportHandoffSynthesisReport,
} from "@/features/editor/desktop-support-handoff-synthesis-types";

export {
  getDesktopSupportHandoffSynthesisCsv,
  getDesktopSupportHandoffSynthesisJson,
  getDesktopSupportHandoffSynthesisMarkdown,
} from "@/features/editor/desktop-support-handoff-synthesis-export";
export type {
  DesktopSupportEscalation,
  DesktopSupportHandoffCategory,
  DesktopSupportHandoffDecision,
  DesktopSupportHandoffPacket,
  DesktopSupportHandoffRow,
  DesktopSupportHandoffStatus,
  DesktopSupportHandoffSynthesisInput,
  DesktopSupportHandoffSynthesisReport,
} from "@/features/editor/desktop-support-handoff-synthesis-types";

export function getDesktopSupportHandoffSynthesisReport({
  crashPerformanceSupport,
  desktopUpdateCohorts,
  enterpriseReleaseOperations,
  generatedAt = new Date().toISOString(),
  offlineWorkspaceHealth,
  pluginTelemetryDigest,
}: DesktopSupportHandoffSynthesisInput): DesktopSupportHandoffSynthesisReport {
  const sourceRows = [
    getUpdateCohortRow(desktopUpdateCohorts),
    getCrashPerformanceRow(crashPerformanceSupport),
    getOfflineHealthRow(offlineWorkspaceHealth),
    getPluginTelemetryRow(pluginTelemetryDigest),
    getReleaseOperationsRow(enterpriseReleaseOperations),
  ];
  const supportGate = getSupportGateRow({
    enterpriseReleaseOperations,
    sourceRows,
  });
  const rows = [...sourceRows, supportGate].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockerCount = rows.reduce((total, row) => total + row.blockerCount, 0);
  const reviewItemCount = rows.reduce((total, row) => total + row.reviewCount, 0);
  const handoffPackets = getHandoffPackets({
    crashPerformanceSupport,
    desktopUpdateCohorts,
    enterpriseReleaseOperations,
    offlineWorkspaceHealth,
    pluginTelemetryDigest,
    rows,
  });
  const escalationQueue = getEscalationQueue(rows);
  const minimumScoreCategory = getMinimumScoreCategory(sourceRows);
  const sourceScores = sourceRows.map((row) => row.sourceScore);
  const score = Math.max(
    0,
    Math.min(...sourceScores) -
      blockedCount * 10 -
      reviewCount * 4 -
      Math.min(12, blockerCount) -
      Math.min(8, reviewItemCount),
  );
  const status =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const decision = getDecision(status, enterpriseReleaseOperations);

  return {
    generatedAt,
    status,
    decision,
    score,
    sourceCount: sourceRows.length,
    blockerCount,
    reviewItemCount,
    packetCount: handoffPackets.length,
    escalationCount: escalationQueue.length,
    readyCount,
    reviewCount,
    blockedCount,
    minimumScoreCategory,
    rows,
    handoffPackets,
    escalationQueue,
    executiveSummary: getExecutiveSummary({
      decision,
      score,
      sourceRows,
    }),
    signoffChecklist: getSignoffChecklist({
      decision,
      handoffPackets,
      rows,
    }),
    desktopUpdateCohorts,
    crashPerformanceSupport,
    offlineWorkspaceHealth,
    pluginTelemetryDigest,
    enterpriseReleaseOperations,
  };
}

function getUpdateCohortRow(
  report: DesktopSupportHandoffSynthesisInput["desktopUpdateCohorts"],
): DesktopSupportHandoffRow {
  return {
    id: "desktop-support-update-cohorts",
    status: report.status,
    category: "update-cohorts",
    label: "Update cohort observability",
    detail: `${report.channelCount} update channels include ${report.updaterFailureCount} updater failure${report.updaterFailureCount === 1 ? "" : "s"}, ${report.rollbackCohortCount} rollback cohort${report.rollbackCohortCount === 1 ? "" : "s"}, and ${report.signedEvidenceCount} signed evidence export${report.signedEvidenceCount === 1 ? "" : "s"}.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    packetCount: report.evidencePackets.length,
    recommendation:
      report.status === "ready"
        ? "Attach cohort evidence to the support handoff."
        : "Hold handoff until updater failures, rollback cohorts, and signed evidence gaps are cleared.",
  };
}

function getCrashPerformanceRow(
  report: DesktopSupportHandoffSynthesisInput["crashPerformanceSupport"],
): DesktopSupportHandoffRow {
  return {
    id: "desktop-support-crash-performance",
    status: report.status,
    category: "crash-performance",
    label: "Crash and performance support bundle",
    detail: `${report.signalCount} support signals include ${report.crashCount} crash signal${report.crashCount === 1 ? "" : "s"}, ${report.slowSignalCount} slow signal${report.slowSignalCount === 1 ? "" : "s"}, and ${report.supportPacketCount} support packet${report.supportPacketCount === 1 ? "" : "s"}.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    packetCount: report.supportPacketCount,
    recommendation:
      report.status === "ready"
        ? "Attach crash/performance bundle to support notes."
        : "Clear crash, memory, startup, file-open, and plugin-run blockers before support handoff.",
  };
}

function getOfflineHealthRow(
  report: DesktopSupportHandoffSynthesisInput["offlineWorkspaceHealth"],
): DesktopSupportHandoffRow {
  return {
    id: "desktop-support-offline-health",
    status: report.status,
    category: "offline-health",
    label: "Offline workspace health",
    detail: `${report.localDatabaseIssueCount} local database issue${report.localDatabaseIssueCount === 1 ? "" : "s"}, ${report.autosaveDriftCount} autosave drift signal${report.autosaveDriftCount === 1 ? "" : "s"}, and ${report.userSafeRepairCount} user-safe repair packet${report.userSafeRepairCount === 1 ? "" : "s"} are present.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    packetCount: report.repairPacketCount,
    recommendation:
      report.status === "ready"
        ? "Offline workspace health is ready for support handoff."
        : "Close local database, autosave drift, and media cache blockers before handoff.",
  };
}

function getPluginTelemetryRow(
  report: DesktopSupportHandoffSynthesisInput["pluginTelemetryDigest"],
): DesktopSupportHandoffRow {
  return {
    id: "desktop-support-plugin-telemetry",
    status: report.status,
    category: "plugin-telemetry",
    label: "Plugin runtime telemetry",
    detail: `${report.permissionPromptCount} permission prompt signal${report.permissionPromptCount === 1 ? "" : "s"}, ${report.blockedRunCount} blocked run${report.blockedRunCount === 1 ? "" : "s"}, ${report.replayMismatchCount} replay mismatch${report.replayMismatchCount === 1 ? "" : "es"}, and ${report.adminEscalationQueueCount} admin escalation${report.adminEscalationQueueCount === 1 ? "" : "s"} are in scope.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    packetCount: Math.max(1, report.adminEscalationQueueCount),
    recommendation:
      report.status === "ready"
        ? "Plugin telemetry digest is ready for support handoff."
        : "Resolve plugin runtime escalation queue before handoff.",
  };
}

function getReleaseOperationsRow(
  report: DesktopSupportHandoffSynthesisInput["enterpriseReleaseOperations"],
): DesktopSupportHandoffRow {
  return {
    id: "desktop-support-release-operations",
    status: report.status,
    category: "release-operations",
    label: "Enterprise release operations",
    detail: `Desktop release decision is ${report.desktopReleaseDecision} with ${report.blockerCount} blocker${report.blockerCount === 1 ? "" : "s"}, ${report.reviewItemCount} review item${report.reviewItemCount === 1 ? "" : "s"}, and ${report.releasePacketCount} release packet${report.releasePacketCount === 1 ? "" : "s"}.`,
    sourceScore: report.score,
    blockerCount: report.blockerCount,
    reviewCount: report.reviewItemCount,
    packetCount: report.releasePacketCount,
    recommendation:
      report.status === "ready"
        ? "Release operations can be attached to support handoff."
        : "Keep support handoff gated by enterprise release operations.",
  };
}

function getSupportGateRow({
  enterpriseReleaseOperations,
  sourceRows,
}: {
  enterpriseReleaseOperations: DesktopSupportHandoffSynthesisInput["enterpriseReleaseOperations"];
  sourceRows: DesktopSupportHandoffRow[];
}): DesktopSupportHandoffRow {
  const blockedCount = sourceRows.filter((row) => row.status === "blocked").length;
  const reviewCount = sourceRows.filter((row) => row.status === "review").length;
  const status: DesktopSupportHandoffStatus =
    enterpriseReleaseOperations.desktopReleaseDecision === "do-not-ship" ||
    blockedCount > 0
      ? "blocked"
      : reviewCount > 0 ||
          enterpriseReleaseOperations.desktopReleaseDecision ===
            "review-required"
        ? "review"
        : "ready";

  return {
    id: "desktop-support-handoff-gate",
    status,
    category: "support-gate",
    label: "Desktop support handoff gate",
    detail: `${blockedCount} source blocker${blockedCount === 1 ? "" : "s"} and ${reviewCount} review source${reviewCount === 1 ? "" : "s"} determine the support handoff decision.`,
    sourceScore: Math.min(...sourceRows.map((row) => row.sourceScore)),
    blockerCount: blockedCount,
    reviewCount,
    packetCount: sourceRows.reduce((total, row) => total + row.packetCount, 0),
    recommendation:
      status === "ready"
        ? "Support handoff can be exported for release owner signoff."
        : "Do not hand off desktop support until blocked source reports are cleared.",
  };
}

function getHandoffPackets({
  crashPerformanceSupport,
  desktopUpdateCohorts,
  enterpriseReleaseOperations,
  offlineWorkspaceHealth,
  pluginTelemetryDigest,
  rows,
}: {
  crashPerformanceSupport: DesktopSupportHandoffSynthesisInput["crashPerformanceSupport"];
  desktopUpdateCohorts: DesktopSupportHandoffSynthesisInput["desktopUpdateCohorts"];
  enterpriseReleaseOperations: DesktopSupportHandoffSynthesisInput["enterpriseReleaseOperations"];
  offlineWorkspaceHealth: DesktopSupportHandoffSynthesisInput["offlineWorkspaceHealth"];
  pluginTelemetryDigest: DesktopSupportHandoffSynthesisInput["pluginTelemetryDigest"];
  rows: DesktopSupportHandoffRow[];
}): DesktopSupportHandoffPacket[] {
  return [
    {
      id: "support-update-cohort-packet",
      status: desktopUpdateCohorts.status,
      category: "update-cohorts",
      label: "Update cohort packet",
      detail: `${desktopUpdateCohorts.evidencePackets.length} update cohort evidence packet${desktopUpdateCohorts.evidencePackets.length === 1 ? "" : "s"} are available.`,
      evidence: desktopUpdateCohorts.signedEvidenceExports,
      evidenceCount: desktopUpdateCohorts.evidencePackets.length,
    },
    {
      id: "support-crash-performance-packet",
      status: crashPerformanceSupport.status,
      category: "crash-performance",
      label: "Crash performance packet",
      detail: `${crashPerformanceSupport.supportPacketCount} crash/performance support packet${crashPerformanceSupport.supportPacketCount === 1 ? "" : "s"} are available.`,
      evidence: crashPerformanceSupport.bundles.map((packet) => packet.label),
      evidenceCount: crashPerformanceSupport.supportPacketCount,
    },
    {
      id: "support-offline-health-packet",
      status: offlineWorkspaceHealth.status,
      category: "offline-health",
      label: "Offline health packet",
      detail: `${offlineWorkspaceHealth.userSafeRepairCount} user-safe repair packet${offlineWorkspaceHealth.userSafeRepairCount === 1 ? "" : "s"} are available.`,
      evidence: offlineWorkspaceHealth.repairPackets.map((packet) => packet.label),
      evidenceCount: offlineWorkspaceHealth.repairPacketCount,
    },
    {
      id: "support-plugin-telemetry-packet",
      status: pluginTelemetryDigest.status,
      category: "plugin-telemetry",
      label: "Plugin telemetry packet",
      detail: `${pluginTelemetryDigest.adminEscalationQueueCount} admin escalation queue item${pluginTelemetryDigest.adminEscalationQueueCount === 1 ? "" : "s"} are available.`,
      evidence: pluginTelemetryDigest.adminEscalationQueue.map(
        (item) => item.reason,
      ),
      evidenceCount: Math.max(1, pluginTelemetryDigest.rows.length),
    },
    {
      id: "support-release-operations-packet",
      status: enterpriseReleaseOperations.status,
      category: "release-operations",
      label: "Release operations packet",
      detail: `${enterpriseReleaseOperations.releasePacketCount} enterprise release packet${enterpriseReleaseOperations.releasePacketCount === 1 ? "" : "s"} are available.`,
      evidence: enterpriseReleaseOperations.releasePackets.map(
        (packet) => packet.label,
      ),
      evidenceCount: enterpriseReleaseOperations.releasePacketCount,
    },
    {
      id: "support-gate-packet",
      status:
        rows.find((row) => row.category === "support-gate")?.status ?? "review",
      category: "support-gate",
      label: "Support gate packet",
      detail: "Support gate decision joins every desktop runtime observability source.",
      evidence: rows.map((row) => `${row.label}: ${row.status}`),
      evidenceCount: rows.length,
    },
  ];
}

function getEscalationQueue(
  rows: DesktopSupportHandoffRow[],
): DesktopSupportEscalation[] {
  return rows
    .filter((row) => row.status !== "ready")
    .map((row) => ({
      id: `support-escalation:${row.category}`,
      status: row.status,
      category: row.category,
      label: row.label,
      detail: row.detail,
      ownerHint: getOwnerHint(row.category),
    }));
}

function getOwnerHint(category: DesktopSupportHandoffCategory) {
  const owners = {
    "crash-performance": "desktop performance owner",
    "offline-health": "local workspace reliability owner",
    "plugin-telemetry": "plugin runtime owner",
    "release-operations": "release operations owner",
    "support-gate": "support lead",
    "update-cohorts": "desktop updater owner",
  } satisfies Record<DesktopSupportHandoffCategory, string>;

  return owners[category];
}

function getDecision(
  status: DesktopSupportHandoffStatus,
  enterpriseReleaseOperations: DesktopSupportHandoffSynthesisInput["enterpriseReleaseOperations"],
): DesktopSupportHandoffDecision {
  if (
    status === "blocked" ||
    enterpriseReleaseOperations.desktopReleaseDecision === "do-not-ship"
  ) {
    return "do-not-handoff";
  }

  return status === "review" ? "review-required" : "handoff";
}

function getExecutiveSummary({
  decision,
  score,
  sourceRows,
}: {
  decision: DesktopSupportHandoffDecision;
  score: number;
  sourceRows: DesktopSupportHandoffRow[];
}) {
  return [
    `Desktop support handoff decision: ${decision}.`,
    `Support handoff score is ${score}; minimum source is ${getMinimumScoreCategory(sourceRows)}.`,
    `${sourceRows.filter((row) => row.status === "blocked").length} source report${sourceRows.filter((row) => row.status === "blocked").length === 1 ? "" : "s"} are blocked.`,
    `${sourceRows.reduce((total, row) => total + row.packetCount, 0)} source packet${sourceRows.reduce((total, row) => total + row.packetCount, 0) === 1 ? "" : "s"} are ready for export.`,
  ];
}

function getSignoffChecklist({
  decision,
  handoffPackets,
  rows,
}: {
  decision: DesktopSupportHandoffDecision;
  handoffPackets: DesktopSupportHandoffPacket[];
  rows: DesktopSupportHandoffRow[];
}) {
  return [
    "Export the support handoff JSON, CSV, and Markdown packets.",
    "Attach update cohort, crash/performance, offline health, plugin telemetry, and release operations packets.",
    "Assign every blocked or review escalation before support handoff.",
    decision === "handoff"
      ? "Proceed with support lead signoff."
      : "Hold handoff until blocked rows are cleared.",
    `${handoffPackets.length} handoff packet${handoffPackets.length === 1 ? "" : "s"} and ${rows.length} gate row${rows.length === 1 ? "" : "s"} should be archived.`,
  ];
}

function getMinimumScoreCategory(rows: DesktopSupportHandoffRow[]) {
  return rows.reduce((minimum, row) =>
    row.sourceScore < minimum.sourceScore ? row : minimum,
  ).category;
}

function sortRows(
  left: DesktopSupportHandoffRow,
  right: DesktopSupportHandoffRow,
) {
  const rank: Record<DesktopSupportHandoffStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}

import type {
  WorkspaceFileOfflineOpenQueueItem,
  WorkspaceFileOperationsPacket,
  WorkspaceFileOperationsReviewReport,
  WorkspaceFileOperationsRow,
  WorkspaceFilePermissionDriftQueueItem,
} from "@/features/editor/workspace-file-operations-review-types";

export function getWorkspaceFileOperationsReviewCsv(
  report: WorkspaceFileOperationsReviewReport,
  rows: WorkspaceFileOperationsRow[] = report.rows,
) {
  const rowHeader: Array<keyof WorkspaceFileOperationsRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "metric",
    "threshold",
    "packetIds",
    "recommendation",
  ];
  const packetHeader: Array<keyof WorkspaceFileOperationsPacket> = [
    "id",
    "kind",
    "status",
    "label",
    "detail",
    "fileIds",
    "evidenceCount",
  ];
  const driftHeader: Array<keyof WorkspaceFilePermissionDriftQueueItem> = [
    "fileId",
    "status",
    "fileName",
    "accessRole",
    "scope",
    "teamName",
    "projectName",
    "reason",
    "handoffSignalCount",
  ];
  const offlineHeader: Array<keyof WorkspaceFileOfflineOpenQueueItem> = [
    "fileId",
    "status",
    "fileName",
    "latestLocalArtifactAt",
    "snapshotCount",
    "queuedSaveCount",
    "retryableSaveCount",
    "failedSaveCount",
    "syncedSaveCount",
  ];

  return [
    [
      "score",
      "status",
      "active_files",
      "recent_files",
      "stale_recent_files",
      "team_scopes",
      "project_scopes",
      "unscoped_files",
      "permission_drift",
      "offline_ready",
      "offline_blocked",
      "operator_evidence",
    ].join(","),
    [
      report.score,
      report.status,
      report.activeFileCount,
      report.recentFileCount,
      report.staleRecentFileCount,
      report.teamScopeCount,
      report.projectScopeCount,
      report.unscopedFileCount,
      report.permissionDriftCount,
      report.offlineOpenReadyCount,
      report.offlineOpenBlockedCount,
      report.operatorEvidenceCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    rowHeader.join(","),
    ...rows.map((row) =>
      rowHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
    "",
    packetHeader.join(","),
    ...report.operationPackets.map((packet) =>
      packetHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(packet[key])
              ? packet[key].join("; ")
              : packet[key],
          ),
        )
        .join(","),
    ),
    "",
    driftHeader.join(","),
    ...report.permissionDriftQueue.map((item) =>
      driftHeader.map((key) => escapeCsvCell(item[key])).join(","),
    ),
    "",
    offlineHeader.join(","),
    ...report.offlineOpenQueue.map((item) =>
      offlineHeader.map((key) => escapeCsvCell(item[key])).join(","),
    ),
  ].join("\n");
}

export function getWorkspaceFileOperationsReviewMarkdown(
  report: WorkspaceFileOperationsReviewReport,
  rows: WorkspaceFileOperationsRow[] = report.rows,
) {
  return [
    "# Workspace File Operations Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active files: ${report.activeFileCount}`,
    `Recent files: ${report.recentFileCount}`,
    `Team scopes: ${report.teamScopeCount}`,
    `Project scopes: ${report.projectScopeCount}`,
    `Unscoped files: ${report.unscopedFileCount}`,
    `Permission drift: ${report.permissionDriftCount}`,
    `Offline-open ready: ${report.offlineOpenReadyCount}`,
    `Offline-open blocked: ${report.offlineOpenBlockedCount}`,
    `Operator evidence: ${report.operatorEvidenceCount}`,
    "",
    "This packet covers recent files, project/team scopes, permission drift, offline-open readiness, and operator evidence for desktop workspace operations.",
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Operation Packets",
    ...report.operationPackets.flatMap((packet) => [
      `- [${packet.status}] ${packet.kind} / ${packet.label}: ${packet.detail}`,
      ...packet.steps.map((step) => `  - ${step}`),
    ]),
    "",
    "## Permission Drift",
    ...(report.permissionDriftQueue.length > 0
      ? report.permissionDriftQueue.map(
          (item) =>
            `- [${item.status}] ${item.fileName}: ${item.detail} ${item.recommendation}`,
        )
      : ["- No permission drift detected."]),
    "",
    "## Offline-Open Queue",
    ...(report.offlineOpenQueue.length > 0
      ? report.offlineOpenQueue.map(
          (item) =>
            `- [${item.status}] ${item.fileName}: ${item.detail} ${item.recommendation}`,
        )
      : ["- No recent files need offline-open review."]),
    "",
    "## Operator Evidence",
    ...report.operatorEvidence.map((item) => `- ${item}`),
  ].join("\n");
}

export function getWorkspaceFileOperationsReviewJson(
  report: WorkspaceFileOperationsReviewReport,
  rows: WorkspaceFileOperationsRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.workspace-file-operations-review",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        fileCount: report.fileCount,
        activeFileCount: report.activeFileCount,
        recentFileCount: report.recentFileCount,
        staleRecentFileCount: report.staleRecentFileCount,
        teamScopeCount: report.teamScopeCount,
        projectScopeCount: report.projectScopeCount,
        unscopedFileCount: report.unscopedFileCount,
        permissionDriftCount: report.permissionDriftCount,
        blockedPermissionDriftCount: report.blockedPermissionDriftCount,
        offlineOpenReadyCount: report.offlineOpenReadyCount,
        offlineOpenReviewCount: report.offlineOpenReviewCount,
        offlineOpenBlockedCount: report.offlineOpenBlockedCount,
        failedOfflineSaveCount: report.failedOfflineSaveCount,
        retryableOfflineSaveCount: report.retryableOfflineSaveCount,
        operatorEvidenceCount: report.operatorEvidenceCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      rows,
      operationPackets: report.operationPackets,
      permissionDriftQueue: report.permissionDriftQueue,
      offlineOpenQueue: report.offlineOpenQueue,
      operatorEvidence: report.operatorEvidence,
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

import type {
  OfflineWorkspaceHealthMonitorReport,
  OfflineWorkspaceHealthRow,
  OfflineWorkspaceRepairPacket,
} from "@/features/editor/offline-workspace-health-monitor-types";

export function getOfflineWorkspaceHealthMonitorCsv(
  report: OfflineWorkspaceHealthMonitorReport,
  rows: OfflineWorkspaceHealthRow[] = report.rows,
) {
  const rowHeader: Array<keyof OfflineWorkspaceHealthRow> = [
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
  const packetHeader: Array<keyof OfflineWorkspaceRepairPacket> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "userSafe",
    "evidenceCount",
  ];

  return [
    [
      "score",
      "status",
      "file_id",
      "file_name",
      "database_issues",
      "autosave_drift",
      "media_cache_bytes",
      "media_cache_pressure",
      "repair_packets",
      "user_safe_repairs",
      "failed_offline_saves",
      "retryable_offline_saves",
      "stale_offline_saves",
    ].join(","),
    [
      report.score,
      report.status,
      report.fileId,
      report.fileName,
      report.localDatabaseIssueCount,
      report.autosaveDriftCount,
      report.mediaCachePressureBytes,
      report.mediaCachePressureCount,
      report.repairPacketCount,
      report.userSafeRepairCount,
      report.failedOfflineSaveCount,
      report.retryableOfflineSaveCount,
      report.staleOfflineSaveCount,
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
    ...report.repairPackets.map((packet) =>
      packetHeader
        .map((key) => escapeCsvCell(packet[key]))
        .join(","),
    ),
  ].join("\n");
}

export function getOfflineWorkspaceHealthMonitorMarkdown(
  report: OfflineWorkspaceHealthMonitorReport,
  rows: OfflineWorkspaceHealthRow[] = report.rows,
) {
  return [
    "# Offline Workspace Health Monitor",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `File: ${report.fileName}`,
    `Local database issues: ${report.localDatabaseIssueCount}`,
    `Autosave drift: ${report.autosaveDriftCount}`,
    `Media cache pressure bytes: ${report.mediaCachePressureBytes}`,
    `User-safe repair packets: ${report.userSafeRepairCount}`,
    "",
    "This monitor joins local database integrity, autosave drift, media cache pressure, and user-safe repair packets for offline desktop workspaces.",
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## User-Safe Repair Packets",
    ...report.repairPackets.flatMap((packet) => [
      `- [${packet.status}] ${packet.category} / ${packet.label}: ${packet.detail}`,
      ...packet.steps.map((step) => `  - ${step}`),
    ]),
  ].join("\n");
}

export function getOfflineWorkspaceHealthMonitorJson(
  report: OfflineWorkspaceHealthMonitorReport,
  rows: OfflineWorkspaceHealthRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.offline-workspace-health-monitor",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        fileId: report.fileId,
        fileName: report.fileName,
        localDatabaseIssueCount: report.localDatabaseIssueCount,
        autosaveDriftCount: report.autosaveDriftCount,
        mediaCachePressureBytes: report.mediaCachePressureBytes,
        mediaCachePressureCount: report.mediaCachePressureCount,
        repairPacketCount: report.repairPacketCount,
        userSafeRepairCount: report.userSafeRepairCount,
        failedOfflineSaveCount: report.failedOfflineSaveCount,
        staleOfflineSaveCount: report.staleOfflineSaveCount,
        retryableOfflineSaveCount: report.retryableOfflineSaveCount,
        autosaveSnapshotCount: report.autosaveSnapshotCount,
        staleAutosaveSnapshotCount: report.staleAutosaveSnapshotCount,
        mediaCompressionCandidateCount: report.mediaCompressionCandidateCount,
        mediaManifestBlockedCount: report.mediaManifestBlockedCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      rows,
      repairPackets: report.repairPackets,
      sourceScores: {
        workspaceRestoreDrills: report.workspaceRestoreDrills.score,
        workspaceFileOperations: report.workspaceFileOperations.score,
        mediaAssetPipeline: report.mediaAssetPipeline.score,
      },
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | string[] | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) ? value.join("; ") : String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

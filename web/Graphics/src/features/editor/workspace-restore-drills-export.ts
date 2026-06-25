import type {
  WorkspaceRestoreDrillPacket,
  WorkspaceRestoreDrillRow,
  WorkspaceRestoreDrillsReport,
} from "@/features/editor/workspace-restore-drills-types";

export function getWorkspaceRestoreDrillsCsv(
  report: WorkspaceRestoreDrillsReport,
  rows: WorkspaceRestoreDrillRow[] = report.rows,
) {
  const rowHeader: Array<keyof WorkspaceRestoreDrillRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "metric",
    "threshold",
    "drillPacketIds",
    "recommendation",
  ];
  const packetHeader: Array<keyof WorkspaceRestoreDrillPacket> = [
    "id",
    "kind",
    "status",
    "label",
    "detail",
    "artifactIds",
    "evidenceCount",
  ];

  return [
    [
      "score",
      "status",
      "file_id",
      "autosave_snapshots",
      "stale_snapshots",
      "named_versions",
      "conflict_previews",
      "corrupted_artifacts",
      "retryable_saves",
      "failed_saves",
      "stale_saves",
      "operator_evidence",
    ].join(","),
    [
      report.score,
      report.status,
      report.fileId,
      report.autosaveSnapshotCount,
      report.staleSnapshotCount,
      report.namedVersionCount,
      report.conflictPreviewCount,
      report.corruptedArtifactCount,
      report.retryableSaveCount,
      report.failedSaveCount,
      report.staleSaveCount,
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
    ...report.drillPackets.map((packet) =>
      packetHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(packet[key]) ? packet[key].join("; ") : packet[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getWorkspaceRestoreDrillsMarkdown(
  report: WorkspaceRestoreDrillsReport,
  rows: WorkspaceRestoreDrillRow[] = report.rows,
) {
  return [
    "# Workspace Restore Drills",
    "",
    `Generated: ${report.generatedAt}`,
    `File: ${report.fileName} (${report.fileId})`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Autosave snapshots: ${report.autosaveSnapshotCount}`,
    `Stale snapshots: ${report.staleSnapshotCount}`,
    `Named versions: ${report.namedVersionCount}`,
    `Conflict-safe previews: ${report.conflictPreviewCount}`,
    `Corrupted artifacts: ${report.corruptedArtifactCount}`,
    `Retryable saves: ${report.retryableSaveCount}`,
    `Operator evidence: ${report.operatorEvidenceCount}`,
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Drill Packets",
    ...report.drillPackets.flatMap((packet) => [
      `- [${packet.status}] ${packet.kind} / ${packet.label}: ${packet.detail}`,
      ...packet.steps.map((step) => `  - ${step}`),
    ]),
    "",
    "## Operator Evidence",
    ...report.operatorEvidence.map((item) => `- ${item}`),
    "",
    "## Corruption Issues",
    ...(report.corruptionIssues.length > 0
      ? report.corruptionIssues.map((item) => `- ${item}`)
      : ["- No corruption issues detected."]),
  ].join("\n");
}

export function getWorkspaceRestoreDrillsJson(
  report: WorkspaceRestoreDrillsReport,
  rows: WorkspaceRestoreDrillRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.workspace-restore-drills",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        fileId: report.fileId,
        fileName: report.fileName,
        status: report.status,
        score: report.score,
        autosaveSnapshotCount: report.autosaveSnapshotCount,
        staleSnapshotCount: report.staleSnapshotCount,
        namedVersionCount: report.namedVersionCount,
        conflictPreviewCount: report.conflictPreviewCount,
        corruptedArtifactCount: report.corruptedArtifactCount,
        retryableSaveCount: report.retryableSaveCount,
        failedSaveCount: report.failedSaveCount,
        staleSaveCount: report.staleSaveCount,
        operatorEvidenceCount: report.operatorEvidenceCount,
        latestSnapshotAt: report.latestSnapshotAt,
        latestVersionAt: report.latestVersionAt,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
        readyCount: report.readyCount,
      },
      rows,
      drillPackets: report.drillPackets,
      operatorEvidence: report.operatorEvidence,
      corruptionIssues: report.corruptionIssues,
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

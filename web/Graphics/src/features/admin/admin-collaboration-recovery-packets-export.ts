import type {
  AdminCollaborationRecoveryPacket,
  AdminCollaborationRecoveryPacketsReport,
  AdminCollaborationRecoveryRow,
} from "@/features/admin/admin-collaboration-recovery-packets-types";

export function getAdminCollaborationRecoveryPacketsJson(
  report: AdminCollaborationRecoveryPacketsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminCollaborationRecoveryPacketsCsv(
  report: AdminCollaborationRecoveryPacketsReport,
) {
  const rowHeader: Array<keyof AdminCollaborationRecoveryRow> = [
    "id",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "count",
    "target",
    "latestAt",
  ];
  const packetHeader: Array<keyof AdminCollaborationRecoveryPacket> = [
    "id",
    "status",
    "fileName",
    "ownerEmail",
    "ownerHandoffStatus",
    "activityReplayEvidenceCount",
    "replayWindowStatus",
    "roomCaptured",
    "evidenceArchived",
    "exportReady",
    "conflictSummaryCount",
    "saveConflictCount",
    "unresolvedMentionCount",
    "latestAt",
    "recommendation",
  ];

  return [
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["review-row", ...rowHeader.map((key) => row[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...packetHeader].join(","),
    ...report.packets.map((packet) =>
      ["packet", ...packetHeader.map((key) => packet[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminCollaborationRecoveryPacketsMarkdown(
  report: AdminCollaborationRecoveryPacketsReport,
) {
  return [
    "# Collaboration Recovery Packets",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Packets: ${report.readyPacketCount} ready, ${report.reviewPacketCount} review, ${report.blockedPacketCount} blocked`,
    `Export ready: ${report.exportReadyPacketCount}`,
    `Activity replay evidence: ${report.replayEvidenceCount}`,
    `Ownership handoff: ${report.ownershipHandoffCount} assigned / ${report.missingOwnershipCount} missing`,
    `Conflict summary rows: ${report.conflictSummaryCount}`,
    `Save conflicts: ${report.saveConflictCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Target: ${row.target ?? "none"}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Packets",
    "",
    ...report.packets.map((packet) =>
      [
        `- [${packet.status}] ${packet.fileName}`,
        `  - Owner: ${packet.ownerEmail}`,
        `  - Activity replay: ${packet.activityReplayEvidenceCount} evidence items`,
        `  - Ownership handoff: ${packet.ownerHandoffLabel}`,
        `  - Conflict summary: ${packet.conflictSummaryCount} signals`,
        `  - Export ready: ${packet.exportReady ? "yes" : "no"}`,
        `  - Recovery steps: ${packet.recoverySteps.join("; ") || "none"}`,
        `  - Recommendation: ${packet.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ]
    .map(redactSensitive)
    .join("\n");
}

function redactSensitive(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\b/gi, "[redacted-token]")
    .replace(/\/share\/[A-Za-z0-9_-]+/g, "/share/[redacted-token]");
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

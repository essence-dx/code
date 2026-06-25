import type {
  AdminCollaborationHandoffOperationsReport,
  AdminCollaborationHandoffRow,
} from "@/features/admin/admin-collaboration-handoff-operations";

export function getAdminCollaborationHandoffOperationsJson(
  report: AdminCollaborationHandoffOperationsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminCollaborationHandoffOperationsCsv(
  report: AdminCollaborationHandoffOperationsReport,
) {
  const header: Array<keyof AdminCollaborationHandoffRow> = [
    "id",
    "roomId",
    "category",
    "status",
    "fileName",
    "ownerEmail",
    "label",
    "detail",
    "recommendation",
    "count",
    "latestAt",
  ];

  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getAdminCollaborationHandoffOperationsMarkdown(
  report: AdminCollaborationHandoffOperationsReport,
) {
  return [
    "# Collaboration Handoff Room Operations",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Files: ${report.fileCount}`,
    `Rooms: ${report.roomCount}`,
    `Captured rooms: ${report.capturedRoomCount}`,
    `Active rooms: ${report.activeRoomCount}`,
    `Stale rooms: ${report.staleRoomCount}`,
    `Unresolved mentions: ${report.unresolvedMentionCount}`,
    `Presenter conflicts: ${report.presenterConflictCount}`,
    `Conflict queue: ${report.conflictQueueCount}`,
    `Escalations: ${report.escalationQueueCount}`,
    `Assigned handoff owners: ${report.assignedOwnerCount}`,
    `Archived room evidence: ${report.archivedEvidenceCount}`,
    `Resolved queues: ${report.resolvedQueueCount}`,
    "",
    "## Rooms",
    "",
    ...report.rooms.map((room) =>
      [
        `- [${room.status}] ${room.fileName}`,
        `  - Owner: ${room.ownerEmail}`,
        `  - Room captured: ${room.roomCaptured ? "yes" : "no"}`,
        `  - Updated: ${room.roomUpdatedAt ?? "never"}`,
        `  - Chat: ${room.chatMessageCount}`,
        `  - Presence events: ${room.presenceEventCount}`,
        `  - Mentions: ${room.unresolvedMentionCount}`,
        `  - Presenter: ${room.presenter.summary}`,
        `  - Conflicts: ${room.operationConflictCount + room.targetConflictCount}`,
        `  - Escalations: ${room.escalationCount}`,
        `  - Handoff owner: ${room.handoffOwnerEmail ?? "unassigned"}`,
        `  - Evidence archived: ${room.evidenceArchivedAt ?? "no"}`,
        `  - Queues resolved: ${[
          room.mentionQueueResolvedAt ? "mentions" : "",
          room.escalationQueueResolvedAt ? "escalations" : "",
        ].filter(Boolean).join(", ") || "none"}`,
        `  - Recommendation: ${room.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Review Queue",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - File: ${row.fileName}`,
        `  - Category: ${row.category}`,
        `  - Count: ${row.count}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

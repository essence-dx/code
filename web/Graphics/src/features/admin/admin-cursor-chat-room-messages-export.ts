import type {
  AdminCursorChatRoomMessageRoom,
  AdminCursorChatRoomMessageRow,
  AdminCursorChatRoomMessagesReport,
  AdminCursorChatRoomReplayEvidence,
} from "@/features/admin/admin-cursor-chat-room-messages-types";

export function getAdminCursorChatRoomMessagesJson(
  report: AdminCursorChatRoomMessagesReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminCursorChatRoomMessagesCsv(
  report: AdminCursorChatRoomMessagesReport,
) {
  const rowHeader: Array<keyof AdminCursorChatRoomMessageRow> = [
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
  const roomHeader: Array<keyof AdminCursorChatRoomMessageRoom> = [
    "id",
    "status",
    "fileName",
    "roomCaptured",
    "messageCount",
    "retainedMessageCount",
    "expiredMessageCount",
    "mentionCount",
    "participantCount",
    "externalParticipantCount",
    "privacyReplayEvidenceCount",
    "replayWindowStatus",
    "recoveryPacketStatus",
    "recoveryPacketExportReady",
    "exportReady",
    "latestAt",
    "recommendation",
  ];
  const evidenceHeader: Array<keyof AdminCursorChatRoomReplayEvidence> = [
    "id",
    "status",
    "fileName",
    "messageId",
    "actorRef",
    "privacy",
    "detail",
    "createdAt",
    "retentionExpiresAt",
    "expired",
    "recoveryPacketStatus",
  ];

  return [
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["review-row", ...rowHeader.map((key) => row[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...roomHeader].join(","),
    ...report.rooms.map((room) =>
      ["room", ...roomHeader.map((key) => room[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...evidenceHeader].join(","),
    ...report.replayEvidence.map((item) =>
      ["privacy-replay", ...evidenceHeader.map((key) => item[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminCursorChatRoomMessagesMarkdown(
  report: AdminCursorChatRoomMessagesReport,
) {
  return [
    "# Cursor Chat Room Messages",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rooms: ${report.roomCount}`,
    `Messages: ${report.messageCount}`,
    `Expired messages: ${report.expiredMessageCount}`,
    `Mentions: ${report.mentionCount}`,
    `privacy-safe replay evidence: ${report.privacyReplayEvidenceCount}`,
    `Recovery packet links: ${report.recoveryPacketLinkedCount}`,
    `Export-ready rooms: ${report.exportReadyRoomCount}`,
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
    "## Rooms",
    "",
    ...report.rooms.map((room) =>
      [
        `- [${room.status}] ${room.fileName}`,
        `  - Messages: ${room.messageCount} total / ${room.expiredMessageCount} expired`,
        `  - Participants: ${room.participantCount} total / ${room.externalParticipantCount} external`,
        `  - Privacy-safe replay: ${room.privacyReplayEvidenceCount}`,
        `  - Recovery packet: ${room.recoveryPacketStatus}`,
        `  - Export-ready: ${room.exportReady ? "yes" : "no"}`,
        `  - Recommendation: ${room.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Privacy-Safe Replay Evidence",
    "",
    ...report.replayEvidence.map((item) =>
      [
        `- [${item.status}] ${item.fileName}`,
        `  - Actor: ${item.actorRef}`,
        `  - Detail: ${item.detail}`,
        `  - Retention expires: ${item.retentionExpiresAt}`,
        `  - Recovery packet: ${item.recoveryPacketStatus}`,
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

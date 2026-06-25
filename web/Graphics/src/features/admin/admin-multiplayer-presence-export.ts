import type {
  AdminMultiplayerPresenceReport,
  AdminMultiplayerPresenceRoom,
  AdminMultiplayerPresenceRow,
} from "@/features/admin/admin-multiplayer-presence";

export function getAdminMultiplayerPresenceJson(
  report: AdminMultiplayerPresenceReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminMultiplayerPresenceCsv(
  report: AdminMultiplayerPresenceReport,
) {
  const rowHeader: Array<keyof AdminMultiplayerPresenceRow> = [
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
  const roomHeader: Array<keyof AdminMultiplayerPresenceRoom> = [
    "id",
    "status",
    "fileName",
    "ownerEmail",
    "roomCaptured",
    "cursorEvidenceCount",
    "spotlightEventCount",
    "followEventCount",
    "presenterHandoffAgeMinutes",
    "presenterHandoffTimerStatus",
    "staleRecoveryStatus",
    "saveConflictCount",
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
    ["section", ...roomHeader].join(","),
    ...report.rooms.map((room) =>
      ["room", ...roomHeader.map((key) => room[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminMultiplayerPresenceMarkdown(
  report: AdminMultiplayerPresenceReport,
) {
  return [
    "# Multiplayer Presence Operations",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rooms: ${report.readyRoomCount} ready, ${report.reviewRoomCount} review, ${report.blockedRoomCount} blocked`,
    `Presence events: ${report.presenceEventCount}`,
    `Cursor evidence: ${report.cursorEvidenceCount}`,
    `Spotlight events: ${report.spotlightEventCount}`,
    `Follow events: ${report.followEventCount}`,
    `Handoff timer review: ${report.handoffTimerReviewCount}`,
    `Stale recovery queue: ${report.staleRecoveryQueueCount}`,
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
    "## Rooms",
    "",
    ...report.rooms.map((room) =>
      [
        `- [${room.status}] ${room.fileName}`,
        `  - Owner: ${room.ownerEmail}`,
        `  - Captured: ${room.roomCaptured ? "yes" : "no"}`,
        `  - Cursor evidence: ${room.cursorEvidenceCount}`,
        `  - Spotlight/follow: ${room.spotlightEventCount}/${room.followEventCount}`,
        `  - Presenter: ${room.presenterStatus}`,
        `  - Presenter handoff age: ${room.presenterHandoffAgeMinutes ?? "unknown"} minutes`,
        `  - Presenter handoff timer: ${room.presenterHandoffTimerStatus}`,
        `  - Stale recovery: ${room.staleRecoveryStatus}`,
        `  - Save conflicts: ${room.saveConflictCount}`,
        `  - Recommendation: ${room.recommendation}`,
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

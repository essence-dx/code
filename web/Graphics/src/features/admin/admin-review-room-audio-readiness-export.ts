import type {
  AdminReviewRoomAudioEvidence,
  AdminReviewRoomAudioReadinessReport,
  AdminReviewRoomAudioRoom,
  AdminReviewRoomAudioRow,
  AdminReviewRoomFallbackNote,
} from "@/features/admin/admin-review-room-audio-readiness-types";

export function getAdminReviewRoomAudioReadinessJson(
  report: AdminReviewRoomAudioReadinessReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminReviewRoomAudioReadinessCsv(
  report: AdminReviewRoomAudioReadinessReport,
) {
  const rowHeader: Array<keyof AdminReviewRoomAudioRow> = [
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
  const roomHeader: Array<keyof AdminReviewRoomAudioRoom> = [
    "id",
    "status",
    "fileName",
    "consentState",
    "participantCheckStatus",
    "participantCount",
    "reviewerCount",
    "externalParticipantCount",
    "activePresenceCount",
    "fallbackHandoffNoteCount",
    "adminSafeEvidenceCount",
    "audioRiskCount",
    "exportReady",
    "latestAt",
    "recommendation",
  ];
  const noteHeader: Array<keyof AdminReviewRoomFallbackNote> = [
    "id",
    "roomId",
    "fileName",
    "status",
    "source",
    "ownerRef",
    "note",
    "latestAt",
  ];
  const evidenceHeader: Array<keyof AdminReviewRoomAudioEvidence> = [
    "id",
    "roomId",
    "fileName",
    "status",
    "kind",
    "privacy",
    "detail",
    "latestAt",
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
      ["audio-room", ...roomHeader.map((key) => room[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...noteHeader].join(","),
    ...report.fallbackNotes.map((note) =>
      ["fallback-note", ...noteHeader.map((key) => note[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...evidenceHeader].join(","),
    ...report.evidence.map((item) =>
      ["audio-evidence", ...evidenceHeader.map((key) => item[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminReviewRoomAudioReadinessMarkdown(
  report: AdminReviewRoomAudioReadinessReport,
) {
  return [
    "# Review Room Audio Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rooms: ${report.roomCount}`,
    `Consent captured: ${report.consentCapturedCount}`,
    `Missing consent: ${report.missingConsentCount}`,
    `participant checks: ${report.participantCheckCount}`,
    `Failed participant checks: ${report.failedParticipantCheckCount}`,
    `fallback handoff notes: ${report.fallbackHandoffNoteCount}`,
    `Admin-safe evidence: ${report.adminSafeEvidenceCount}`,
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
    "## Audio Rooms",
    "",
    ...report.rooms.map((room) =>
      [
        `- [${room.status}] ${room.fileName}`,
        `  - Consent: ${room.consentState}`,
        `  - Participant checks: ${room.participantCheckStatus}`,
        `  - Fallback handoff: ${room.fallbackHandoffNoteCount}`,
        `  - Evidence: ${room.adminSafeEvidenceCount}`,
        `  - Export-ready: ${room.exportReady ? "yes" : "no"}`,
        `  - Recommendation: ${room.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Fallback Handoff",
    "",
    ...report.fallbackNotes.map((note) =>
      [
        `- [${note.status}] ${note.fileName}`,
        `  - Source: ${note.source}`,
        `  - Owner: ${note.ownerRef}`,
        `  - Note: ${note.note}`,
      ].join("\n"),
    ),
    "",
    "## Admin-Safe Evidence",
    "",
    ...report.evidence.map((item) =>
      [
        `- [${item.status}] ${item.fileName}`,
        `  - Kind: ${item.kind}`,
        `  - Privacy: ${item.privacy}`,
        `  - Detail: ${item.detail}`,
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

import type {
  AdminCollaborationEventIngestionReport,
  AdminCollaborationEventRecord,
  AdminCollaborationIncidentRow,
  AdminCollaborationReplayWindow,
} from "@/features/admin/admin-collaboration-event-ingestion";

export function getAdminCollaborationEventIngestionJson(
  report: AdminCollaborationEventIngestionReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminCollaborationEventIngestionCsv(
  report: AdminCollaborationEventIngestionReport,
) {
  const incidentHeader: Array<keyof AdminCollaborationIncidentRow> = [
    "id",
    "fileId",
    "fileName",
    "status",
    "category",
    "label",
    "value",
    "detail",
    "recommendation",
    "latestAt",
  ];
  const windowHeader: Array<keyof AdminCollaborationReplayWindow> = [
    "fileId",
    "fileName",
    "ownerEmail",
    "status",
    "firstEventAt",
    "latestEventAt",
    "retentionExpiresAt",
    "eventCount",
    "chatCount",
    "presenceCount",
    "activityCount",
    "roomActionCount",
    "purgeCandidate",
    "recommendation",
  ];
  const eventHeader: Array<keyof AdminCollaborationEventRecord> = [
    "id",
    "fileId",
    "fileName",
    "kind",
    "signal",
    "actorRef",
    "privacy",
    "detail",
    "createdAt",
    "retentionExpiresAt",
  ];

  return [
    ["section", ...incidentHeader],
    ...report.incidents.map((row) => ["incident", ...incidentHeader.map((key) => row[key])]),
    [],
    ["section", ...windowHeader],
    ...report.replayWindows.map((row) => ["replay-window", ...windowHeader.map((key) => row[key])]),
    [],
    ["section", ...eventHeader],
    ...report.recentEvents.map((row) => ["event", ...eventHeader.map((key) => row[key])]),
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getAdminCollaborationEventIngestionMarkdown(
  report: AdminCollaborationEventIngestionReport,
) {
  return [
    "# Collaboration Event Ingestion",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Retention: ${report.retentionDays} days`,
    `Replay window: ${report.replayWindowDays} days`,
    `Durable events: ${report.durableEventCount}`,
    `Redacted events: ${report.redactedEventCount}`,
    `Purge candidates: ${report.purgeCandidateCount}`,
    `Latest purge: ${report.latestPurgeAt ?? "none"}`,
    "",
    "## Incidents",
    "",
    ...report.incidents.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - File: ${row.fileName}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Replay Windows",
    "",
    ...report.replayWindows.slice(0, 20).map((window) =>
      [
        `- [${window.status}] ${window.fileName}`,
        `  - Events: ${window.eventCount}`,
        `  - Latest: ${window.latestEventAt ?? "none"}`,
        `  - Retention expires: ${window.retentionExpiresAt ?? "none"}`,
        `  - Purge candidate: ${window.purgeCandidate ? "yes" : "no"}`,
        `  - Recommendation: ${window.recommendation}`,
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

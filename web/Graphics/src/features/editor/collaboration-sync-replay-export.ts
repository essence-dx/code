import type { CollaborationSyncReplayReport } from "@/features/editor/collaboration-sync-replay";

export function getCollaborationSyncReplayJson(
  report: CollaborationSyncReplayReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getCollaborationSyncReplayCsv(
  report: CollaborationSyncReplayReport,
) {
  return [
    [
      "status",
      "score",
      "room_captured",
      "room_updated_at",
      "room_age_minutes",
      "chat_messages",
      "presence_events",
      "disconnects",
      "recovered_peers",
      "unrecovered_peers",
      "offline_replay_queue",
      "event_drift",
      "reconnect_quality",
      "room_latency_status",
      "operation_conflicts",
      "target_conflicts",
    ].join(","),
    [
      report.status,
      report.score,
      report.roomCaptured,
      report.roomUpdatedAt ?? "",
      report.roomAgeMinutes ?? "",
      report.chatMessageCount,
      report.presenceEventCount,
      report.disconnectCount,
      report.recoveredPeerCount,
      report.unrecoveredPeerCount,
      report.offlineReplayQueueCount,
      report.eventDriftCount,
      report.reconnectQualityScore,
      report.roomLatencyStatus,
      report.operationConflictCount,
      report.targetConflictCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    [
      "id",
      "status",
      "kind",
      "label",
      "detail",
      "event_count",
      "target_id",
      "latest_activity_at",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.kind,
        row.label,
        row.detail,
        row.eventCount,
        row.targetId ?? "",
        row.latestActivityAt ?? "",
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getCollaborationSyncReplayMarkdown(
  report: CollaborationSyncReplayReport,
) {
  return [
    "# Collaboration Sync Replay",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Room captured: ${report.roomCaptured ? "yes" : "no"}`,
    `Room updated: ${report.roomUpdatedAt ?? "not captured"}`,
    `Room age: ${report.roomAgeMinutes ?? "unknown"} minutes`,
    `Chat messages: ${report.chatMessageCount}`,
    `Presence events: ${report.presenceEventCount}`,
    `Recovered peers: ${report.recoveredPeerCount}`,
    `Unrecovered peers: ${report.unrecoveredPeerCount}`,
    `Offline replay queue: ${report.offlineReplayQueueCount}`,
    `Event drift: ${report.eventDriftCount}`,
    `Reconnect quality: ${report.reconnectQualityScore}`,
    `Room latency status: ${report.roomLatencyStatus}`,
    `Operation conflicts: ${report.operationConflictCount}`,
    `Target conflicts: ${report.targetConflictCount}`,
    "",
    "## Replay Queue",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

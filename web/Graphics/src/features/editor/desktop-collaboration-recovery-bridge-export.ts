import type {
  DesktopCollaborationRecoveryBridgeReport,
  DesktopCollaborationRecoveryPacket,
  DesktopCollaborationRecoveryRow,
} from "@/features/editor/desktop-collaboration-recovery-bridge-types";

export function getDesktopCollaborationRecoveryBridgeCsv(
  report: DesktopCollaborationRecoveryBridgeReport,
  rows: DesktopCollaborationRecoveryRow[] = report.rows,
) {
  const rowHeader: Array<keyof DesktopCollaborationRecoveryRow> = [
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
  const packetHeader: Array<keyof DesktopCollaborationRecoveryPacket> = [
    "id",
    "kind",
    "status",
    "label",
    "detail",
    "evidenceCount",
  ];

  return [
    [
      "score",
      "status",
      "active_peers",
      "presence_events",
      "chat_events",
      "handoffs",
      "handoff_blockers",
      "offline_replay_queue",
      "failed_offline_saves",
      "stale_offline_saves",
      "event_drift",
      "cursor_chat_queue",
      "cursor_chat_blockers",
      "admin_evidence",
      "blocked",
      "review",
      "ready",
    ].join(","),
    [
      report.score,
      report.status,
      report.activePeerCount,
      report.presenceEventCount,
      report.chatEventCount,
      report.reconnectHandoffCount,
      report.reconnectHandoffBlockedCount,
      report.offlineReplayQueueCount,
      report.failedOfflineSaveCount,
      report.staleOfflineSaveCount,
      report.eventDriftCount,
      report.cursorChatQueueCount,
      report.cursorChatBlockedCount,
      report.adminEvidenceCount,
      report.blockedCount,
      report.reviewCount,
      report.readyCount,
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
    ...report.recoveryPackets.map((packet) =>
      packetHeader
        .map((key) => escapeCsvCell(packet[key]))
        .join(","),
    ),
  ].join("\n");
}

export function getDesktopCollaborationRecoveryBridgeMarkdown(
  report: DesktopCollaborationRecoveryBridgeReport,
  rows: DesktopCollaborationRecoveryRow[] = report.rows,
) {
  return [
    "# Desktop Collaboration Recovery Bridge",
    "",
    `Generated: ${report.generatedAt}`,
    `File: ${report.fileName}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Reconnect handoff blockers: ${report.reconnectHandoffBlockedCount}`,
    `Offline event replay queue: ${report.offlineReplayQueueCount}`,
    `Cursor/chat queue blockers: ${report.cursorChatBlockedCount}`,
    `Admin evidence exports: ${report.adminEvidenceCount}`,
    "",
    "This packet joins reconnect handoff, offline event replay, cursor/chat queue safety, and admin evidence exports for desktop collaboration recovery.",
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Recovery Packets",
    ...report.recoveryPackets.flatMap((packet) => [
      `- [${packet.status}] ${packet.kind} / ${packet.label}: ${packet.detail}`,
      ...packet.steps.map((step) => `  - ${step}`),
    ]),
    "",
    "## Reconnect Handoff",
    ...report.reconnectHandoffs.map(
      (handoff) =>
        `- [${handoff.status}] ${handoff.label}: ${handoff.detail} ${handoff.recommendation}`,
    ),
    "",
    "## Offline Event Replay",
    ...report.offlineReplayItems.map(
      (item) =>
        `- [${item.status}] ${item.label}: ${item.detail} ${item.recommendation}`,
    ),
    "",
    "## Cursor/Chat Queue",
    ...report.cursorChatQueue.map(
      (item) =>
        `- [${item.status}] ${item.peerName}: ${item.detail} ${item.recommendation}`,
    ),
    "",
    "## Admin Evidence",
    ...report.adminEvidence.map((item) => `- ${item}`),
  ].join("\n");
}

export function getDesktopCollaborationRecoveryBridgeJson(
  report: DesktopCollaborationRecoveryBridgeReport,
  rows: DesktopCollaborationRecoveryRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.desktop-collaboration-recovery-bridge",
      version: 1,
      generatedAt: report.generatedAt,
      fileId: report.fileId,
      fileName: report.fileName,
      summary: {
        status: report.status,
        score: report.score,
        activePeerCount: report.activePeerCount,
        chatEventCount: report.chatEventCount,
        presenceEventCount: report.presenceEventCount,
        reconnectHandoffCount: report.reconnectHandoffCount,
        reconnectHandoffBlockedCount: report.reconnectHandoffBlockedCount,
        offlineReplayQueueCount: report.offlineReplayQueueCount,
        failedOfflineSaveCount: report.failedOfflineSaveCount,
        staleOfflineSaveCount: report.staleOfflineSaveCount,
        eventDriftCount: report.eventDriftCount,
        cursorChatQueueCount: report.cursorChatQueueCount,
        cursorChatBlockedCount: report.cursorChatBlockedCount,
        adminEvidenceCount: report.adminEvidenceCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      rows,
      recoveryPackets: report.recoveryPackets,
      reconnectHandoffs: report.reconnectHandoffs,
      offlineReplayItems: report.offlineReplayItems,
      cursorChatQueue: report.cursorChatQueue,
      adminEvidence: report.adminEvidence,
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

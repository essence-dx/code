import type {
  OfflineWorkspaceHealthMonitorInput,
  OfflineWorkspaceHealthMonitorReport,
  OfflineWorkspaceHealthRow,
  OfflineWorkspaceHealthStatus,
  OfflineWorkspaceRepairPacket,
} from "@/features/editor/offline-workspace-health-monitor-types";

export {
  getOfflineWorkspaceHealthMonitorCsv,
  getOfflineWorkspaceHealthMonitorJson,
  getOfflineWorkspaceHealthMonitorMarkdown,
} from "@/features/editor/offline-workspace-health-monitor-export";
export type {
  OfflineWorkspaceHealthCategory,
  OfflineWorkspaceHealthMonitorInput,
  OfflineWorkspaceHealthMonitorReport,
  OfflineWorkspaceHealthRow,
  OfflineWorkspaceHealthStatus,
  OfflineWorkspaceRepairPacket,
} from "@/features/editor/offline-workspace-health-monitor-types";

const reviewMediaCacheBytes = 900_000;
const blockedMediaCacheBytes = 3_000_000;

export function getOfflineWorkspaceHealthMonitorReport({
  generatedAt = new Date().toISOString(),
  mediaAssetPipeline,
  workspaceFileOperations,
  workspaceRestoreDrills,
}: OfflineWorkspaceHealthMonitorInput): OfflineWorkspaceHealthMonitorReport {
  const localDatabaseIssueCount =
    workspaceRestoreDrills.corruptedArtifactCount +
    workspaceRestoreDrills.failedSaveCount +
    workspaceFileOperations.failedOfflineSaveCount +
    workspaceFileOperations.offlineOpenBlockedCount;
  const autosaveDriftCount =
    workspaceRestoreDrills.staleSnapshotCount +
    workspaceRestoreDrills.staleSaveCount +
    workspaceRestoreDrills.retryableSaveCount +
    workspaceFileOperations.retryableOfflineSaveCount;
  const mediaCachePressureBytes = mediaAssetPipeline.embeddedSourceBytes;
  const mediaCachePressureCount =
    mediaAssetPipeline.compressionCandidateCount +
    mediaAssetPipeline.exportManifestBlockedCount;
  const repairPackets = getRepairPackets({
    autosaveDriftCount,
    localDatabaseIssueCount,
    mediaAssetPipeline,
    mediaCachePressureBytes,
    mediaCachePressureCount,
    workspaceFileOperations,
    workspaceRestoreDrills,
  });
  const rows = [
    getLocalDatabaseIntegrityRow(localDatabaseIssueCount, workspaceRestoreDrills),
    getAutosaveDriftRow(autosaveDriftCount, workspaceRestoreDrills),
    getMediaCachePressureRow({
      mediaAssetPipeline,
      mediaCachePressureBytes,
      mediaCachePressureCount,
    }),
    getRepairPacketsRow(repairPackets),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const userSafeRepairCount = repairPackets.filter(
    (packet) => packet.userSafe,
  ).length;
  const score = Math.max(
    0,
    Math.min(
      workspaceRestoreDrills.score,
      workspaceFileOperations.score,
      mediaAssetPipeline.score,
    ) -
      blockedCount * 12 -
      reviewCount * 5 -
      Math.min(10, localDatabaseIssueCount * 2) -
      Math.min(8, autosaveDriftCount),
  );

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    fileId: workspaceRestoreDrills.fileId,
    fileName: workspaceRestoreDrills.fileName,
    localDatabaseIssueCount,
    autosaveDriftCount,
    mediaCachePressureBytes,
    mediaCachePressureCount,
    repairPacketCount: repairPackets.length,
    userSafeRepairCount,
    failedOfflineSaveCount:
      workspaceRestoreDrills.failedSaveCount +
      workspaceFileOperations.failedOfflineSaveCount,
    staleOfflineSaveCount: workspaceRestoreDrills.staleSaveCount,
    retryableOfflineSaveCount:
      workspaceRestoreDrills.retryableSaveCount +
      workspaceFileOperations.retryableOfflineSaveCount,
    autosaveSnapshotCount: workspaceRestoreDrills.autosaveSnapshotCount,
    staleAutosaveSnapshotCount: workspaceRestoreDrills.staleSnapshotCount,
    mediaCompressionCandidateCount:
      mediaAssetPipeline.compressionCandidateCount,
    mediaManifestBlockedCount: mediaAssetPipeline.exportManifestBlockedCount,
    readyCount,
    reviewCount,
    blockedCount,
    rows: rows.sort(sortRows),
    repairPackets,
    workspaceRestoreDrills,
    workspaceFileOperations,
    mediaAssetPipeline,
  };
}

function getLocalDatabaseIntegrityRow(
  issueCount: number,
  workspaceRestoreDrills: OfflineWorkspaceHealthMonitorInput["workspaceRestoreDrills"],
): OfflineWorkspaceHealthRow {
  const status: OfflineWorkspaceHealthStatus =
    issueCount > 0
      ? "blocked"
      : workspaceRestoreDrills.status === "review"
        ? "review"
        : "ready";

  return {
    id: "offline-workspace-local-database-integrity",
    status,
    category: "local-database-integrity",
    label: "Local database integrity",
    detail:
      issueCount > 0
        ? `${issueCount} local database, restore, or failed-save integrity signal${issueCount === 1 ? "" : "s"} need repair.`
        : "Local database, restore drill, and offline save integrity evidence is clean.",
    metric: issueCount,
    threshold: 0,
    packetIds: ["local-database-integrity-repair"],
    recommendation:
      status === "ready"
        ? "Keep this integrity packet with offline workspace release evidence."
        : "Export the repair packet and avoid destructive cleanup until a fresh snapshot exists.",
  };
}

function getAutosaveDriftRow(
  driftCount: number,
  workspaceRestoreDrills: OfflineWorkspaceHealthMonitorInput["workspaceRestoreDrills"],
): OfflineWorkspaceHealthRow {
  const status: OfflineWorkspaceHealthStatus =
    workspaceRestoreDrills.autosaveSnapshotCount === 0
      ? "blocked"
      : driftCount > 0
        ? "review"
        : "ready";

  return {
    id: "offline-workspace-autosave-drift",
    status,
    category: "autosave-drift",
    label: "Autosave drift",
    detail: `${workspaceRestoreDrills.autosaveSnapshotCount} autosave snapshot${workspaceRestoreDrills.autosaveSnapshotCount === 1 ? "" : "s"}, ${workspaceRestoreDrills.staleSnapshotCount} stale snapshot${workspaceRestoreDrills.staleSnapshotCount === 1 ? "" : "s"}, and ${workspaceRestoreDrills.retryableSaveCount} retryable save${workspaceRestoreDrills.retryableSaveCount === 1 ? "" : "s"} are in scope.`,
    metric: driftCount,
    threshold: 0,
    packetIds: ["autosave-drift-repair"],
    recommendation:
      status === "ready"
        ? "Autosave drift is clear for offline desktop work."
        : "Capture a fresh autosave snapshot and replay retryable saves before clearing local artifacts.",
  };
}

function getMediaCachePressureRow({
  mediaAssetPipeline,
  mediaCachePressureBytes,
  mediaCachePressureCount,
}: {
  mediaAssetPipeline: OfflineWorkspaceHealthMonitorInput["mediaAssetPipeline"];
  mediaCachePressureBytes: number;
  mediaCachePressureCount: number;
}): OfflineWorkspaceHealthRow {
  const status: OfflineWorkspaceHealthStatus =
    mediaCachePressureBytes >= blockedMediaCacheBytes ||
    mediaAssetPipeline.exportManifestBlockedCount > 0
      ? "blocked"
      : mediaCachePressureBytes >= reviewMediaCacheBytes ||
          mediaCachePressureCount > 0
        ? "review"
        : "ready";

  return {
    id: "offline-workspace-media-cache-pressure",
    status,
    category: "media-cache-pressure",
    label: "Media cache pressure",
    detail: `${mediaAssetPipeline.assetCount} media asset${mediaAssetPipeline.assetCount === 1 ? "" : "s"} use ${mediaCachePressureBytes} embedded byte${mediaCachePressureBytes === 1 ? "" : "s"} with ${mediaAssetPipeline.compressionCandidateCount} compression candidate${mediaAssetPipeline.compressionCandidateCount === 1 ? "" : "s"} and ${mediaAssetPipeline.exportManifestBlockedCount} manifest blocker${mediaAssetPipeline.exportManifestBlockedCount === 1 ? "" : "s"}.`,
    metric: mediaCachePressureBytes,
    threshold: reviewMediaCacheBytes,
    packetIds: ["media-cache-pressure-repair"],
    recommendation:
      status === "ready"
        ? "Media cache pressure is ready for offline workspace packaging."
        : "Compress or replace heavy embedded media before relying on offline cache recovery.",
  };
}

function getRepairPacketsRow(
  packets: OfflineWorkspaceRepairPacket[],
): OfflineWorkspaceHealthRow {
  const userSafeCount = packets.filter((packet) => packet.userSafe).length;
  const status: OfflineWorkspaceHealthStatus =
    userSafeCount >= 4 ? "ready" : userSafeCount > 0 ? "review" : "blocked";

  return {
    id: "offline-workspace-user-safe-repair-packets",
    status,
    category: "repair-packets",
    label: "User-safe repair packets",
    detail: `${userSafeCount}/${packets.length} repair packets are marked user-safe with preview-first steps.`,
    metric: userSafeCount,
    threshold: 4,
    packetIds: packets.map((packet) => packet.id),
    recommendation:
      status === "ready"
        ? "Repair packets are ready for support handoff without destructive automation."
        : "Add preview-first repair steps before exposing local cleanup or replay actions.",
  };
}

function getRepairPackets({
  autosaveDriftCount,
  localDatabaseIssueCount,
  mediaAssetPipeline,
  mediaCachePressureBytes,
  mediaCachePressureCount,
  workspaceFileOperations,
  workspaceRestoreDrills,
}: {
  autosaveDriftCount: number;
  localDatabaseIssueCount: number;
  mediaAssetPipeline: OfflineWorkspaceHealthMonitorInput["mediaAssetPipeline"];
  mediaCachePressureBytes: number;
  mediaCachePressureCount: number;
  workspaceFileOperations: OfflineWorkspaceHealthMonitorInput["workspaceFileOperations"];
  workspaceRestoreDrills: OfflineWorkspaceHealthMonitorInput["workspaceRestoreDrills"];
}): OfflineWorkspaceRepairPacket[] {
  return [
    {
      id: "local-database-integrity-repair",
      status: localDatabaseIssueCount > 0 ? "blocked" : "ready",
      category: "local-database-integrity",
      label: "Local database integrity repair",
      detail: `${localDatabaseIssueCount} local integrity signal${localDatabaseIssueCount === 1 ? "" : "s"} require preview-first handling.`,
      userSafe: true,
      steps: [
        "Export the offline workspace health packet before changing local data.",
        "Confirm a fresh autosave snapshot exists for the active file.",
        "Replay failed offline saves from newest to oldest only after previewing hashes.",
      ],
      evidenceCount: Math.max(1, workspaceRestoreDrills.corruptionIssues.length),
    },
    {
      id: "autosave-drift-repair",
      status:
        workspaceRestoreDrills.autosaveSnapshotCount === 0
          ? "blocked"
          : autosaveDriftCount > 0
            ? "review"
            : "ready",
      category: "autosave-drift",
      label: "Autosave drift repair",
      detail: `${autosaveDriftCount} autosave or queued-save drift signal${autosaveDriftCount === 1 ? "" : "s"} are queued.`,
      userSafe: true,
      steps: [
        "Create a new local snapshot before replaying queued saves.",
        "Preview stale queue entries and skip entries whose hash differs from the current document.",
        "Clear only synced offline saves after export evidence is captured.",
      ],
      evidenceCount: Math.max(1, workspaceRestoreDrills.drillPackets.length),
    },
    {
      id: "media-cache-pressure-repair",
      status:
        mediaCachePressureBytes >= blockedMediaCacheBytes
          ? "blocked"
          : mediaCachePressureCount > 0
            ? "review"
            : "ready",
      category: "media-cache-pressure",
      label: "Media cache pressure repair",
      detail: `${mediaCachePressureBytes} embedded media bytes and ${mediaCachePressureCount} media cache pressure signal${mediaCachePressureCount === 1 ? "" : "s"} are in scope.`,
      userSafe: true,
      steps: [
        "Export the media asset manifest before replacing any source.",
        "Compress data URI images into replacement assets instead of deleting originals.",
        "Keep source metadata and upload provenance attached to every replacement.",
      ],
      evidenceCount: Math.max(1, mediaAssetPipeline.bundleManifest.length),
    },
    {
      id: "offline-workspace-support-handoff",
      status:
        workspaceFileOperations.status === "blocked" ||
        workspaceRestoreDrills.status === "blocked"
          ? "blocked"
          : workspaceFileOperations.status === "review" ||
              workspaceRestoreDrills.status === "review"
            ? "review"
            : "ready",
      category: "repair-packets",
      label: "Offline workspace support handoff",
      detail: `${workspaceFileOperations.operationPackets.length} workspace operation packet${workspaceFileOperations.operationPackets.length === 1 ? "" : "s"} and ${workspaceRestoreDrills.drillPackets.length} restore drill packet${workspaceRestoreDrills.drillPackets.length === 1 ? "" : "s"} are available.`,
      userSafe: true,
      steps: [
        "Attach restore drill, workspace operations, and media pipeline packets to support notes.",
        "Prefer preview, replay, and export actions over irreversible local cleanup.",
        "Escalate blocked integrity rows before asking the user to clear local cache data.",
      ],
      evidenceCount: Math.max(
        1,
        workspaceFileOperations.operationPackets.length +
          workspaceRestoreDrills.drillPackets.length,
      ),
    },
  ];
}

function sortRows(
  left: OfflineWorkspaceHealthRow,
  right: OfflineWorkspaceHealthRow,
) {
  const rank: Record<OfflineWorkspaceHealthStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}

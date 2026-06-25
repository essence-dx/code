import type { DesignFileSummary } from "@/features/files/actions";
import type {
  WorkspaceFileOfflineOpenQueueItem,
  WorkspaceFileOperationsCategory,
  WorkspaceFileOperationsLocalArtifact,
  WorkspaceFileOperationsPacket,
  WorkspaceFileOperationsReviewInput,
  WorkspaceFileOperationsReviewReport,
  WorkspaceFileOperationsRow,
  WorkspaceFileOperationsStatus,
  WorkspaceFilePermissionDriftQueueItem,
  WorkspaceFilePermissionDriftReason,
} from "@/features/editor/workspace-file-operations-review-types";

export {
  getWorkspaceFileOperationsReviewCsv,
  getWorkspaceFileOperationsReviewJson,
  getWorkspaceFileOperationsReviewMarkdown,
} from "@/features/editor/workspace-file-operations-review-export";
export type {
  WorkspaceFileOfflineOpenQueueItem,
  WorkspaceFileOperationsCategory,
  WorkspaceFileOperationsLocalArtifact,
  WorkspaceFileOperationsPacket,
  WorkspaceFileOperationsPacketKind,
  WorkspaceFileOperationsReviewInput,
  WorkspaceFileOperationsReviewReport,
  WorkspaceFileOperationsRow,
  WorkspaceFileOperationsStatus,
  WorkspaceFilePermissionDriftQueueItem,
  WorkspaceFilePermissionDriftReason,
} from "@/features/editor/workspace-file-operations-review-types";

const recentWindowMs = 14 * 24 * 60 * 60 * 1000;
const localArtifactFreshWindowMs = 7 * 24 * 60 * 60 * 1000;

export function getWorkspaceFileOperationsReviewReport({
  files,
  generatedAt = new Date().toISOString(),
  localArtifacts = [],
}: WorkspaceFileOperationsReviewInput): WorkspaceFileOperationsReviewReport {
  const now = getTime(generatedAt);
  const activeFiles = files.filter((file) => !file.trashedAt);
  const recentFiles = activeFiles
    .filter((file) => isRecentFile(file, now))
    .sort(sortRecentlyOpened);
  const staleRecentFileCount = activeFiles.filter(
    (file) => file.lastOpenedAt && !isRecentFile(file, now),
  ).length;
  const teamScopeCount = countUnique(
    activeFiles
      .map((file) => file.teamName.trim())
      .filter(Boolean),
  );
  const projectScopeCount = countUnique(
    activeFiles
      .map((file) => file.projectName.trim())
      .filter(Boolean),
  );
  const unscopedFiles = activeFiles.filter(isUnscopedSharedFile);
  const permissionDriftQueue = activeFiles
    .map(getPermissionDriftQueueItem)
    .filter((item): item is WorkspaceFilePermissionDriftQueueItem =>
      Boolean(item),
    )
    .sort(sortQueueItems);
  const artifactsByFileId = new Map(
    localArtifacts.map((artifact) => [artifact.fileId, artifact]),
  );
  const offlineOpenQueue = recentFiles
    .map((file) =>
      getOfflineOpenQueueItem({
        artifact: artifactsByFileId.get(file.id),
        file,
        now,
      }),
    )
    .sort(sortQueueItems);
  const failedOfflineSaveCount = offlineOpenQueue.reduce(
    (total, item) => total + item.failedSaveCount,
    0,
  );
  const retryableOfflineSaveCount = offlineOpenQueue.reduce(
    (total, item) => total + item.retryableSaveCount,
    0,
  );
  const operatorEvidence = getOperatorEvidence({
    activeFileCount: activeFiles.length,
    offlineOpenReadyCount: getQueueStatusCount(offlineOpenQueue, "ready"),
    permissionDriftCount: permissionDriftQueue.length,
    projectScopeCount,
    recentFileCount: recentFiles.length,
    teamScopeCount,
    unscopedFileCount: unscopedFiles.length,
  });
  const rows = getRows({
    activeFileCount: activeFiles.length,
    blockedPermissionDriftCount: getQueueStatusCount(
      permissionDriftQueue,
      "blocked",
    ),
    failedOfflineSaveCount,
    offlineOpenBlockedCount: getQueueStatusCount(offlineOpenQueue, "blocked"),
    offlineOpenReadyCount: getQueueStatusCount(offlineOpenQueue, "ready"),
    offlineOpenReviewCount: getQueueStatusCount(offlineOpenQueue, "review"),
    operatorEvidenceCount: operatorEvidence.length,
    permissionDriftCount: permissionDriftQueue.length,
    projectScopeCount,
    recentFileCount: recentFiles.length,
    teamScopeCount,
    unscopedFileCount: unscopedFiles.length,
  }).sort(sortRows);
  const operationPackets = getOperationPackets({
    permissionDriftQueue,
    recentFiles,
    rows,
    offlineOpenQueue,
    operatorEvidence,
    unscopedFiles,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(
      0,
      100 -
        blockedCount * 18 -
        reviewCount * 6 -
        Math.min(10, unscopedFiles.length * 2) -
        Math.min(18, failedOfflineSaveCount * 6),
    ),
    fileCount: files.length,
    activeFileCount: activeFiles.length,
    recentFileCount: recentFiles.length,
    staleRecentFileCount,
    teamScopeCount,
    projectScopeCount,
    unscopedFileCount: unscopedFiles.length,
    permissionDriftCount: permissionDriftQueue.length,
    blockedPermissionDriftCount: getQueueStatusCount(
      permissionDriftQueue,
      "blocked",
    ),
    offlineOpenReadyCount: getQueueStatusCount(offlineOpenQueue, "ready"),
    offlineOpenReviewCount: getQueueStatusCount(offlineOpenQueue, "review"),
    offlineOpenBlockedCount: getQueueStatusCount(offlineOpenQueue, "blocked"),
    failedOfflineSaveCount,
    retryableOfflineSaveCount,
    operatorEvidenceCount: operatorEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    rows,
    operationPackets,
    permissionDriftQueue,
    offlineOpenQueue,
    operatorEvidence,
  };
}

function getRows({
  activeFileCount,
  blockedPermissionDriftCount,
  failedOfflineSaveCount,
  offlineOpenBlockedCount,
  offlineOpenReadyCount,
  offlineOpenReviewCount,
  operatorEvidenceCount,
  permissionDriftCount,
  projectScopeCount,
  recentFileCount,
  teamScopeCount,
  unscopedFileCount,
}: {
  activeFileCount: number;
  blockedPermissionDriftCount: number;
  failedOfflineSaveCount: number;
  offlineOpenBlockedCount: number;
  offlineOpenReadyCount: number;
  offlineOpenReviewCount: number;
  operatorEvidenceCount: number;
  permissionDriftCount: number;
  projectScopeCount: number;
  recentFileCount: number;
  teamScopeCount: number;
  unscopedFileCount: number;
}): WorkspaceFileOperationsRow[] {
  const recentThreshold = Math.min(3, Math.max(1, activeFileCount));

  return [
    {
      id: "workspace-file-ops-recent-files",
      status:
        activeFileCount === 0
          ? "blocked"
          : recentFileCount >= recentThreshold
            ? "ready"
            : recentFileCount > 0
              ? "review"
              : "blocked",
      category: "recent-files",
      label: "Recent file operations",
      detail: `${recentFileCount} recently opened file${recentFileCount === 1 ? "" : "s"} are available for desktop operations review across ${activeFileCount} active file${activeFileCount === 1 ? "" : "s"}.`,
      metric: recentFileCount,
      threshold: recentThreshold,
      packetIds: ["recent-file-operations-packet"],
      recommendation:
        "Keep a permission-aware recent file list before running desktop workspace operations.",
    },
    {
      id: "workspace-file-ops-team-project-scope",
      status:
        activeFileCount === 0
          ? "blocked"
          : unscopedFileCount > 0
            ? "review"
            : teamScopeCount > 0 && projectScopeCount > 0
              ? "ready"
              : "blocked",
      category: "workspace-scope",
      label: "Project and team scopes",
      detail: `${teamScopeCount} team scope${teamScopeCount === 1 ? "" : "s"}, ${projectScopeCount} project scope${projectScopeCount === 1 ? "" : "s"}, and ${unscopedFileCount} shared file${unscopedFileCount === 1 ? "" : "s"} missing scope labels.`,
      metric: teamScopeCount + projectScopeCount,
      threshold: 2,
      packetIds: ["team-project-scope-packet"],
      recommendation:
        unscopedFileCount > 0
          ? "Assign team and project labels to shared files before moving them into desktop release folders."
          : "Keep team and project scopes attached to every desktop workspace operation.",
    },
    {
      id: "workspace-file-ops-permission-drift",
      status:
        blockedPermissionDriftCount > 0
          ? "blocked"
          : permissionDriftCount > 0
            ? "review"
            : "ready",
      category: "permission-drift",
      label: "Permission drift queue",
      detail: `${permissionDriftCount} file${permissionDriftCount === 1 ? "" : "s"} need permission drift review, including ${blockedPermissionDriftCount} blocker${blockedPermissionDriftCount === 1 ? "" : "s"}.`,
      metric: permissionDriftCount,
      threshold: 0,
      packetIds: ["permission-drift-audit-packet"],
      recommendation:
        permissionDriftCount === 0
          ? "No cross-scope permission drift is blocking desktop operations."
          : "Review public collaborators, viewer comment drift, and reviewer handoff files before sync or packaging.",
    },
    {
      id: "workspace-file-ops-offline-open",
      status:
        failedOfflineSaveCount > 0 || offlineOpenBlockedCount > 0
          ? "blocked"
          : offlineOpenReviewCount > 0
            ? "review"
            : "ready",
      category: "offline-open",
      label: "Offline-open readiness",
      detail: `${offlineOpenReadyCount} recent file${offlineOpenReadyCount === 1 ? "" : "s"} are offline-open ready, ${offlineOpenReviewCount} need review, ${offlineOpenBlockedCount} are blocked, and ${failedOfflineSaveCount} failed save artifact${failedOfflineSaveCount === 1 ? "" : "s"} remain.`,
      metric: offlineOpenReadyCount,
      threshold: Math.max(1, offlineOpenReadyCount + offlineOpenBlockedCount),
      packetIds: ["offline-open-readiness-packet"],
      recommendation:
        offlineOpenBlockedCount === 0 && failedOfflineSaveCount === 0
          ? "Keep local backups or snapshots fresh for every recently opened desktop file."
          : "Capture local restore evidence and replay failed saves before promising offline-open support.",
    },
    {
      id: "workspace-file-ops-operator-evidence",
      status:
        operatorEvidenceCount >= 5
          ? "ready"
          : operatorEvidenceCount >= 3
            ? "review"
            : "blocked",
      category: "operator-evidence",
      label: "Operator export evidence",
      detail: `${operatorEvidenceCount} evidence item${operatorEvidenceCount === 1 ? "" : "s"} are available for workspace operations export.`,
      metric: operatorEvidenceCount,
      threshold: 5,
      packetIds: ["workspace-file-operator-export-packet"],
      recommendation:
        "Export JSON, CSV, and Markdown operations packets for release and desktop support owners.",
    },
  ];
}

function getOperationPackets({
  offlineOpenQueue,
  operatorEvidence,
  permissionDriftQueue,
  recentFiles,
  rows,
  unscopedFiles,
}: {
  offlineOpenQueue: WorkspaceFileOfflineOpenQueueItem[];
  operatorEvidence: string[];
  permissionDriftQueue: WorkspaceFilePermissionDriftQueueItem[];
  recentFiles: DesignFileSummary[];
  rows: WorkspaceFileOperationsRow[];
  unscopedFiles: DesignFileSummary[];
}): WorkspaceFileOperationsPacket[] {
  const rowByCategory = new Map(rows.map((row) => [row.category, row]));

  return [
    {
      id: "recent-file-operations-packet",
      kind: "recent-file-review",
      status: getRowStatus(rowByCategory, "recent-files"),
      label: "Recent file operations",
      detail: `${recentFiles.length} recent file${recentFiles.length === 1 ? "" : "s"} are ready for operator review.`,
      fileIds: recentFiles.map((file) => file.id),
      steps: [
        "Confirm recent files keep access-role context visible.",
        "Prioritize recent files before desktop workspace sync.",
        "Archive the recent-file queue with release evidence.",
      ],
      evidenceCount: Math.max(1, recentFiles.length),
    },
    {
      id: "team-project-scope-packet",
      kind: "workspace-scope-review",
      status: getRowStatus(rowByCategory, "workspace-scope"),
      label: "Team and project scope review",
      detail: `${unscopedFiles.length} shared file${unscopedFiles.length === 1 ? "" : "s"} need team/project scope cleanup.`,
      fileIds: unscopedFiles.map((file) => file.id),
      steps: [
        "Verify team labels before desktop folder operations.",
        "Verify project labels before import or sync handoff.",
        "Keep private drafts separate from shared release workspaces.",
      ],
      evidenceCount: Math.max(1, unscopedFiles.length),
    },
    {
      id: "permission-drift-audit-packet",
      kind: "permission-drift-audit",
      status: getRowStatus(rowByCategory, "permission-drift"),
      label: "Permission drift audit",
      detail: `${permissionDriftQueue.length} drift item${permissionDriftQueue.length === 1 ? "" : "s"} require permission review.`,
      fileIds: permissionDriftQueue.map((item) => item.fileId),
      steps: [
        "Review public collaborators and elevated shared-file access.",
        "Confirm viewer/commenter activity still matches the intended role.",
        "Record least-privilege decisions before desktop packaging.",
      ],
      evidenceCount: Math.max(1, permissionDriftQueue.length),
    },
    {
      id: "offline-open-readiness-packet",
      kind: "offline-open-rehearsal",
      status: getRowStatus(rowByCategory, "offline-open"),
      label: "Offline-open readiness",
      detail: `${offlineOpenQueue.length} recent file${offlineOpenQueue.length === 1 ? "" : "s"} have local/offline evidence for desktop open review.`,
      fileIds: offlineOpenQueue.map((item) => item.fileId),
      steps: [
        "Confirm a backup or autosave snapshot exists for each recent file.",
        "Block offline-open when failed local save artifacts remain.",
        "Keep synced queue evidence with local-first desktop release notes.",
      ],
      evidenceCount: Math.max(1, offlineOpenQueue.length),
    },
    {
      id: "workspace-file-operator-export-packet",
      kind: "operator-export",
      status: getRowStatus(rowByCategory, "operator-evidence"),
      label: "Operator export packet",
      detail: `${operatorEvidence.length} evidence item${operatorEvidence.length === 1 ? "" : "s"} are ready for workspace operations handoff.`,
      fileIds: [],
      steps: [
        "Export the workspace file operations JSON packet.",
        "Export CSV rows for audit and support triage.",
        "Export Markdown for release owner signoff.",
      ],
      evidenceCount: operatorEvidence.length,
    },
  ];
}

function getPermissionDriftQueueItem(
  file: DesignFileSummary,
): WorkspaceFilePermissionDriftQueueItem | null {
  const handoffSignalCount =
    file.openCommentCount + file.readyForDevCount + file.prototypeHotspotCount;
  const reason = getPermissionDriftReason(file, handoffSignalCount);

  if (!reason) {
    return null;
  }

  const status: WorkspaceFileOperationsStatus =
    reason === "public-collaborator" ? "blocked" : "review";

  return {
    id: `permission-drift:${file.id}`,
    status,
    fileId: file.id,
    fileName: file.name,
    accessRole: file.accessRole,
    scope: file.scope,
    teamName: normalizedLabel(file.teamName, "Unscoped team"),
    projectName: normalizedLabel(file.projectName, "Unscoped project"),
    reason,
    handoffSignalCount,
    detail: `${file.accessRole} access on ${file.scope} scope with ${handoffSignalCount} handoff/comment signal${handoffSignalCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "blocked"
        ? "Reconfirm public collaborator access or reduce scope before desktop sync."
        : "Review the role against current comments, Dev Mode handoff, and prototype signals.",
  };
}

function getPermissionDriftReason(
  file: DesignFileSummary,
  handoffSignalCount: number,
): WorkspaceFilePermissionDriftReason | null {
  if (file.scope === "public" && file.accessRole !== "owner") {
    return "public-collaborator";
  }

  if (file.scope === "public" && handoffSignalCount > 0) {
    return "public-handoff";
  }

  if (file.accessRole === "viewer" && file.openCommentCount > 0) {
    return "viewer-comment-drift";
  }

  if (file.accessRole !== "owner" && handoffSignalCount > 0) {
    return "reviewer-handoff";
  }

  return null;
}

function getOfflineOpenQueueItem({
  artifact,
  file,
  now,
}: {
  artifact: WorkspaceFileOperationsLocalArtifact | undefined;
  file: DesignFileSummary;
  now: number;
}): WorkspaceFileOfflineOpenQueueItem {
  const latestLocalArtifactAt = getLatestDate([
    artifact?.backupSavedAt,
    artifact?.latestSnapshotAt,
  ]);
  const hasLocalEvidence =
    Boolean(latestLocalArtifactAt) || (artifact?.snapshotCount ?? 0) > 0;
  const failedSaveCount = artifact?.failedSaveCount ?? 0;
  const isStale =
    latestLocalArtifactAt !== null &&
    now - getTime(latestLocalArtifactAt) > localArtifactFreshWindowMs;
  const status: WorkspaceFileOperationsStatus =
    failedSaveCount > 0 || !hasLocalEvidence
      ? "blocked"
      : isStale
        ? "review"
        : "ready";

  return {
    id: `offline-open:${file.id}`,
    status,
    fileId: file.id,
    fileName: file.name,
    latestLocalArtifactAt,
    snapshotCount: artifact?.snapshotCount ?? 0,
    queuedSaveCount: artifact?.queuedSaveCount ?? 0,
    retryableSaveCount: artifact?.retryableSaveCount ?? 0,
    failedSaveCount,
    syncedSaveCount: artifact?.syncedSaveCount ?? 0,
    detail:
      status === "ready"
        ? `${file.name} has fresh local evidence for offline-open.`
        : failedSaveCount > 0
          ? `${file.name} has ${failedSaveCount} failed offline save artifact${failedSaveCount === 1 ? "" : "s"}.`
          : `${file.name} has no fresh local backup or autosave snapshot.`,
    recommendation:
      status === "ready"
        ? "Keep this local evidence with the desktop operations packet."
        : "Create a local backup or replay failed saves before offline-open signoff.",
  };
}

function getOperatorEvidence({
  activeFileCount,
  offlineOpenReadyCount,
  permissionDriftCount,
  projectScopeCount,
  recentFileCount,
  teamScopeCount,
  unscopedFileCount,
}: {
  activeFileCount: number;
  offlineOpenReadyCount: number;
  permissionDriftCount: number;
  projectScopeCount: number;
  recentFileCount: number;
  teamScopeCount: number;
  unscopedFileCount: number;
}) {
  return [
    "Export workspace file operations JSON.",
    "Export workspace file operations CSV.",
    "Export workspace file operations Markdown.",
    `${activeFileCount} active desktop workspace file${activeFileCount === 1 ? "" : "s"} reviewed.`,
    `${recentFileCount} recent file${recentFileCount === 1 ? "" : "s"} reviewed.`,
    `${teamScopeCount} team scope${teamScopeCount === 1 ? "" : "s"} and ${projectScopeCount} project scope${projectScopeCount === 1 ? "" : "s"} recorded.`,
    `${permissionDriftCount} permission drift item${permissionDriftCount === 1 ? "" : "s"} queued.`,
    `${offlineOpenReadyCount} file${offlineOpenReadyCount === 1 ? "" : "s"} ready for offline-open.`,
    `${unscopedFileCount} shared file${unscopedFileCount === 1 ? "" : "s"} missing team/project scope.`,
  ];
}

function isRecentFile(file: DesignFileSummary, now: number) {
  if (!file.lastOpenedAt) {
    return false;
  }

  const openedAt = getTime(file.lastOpenedAt);
  return openedAt > 0 && now - openedAt <= recentWindowMs;
}

function isUnscopedSharedFile(file: DesignFileSummary) {
  return (
    file.scope !== "private" &&
    (!file.teamName.trim() || !file.projectName.trim())
  );
}

function getQueueStatusCount(
  rows: ReadonlyArray<{ status: WorkspaceFileOperationsStatus }>,
  status: WorkspaceFileOperationsStatus,
) {
  return rows.filter((row) => row.status === status).length;
}

function getRowStatus(
  rowByCategory: Map<WorkspaceFileOperationsCategory, WorkspaceFileOperationsRow>,
  category: WorkspaceFileOperationsCategory,
) {
  return rowByCategory.get(category)?.status ?? "review";
}

function sortRows(
  left: WorkspaceFileOperationsRow,
  right: WorkspaceFileOperationsRow,
) {
  const statusOrder: Record<WorkspaceFileOperationsStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return (
    statusOrder[left.status] - statusOrder[right.status] ||
    left.category.localeCompare(right.category) ||
    left.label.localeCompare(right.label)
  );
}

function sortQueueItems<
  T extends {
    fileName: string;
    status: WorkspaceFileOperationsStatus;
  },
>(left: T, right: T) {
  const statusOrder: Record<WorkspaceFileOperationsStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return (
    statusOrder[left.status] - statusOrder[right.status] ||
    left.fileName.localeCompare(right.fileName)
  );
}

function sortRecentlyOpened(left: DesignFileSummary, right: DesignFileSummary) {
  return getTime(right.lastOpenedAt ?? undefined) - getTime(left.lastOpenedAt ?? undefined);
}

function countUnique(values: string[]) {
  return new Set(values).size;
}

function getLatestDate(values: Array<null | string | undefined>) {
  const latest = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ time: getTime(value), value }))
    .filter((item) => item.time > 0)
    .sort((left, right) => right.time - left.time)[0];

  return latest?.value ?? null;
}

function getTime(value: string | undefined) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function normalizedLabel(value: string, fallback: string) {
  return value.trim() || fallback;
}

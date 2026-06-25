import { getVersionTimelineReview } from "@/features/editor/version-timeline-review";
import type {
  WorkspaceRestoreDrillPacket,
  WorkspaceRestoreDrillRow,
  WorkspaceRestoreDrillStatus,
  WorkspaceRestoreDrillsInput,
  WorkspaceRestoreDrillsReport,
} from "@/features/editor/workspace-restore-drills-types";
import type { DesignDocument } from "@/features/editor/types";
import type { DesignFileVersionSummary } from "@/features/files/actions";

export {
  getWorkspaceRestoreDrillsCsv,
  getWorkspaceRestoreDrillsJson,
  getWorkspaceRestoreDrillsMarkdown,
} from "@/features/editor/workspace-restore-drills-export";
export type {
  WorkspaceRestoreDrillCategory,
  WorkspaceRestoreDrillPacket,
  WorkspaceRestoreDrillPacketKind,
  WorkspaceRestoreDrillRow,
  WorkspaceRestoreDrillStatus,
  WorkspaceRestoreDrillsInput,
  WorkspaceRestoreDrillsReport,
} from "@/features/editor/workspace-restore-drills-types";

const freshSnapshotWindowMs = 24 * 60 * 60 * 1000;

export function getWorkspaceRestoreDrillsReport({
  fileId,
  fileName,
  generatedAt = new Date().toISOString(),
  localSnapshots,
  offlineQueue,
  versions,
  workspaceDocument,
}: WorkspaceRestoreDrillsInput): WorkspaceRestoreDrillsReport {
  const now = getTime(generatedAt);
  const latestSnapshotAt = getLatestDate(localSnapshots.map((item) => item.savedAt));
  const staleSnapshotCount = localSnapshots.filter(
    (snapshot) => now - getTime(snapshot.savedAt) > freshSnapshotWindowMs,
  ).length;
  const corruptionIssues = getCorruptionIssues(workspaceDocument, versions);
  const versionTimeline = getVersionTimelineReview({
    currentDocument: workspaceDocument,
    now,
    versions,
  });
  const conflictPreviewCount =
    versionTimeline.highRiskCount +
    versionTimeline.mediumRiskCount +
    versions.length;
  const operatorEvidence = getOperatorEvidence({
    conflictPreviewCount,
    fileId,
    fileName,
    localSnapshotCount: localSnapshots.length,
    offlineQueueCount: offlineQueue.totalCount,
    versionCount: versions.length,
  });
  const drillPackets = [
    getAutosavePacket(localSnapshots.length, staleSnapshotCount),
    getCorruptionPacket(corruptionIssues),
    getRestorePreviewPacket(getTimelineStatus(versionTimeline), conflictPreviewCount),
    getOfflineQueuePacket(offlineQueue),
    getOperatorEvidencePacket(operatorEvidence),
  ];
  const rows = [
    getAutosaveRow(localSnapshots.length, staleSnapshotCount),
    getCorruptionRow(corruptionIssues),
    getRestorePreviewRow(versionTimeline, conflictPreviewCount),
    getOfflineQueueRow(offlineQueue),
    getOperatorEvidenceRow(operatorEvidence),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    fileId,
    fileName,
    score: Math.max(
      0,
      100 -
        blockedCount * 18 -
        reviewCount * 6 -
        Math.min(12, corruptionIssues.length * 4),
    ),
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    autosaveSnapshotCount: localSnapshots.length,
    staleSnapshotCount,
    namedVersionCount: versions.length,
    conflictPreviewCount,
    corruptedArtifactCount: corruptionIssues.length,
    retryableSaveCount: offlineQueue.retryableCount,
    failedSaveCount: offlineQueue.failedCount,
    staleSaveCount: offlineQueue.staleCount,
    operatorEvidenceCount: operatorEvidence.length,
    latestSnapshotAt,
    latestVersionAt: versionTimeline.latestVersionAt,
    blockedCount,
    reviewCount,
    readyCount,
    rows: rows.sort(sortRows),
    drillPackets,
    operatorEvidence,
    corruptionIssues,
  };
}

function getAutosaveRow(
  snapshotCount: number,
  staleSnapshotCount: number,
): WorkspaceRestoreDrillRow {
  const status =
    snapshotCount === 0 ? "blocked" : staleSnapshotCount > 0 ? "review" : "ready";

  return {
    id: "workspace-restore-autosave-snapshots",
    status,
    category: "autosave-snapshot",
    label: "Autosave snapshot coverage",
    detail:
      snapshotCount === 0
        ? "No local autosave snapshots are available for a restore drill."
        : `${snapshotCount} local snapshot${snapshotCount === 1 ? "" : "s"} available, ${staleSnapshotCount} stale.`,
    metric: snapshotCount,
    threshold: 1,
    drillPacketIds: ["autosave-restore-drill"],
    recommendation:
      status === "ready"
        ? "Keep a fresh local snapshot before destructive desktop or offline work."
        : "Capture a fresh local autosave snapshot and rerun the restore drill.",
  };
}

function getCorruptionRow(
  issues: string[],
): WorkspaceRestoreDrillRow {
  const status = issues.length > 0 ? "blocked" : "ready";

  return {
    id: "workspace-restore-corruption-checks",
    status,
    category: "corruption-check",
    label: "Workspace corruption checks",
    detail:
      issues.length > 0
        ? `${issues.length} corrupt restore artifact${issues.length === 1 ? "" : "s"} detected.`
        : "Current document and named-version restore artifacts passed integrity checks.",
    metric: issues.length,
    threshold: 0,
    drillPacketIds: ["corruption-restore-drill"],
    recommendation:
      status === "ready"
        ? "Archive this corruption check with restore evidence."
        : "Repair active page, page payload, or version artifact integrity before restore approval.",
  };
}

function getRestorePreviewRow(
  timeline: ReturnType<typeof getVersionTimelineReview>,
  conflictPreviewCount: number,
): WorkspaceRestoreDrillRow {
  const status = getTimelineStatus(timeline);

  return {
    id: "workspace-restore-conflict-preview",
    status,
    category: "restore-preview",
    label: "Conflict-safe restore previews",
    detail: `${conflictPreviewCount} restore preview${conflictPreviewCount === 1 ? "" : "s"} reviewed across ${timeline.versionCount} named versions, ${timeline.highRiskCount} high risk, and ${timeline.mediumRiskCount} medium risk.`,
    metric: conflictPreviewCount,
    threshold: 1,
    drillPacketIds: ["conflict-safe-restore-preview"],
    recommendation:
      status === "ready"
        ? "Keep named-version preview evidence with the operator handoff."
        : "Review high-risk restore or merge previews before offering one-click restore.",
  };
}

function getOfflineQueueRow(
  report: WorkspaceRestoreDrillsInput["offlineQueue"],
): WorkspaceRestoreDrillRow {
  const status =
    report.failedCount > 0
      ? "blocked"
      : report.retryableCount > 0 || report.staleCount > 0
        ? "review"
        : "ready";

  return {
    id: "workspace-restore-offline-save-queue",
    status,
    category: "offline-save-queue",
    label: "Offline save queue replay",
    detail: `${report.totalCount} queued save artifact${report.totalCount === 1 ? "" : "s"}, ${report.retryableCount} retryable, ${report.failedCount} failed, and ${report.staleCount} stale.`,
    metric: report.retryableCount + report.failedCount + report.staleCount,
    threshold: 0,
    drillPacketIds: ["offline-save-replay-drill"],
    recommendation:
      status === "ready"
        ? "Offline save queue is clear or synced for restore rehearsal."
        : "Replay or remove failed and stale offline saves before restore signoff.",
  };
}

function getOperatorEvidenceRow(
  evidence: string[],
): WorkspaceRestoreDrillRow {
  return {
    id: "workspace-restore-operator-evidence",
    status: evidence.length >= 4 ? "ready" : "review",
    category: "operator-evidence",
    label: "Operator export evidence",
    detail: `${evidence.length} operator evidence artifact${evidence.length === 1 ? "" : "s"} are ready for the restore handoff.`,
    metric: evidence.length,
    threshold: 4,
    drillPacketIds: ["operator-restore-export-drill"],
    recommendation:
      evidence.length >= 4
        ? "Export JSON, CSV, and Markdown drill packets for the release owner."
        : "Collect restore drill exports before marking the workspace recoverable.",
  };
}

function getAutosavePacket(
  snapshotCount: number,
  staleSnapshotCount: number,
): WorkspaceRestoreDrillPacket {
  const status =
    snapshotCount === 0 ? "blocked" : staleSnapshotCount > 0 ? "review" : "ready";

  return {
    id: "autosave-restore-drill",
    kind: "autosave-rehearsal",
    status,
    label: "Autosave restore rehearsal",
    detail: `${snapshotCount} local snapshots are available for rehearsal.`,
    artifactIds: ["local-design-snapshots"],
    steps: [
      "Create or confirm a fresh local autosave snapshot.",
      "Preview the snapshot metadata before restore.",
      "Restore into memory before saving over the server document.",
    ],
    evidenceCount: Math.max(1, snapshotCount),
  };
}

function getCorruptionPacket(issues: string[]): WorkspaceRestoreDrillPacket {
  return {
    id: "corruption-restore-drill",
    kind: "corruption-audit",
    status: issues.length > 0 ? "blocked" : "ready",
    label: "Corruption audit",
    detail:
      issues.length > 0
        ? `${issues.length} integrity issue${issues.length === 1 ? "" : "s"} must be cleared.`
        : "Document and version artifacts passed restore integrity checks.",
    artifactIds: issues.length > 0 ? issues : ["workspace-document", "named-versions"],
    steps: [
      "Validate current document version and active page.",
      "Validate every named-version restore document.",
      "Block restore when any artifact cannot be replayed safely.",
    ],
    evidenceCount: Math.max(1, issues.length),
  };
}

function getRestorePreviewPacket(
  status: WorkspaceRestoreDrillStatus,
  conflictPreviewCount: number,
): WorkspaceRestoreDrillPacket {
  return {
    id: "conflict-safe-restore-preview",
    kind: "restore-preview",
    status,
    label: "Conflict-safe restore preview",
    detail: `${conflictPreviewCount} named-version preview${conflictPreviewCount === 1 ? "" : "s"} are available for operator review.`,
    artifactIds: ["version-timeline-review", "version-compare-review"],
    steps: [
      "Compare each restore candidate against the current document.",
      "Flag destructive, design-system, and handoff-risk changes.",
      "Require operator approval before applying risky restore previews.",
    ],
    evidenceCount: Math.max(1, conflictPreviewCount),
  };
}

function getOfflineQueuePacket(
  report: WorkspaceRestoreDrillsInput["offlineQueue"],
): WorkspaceRestoreDrillPacket {
  const status =
    report.failedCount > 0
      ? "blocked"
      : report.retryableCount > 0 || report.staleCount > 0
        ? "review"
        : "ready";

  return {
    id: "offline-save-replay-drill",
    kind: "offline-replay",
    status,
    label: "Offline save replay drill",
    detail: `${report.totalCount} offline save queue artifact${report.totalCount === 1 ? "" : "s"} reviewed.`,
    artifactIds: report.entries.map((entry) => entry.id),
    steps: [
      "Replay retryable saves against the current document hash.",
      "Keep stale saves out of overwrite paths.",
      "Archive queue evidence before clearing synced entries.",
    ],
    evidenceCount: Math.max(1, report.totalCount),
  };
}

function getOperatorEvidencePacket(
  evidence: string[],
): WorkspaceRestoreDrillPacket {
  return {
    id: "operator-restore-export-drill",
    kind: "operator-export",
    status: evidence.length >= 4 ? "ready" : "review",
    label: "Operator restore export",
    detail: `${evidence.length} evidence item${evidence.length === 1 ? "" : "s"} prepared for operators.`,
    artifactIds: ["workspace-restore-drills-json", "workspace-restore-drills-csv", "workspace-restore-drills-markdown"],
    steps: [
      "Export the restore drill JSON packet.",
      "Export CSV rows for audit review.",
      "Export Markdown handoff for release notes.",
    ],
    evidenceCount: evidence.length,
  };
}

function getOperatorEvidence({
  conflictPreviewCount,
  fileId,
  fileName,
  localSnapshotCount,
  offlineQueueCount,
  versionCount,
}: {
  conflictPreviewCount: number;
  fileId: string;
  fileName: string;
  localSnapshotCount: number;
  offlineQueueCount: number;
  versionCount: number;
}) {
  return [
    `Export workspace restore drills JSON for ${fileName} (${fileId}).`,
    "Export workspace restore drills CSV.",
    "Export workspace restore drills Markdown.",
    `${localSnapshotCount} local autosave snapshot${localSnapshotCount === 1 ? "" : "s"} retained.`,
    `${versionCount} named version restore preview${versionCount === 1 ? "" : "s"} evaluated.`,
    `${conflictPreviewCount} conflict-safe preview evidence item${conflictPreviewCount === 1 ? "" : "s"} recorded.`,
    `${offlineQueueCount} offline save queue artifact${offlineQueueCount === 1 ? "" : "s"} reviewed.`,
  ];
}

function getCorruptionIssues(
  document: DesignDocument,
  versions: DesignFileVersionSummary[],
) {
  const issues = getDocumentIssues("current", document);

  versions.forEach((version) => {
    issues.push(
      ...getDocumentIssues(`version:${version.id}`, version.document),
    );
  });

  return issues;
}

function getDocumentIssues(label: string, document: DesignDocument) {
  const issues: string[] = [];

  if (document.version !== 1) {
    issues.push(`${label} has unsupported document version.`);
  }

  if (!Array.isArray(document.pages) || document.pages.length === 0) {
    issues.push(`${label} has no pages.`);
  }

  if (!document.pages.some((page) => page.id === document.activePageId)) {
    issues.push(`${label} active page does not exist.`);
  }

  document.pages.forEach((page) => {
    if (!Array.isArray(page.layers)) {
      issues.push(`${label} page ${page.id} has invalid layers.`);
    }
  });

  return issues;
}

function getTimelineStatus(
  timeline: ReturnType<typeof getVersionTimelineReview>,
): WorkspaceRestoreDrillStatus {
  if (timeline.highRiskCount > 0 || timeline.blockedCount > 0) {
    return "blocked";
  }

  if (
    timeline.mediumRiskCount > 0 ||
    timeline.reviewCount > 0 ||
    timeline.noRecentCheckpoint
  ) {
    return "review";
  }

  return "ready";
}

function getLatestDate(values: string[]) {
  const latest = values
    .map((value) => ({ time: getTime(value), value }))
    .filter((item) => Number.isFinite(item.time))
    .sort((left, right) => right.time - left.time)[0];

  return latest?.value ?? null;
}

function getTime(value: string | undefined) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function sortRows(
  left: WorkspaceRestoreDrillRow,
  right: WorkspaceRestoreDrillRow,
) {
  const statusOrder: Record<WorkspaceRestoreDrillStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return (
    statusOrder[left.status] - statusOrder[right.status] ||
    left.label.localeCompare(right.label)
  );
}

import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

export type DesktopOfflineSyncStatus = "ready" | "attention" | "blocked";

export type DesktopOfflineSyncQueueKind =
  | "project-sync"
  | "conflict-resolution"
  | "asset-upload"
  | "export-handoff"
  | "desktop-cache"
  | "batch-export"
  | "watched-folder"
  | "integrity-check";

export type DesktopOfflineSyncQueueItem = {
  id: string;
  kind: DesktopOfflineSyncQueueKind;
  title: string;
  detail: string;
  status: DesktopOfflineSyncStatus;
  progress: number;
  href: string | null;
  updatedAt: string;
  diagnostics: string[];
};

export type DesktopOfflineSyncDiagnostic = {
  id: string;
  label: string;
  detail: string;
  status: DesktopOfflineSyncStatus;
  value: string;
};

export type DesktopOfflineSyncCenter = {
  status: DesktopOfflineSyncStatus;
  score: number;
  queue: DesktopOfflineSyncQueueItem[];
  diagnostics: DesktopOfflineSyncDiagnostic[];
  nextActions: string[];
  totals: {
    queueItems: number;
    conflicts: number;
    resumableUploads: number;
    exportHandoffs: number;
    localToCloudHandoffs: number;
    batchExports: number;
    watchedFolders: number;
    integrityIssues: number;
    auditEvents: number;
  };
};

type CreateDesktopOfflineSyncCenterInput = {
  projects: ProjectSummary[];
  assetAudit: AssetLibraryAudit;
  serverExportJobs: ServerExportJobSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
};

const staleManifestHours = 72;
const recentProjectHours = 48;

export function createDesktopOfflineSyncCenter({
  projects,
  assetAudit,
  serverExportJobs,
  auditLogs,
  now = new Date(),
}: CreateDesktopOfflineSyncCenterInput): DesktopOfflineSyncCenter {
  const activeProjects = projects.filter((project) => !project.deletedAt);
  const projectManifestIds = new Set(
    assetAudit.records
      .filter((record) => record.scope === "projects")
      .map((record) => record.id),
  );
  const projectSyncItems = createProjectSyncItems({
    projects: activeProjects,
    projectManifestIds,
    now,
  });
  const conflictItems = createConflictItems({
    projects: activeProjects,
    now,
  });
  const assetUploadItems = createAssetUploadItems({
    assetAudit,
    now,
  });
  const exportHandoffItems = createExportHandoffItems(serverExportJobs);
  const batchExportItems = createBatchExportItems({
    projects: activeProjects,
    serverExportJobs,
    now,
  });
  const watchedFolderItems = createWatchedFolderItems({
    activeProjectCount: activeProjects.length,
    projectManifestCount: projectManifestIds.size,
    auditEventCount: countSyncAuditEvents(auditLogs),
    now,
  });
  const integrityItems = createIntegrityItems({
    assetAudit,
    now,
  });
  const desktopCacheItems = createDesktopCacheItems({
    assetAudit,
    projectManifestIds,
    activeProjectCount: activeProjects.length,
    now,
  });
  const queue = [
    ...conflictItems,
    ...assetUploadItems,
    ...exportHandoffItems,
    ...batchExportItems,
    ...watchedFolderItems,
    ...integrityItems,
    ...projectSyncItems,
    ...desktopCacheItems,
  ]
    .sort(compareSyncItems)
    .slice(0, 24);
  const diagnostics = createDiagnostics({
    activeProjectCount: activeProjects.length,
    projectManifestCount: projectManifestIds.size,
    skippedReferenceCount: assetAudit.skippedProjectReferenceCount,
    failedExportCount: serverExportJobs.filter((job) => job.status === "failed")
      .length,
    completedExportCount: serverExportJobs.filter(
      (job) => job.status === "completed",
    ).length,
    runningExportCount: serverExportJobs.filter(
      (job) => job.status === "queued" || job.status === "running",
    ).length,
    conflictCount: conflictItems.length,
    batchExportCount: batchExportItems.length,
    watchedFolderCount: watchedFolderItems.length,
    integrityIssueCount: integrityItems.length,
    auditEventCount: countSyncAuditEvents(auditLogs),
  });
  const score = createSyncScore({ queue, diagnostics });

  return {
    status: scoreToStatus(score),
    score,
    queue,
    diagnostics,
    nextActions: createNextActions(queue, diagnostics),
    totals: {
      queueItems: queue.length,
      conflicts: conflictItems.length,
      resumableUploads: assetUploadItems.length,
      exportHandoffs: exportHandoffItems.length,
      localToCloudHandoffs: projectSyncItems.length,
      batchExports: batchExportItems.length,
      watchedFolders: watchedFolderItems.length,
      integrityIssues: integrityItems.length,
      auditEvents: countSyncAuditEvents(auditLogs),
    },
  };
}

function createProjectSyncItems({
  projects,
  projectManifestIds,
  now,
}: {
  projects: ProjectSummary[];
  projectManifestIds: Set<string>;
  now: Date;
}) {
  return projects
    .filter(
      (project) =>
        !projectManifestIds.has(project.id) &&
        isWithinHours(project.updatedAt, now, staleManifestHours),
    )
    .sort(compareProjectsByUpdatedAt)
    .slice(0, 6)
    .map(
      (project): DesktopOfflineSyncQueueItem => ({
        id: `project-sync-${project.id}`,
        kind: "project-sync",
        title: project.name,
        detail:
          "Project needs a fresh local-to-cloud asset manifest before offline handoff.",
        status: isWithinHours(project.updatedAt, now, recentProjectHours)
          ? "attention"
          : "ready",
        progress: 50,
        href: `/editor/${project.id}`,
        updatedAt: project.updatedAt,
        diagnostics: [
          "Open the project and save once to rebuild the manifest.",
          "Desktop save-as will include the refreshed project asset map.",
        ],
      }),
    );
}

function createConflictItems({
  projects,
  now,
}: {
  projects: ProjectSummary[];
  now: Date;
}) {
  return projects
    .filter(
      (project) =>
        Boolean(project.editShareId) &&
        project.editSharePermission === "edit" &&
        isWithinHours(project.updatedAt, now, recentProjectHours),
    )
    .sort(compareProjectsByUpdatedAt)
    .slice(0, 6)
    .map(
      (project): DesktopOfflineSyncQueueItem => ({
        id: `conflict-${project.id}`,
        kind: "conflict-resolution",
        title: project.name,
        detail:
          project.approvalStatus === "changes-requested"
            ? "Editable share is active while changes are requested."
            : "Editable share can race with local desktop edits.",
        status:
          project.approvalStatus === "changes-requested"
            ? "blocked"
            : "attention",
        progress: project.approvalStatus === "changes-requested" ? 25 : 65,
        href: `/editor/${project.id}`,
        updatedAt: project.updatedAt,
        diagnostics: [
          "Collaboration sync already blocks stale base saves with conflict responses.",
          "Load latest remote edits before continuing local desktop handoff.",
        ],
      }),
    );
}

function createAssetUploadItems({
  assetAudit,
  now,
}: {
  assetAudit: AssetLibraryAudit;
  now: Date;
}) {
  const skippedReferences =
    assetAudit.skippedProjectReferenceCount > 0
      ? [
          {
            id: "asset-skipped-references",
            kind: "asset-upload" as const,
            title: "Resume skipped project assets",
            detail: `${assetAudit.skippedProjectReferenceCount} project asset references need resumable upload handling.`,
            status: "blocked" as const,
            progress: 30,
            href: null,
            updatedAt: now.toISOString(),
            diagnostics: [
              "Large or over-limit data-url references were kept out of the cloud manifest.",
              "Use desktop cache first, then replace oversized assets with hosted files.",
            ],
          },
        ]
      : [];
  const largeProjectAssets = assetAudit.records
    .filter(
      (record) =>
        record.scope === "projects" &&
        record.sizeBytes >= 8 * 1024 * 1024,
    )
    .sort((left, right) => right.sizeBytes - left.sizeBytes)
    .slice(0, 4)
    .map(
      (record): DesktopOfflineSyncQueueItem => ({
        id: `asset-large-${record.id}`,
        kind: "asset-upload",
        title: record.name,
        detail: `${formatAssetBytes(record.sizeBytes)} project asset manifest should sync with resumable handoff checks.`,
        status: record.sizeBytes >= 24 * 1024 * 1024 ? "blocked" : "attention",
        progress: record.sizeBytes >= 24 * 1024 * 1024 ? 35 : 70,
        href: record.href,
        updatedAt: record.updatedAt,
        diagnostics: [
          `${record.referenceCount ?? 0} document references depend on this asset bundle.`,
          "Desktop cache keeps local files available while cloud handoff catches up.",
        ],
      }),
    );

  return [...skippedReferences, ...largeProjectAssets];
}

function createExportHandoffItems(jobs: ServerExportJobSummary[]) {
  return jobs
    .filter(
      (job) =>
        job.status === "failed" ||
        job.status === "queued" ||
        job.status === "running" ||
        (job.status === "completed" && !job.artifactDataUrl),
    )
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 8)
    .map((job): DesktopOfflineSyncQueueItem => {
      const completedWithoutArtifact =
        job.status === "completed" && !job.artifactDataUrl;

      return {
        id: `export-handoff-${job.id}`,
        kind: "export-handoff",
        title: job.fileName,
        detail:
          job.status === "failed"
            ? job.failureMessage ?? "Export failed before desktop handoff."
            : completedWithoutArtifact
              ? "Export completed with metadata only; regenerate if an offline file is required."
              : `${job.formatLabel} export is ${job.status}.`,
        status: job.status === "failed" ? "blocked" : "attention",
        progress: job.status === "failed" ? 20 : Math.max(job.progress, 45),
        href: `/editor/${job.projectId}`,
        updatedAt: job.updatedAt,
        diagnostics: [
          "Server export history is durable and can be retried from the editor.",
          completedWithoutArtifact
            ? "Artifact exceeded the database storage cap or was not persisted."
            : "Keep the job visible until it completes or fails.",
        ],
      };
    });
}

function createBatchExportItems({
  projects,
  serverExportJobs,
  now,
}: {
  projects: ProjectSummary[];
  serverExportJobs: ServerExportJobSummary[];
  now: Date;
}) {
  const completedProjectIds = new Set(
    serverExportJobs
      .filter((job) => job.status === "completed")
      .map((job) => job.projectId),
  );

  return projects
    .filter((project) => !completedProjectIds.has(project.id))
    .sort(compareProjectsByUpdatedAt)
    .slice(0, 6)
    .map(
      (project): DesktopOfflineSyncQueueItem => ({
        id: `batch-export-${project.id}`,
        kind: "batch-export",
        title: project.name,
        detail:
          "Project is missing a completed export and should join the next offline batch export.",
        status:
          project.approvalStatus === "changes-requested"
            ? "blocked"
            : "attention",
        progress: project.approvalStatus === "changes-requested" ? 20 : 55,
        href: `/editor/${project.id}`,
        updatedAt: project.updatedAt || now.toISOString(),
        diagnostics: [
          "Queue this design for PNG/PDF handoff before desktop packaging.",
          "Batch export coverage keeps offline folders complete for review.",
        ],
      }),
    );
}

function createWatchedFolderItems({
  activeProjectCount,
  projectManifestCount,
  auditEventCount,
  now,
}: {
  activeProjectCount: number;
  projectManifestCount: number;
  auditEventCount: number;
  now: Date;
}) {
  if (activeProjectCount === 0 || projectManifestCount >= activeProjectCount) {
    return [];
  }

  return [
    {
      id: "watched-folder-project-manifests",
      kind: "watched-folder",
      title: "Watch project asset folders",
      detail:
        "Some active projects do not have local manifest coverage for watched-folder handoff.",
      status: auditEventCount ? "attention" : "blocked",
      progress: auditEventCount ? 60 : 30,
      href: "/designs",
      updatedAt: now.toISOString(),
      diagnostics: [
        `${projectManifestCount} of ${activeProjectCount} active projects have manifests.`,
        "Use the desktop app to watch export and asset folders before cloud sync.",
      ],
    } satisfies DesktopOfflineSyncQueueItem,
  ];
}

function createIntegrityItems({
  assetAudit,
  now,
}: {
  assetAudit: AssetLibraryAudit;
  now: Date;
}) {
  const duplicateItems = assetAudit.duplicateGroups.slice(0, 3).map(
    (group): DesktopOfflineSyncQueueItem => ({
      id: `integrity-duplicate-${group.key}`,
      kind: "integrity-check",
      title: `${group.assets.length} duplicate assets`,
      detail: `${formatAssetBytes(group.duplicateBytes)} can be cleaned before local file handoff.`,
      status: "attention",
      progress: 65,
      href: null,
      updatedAt: group.assets[0]?.updatedAt ?? now.toISOString(),
      diagnostics: [
        "Duplicate local files increase watched-folder sync cost.",
        "Use asset cleanup before preparing desktop production folders.",
      ],
    }),
  );
  const skippedProjectItems = assetAudit.records
    .filter(
      (record) =>
        record.scope === "projects" &&
        (record.skippedReferenceCount ?? 0) > 0,
    )
    .slice(0, 3)
    .map(
      (record): DesktopOfflineSyncQueueItem => ({
        id: `integrity-skipped-${record.id}`,
        kind: "integrity-check",
        title: record.name,
        detail: `${record.skippedReferenceCount ?? 0} skipped local references need file integrity review.`,
        status: "blocked",
        progress: 25,
        href: record.href,
        updatedAt: record.updatedAt,
        diagnostics: [
          "Skipped project references can break offline export folders.",
          "Replace oversized embedded data with hosted or cached assets.",
        ],
      }),
    );

  return [...skippedProjectItems, ...duplicateItems];
}

function createDesktopCacheItems({
  assetAudit,
  projectManifestIds,
  activeProjectCount,
  now,
}: {
  assetAudit: AssetLibraryAudit;
  projectManifestIds: Set<string>;
  activeProjectCount: number;
  now: Date;
}) {
  if (activeProjectCount === 0 || projectManifestIds.size > 0) return [];

  return [
    {
      id: "desktop-cache-empty",
      kind: "desktop-cache",
      title: "Cache first offline project assets",
      detail:
        "No project asset manifests are ready for the desktop offline cache yet.",
      status: assetAudit.assetCount > 0 ? "attention" : "blocked",
      progress: assetAudit.assetCount > 0 ? 45 : 15,
      href: "/designs",
      updatedAt: now.toISOString(),
      diagnostics: [
        "Open a design and use Desktop files > Cache assets in the Tauri app.",
        "Cloud project assets will become reusable once a manifest is saved.",
      ],
    } satisfies DesktopOfflineSyncQueueItem,
  ];
}

function createDiagnostics(input: {
  activeProjectCount: number;
  projectManifestCount: number;
  skippedReferenceCount: number;
  failedExportCount: number;
  completedExportCount: number;
  runningExportCount: number;
  conflictCount: number;
  batchExportCount: number;
  watchedFolderCount: number;
  integrityIssueCount: number;
  auditEventCount: number;
}): DesktopOfflineSyncDiagnostic[] {
  return [
    {
      id: "project-manifests",
      label: "Local-to-cloud manifests",
      detail: "Project asset manifests power hosted assets and desktop handoff.",
      status:
        input.projectManifestCount > 0
          ? "ready"
          : input.activeProjectCount > 0
            ? "attention"
            : "blocked",
      value: `${input.projectManifestCount}/${input.activeProjectCount}`,
    },
    {
      id: "asset-resume",
      label: "Resumable asset uploads",
      detail: "Skipped references need oversized-asset recovery before handoff.",
      status: input.skippedReferenceCount ? "blocked" : "ready",
      value: input.skippedReferenceCount.toLocaleString(),
    },
    {
      id: "conflict-guard",
      label: "Conflict guard",
      detail: "Editable share projects need latest-remote checks before local save.",
      status: input.conflictCount ? "attention" : "ready",
      value: input.conflictCount.toLocaleString(),
    },
    {
      id: "export-handoff",
      label: "Export handoff",
      detail: "Queued, running, failed, and metadata-only exports stay visible.",
      status: input.failedExportCount
        ? "blocked"
        : input.runningExportCount
          ? "attention"
          : "ready",
      value: `${input.failedExportCount} failed`,
    },
    {
      id: "batch-export",
      label: "Offline batch exports",
      detail: "Projects without completed exports are grouped for desktop batches.",
      status: input.batchExportCount
        ? input.completedExportCount
          ? "attention"
          : "blocked"
        : "ready",
      value: input.batchExportCount.toLocaleString(),
    },
    {
      id: "watched-folders",
      label: "Watched folders",
      detail: "Desktop watched folders should cover local export and asset handoff.",
      status: input.watchedFolderCount ? "attention" : "ready",
      value: input.watchedFolderCount.toLocaleString(),
    },
    {
      id: "file-integrity",
      label: "Local file integrity",
      detail: "Duplicate files and skipped references need cleanup before offline runs.",
      status: input.integrityIssueCount ? "attention" : "ready",
      value: input.integrityIssueCount.toLocaleString(),
    },
    {
      id: "audit-trail",
      label: "Sync audit visibility",
      detail: "Recent project, asset, export, and automation events are traceable.",
      status: input.auditEventCount ? "ready" : "attention",
      value: input.auditEventCount.toLocaleString(),
    },
  ];
}

function createSyncScore(input: {
  queue: DesktopOfflineSyncQueueItem[];
  diagnostics: DesktopOfflineSyncDiagnostic[];
}) {
  const diagnosticScore =
    input.diagnostics.reduce(
      (total, diagnostic) => total + statusScore(diagnostic.status),
      0,
    ) / input.diagnostics.length;
  const queuePenalty = input.queue.reduce((total, item) => {
    if (item.status === "blocked") return total + 12;
    if (item.status === "attention") return total + 5;

    return total;
  }, 0);

  return Math.max(0, Math.round(diagnosticScore - queuePenalty));
}

function createNextActions(
  queue: DesktopOfflineSyncQueueItem[],
  diagnostics: DesktopOfflineSyncDiagnostic[],
) {
  const blockedQueue = queue.find((item) => item.status === "blocked");
  const attentionQueue = queue.find((item) => item.status === "attention");
  const blockedDiagnostic = diagnostics.find(
    (diagnostic) => diagnostic.status === "blocked",
  );
  const attentionDiagnostic = diagnostics.find(
    (diagnostic) => diagnostic.status === "attention",
  );
  const actions = [
    blockedQueue
      ? `${blockedQueue.title}: ${blockedQueue.detail}`
      : null,
    blockedDiagnostic
      ? `${blockedDiagnostic.label}: ${blockedDiagnostic.detail}`
      : null,
    attentionQueue
      ? `${attentionQueue.title}: ${attentionQueue.detail}`
      : null,
    attentionDiagnostic
      ? `${attentionDiagnostic.label}: ${attentionDiagnostic.detail}`
      : null,
  ].filter((action): action is string => Boolean(action));

  return actions.length ? actions.slice(0, 4) : ["Offline handoff is ready."];
}

function compareSyncItems(
  left: DesktopOfflineSyncQueueItem,
  right: DesktopOfflineSyncQueueItem,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
    right.progress - left.progress ||
    left.title.localeCompare(right.title)
  );
}

function compareProjectsByUpdatedAt(left: ProjectSummary, right: ProjectSummary) {
  return (
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
    left.name.localeCompare(right.name)
  );
}

function isWithinHours(value: string, now: Date, hours: number) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return false;

  return now.getTime() - timestamp <= hours * 60 * 60 * 1000;
}

function countSyncAuditEvents(auditLogs: WorkspaceAuditLogSummary[]) {
  return auditLogs.filter(
    (log) =>
      log.action.startsWith("project.") ||
      log.action.startsWith("asset.") ||
      log.action.startsWith("automation.") ||
      log.action === "approval.updated",
  ).length;
}

function statusWeight(status: DesktopOfflineSyncStatus) {
  if (status === "blocked") return 2;
  if (status === "attention") return 1;

  return 0;
}

function statusScore(status: DesktopOfflineSyncStatus) {
  if (status === "ready") return 100;
  if (status === "attention") return 70;

  return 35;
}

function scoreToStatus(score: number): DesktopOfflineSyncStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "attention";

  return "blocked";
}

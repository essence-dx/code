import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";

export type ProjectRetentionStatus = "ready" | "review" | "blocked";

export type ProjectArchiveCandidate = {
  id: string;
  projectId: string;
  projectName: string;
  inactiveDays: number;
  lastUpdatedAt: string;
  latestVersionId: string | null;
  completedExportCount: number;
  reason: string;
  recommendedAction: string;
};

export type ProjectLegalHold = {
  id: string;
  projectId: string;
  projectName: string;
  caseId: string | null;
  reason: string;
  ownerEmail: string | null;
  enabledAt: string;
  auditLogId: string;
};

export type ProjectRestorePreview = {
  id: string;
  projectId: string;
  projectName: string;
  deletedAt: string;
  daysSinceDeleted: number;
  daysUntilRetentionExpires: number;
  latestVersionId: string | null;
  latestVersionName: string | null;
  completedExportCount: number;
  publicSurfaceCount: number;
  openReviewTaskCount: number;
  legalHold: ProjectLegalHold | null;
  summary: string;
};

export type ProjectDeletionPacket = {
  id: string;
  projectId: string;
  projectName: string;
  status: ProjectRetentionStatus;
  deletedAt: string;
  retentionExpiresAt: string;
  requiresLegalRelease: boolean;
  deletionEligible: boolean;
  reasons: string[];
  auditLogIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type ProjectRetentionCenter = {
  status: ProjectRetentionStatus;
  score: number;
  retentionDays: number;
  archiveReviewDays: number;
  archiveCandidates: ProjectArchiveCandidate[];
  legalHolds: ProjectLegalHold[];
  restorePreviews: ProjectRestorePreview[];
  deletionPackets: ProjectDeletionPacket[];
  nextActions: string[];
  totals: {
    projects: number;
    activeProjects: number;
    trashedProjects: number;
    archiveCandidates: number;
    legalHolds: number;
    restorePreviews: number;
    deletionPackets: number;
    blockedDeletionPackets: number;
  };
};

export type ProjectRetentionCenterInput = {
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

const retentionDays = 30;
const archiveReviewDays = 120;

export function createProjectRetentionCenter(
  input: ProjectRetentionCenterInput,
): ProjectRetentionCenter {
  const now = normalizeNow(input.now);
  const projectsById = new Map(
    input.projects.map((project) => [project.id, project]),
  );
  const legalHolds = createLegalHolds(input.auditLogs, projectsById);
  const legalHoldByProjectId = new Map(
    legalHolds.map((hold) => [hold.projectId, hold]),
  );
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const trashedProjects = input.projects.filter((project) => project.deletedAt);
  const archiveCandidates = createArchiveCandidates({
    projects: activeProjects,
    projectVersions: input.projectVersions,
    serverExportJobs: input.serverExportJobs,
    now,
  });
  const restorePreviews = trashedProjects.map((project) =>
    createRestorePreview({
      project,
      projectVersions: input.projectVersions,
      serverExportJobs: input.serverExportJobs,
      websitePublishes: input.websitePublishes,
      reviewTasks: input.reviewTasks,
      legalHold: legalHoldByProjectId.get(project.id) ?? null,
      now,
    }),
  );
  const deletionPackets = restorePreviews.map((preview) =>
    createDeletionPacket({
      preview,
      auditLogs: input.auditLogs,
      now,
    }),
  );
  const blockedDeletionPackets = deletionPackets.filter(
    (packet) => packet.status === "blocked",
  ).length;
  const reviewDeletionPackets = deletionPackets.filter(
    (packet) => packet.status === "review",
  ).length;
  const status = blockedDeletionPackets
    ? "blocked"
    : archiveCandidates.length ||
        restorePreviews.length ||
        reviewDeletionPackets
      ? "review"
      : "ready";
  const score = scoreRetentionCenter({
    archiveCandidates: archiveCandidates.length,
    legalHolds: legalHolds.length,
    restorePreviews: restorePreviews.length,
    blockedDeletionPackets,
    reviewDeletionPackets,
  });

  return {
    status,
    score,
    retentionDays,
    archiveReviewDays,
    archiveCandidates,
    legalHolds,
    restorePreviews,
    deletionPackets,
    nextActions: createNextActions({
      archiveCandidates,
      legalHolds,
      deletionPackets,
    }),
    totals: {
      projects: input.projects.length,
      activeProjects: activeProjects.length,
      trashedProjects: trashedProjects.length,
      archiveCandidates: archiveCandidates.length,
      legalHolds: legalHolds.length,
      restorePreviews: restorePreviews.length,
      deletionPackets: deletionPackets.length,
      blockedDeletionPackets,
    },
  };
}

function createLegalHolds(
  auditLogs: WorkspaceAuditLogSummary[],
  projectsById: Map<string, ProjectSummary>,
) {
  const logsByProject = new Map<string, WorkspaceAuditLogSummary[]>();

  for (const log of auditLogs) {
    if (log.targetType !== "project" || !log.targetId) continue;
    if (
      log.action !== "project.legal_hold.enabled" &&
      log.action !== "project.legal_hold.released"
    ) {
      continue;
    }

    const logs = logsByProject.get(log.targetId) ?? [];
    logs.push(log);
    logsByProject.set(log.targetId, logs);
  }

  return Array.from(logsByProject.entries()).flatMap(([projectId, logs]) => {
    const latest = logs.sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )[0];

    if (!latest || latest.action !== "project.legal_hold.enabled") return [];

    const project = projectsById.get(projectId);

    return [
      {
        id: `hold-${projectId}`,
        projectId,
        projectName: project?.name ?? "Unknown project",
        caseId: stringOrNull(latest.metadata.caseId),
        reason: stringOrNull(latest.metadata.reason) ?? latest.summary,
        ownerEmail:
          stringOrNull(latest.metadata.ownerEmail) ?? latest.actorEmail ?? null,
        enabledAt: latest.createdAt,
        auditLogId: latest.id,
      },
    ];
  });
}

function createArchiveCandidates(input: {
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  now: Date;
}): ProjectArchiveCandidate[] {
  return input.projects
    .map((project) => {
      const inactiveDays = daysBetweenInclusive(project.updatedAt, input.now);

      if (inactiveDays < archiveReviewDays) return null;

      const latestVersion = findLatestVersion(
        project.id,
        input.projectVersions,
      );
      const completedExportCount = input.serverExportJobs.filter(
        (job) => job.projectId === project.id && job.status === "completed",
      ).length;
      const candidate: ProjectArchiveCandidate = {
        id: `archive-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        inactiveDays,
        lastUpdatedAt: project.updatedAt,
        latestVersionId: latestVersion?.id ?? null,
        completedExportCount,
        reason: `${project.name} has been inactive for ${inactiveDays} days.`,
        recommendedAction: completedExportCount
          ? "Archive after confirming the latest export and restore point."
          : "Create a final handoff export before archival review.",
      };

      return candidate;
    })
    .filter((candidate): candidate is ProjectArchiveCandidate =>
      Boolean(candidate),
    )
    .sort(
      (left, right) =>
        right.inactiveDays - left.inactiveDays ||
        left.projectName.localeCompare(right.projectName),
    )
    .slice(0, 8);
}

function createRestorePreview(input: {
  project: ProjectSummary;
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  reviewTasks: ReviewTaskSummary[];
  legalHold: ProjectLegalHold | null;
  now: Date;
}): ProjectRestorePreview {
  const deletedAt = input.project.deletedAt ?? input.project.updatedAt;
  const daysSinceDeleted = daysBetweenInclusive(deletedAt, input.now);
  const latestVersion = findLatestVersion(
    input.project.id,
    input.projectVersions,
  );
  const completedExportCount = input.serverExportJobs.filter(
    (job) => job.projectId === input.project.id && job.status === "completed",
  ).length;
  const publicSurfaceCount =
    (input.project.publicShareId ? 1 : 0) +
    (input.project.editShareId ? 1 : 0) +
    input.websitePublishes.filter(
      (publish) =>
        publish.projectId === input.project.id &&
        publish.status === "published",
    ).length;
  const openReviewTaskCount = input.reviewTasks.filter(
    (task) =>
      task.projectId === input.project.id &&
      task.taskStatus !== "done" &&
      !task.resolved,
  ).length;

  return {
    id: `restore-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    deletedAt,
    daysSinceDeleted,
    daysUntilRetentionExpires: Math.max(0, retentionDays - daysSinceDeleted),
    latestVersionId: latestVersion?.id ?? null,
    latestVersionName: latestVersion?.name ?? null,
    completedExportCount,
    publicSurfaceCount,
    openReviewTaskCount,
    legalHold: input.legalHold,
    summary: `${input.project.name} can be restored with ${
      latestVersion ? latestVersion.name : "the current project record"
    }.`,
  };
}

function createDeletionPacket(input: {
  preview: ProjectRestorePreview;
  auditLogs: WorkspaceAuditLogSummary[];
  now: Date;
}): ProjectDeletionPacket {
  const retentionExpiresAt = addDays(
    new Date(input.preview.deletedAt),
    retentionDays,
  ).toISOString();
  const retentionExpired =
    Date.parse(retentionExpiresAt) <= input.now.getTime();
  const reasons = createDeletionReasons(input.preview, retentionExpired);
  const requiresLegalRelease = Boolean(input.preview.legalHold);
  const status: ProjectRetentionStatus = requiresLegalRelease
    ? "blocked"
    : reasons.length
      ? "review"
      : "ready";
  const deletionEligible = status === "ready";
  const auditLogIds = input.auditLogs
    .filter(
      (log) =>
        log.targetType === "project" &&
        log.targetId === input.preview.projectId,
    )
    .map((log) => log.id);
  const payload = {
    kind: "essence-studio.project-deletion-packet",
    version: 1,
    generatedAt: input.now.toISOString(),
    projectId: input.preview.projectId,
    projectName: input.preview.projectName,
    status,
    deletionEligible,
    retentionDays,
    deletedAt: input.preview.deletedAt,
    retentionExpiresAt,
    requiresLegalRelease,
    reasons,
    restorePreview: input.preview,
    auditLogIds,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `delete-${input.preview.projectId}`,
    projectId: input.preview.projectId,
    projectName: input.preview.projectName,
    status,
    deletedAt: input.preview.deletedAt,
    retentionExpiresAt,
    requiresLegalRelease,
    deletionEligible,
    reasons,
    auditLogIds,
    download: {
      fileName: `project-deletion-packet-${slugify(
        input.preview.projectName,
      )}.json`,
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createDeletionReasons(
  preview: ProjectRestorePreview,
  retentionExpired: boolean,
) {
  return [
    preview.legalHold
      ? `Legal hold ${preview.legalHold.caseId ?? preview.legalHold.id} must be released before deletion.`
      : null,
    retentionExpired
      ? null
      : `${preview.daysUntilRetentionExpires} retention day${
          preview.daysUntilRetentionExpires === 1 ? "" : "s"
        } remain before permanent deletion review.`,
    preview.publicSurfaceCount
      ? `${preview.publicSurfaceCount} public or shared surface${
          preview.publicSurfaceCount === 1 ? "" : "s"
        } should be unpublished or documented.`
      : null,
    preview.openReviewTaskCount
      ? `${preview.openReviewTaskCount} open review task${
          preview.openReviewTaskCount === 1 ? "" : "s"
        } should be closed or transferred.`
      : null,
  ].filter((reason): reason is string => Boolean(reason));
}

function createNextActions(input: {
  archiveCandidates: ProjectArchiveCandidate[];
  legalHolds: ProjectLegalHold[];
  deletionPackets: ProjectDeletionPacket[];
}) {
  return [
    ...input.legalHolds.map(
      (hold) =>
        `${hold.projectName}: resolve legal hold ${hold.caseId ?? hold.id} before deletion.`,
    ),
    ...input.deletionPackets
      .filter((packet) => packet.status !== "ready")
      .map((packet) => `${packet.projectName}: ${packet.reasons[0]}`),
    ...input.archiveCandidates.map(
      (candidate) => `${candidate.projectName}: ${candidate.recommendedAction}`,
    ),
  ]
    .filter((action): action is string => Boolean(action))
    .slice(0, 5);
}

function scoreRetentionCenter(input: {
  archiveCandidates: number;
  legalHolds: number;
  restorePreviews: number;
  blockedDeletionPackets: number;
  reviewDeletionPackets: number;
}) {
  const penalty =
    input.blockedDeletionPackets * 24 +
    input.legalHolds * 12 +
    input.reviewDeletionPackets * 8 +
    input.restorePreviews * 4 +
    input.archiveCandidates * 3;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function findLatestVersion(
  projectId: string,
  projectVersions: ProjectVersionSummary[],
) {
  return projectVersions
    .filter((version) => version.projectId === projectId)
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )[0];
}

function daysBetweenInclusive(value: string, now: Date) {
  const start = Date.parse(value);

  if (!Number.isFinite(start)) return 0;

  return Math.max(
    0,
    Math.floor((now.getTime() - start) / (24 * 60 * 60 * 1000)) + 1,
  );
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);

  next.setDate(next.getDate() + days);

  return next;
}

function stringOrNull(value: unknown) {
  const stringValue = String(value ?? "").trim();

  return stringValue || null;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

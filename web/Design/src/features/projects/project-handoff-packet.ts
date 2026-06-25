import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ReviewTaskStatus,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ApprovalStatus } from "@/features/review/approval-status";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";

export type ProjectHandoffStatus = "ready" | "review" | "blocked";

export type ProjectHandoffExportStatus =
  | "ready"
  | "running"
  | "failed"
  | "missing";

export type ProjectHandoffChecklistItem = {
  id: "readiness" | "exports" | "notes" | "approval";
  label: string;
  complete: boolean;
  detail: string;
};

export type ProjectHandoffApprovalEvent = {
  id: string;
  summary: string;
  actorEmail: string | null;
  approvalStatus: ApprovalStatus | null;
  createdAt: string;
};

export type ProjectHandoffCommentSignal = {
  id: string;
  projectId: string;
  body: string;
  authorName: string;
  resolved: boolean;
  taskStatus: ReviewTaskStatus;
  taskAssigneeName: string | null;
  taskDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectHandoffAuditLogSignal = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ProjectHandoffPacket = {
  projectId: string;
  projectName: string;
  updatedAt: string;
  approvalStatus: ApprovalStatus;
  packetScore: number;
  status: ProjectHandoffStatus;
  nextAction: string;
  readinessReport: {
    score: number;
    status: ProjectAuditSummary["status"];
    dimensions: ProjectAuditSummary["dimensions"];
  } | null;
  exportBundle: {
    status: ProjectHandoffExportStatus;
    completedCount: number;
    storedArtifactCount: number;
    failedCount: number;
    latestFormatLabel: string | null;
    latestArtifactName: string | null;
    latestCompletedAt: string | null;
    totalStoredBytes: number;
  };
  stakeholderNotes: {
    totalCount: number;
    unresolvedCount: number;
    openTaskCount: number;
    overdueTaskCount: number;
    latestNoteAt: string | null;
  };
  approvalHistory: ProjectHandoffApprovalEvent[];
  checklist: ProjectHandoffChecklistItem[];
};

export function createProjectHandoffPackets(input: {
  projects: ProjectSummary[];
  audits: ProjectAuditSummary[];
  exportJobs: ServerExportJobSummary[];
  comments: ProjectHandoffCommentSignal[];
  auditLogs: ProjectHandoffAuditLogSignal[];
  now?: Date;
}): ProjectHandoffPacket[] {
  const now = input.now ?? new Date();
  const auditByProject = new Map(
    input.audits.map((audit) => [audit.projectId, audit]),
  );

  return input.projects
    .filter((project) => !project.deletedAt)
    .map((project) => {
      const audit = auditByProject.get(project.id) ?? null;
      const exportBundle = createExportBundle(
        input.exportJobs.filter((job) => job.projectId === project.id),
      );
      const stakeholderNotes = createStakeholderNotes({
        comments: input.comments.filter(
          (comment) => comment.projectId === project.id,
        ),
        now,
      });
      const approvalHistory = createApprovalHistory({
        projectId: project.id,
        auditLogs: input.auditLogs,
      });
      const checklist = createChecklist({
        audit,
        exportBundle,
        stakeholderNotes,
        approvalStatus: project.approvalStatus,
        approvalHistory,
      });
      const packetScore = createPacketScore({
        readinessScore: audit?.overallScore ?? 0,
        exportBundle,
        stakeholderNotes,
        approvalStatus: project.approvalStatus,
      });
      const status = createPacketStatus({
        packetScore,
        exportBundle,
        approvalStatus: project.approvalStatus,
      });

      return {
        projectId: project.id,
        projectName: project.name,
        updatedAt: project.updatedAt,
        approvalStatus: project.approvalStatus,
        packetScore,
        status,
        nextAction: createNextAction({
          audit,
          exportBundle,
          stakeholderNotes,
          approvalStatus: project.approvalStatus,
        }),
        readinessReport: audit
          ? {
              score: audit.overallScore,
              status: audit.status,
              dimensions: audit.dimensions,
            }
          : null,
        exportBundle,
        stakeholderNotes,
        approvalHistory,
        checklist,
      } satisfies ProjectHandoffPacket;
    })
    .sort((left, right) => right.packetScore - left.packetScore)
    .slice(0, 12);
}

function createExportBundle(jobs: ServerExportJobSummary[]) {
  const sortedJobs = [...jobs].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const completedJobs = sortedJobs.filter((job) => job.status === "completed");
  const latestCompletedJob = completedJobs[0] ?? null;
  const hasRunningJob = sortedJobs.some(
    (job) => job.status === "queued" || job.status === "running",
  );
  const failedCount = sortedJobs.filter((job) => job.status === "failed").length;
  const storedArtifactCount = completedJobs.filter(
    (job) => job.artifactDataUrl,
  ).length;

  return {
    status: createExportStatus({
      completedCount: completedJobs.length,
      hasRunningJob,
      failedCount,
    }),
    completedCount: completedJobs.length,
    storedArtifactCount,
    failedCount,
    latestFormatLabel: latestCompletedJob?.formatLabel ?? null,
    latestArtifactName:
      latestCompletedJob?.artifactName ?? latestCompletedJob?.fileName ?? null,
    latestCompletedAt: latestCompletedJob?.completedAt ?? null,
    totalStoredBytes: completedJobs.reduce(
      (total, job) => total + (job.artifactSizeBytes ?? 0),
      0,
    ),
  } satisfies ProjectHandoffPacket["exportBundle"];
}

function createExportStatus(input: {
  completedCount: number;
  hasRunningJob: boolean;
  failedCount: number;
}): ProjectHandoffExportStatus {
  if (input.completedCount > 0) return "ready";
  if (input.hasRunningJob) return "running";
  if (input.failedCount > 0) return "failed";

  return "missing";
}

function createStakeholderNotes(input: {
  comments: ProjectHandoffCommentSignal[];
  now: Date;
}) {
  const taskComments = input.comments.filter(
    (comment) => comment.taskStatus !== "none",
  );
  const openTasks = taskComments.filter(
    (comment) => comment.taskStatus !== "done",
  );
  const latestComment = [...input.comments].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )[0];

  return {
    totalCount: input.comments.length,
    unresolvedCount: input.comments.filter((comment) => !comment.resolved)
      .length,
    openTaskCount: openTasks.length,
    overdueTaskCount: openTasks.filter((comment) =>
      isReviewTaskOverdue({
        taskStatus: comment.taskStatus,
        taskDueAt: comment.taskDueAt,
        now: input.now,
      }),
    ).length,
    latestNoteAt: latestComment?.updatedAt ?? null,
  } satisfies ProjectHandoffPacket["stakeholderNotes"];
}

function createApprovalHistory(input: {
  projectId: string;
  auditLogs: ProjectHandoffAuditLogSignal[];
}) {
  return input.auditLogs
    .filter(
      (log) =>
        log.action === "approval.updated" &&
        log.targetType === "project" &&
        log.targetId === input.projectId,
    )
    .map((log) => ({
      id: log.id,
      summary: log.summary,
      actorEmail: log.actorEmail,
      approvalStatus: parseApprovalStatus(log.summary),
      createdAt: log.createdAt,
    }))
    .slice(0, 4);
}

function createChecklist(input: {
  audit: ProjectAuditSummary | null;
  exportBundle: ProjectHandoffPacket["exportBundle"];
  stakeholderNotes: ProjectHandoffPacket["stakeholderNotes"];
  approvalStatus: ApprovalStatus;
  approvalHistory: ProjectHandoffApprovalEvent[];
}): ProjectHandoffChecklistItem[] {
  return [
    {
      id: "readiness",
      label: "Readiness report",
      complete: Boolean(input.audit),
      detail: input.audit
        ? `${input.audit.overallScore}/100 production readiness`
        : "No project audit has run yet.",
    },
    {
      id: "exports",
      label: "Export bundle",
      complete: input.exportBundle.status === "ready",
      detail:
        input.exportBundle.status === "ready"
          ? `${input.exportBundle.completedCount} completed export${input.exportBundle.completedCount === 1 ? "" : "s"}`
          : "No completed export is ready for handoff.",
    },
    {
      id: "notes",
      label: "Stakeholder notes",
      complete:
        input.stakeholderNotes.totalCount > 0 &&
        input.stakeholderNotes.openTaskCount === 0,
      detail: input.stakeholderNotes.totalCount
        ? `${input.stakeholderNotes.unresolvedCount} unresolved note${input.stakeholderNotes.unresolvedCount === 1 ? "" : "s"}`
        : "No stakeholder notes are attached yet.",
    },
    {
      id: "approval",
      label: "Approval history",
      complete:
        input.approvalStatus === "approved" ||
        input.approvalHistory.length > 0,
      detail:
        input.approvalStatus === "approved"
          ? "Project is approved."
          : input.approvalHistory.length
            ? `${input.approvalHistory.length} approval event${input.approvalHistory.length === 1 ? "" : "s"}`
            : "No approval movement recorded yet.",
    },
  ];
}

function createPacketScore(input: {
  readinessScore: number;
  exportBundle: ProjectHandoffPacket["exportBundle"];
  stakeholderNotes: ProjectHandoffPacket["stakeholderNotes"];
  approvalStatus: ApprovalStatus;
}) {
  const exportScore = {
    ready: 100,
    running: 60,
    failed: 25,
    missing: 0,
  }[input.exportBundle.status];
  const notesScore =
    input.stakeholderNotes.openTaskCount > 0
      ? Math.max(20, 80 - input.stakeholderNotes.openTaskCount * 20)
      : input.stakeholderNotes.unresolvedCount > 0
        ? 70
        : input.stakeholderNotes.totalCount > 0
          ? 100
          : 55;
  const approvalScore = {
    draft: 35,
    "in-review": 65,
    "changes-requested": 25,
    approved: 100,
  }[input.approvalStatus];

  return Math.round(
    input.readinessScore * 0.4 +
      exportScore * 0.25 +
      notesScore * 0.15 +
      approvalScore * 0.2,
  );
}

function createPacketStatus(input: {
  packetScore: number;
  exportBundle: ProjectHandoffPacket["exportBundle"];
  approvalStatus: ApprovalStatus;
}): ProjectHandoffStatus {
  if (
    input.packetScore >= 85 &&
    input.exportBundle.status === "ready" &&
    input.approvalStatus === "approved"
  ) {
    return "ready";
  }

  if (input.packetScore >= 65) return "review";

  return "blocked";
}

function createNextAction(input: {
  audit: ProjectAuditSummary | null;
  exportBundle: ProjectHandoffPacket["exportBundle"];
  stakeholderNotes: ProjectHandoffPacket["stakeholderNotes"];
  approvalStatus: ApprovalStatus;
}) {
  if (!input.audit) return "Run the project audit report.";
  if (input.audit.overallScore < 85) return "Resolve readiness audit issues.";
  if (input.exportBundle.status !== "ready") return "Create a final export.";
  if (input.stakeholderNotes.openTaskCount > 0) {
    return "Close remaining stakeholder tasks.";
  }
  if (input.approvalStatus !== "approved") return "Move project to approved.";

  return "Ready to hand off.";
}

function parseApprovalStatus(summary: string): ApprovalStatus | null {
  if (summary.includes("approved")) return "approved";
  if (summary.includes("changes-requested")) return "changes-requested";
  if (summary.includes("in-review")) return "in-review";
  if (summary.includes("draft")) return "draft";

  return null;
}

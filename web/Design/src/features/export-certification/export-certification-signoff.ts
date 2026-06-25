import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";
import type {
  ExportCertificationApprovalEvent,
  ExportCertificationArtifactDefinition,
  ExportCertificationSignoff,
} from "@/features/export-certification/export-certification-types";
import {
  clampCertificationScore,
  scoreToCertificationStatus,
} from "@/features/export-certification/export-certification-utils";

export function createCertificationSignoff(input: {
  definition: ExportCertificationArtifactDefinition;
  projects: ProjectSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now: Date;
}): ExportCertificationSignoff {
  const projectIds = new Set(input.projects.map((project) => project.id));
  const tasks = input.reviewTasks.filter((task) =>
    projectIds.has(task.projectId),
  );
  const openTasks = tasks.filter(
    (task) => task.taskStatus !== "none" && task.taskStatus !== "done",
  );
  const overdueTasks = openTasks.filter((task) =>
    isReviewTaskOverdue({
      taskStatus: task.taskStatus,
      taskDueAt: task.taskDueAt,
      now: input.now,
    }),
  );
  const handoffEvents = input.projectHandoffPackets
    .filter((packet) => projectIds.has(packet.projectId))
    .flatMap((packet) =>
      packet.approvalHistory.map((event) => ({
        id: event.id,
        projectId: packet.projectId,
        summary: event.summary,
        actorEmail: event.actorEmail,
        createdAt: event.createdAt,
      })),
    );
  const auditEvents = input.auditLogs
    .filter(
      (log) =>
        log.action === "approval.updated" &&
        (!log.targetId || projectIds.has(log.targetId)),
    )
    .map((log) => ({
      id: log.id,
      projectId: log.targetId,
      summary: log.summary,
      actorEmail: log.actorEmail,
      createdAt: log.createdAt,
    }));
  const approvalEvents = uniqueEvents([...handoffEvents, ...auditEvents]).slice(
    0,
    6,
  );
  const approvedProjects = input.projects.filter(
    (project) => project.approvalStatus === "approved",
  ).length;
  const totalProjects = input.projects.length;
  const approvalCoverage = totalProjects
    ? Math.round((approvedProjects / totalProjects) * 100)
    : 0;
  const eventCoverage =
    totalProjects && approvalEvents.length ? 100 : totalProjects ? 55 : 0;
  const taskPenalty = overdueTasks.length * 24 + openTasks.length * 10;
  const score = clampCertificationScore(
    Math.round(approvalCoverage * 0.62 + eventCoverage * 0.38) - taskPenalty,
  );
  const status = scoreToCertificationStatus(
    score,
    totalProjects === 0 || overdueTasks.length > 0,
  );

  return {
    status,
    score,
    approvedProjects,
    totalProjects,
    openTasks: openTasks.length,
    overdueTasks: overdueTasks.length,
    approvalEvents,
    summary: createSignoffSummary({
      definition: input.definition,
      approvedProjects,
      totalProjects,
      openTasks,
      overdueTasks,
      approvalEvents,
    }),
  };
}

function createSignoffSummary(input: {
  definition: ExportCertificationArtifactDefinition;
  approvedProjects: number;
  totalProjects: number;
  openTasks: ReviewTaskSummary[];
  overdueTasks: ReviewTaskSummary[];
  approvalEvents: ExportCertificationApprovalEvent[];
}) {
  if (!input.totalProjects) {
    return `${input.definition.label} has no linked project for stakeholder signoff.`;
  }

  if (input.overdueTasks.length) {
    return `${input.overdueTasks[0]?.body ?? "Stakeholder task"} is overdue before certification.`;
  }

  if (input.openTasks.length) {
    return `${input.openTasks[0]?.body ?? "Stakeholder task"} is still open before certification.`;
  }

  if (input.approvedProjects < input.totalProjects) {
    return `${input.approvedProjects}/${input.totalProjects} linked projects are approved.`;
  }

  if (!input.approvalEvents.length) {
    return "Approval status is ready, but no approval audit event is linked.";
  }

  return `${input.approvedProjects}/${input.totalProjects} linked projects have stakeholder approval evidence.`;
}

function uniqueEvents(events: ExportCertificationApprovalEvent[]) {
  const seen = new Set<string>();
  const unique: ExportCertificationApprovalEvent[] = [];

  for (const event of events.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )) {
    const key = `${event.id}-${event.projectId ?? "workspace"}`;

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(event);
  }

  return unique;
}

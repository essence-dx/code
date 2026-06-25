import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import { listProjectAuditSummaries } from "@/db/project-audit-center";
import { listProjects } from "@/db/projects";
import { listServerExportJobs } from "@/db/server-export-jobs";
import { project, projectComment } from "@/db/schema";
import { listWorkspaceAuditLogs } from "@/db/workspace-audit-logs";
import {
  createProjectHandoffPackets,
  type ProjectHandoffCommentSignal,
  type ProjectHandoffPacket,
} from "@/features/projects/project-handoff-packet";
import { normalizeReviewTaskStatus } from "@/features/review/review-tasks";

export async function listProjectHandoffPackets(
  userId: string,
): Promise<ProjectHandoffPacket[]> {
  const [projects, audits, exportJobs, auditLogs, comments] =
    await Promise.all([
      listProjects(userId),
      listProjectAuditSummaries(userId),
      listServerExportJobs(userId),
      listWorkspaceAuditLogs(userId),
      listProjectHandoffCommentSignals(userId),
    ]);

  return createProjectHandoffPackets({
    projects,
    audits,
    exportJobs,
    comments,
    auditLogs,
  });
}

async function listProjectHandoffCommentSignals(
  userId: string,
): Promise<ProjectHandoffCommentSignal[]> {
  const rows = await getDb()
    .select({
      comment: projectComment,
    })
    .from(projectComment)
    .innerJoin(project, eq(projectComment.projectId, project.id))
    .where(and(eq(project.userId, userId), isNull(project.deletedAt)))
    .orderBy(desc(projectComment.updatedAt))
    .limit(500);

  return rows.map(({ comment }) => ({
    id: comment.id,
    projectId: comment.projectId,
    body: comment.body,
    authorName: comment.authorName,
    resolved: comment.resolved,
    taskStatus: normalizeReviewTaskStatus(comment.taskStatus),
    taskAssigneeName: comment.taskAssigneeName,
    taskDueAt: comment.taskDueAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }));
}

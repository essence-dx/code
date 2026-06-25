import { and, desc, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  project,
  projectComment,
  projectCommentReaction,
  type ProjectCommentReactionRow,
  type ProjectCommentRow,
} from "@/db/schema";
import {
  extractCommentMentions,
  parseCommentMentions,
  stringifyCommentMentions,
} from "@/features/editor/comment-mentions";
import type {
  CommentReactionKind,
  ProjectCommentReactionSummary,
  ProjectCommentSummary,
  ReviewTaskStatus,
} from "@/features/editor/types";
import {
  normalizeReviewTaskOwner,
  normalizeReviewTaskStatus,
} from "@/features/review/review-tasks";

const reactionKinds: CommentReactionKind[] = ["like", "agree", "love"];

export type ReviewTaskSummary = Pick<
  ProjectCommentSummary,
  | "id"
  | "projectId"
  | "pageId"
  | "elementId"
  | "authorName"
  | "body"
  | "resolved"
  | "taskStatus"
  | "taskAssigneeName"
  | "taskDueAt"
  | "createdAt"
  | "updatedAt"
> & {
  projectName: string;
};

function toSummary(
  row: ProjectCommentRow,
  reactions: ProjectCommentReactionSummary[] = [],
): ProjectCommentSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    pageId: row.pageId,
    elementId: row.elementId,
    authorName: row.authorName,
    body: row.body,
    mentions: parseCommentMentions(row.mentions),
    reactions,
    resolved: row.resolved,
    taskStatus: normalizeReviewTaskStatus(row.taskStatus),
    taskAssigneeName: row.taskAssigneeName,
    taskDueAt: row.taskDueAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProjectComments(input: {
  projectId: string;
  viewerUserId?: string;
}) {
  const [rows, reactions] = await Promise.all([
    getDb()
      .select()
      .from(projectComment)
      .where(eq(projectComment.projectId, input.projectId))
      .orderBy(desc(projectComment.createdAt))
      .limit(200),
    getDb()
      .select()
      .from(projectCommentReaction)
      .where(eq(projectCommentReaction.projectId, input.projectId)),
  ]);

  return rows.map((row) =>
    toSummary(row, summarizeReactions(row.id, reactions, input.viewerUserId)),
  );
}

export async function createProjectComment(input: {
  projectId: string;
  userId: string;
  pageId: string;
  elementId?: string | null;
  authorName: string;
  body: string;
  taskStatus?: ReviewTaskStatus;
  taskAssigneeName?: string | null;
  taskDueAt?: Date | null;
}) {
  const now = new Date();
  const taskStatus = normalizeReviewTaskStatus(input.taskStatus);
  const hasTask = taskStatus !== "none";

  const [row] = await getDb()
    .insert(projectComment)
    .values({
      id: nanoid(),
      projectId: input.projectId,
      userId: input.userId,
      pageId: input.pageId,
      elementId: input.elementId ?? null,
      authorName: input.authorName,
      body: input.body,
      mentions: stringifyCommentMentions(extractCommentMentions(input.body)),
      resolved: false,
      taskStatus,
      taskAssigneeName: hasTask
        ? normalizeReviewTaskOwner(input.taskAssigneeName)
        : null,
      taskDueAt: hasTask ? input.taskDueAt ?? null : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toSummary(row);
}

export async function toggleProjectCommentReaction(input: {
  projectId: string;
  commentId: string;
  userId: string;
  reaction: CommentReactionKind;
}) {
  const [comment] = await getDb()
    .select({ id: projectComment.id })
    .from(projectComment)
    .where(
      and(
        eq(projectComment.id, input.commentId),
        eq(projectComment.projectId, input.projectId),
      ),
    )
    .limit(1);

  if (!comment) return false;

  const [existing] = await getDb()
    .select()
    .from(projectCommentReaction)
    .where(
      and(
        eq(projectCommentReaction.projectId, input.projectId),
        eq(projectCommentReaction.commentId, input.commentId),
        eq(projectCommentReaction.userId, input.userId),
        eq(projectCommentReaction.reaction, input.reaction),
      ),
    )
    .limit(1);

  if (existing) {
    await getDb()
      .delete(projectCommentReaction)
      .where(eq(projectCommentReaction.id, existing.id));
    return true;
  }

  await getDb().insert(projectCommentReaction).values({
    id: nanoid(),
    projectId: input.projectId,
    commentId: input.commentId,
    userId: input.userId,
    reaction: input.reaction,
    createdAt: new Date(),
  });

  return true;
}

export async function resolveProjectComment(input: {
  projectId: string;
  commentId: string;
}) {
  const [existing] = await getDb()
    .select({ taskStatus: projectComment.taskStatus })
    .from(projectComment)
    .where(
      and(
        eq(projectComment.id, input.commentId),
        eq(projectComment.projectId, input.projectId),
      ),
    )
    .limit(1);

  const [row] = await getDb()
    .update(projectComment)
    .set({
      resolved: true,
      taskStatus:
        normalizeReviewTaskStatus(existing?.taskStatus) === "none"
          ? "none"
          : "done",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectComment.id, input.commentId),
        eq(projectComment.projectId, input.projectId),
      ),
    )
    .returning();

  return row ? toSummary(row) : null;
}

export async function listProjectCommentTasks(userId: string) {
  const rows = await getDb()
    .select({
      comment: projectComment,
      projectName: project.name,
    })
    .from(projectComment)
    .innerJoin(project, eq(projectComment.projectId, project.id))
    .where(
      and(eq(project.userId, userId), ne(projectComment.taskStatus, "none")),
    )
    .orderBy(desc(projectComment.updatedAt))
    .limit(80);

  return rows.map(({ comment, projectName }) => {
    const summary = toSummary(comment);

    return {
      id: summary.id,
      projectId: summary.projectId,
      projectName,
      pageId: summary.pageId,
      elementId: summary.elementId,
      authorName: summary.authorName,
      body: summary.body,
      resolved: summary.resolved,
      taskStatus: summary.taskStatus,
      taskAssigneeName: summary.taskAssigneeName,
      taskDueAt: summary.taskDueAt,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    } satisfies ReviewTaskSummary;
  });
}

export async function updateProjectCommentTaskStatus(input: {
  userId: string;
  projectId: string;
  commentId: string;
  taskStatus: ReviewTaskStatus;
}) {
  const taskStatus = normalizeReviewTaskStatus(input.taskStatus);

  if (taskStatus === "none") {
    return null;
  }

  const [ownedProject] = await getDb()
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, input.projectId), eq(project.userId, input.userId)))
    .limit(1);

  if (!ownedProject) {
    return null;
  }

  const [row] = await getDb()
    .update(projectComment)
    .set({
      taskStatus,
      resolved: taskStatus === "done" ? true : false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectComment.id, input.commentId),
        eq(projectComment.projectId, input.projectId),
        ne(projectComment.taskStatus, "none"),
      ),
    )
    .returning();

  return row ? toSummary(row) : null;
}

function summarizeReactions(
  commentId: string,
  reactions: ProjectCommentReactionRow[],
  viewerUserId?: string,
) {
  return reactionKinds.map((kind) => {
    const matching = reactions.filter(
      (reaction) =>
        reaction.commentId === commentId && reaction.reaction === kind,
    );

    return {
      kind,
      count: matching.length,
      reactedByMe: viewerUserId
        ? matching.some((reaction) => reaction.userId === viewerUserId)
        : false,
    };
  });
}

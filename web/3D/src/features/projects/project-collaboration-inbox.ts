import {
  projectReviewSurfaceLabels,
  projectReviewSurfaceKeys,
  resolveShareSettings,
  type ProjectReviewSurface,
  type ProjectReviewWorkflow,
  type ShareSettings,
} from "@/features/projects/share-settings";

type DateLike = Date | string | null | undefined;

export type ProjectCollaborationInboxKind = "mention" | "remote-conflict" | "resolved-comment" | "review-request";
export type ProjectCollaborationInboxSeverity = "info" | "urgent" | "warning";

export interface ProjectCollaborationInboxProject {
  archivedAt: DateLike;
  id: string;
  name: string;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
}

export interface ProjectCollaborationInboxComment {
  body: string;
  createdAt: DateLike;
  id: string;
  projectId: string;
  resolvedAt: DateLike;
  updatedAt: DateLike;
  userId: string;
}

export interface ProjectCollaborationInboxOperationBatch {
  batchId: string;
  createdAt: DateLike;
  operationCount: number;
  projectId: string;
  userEmail: string;
  userId: string;
  userName: string;
}

export interface ProjectCollaborationInboxUser {
  email?: string | null;
  id: string;
  name?: string | null;
}

export interface ProjectCollaborationInboxNotification {
  actionLabel: string;
  count: number;
  id: string;
  kind: ProjectCollaborationInboxKind;
  message: string;
  projectId: string;
  projectName: string;
  severity: ProjectCollaborationInboxSeverity;
  title: string;
  updatedAt: string | null;
}

export interface ProjectCollaborationInbox {
  generatedAt: string;
  notifications: ProjectCollaborationInboxNotification[];
  summary: {
    mentionCount: number;
    remoteConflictCount: number;
    resolvedCommentCount: number;
    reviewRequestCount: number;
    totalCount: number;
    urgentCount: number;
    warningCount: number;
  };
}

const severityRank: Record<ProjectCollaborationInboxSeverity, number> = {
  urgent: 0,
  warning: 1,
  info: 2,
};

function toTime(value: DateLike) {
  if (!value) {
    return 0;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function toIso(value: DateLike) {
  const time = toTime(value);

  return time > 0 ? new Date(time).toISOString() : null;
}

function newestIso(values: DateLike[]) {
  const newest = Math.max(...values.map(toTime), 0);

  return newest > 0 ? new Date(newest).toISOString() : null;
}

function byProject<T extends { projectId: string }>(items: T[]) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const entries = grouped.get(item.projectId) ?? [];

    entries.push(item);
    grouped.set(item.projectId, entries);
  }

  return grouped;
}

function createNotification(input: Omit<ProjectCollaborationInboxNotification, "id">): ProjectCollaborationInboxNotification {
  return {
    ...input,
    id: `${input.projectId}:${input.kind}`,
  };
}

function getRequestedReviewSurfaces(workflow: ProjectReviewWorkflow) {
  return projectReviewSurfaceKeys.filter((surface) => workflow[surface].status === "requested");
}

function reviewRequestUpdatedAt(workflow: ProjectReviewWorkflow, surfaces: ProjectReviewSurface[], fallback: DateLike) {
  return newestIso([...surfaces.map((surface) => workflow[surface].updatedAt), fallback]);
}

function normalizeMentionToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@._-]+/gu, " ")
    .trim();
}

function createMentionNeedles(user: ProjectCollaborationInboxUser) {
  const rawTokens = [user.email, user.email?.split("@")[0], user.name, ...(user.name?.split(/\s+/) ?? [])].filter((value): value is string => Boolean(value?.trim()));
  const tokens = new Set<string>();

  for (const token of rawTokens) {
    const normalized = normalizeMentionToken(token);

    if (normalized.length >= 2) {
      tokens.add(`@${normalized}`);
    }
  }

  return [...tokens];
}

function commentMentionsUser(comment: ProjectCollaborationInboxComment, user: ProjectCollaborationInboxUser, mentionNeedles: string[]) {
  if (comment.userId === user.id || comment.resolvedAt) {
    return false;
  }

  const body = normalizeMentionToken(comment.body);

  return mentionNeedles.some((needle) => body.includes(needle));
}

function recentItems<T>(items: T[], getDate: (item: T) => DateLike, now: Date, days: number) {
  const threshold = now.getTime() - days * 24 * 60 * 60 * 1000;

  return items.filter((item) => toTime(getDate(item)) >= threshold);
}

function formatPeople(items: Array<{ userName: string }>, limit = 2) {
  const names = [...new Set(items.map((item) => item.userName).filter(Boolean))];
  const visibleNames = names.slice(0, limit);
  const hiddenCount = names.length - visibleNames.length;

  return hiddenCount > 0 ? `${visibleNames.join(", ")} +${hiddenCount}` : visibleNames.join(", ");
}

export function summarizeProjectCollaborationInbox(notifications: ProjectCollaborationInboxNotification[]): ProjectCollaborationInbox["summary"] {
  return {
    mentionCount: notifications.filter((notification) => notification.kind === "mention").length,
    remoteConflictCount: notifications.filter((notification) => notification.kind === "remote-conflict").length,
    resolvedCommentCount: notifications.filter((notification) => notification.kind === "resolved-comment").length,
    reviewRequestCount: notifications.filter((notification) => notification.kind === "review-request").length,
    totalCount: notifications.length,
    urgentCount: notifications.filter((notification) => notification.severity === "urgent").length,
    warningCount: notifications.filter((notification) => notification.severity === "warning").length,
  };
}

export function createProjectCollaborationInbox(input: {
  comments: ProjectCollaborationInboxComment[];
  currentUser: ProjectCollaborationInboxUser;
  now?: Date;
  operationBatches: ProjectCollaborationInboxOperationBatch[];
  projects: ProjectCollaborationInboxProject[];
  recentDays?: number;
}): ProjectCollaborationInbox {
  const now = input.now ?? new Date();
  const recentDays = input.recentDays ?? 7;
  const commentsByProject = byProject(input.comments);
  const operationBatchesByProject = byProject(input.operationBatches);
  const mentionNeedles = createMentionNeedles(input.currentUser);
  const notifications: ProjectCollaborationInboxNotification[] = [];

  for (const project of input.projects.filter((entry) => !entry.archivedAt)) {
    const projectComments = commentsByProject.get(project.id) ?? [];
    const projectOperationBatches = operationBatchesByProject.get(project.id) ?? [];
    const settings = resolveShareSettings(project.shareSettings);
    const requestedSurfaces = getRequestedReviewSurfaces(settings.reviewWorkflow);
    const mentions = projectComments.filter((comment) => commentMentionsUser(comment, input.currentUser, mentionNeedles));
    const resolvedComments = recentItems(
      projectComments.filter((comment) => Boolean(comment.resolvedAt)),
      (comment) => comment.resolvedAt,
      now,
      recentDays,
    );
    const remoteBatches = recentItems(
      projectOperationBatches.filter((batch) => batch.userId !== input.currentUser.id),
      (batch) => batch.createdAt,
      now,
      recentDays,
    );

    if (requestedSurfaces.length > 0) {
      const labels = requestedSurfaces.map((surface) => projectReviewSurfaceLabels[surface]).join(", ");

      notifications.push(
        createNotification({
          actionLabel: "Review request",
          count: requestedSurfaces.length,
          kind: "review-request",
          message: `${labels} ${requestedSurfaces.length === 1 ? "is" : "are"} waiting for approval.`,
          projectId: project.id,
          projectName: project.name,
          severity: "warning",
          title: "Review requested",
          updatedAt: reviewRequestUpdatedAt(settings.reviewWorkflow, requestedSurfaces, project.updatedAt),
        }),
      );
    }

    if (mentions.length > 0) {
      notifications.push(
        createNotification({
          actionLabel: "Open comment",
          count: mentions.length,
          kind: "mention",
          message: `${mentions.length} open comment${mentions.length === 1 ? "" : "s"} mention you.`,
          projectId: project.id,
          projectName: project.name,
          severity: "urgent",
          title: "Mentioned in comments",
          updatedAt: newestIso(mentions.map((comment) => comment.updatedAt || comment.createdAt)),
        }),
      );
    }

    if (remoteBatches.length > 0) {
      const operationCount = remoteBatches.reduce((sum, batch) => sum + batch.operationCount, 0);
      const people = formatPeople(remoteBatches);

      notifications.push(
        createNotification({
          actionLabel: "Review remote changes",
          count: remoteBatches.length,
          kind: "remote-conflict",
          message: `${remoteBatches.length} remote collaboration batch${remoteBatches.length === 1 ? "" : "es"} from ${people || "teammates"} may need merge review before publish.`,
          projectId: project.id,
          projectName: project.name,
          severity: operationCount >= 10 || remoteBatches.length >= 3 ? "warning" : "info",
          title: "Remote collaboration review",
          updatedAt: newestIso(remoteBatches.map((batch) => batch.createdAt)),
        }),
      );
    }

    if (resolvedComments.length > 0) {
      notifications.push(
        createNotification({
          actionLabel: "View resolved",
          count: resolvedComments.length,
          kind: "resolved-comment",
          message: `${resolvedComments.length} comment${resolvedComments.length === 1 ? "" : "s"} resolved in the last ${recentDays} days.`,
          projectId: project.id,
          projectName: project.name,
          severity: "info",
          title: "Comments resolved",
          updatedAt: newestIso(resolvedComments.map((comment) => comment.resolvedAt)),
        }),
      );
    }
  }

  notifications.sort((first, second) => severityRank[first.severity] - severityRank[second.severity] || toTime(second.updatedAt) - toTime(first.updatedAt) || first.title.localeCompare(second.title));

  return {
    generatedAt: now.toISOString(),
    notifications,
    summary: summarizeProjectCollaborationInbox(notifications),
  };
}

import type { SceneDocument } from "@/features/editor/types";
import type { ProjectAccessRole } from "./access-types";
import {
  projectReviewStatusLabels,
  projectReviewSurfaceKeys,
  projectReviewSurfaceLabels,
  resolveShareSettings,
  type ShareSettings,
} from "./share-settings";
import type { ProjectAuditEvent, ProjectAuditLogSummary, ProjectAuditStatus } from "./types";
import type { ProjectVersionActivityData } from "./version-activity-types";

type DateLike = Date | string | null | undefined;

export interface ProjectAuditProjectSource {
  archivedAt: DateLike;
  createdAt: DateLike;
  description: string;
  id: string;
  name: string;
  publishedAt: DateLike;
  shareId: string | null;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
  userId: string;
}

export interface ProjectAuditAccessGrantSource {
  createdAt: DateLike;
  createdByUserId: string;
  email: string;
  id: string;
  name: string | null;
  role: ProjectAccessRole;
  updatedAt: DateLike;
  userId: string;
}

export interface ProjectAuditCommentSource {
  body: string;
  createdAt: DateLike;
  id: string;
  objectId: string | null;
  resolvedAt: DateLike;
  updatedAt: DateLike;
  userEmail: string;
  userId: string;
  userName: string | null;
}

export interface ProjectAuditVersionSource {
  activityData: ProjectVersionActivityData | null;
  createdAt: DateLike;
  id: string;
  name: string;
  userEmail: string;
  userId: string;
  userName: string | null;
}

export interface CreateProjectAuditLogInput {
  accessGrants: ProjectAuditAccessGrantSource[];
  comments: ProjectAuditCommentSource[];
  project: ProjectAuditProjectSource;
  sceneData: SceneDocument | null;
  versions: ProjectAuditVersionSource[];
}

const exportPermissionLabels: Array<[keyof ShareSettings, string]> = [
  ["allowViewerDownload", "Viewer package downloads"],
  ["allowCodeExport", "Code snippets"],
  ["allowEmbed", "Embed exports"],
  ["allowPublicApi", "Scene API exports"],
];

function toIso(value: DateLike) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toTime(value: DateLike) {
  const iso = toIso(value);

  return iso ? new Date(iso).getTime() : 0;
}

function actorName(name: string | null | undefined, email: string | null | undefined) {
  return name?.trim() || email?.trim() || "Unknown user";
}

function createEvent(event: ProjectAuditEvent): ProjectAuditEvent {
  return event;
}

function statusForReview(status: string): ProjectAuditStatus {
  if (status === "approved") {
    return "success";
  }

  if (status === "changesRequested") {
    return "danger";
  }

  if (status === "requested") {
    return "warning";
  }

  return "info";
}

function appendProjectLifecycleEvents(input: CreateProjectAuditLogInput, events: ProjectAuditEvent[]) {
  const createdAt = toIso(input.project.createdAt);

  if (createdAt) {
    events.push(
      createEvent({
        category: "publishing",
        description: "Project workspace record was created.",
        id: `project:${input.project.id}:created`,
        occurredAt: createdAt,
        status: "info",
        title: "Project created",
      }),
    );
  }

  const publishedAt = toIso(input.project.publishedAt);

  if (publishedAt && input.project.shareId) {
    events.push(
      createEvent({
        category: "publishing",
        description: `Public link is active with share id ${input.project.shareId}.`,
        id: `project:${input.project.id}:published`,
        metadata: { shareId: input.project.shareId },
        occurredAt: publishedAt,
        status: "success",
        title: "Project published",
      }),
    );
  }

  const archivedAt = toIso(input.project.archivedAt);

  if (archivedAt) {
    events.push(
      createEvent({
        category: "publishing",
        description: "Project is archived in trash.",
        id: `project:${input.project.id}:archived`,
        occurredAt: archivedAt,
        status: "warning",
        title: "Project archived",
      }),
    );
  }
}

function appendAccessEvents(input: CreateProjectAuditLogInput, events: ProjectAuditEvent[]) {
  for (const grant of input.accessGrants) {
    const createdAt = toIso(grant.createdAt);
    const updatedAt = toIso(grant.updatedAt);

    if (createdAt) {
      events.push(
        createEvent({
          actorEmail: grant.email,
          actorName: actorName(grant.name, grant.email),
          category: "permissions",
          description: `${actorName(grant.name, grant.email)} received ${grant.role} access.`,
          id: `access:${grant.id}:created`,
          metadata: { role: grant.role, userId: grant.userId },
          occurredAt: createdAt,
          status: grant.role === "viewer" ? "info" : "success",
          title: "Access granted",
        }),
      );
    }

    if (updatedAt && createdAt && updatedAt !== createdAt) {
      events.push(
        createEvent({
          actorEmail: grant.email,
          actorName: actorName(grant.name, grant.email),
          category: "permissions",
          description: `${actorName(grant.name, grant.email)} now has ${grant.role} access.`,
          id: `access:${grant.id}:updated`,
          metadata: { role: grant.role, userId: grant.userId },
          occurredAt: updatedAt,
          status: "warning",
          title: "Access role changed",
        }),
      );
    }
  }
}

function appendCommentEvents(input: CreateProjectAuditLogInput, events: ProjectAuditEvent[]) {
  for (const comment of input.comments) {
    const createdAt = toIso(comment.createdAt);

    if (createdAt) {
      events.push(
        createEvent({
          actorEmail: comment.userEmail,
          actorName: actorName(comment.userName, comment.userEmail),
          category: "comments",
          description: comment.objectId ? `Comment added on ${comment.objectId}.` : "Project comment added.",
          id: `comment:${comment.id}:created`,
          metadata: { objectId: comment.objectId },
          occurredAt: createdAt,
          status: "info",
          title: "Comment added",
        }),
      );
    }

    const resolvedAt = toIso(comment.resolvedAt);

    if (resolvedAt) {
      events.push(
        createEvent({
          actorEmail: comment.userEmail,
          actorName: actorName(comment.userName, comment.userEmail),
          category: "comments",
          description: comment.objectId ? `Comment on ${comment.objectId} was resolved.` : "Project comment was resolved.",
          id: `comment:${comment.id}:resolved`,
          metadata: { objectId: comment.objectId },
          occurredAt: resolvedAt,
          status: "success",
          title: "Comment resolved",
        }),
      );
    }
  }
}

function appendVersionEvents(input: CreateProjectAuditLogInput, events: ProjectAuditEvent[]) {
  for (const version of input.versions) {
    const createdAt = toIso(version.createdAt);

    if (!createdAt) {
      continue;
    }

    const actorEmail = version.activityData?.actorEmail || version.userEmail;
    const actor = actorName(version.activityData?.actorName ?? version.userName, actorEmail);

    events.push(
      createEvent({
        actorEmail,
        actorName: actor,
        category: "versions",
        description: `${version.name} snapshot captured with ${version.activityData?.totalCommentCount ?? 0} comments in context.`,
        id: `version:${version.id}:created`,
        metadata: {
          activeCollaboratorCount: version.activityData?.activeCollaboratorCount ?? 0,
          openCommentCount: version.activityData?.openCommentCount ?? 0,
          resolvedCommentCount: version.activityData?.resolvedCommentCount ?? 0,
        },
        occurredAt: createdAt,
        status: "info",
        title: "Version snapshot saved",
      }),
    );
  }
}

function appendReviewAndReleaseEvents(input: CreateProjectAuditLogInput, events: ProjectAuditEvent[]) {
  const settings = resolveShareSettings(input.project.shareSettings);
  const fallbackAt = toIso(input.project.updatedAt) ?? toIso(input.project.createdAt);

  for (const surface of projectReviewSurfaceKeys) {
    const decision = settings.reviewWorkflow[surface];
    const occurredAt = toIso(decision.updatedAt) ?? fallbackAt;

    if (!occurredAt || decision.status === "draft") {
      continue;
    }

    const releaseSurface = surface === "desktopRelease" || surface === "appPackage";

    events.push(
      createEvent({
        actorName: decision.reviewerName,
        category: releaseSurface ? "releases" : "publishing",
        description: decision.note || `${projectReviewSurfaceLabels[surface]} marked ${projectReviewStatusLabels[decision.status].toLowerCase()}.`,
        id: `review:${surface}:${decision.status}:${occurredAt}`,
        metadata: { status: decision.status, surface },
        occurredAt,
        status: statusForReview(decision.status),
        title: `${projectReviewSurfaceLabels[surface]} ${projectReviewStatusLabels[decision.status].toLowerCase()}`,
      }),
    );
  }

  for (const [permission, label] of exportPermissionLabels) {
    if (!fallbackAt) {
      continue;
    }

    const enabled = Boolean(settings[permission]);

    events.push(
      createEvent({
        category: "exports",
        description: enabled ? `${label} are enabled for this project.` : `${label} are disabled for this project.`,
        id: `export:${permission}:${enabled ? "enabled" : "disabled"}`,
        metadata: { permission, value: enabled },
        occurredAt: fallbackAt,
        status: enabled ? "success" : "warning",
        title: label,
      }),
    );
  }

  if (input.sceneData && fallbackAt) {
    events.push(
      createEvent({
        category: "exports",
        description: `${input.sceneData.objects.length} scene objects are available to share and package exporters.`,
        id: `export:scene-readiness:${input.project.id}`,
        metadata: {
          documentUpdatedAt: input.sceneData.updatedAt,
          objectCount: input.sceneData.objects.length,
        },
        occurredAt: fallbackAt,
        status: input.sceneData.objects.length > 0 ? "success" : "warning",
        title: "Scene export readiness",
      }),
    );
  }
}

function summarize(events: ProjectAuditEvent[]): ProjectAuditLogSummary {
  return events.reduce<ProjectAuditLogSummary>(
    (summary, event) => ({
      ...summary,
      [event.category]: summary[event.category] + 1,
      total: summary.total + 1,
    }),
    {
      comments: 0,
      exports: 0,
      permissions: 0,
      publishing: 0,
      releases: 0,
      total: 0,
      versions: 0,
    },
  );
}

export function createProjectAuditLogFromEvents(events: ProjectAuditEvent[]) {
  const sortedEvents = events
    .filter((event) => event.occurredAt)
    .sort((first, second) => toTime(second.occurredAt) - toTime(first.occurredAt) || first.title.localeCompare(second.title))
    .slice(0, 80);

  return {
    events: sortedEvents,
    summary: summarize(sortedEvents),
  };
}

export function createProjectAuditLog(input: CreateProjectAuditLogInput) {
  const events: ProjectAuditEvent[] = [];

  appendProjectLifecycleEvents(input, events);
  appendAccessEvents(input, events);
  appendCommentEvents(input, events);
  appendVersionEvents(input, events);
  appendReviewAndReleaseEvents(input, events);

  return createProjectAuditLogFromEvents(events);
}

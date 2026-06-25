import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { projectAccessGrant, projectComment, projectVersion, type ProjectRecord, user } from "@/db/schema";
import { sceneDocumentSchema } from "@/features/editor/types";
import { createProjectAuditLog, createProjectAuditLogFromEvents } from "@/features/projects/project-audit-log";
import { listProjectAuditEvents } from "@/features/projects/server/project-audit-event-service";
import type { ProjectAuditEvent } from "@/features/projects/types";
import { ensureProjectVersionActivitySchema } from "@/features/projects/server/project-version-activity-service";

function durableEventKey(event: ProjectAuditEvent) {
  if (event.action && event.resourceType) {
    return `${event.action}:${event.resourceType}:${event.resourceId ?? ""}`;
  }

  const [resourceType, resourceId, action] = event.id.split(":");

  if (resourceType === "project" && action) {
    return `project.${action}:project:${resourceId}`;
  }

  if (resourceType === "access" && action === "created") {
    return `access.granted:accessGrant:${resourceId}`;
  }

  if (resourceType === "access" && action === "updated") {
    return `access.changed:accessGrant:${resourceId}`;
  }

  if (resourceType === "comment" && action === "created") {
    return `comment.created:comment:${resourceId}`;
  }

  if (resourceType === "comment" && action === "resolved") {
    return `comment.resolved:comment:${resourceId}`;
  }

  if (resourceType === "version" && action === "created") {
    return `version.created:projectVersion:${resourceId}`;
  }

  return event.id;
}

export async function loadProjectAuditSnapshot(projectRecord: ProjectRecord) {
  await ensureProjectVersionActivitySchema();

  const [accessGrants, comments, persistedEvents, versions] = await Promise.all([
    getDb()
      .select({
        createdAt: projectAccessGrant.createdAt,
        createdByUserId: projectAccessGrant.createdByUserId,
        email: user.email,
        id: projectAccessGrant.id,
        name: user.name,
        role: projectAccessGrant.role,
        updatedAt: projectAccessGrant.updatedAt,
        userId: projectAccessGrant.userId,
      })
      .from(projectAccessGrant)
      .innerJoin(user, eq(projectAccessGrant.userId, user.id))
      .where(eq(projectAccessGrant.projectId, projectRecord.id))
      .orderBy(desc(projectAccessGrant.updatedAt)),
    getDb()
      .select({
        body: projectComment.body,
        createdAt: projectComment.createdAt,
        id: projectComment.id,
        objectId: projectComment.objectId,
        resolvedAt: projectComment.resolvedAt,
        updatedAt: projectComment.updatedAt,
        userEmail: user.email,
        userId: projectComment.userId,
        userName: user.name,
      })
      .from(projectComment)
      .innerJoin(user, eq(projectComment.userId, user.id))
      .where(eq(projectComment.projectId, projectRecord.id))
      .orderBy(desc(projectComment.updatedAt))
      .limit(60),
    listProjectAuditEvents(projectRecord.id),
    getDb()
      .select({
        activityData: projectVersion.activityData,
        createdAt: projectVersion.createdAt,
        id: projectVersion.id,
        name: projectVersion.name,
        userEmail: user.email,
        userId: projectVersion.userId,
        userName: user.name,
      })
      .from(projectVersion)
      .innerJoin(user, eq(projectVersion.userId, user.id))
      .where(eq(projectVersion.projectId, projectRecord.id))
      .orderBy(desc(projectVersion.createdAt))
      .limit(40),
  ]);
  const sceneData = sceneDocumentSchema.safeParse(projectRecord.sceneData);
  const parsedSceneData = sceneData.success ? sceneData.data : null;
  const derivedEvents = createProjectAuditLog({
    accessGrants,
    comments,
    project: projectRecord,
    sceneData: parsedSceneData,
    versions,
  }).events;
  const persistedKeys = new Set(persistedEvents.map(durableEventKey));

  return {
    accessGrants,
    auditLog: createProjectAuditLogFromEvents([
      ...persistedEvents,
      ...derivedEvents.filter((event) => !persistedKeys.has(durableEventKey(event))),
    ]),
    comments,
    sceneData: parsedSceneData,
    versions,
  };
}

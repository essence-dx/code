import { strict as assert } from "node:assert";
import { createProjectAuditLogFromEvents } from "@/features/projects/project-audit-log";
import type { ProjectAuditEvent } from "@/features/projects/types";

const events: ProjectAuditEvent[] = [
  {
    action: "access.revoked",
    actorEmail: "owner@mail.com",
    actorName: "Owner",
    category: "permissions",
    description: "Project editor access was revoked.",
    id: "persisted:grant-revoked",
    occurredAt: "2026-05-15T00:01:00.000Z",
    resourceId: "grant-1",
    resourceType: "accessGrant",
    status: "warning",
    title: "Access revoked",
    tombstone: {
      role: "editor",
      targetUserId: "editor-1",
    },
  },
  {
    action: "comment.deleted",
    actorEmail: "editor@mail.com",
    actorName: "Editor",
    category: "comments",
    description: "Project comment was deleted.",
    id: "persisted:comment-deleted",
    occurredAt: "2026-05-15T00:02:00.000Z",
    resourceId: "comment-1",
    resourceType: "comment",
    status: "warning",
    title: "Comment deleted",
    tombstone: {
      bodyLength: 23,
      targetUserId: "editor-1",
    },
  },
  {
    action: "project.deleted",
    actorEmail: "owner@mail.com",
    actorName: "Owner",
    category: "publishing",
    description: "Deleted project tombstone was retained.",
    id: "persisted:project-deleted",
    occurredAt: "2026-05-15T00:03:00.000Z",
    resourceId: "project-1",
    resourceType: "project",
    status: "warning",
    title: "Project deleted",
    tombstone: {
      name: "Deleted project",
      shareId: "share-1",
    },
  },
];

const auditLog = createProjectAuditLogFromEvents(events);

assert.equal(auditLog.summary.total, 3);
assert.equal(auditLog.summary.comments, 1);
assert.equal(auditLog.summary.permissions, 1);
assert.equal(auditLog.summary.publishing, 1);
assert.equal(auditLog.events[0].action, "project.deleted");
assert.equal(auditLog.events.every((event) => Boolean(event.tombstone)), true);
assert.equal(auditLog.events[0].tombstone?.name, "Deleted project");

console.log("project audit events smoke passed");

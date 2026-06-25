import { strict as assert } from "node:assert";
import type { SceneDocument } from "@/features/editor/types";
import { createProjectAuditLog } from "@/features/projects/project-audit-log";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const baseTime = "2026-05-15T00:00:00.000Z";
const sceneData: SceneDocument = {
  createdAt: baseTime,
  id: "scene-audit",
  name: "Audit scene",
  objects: [],
  updatedAt: baseTime,
};

const reviewWorkflow = updateProjectReviewWorkflow(
  updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "desktopRelease", "requested", {
    updatedAt: "2026-05-15T00:03:00.000Z",
  }),
  "publicLink",
  "approved",
  {
    updatedAt: "2026-05-15T00:04:00.000Z",
  },
);

const auditLog = createProjectAuditLog({
  accessGrants: [
    {
      createdAt: "2026-05-15T00:01:00.000Z",
      createdByUserId: "owner",
      email: "editor@mail.com",
      id: "grant-1",
      name: "Editor",
      role: "editor",
      updatedAt: "2026-05-15T00:02:00.000Z",
      userId: "editor",
    },
  ],
  comments: [
    {
      body: "Check material",
      createdAt: "2026-05-15T00:05:00.000Z",
      id: "comment-1",
      objectId: "mesh-1",
      resolvedAt: "2026-05-15T00:06:00.000Z",
      updatedAt: "2026-05-15T00:06:00.000Z",
      userEmail: "reviewer@mail.com",
      userId: "reviewer",
      userName: "Reviewer",
    },
  ],
  project: {
    archivedAt: null,
    createdAt: baseTime,
    description: "",
    id: "project-1",
    name: "Audit project",
    publishedAt: "2026-05-15T00:07:00.000Z",
    shareId: "share-1",
    shareSettings: {
      ...defaultShareSettings,
      allowViewerDownload: false,
      reviewWorkflow,
    },
    updatedAt: "2026-05-15T00:08:00.000Z",
    userId: "owner",
  },
  sceneData,
  versions: [
    {
      activityData: {
        activeCollaboratorCount: 2,
        actorEmail: "owner@mail.com",
        actorName: "Owner",
        actorUserId: "owner",
        capturedAt: "2026-05-15T00:09:00.000Z",
        openCommentCount: 0,
        resolvedCommentCount: 1,
        totalCommentCount: 1,
      },
      createdAt: "2026-05-15T00:09:00.000Z",
      id: "version-1",
      name: "Audit version",
      userEmail: "owner@mail.com",
      userId: "owner",
      userName: "Owner",
    },
  ],
});

const categories = new Set(auditLog.events.map((event) => event.category));

for (const category of ["comments", "exports", "permissions", "publishing", "releases", "versions"] as const) {
  assert.equal(categories.has(category), true, `${category} audit event should be present`);
  assert.ok(auditLog.summary[category] > 0, `${category} summary should be counted`);
}

for (let index = 1; index < auditLog.events.length; index += 1) {
  assert.ok(new Date(auditLog.events[index - 1].occurredAt).getTime() >= new Date(auditLog.events[index].occurredAt).getTime(), "audit events should be newest first");
}

assert.equal(auditLog.summary.total, auditLog.events.length);
assert.equal(auditLog.events[0].title, "Version snapshot saved");

console.log("project audit log smoke passed");

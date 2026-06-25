import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import {
  createProjectHandoffPackets,
  type ProjectHandoffAuditLogSignal,
  type ProjectHandoffCommentSignal,
} from "@/features/projects/project-handoff-packet";

describe("project handoff packets", () => {
  test("combines readiness, exports, comments, and approvals", () => {
    const packets = createProjectHandoffPackets({
      projects: [createProject({ approvalStatus: "approved" })],
      audits: [createAudit({ overallScore: 94 })],
      exportJobs: [createExportJob({ status: "completed" })],
      comments: [
        createComment({ resolved: true, taskStatus: "done" }),
        createComment({ id: "comment-2", resolved: true }),
      ],
      auditLogs: [createAuditLog({ summary: "Updated project approval to approved" })],
      now: new Date("2026-05-16T12:00:00.000Z"),
    });

    assert.equal(packets.length, 1);
    assert.equal(packets[0]?.status, "ready");
    assert.equal(packets[0]?.exportBundle.status, "ready");
    assert.equal(packets[0]?.stakeholderNotes.totalCount, 2);
    assert.equal(packets[0]?.approvalHistory.length, 1);
  });

  test("marks packets blocked when final exports and approvals are missing", () => {
    const packets = createProjectHandoffPackets({
      projects: [createProject({ approvalStatus: "draft" })],
      audits: [createAudit({ overallScore: 82 })],
      exportJobs: [],
      comments: [],
      auditLogs: [],
      now: new Date("2026-05-16T12:00:00.000Z"),
    });

    assert.equal(packets[0]?.status, "blocked");
    assert.equal(packets[0]?.exportBundle.status, "missing");
    assert.equal(packets[0]?.nextAction, "Resolve readiness audit issues.");
    assert.equal(
      packets[0]?.checklist.find((item) => item.id === "exports")?.complete,
      false,
    );
  });

  test("counts overdue stakeholder tasks", () => {
    const packets = createProjectHandoffPackets({
      projects: [createProject({ approvalStatus: "in-review" })],
      audits: [createAudit({ overallScore: 90 })],
      exportJobs: [createExportJob({ status: "completed" })],
      comments: [
        createComment({
          taskStatus: "todo",
          taskDueAt: "2026-05-15T09:00:00.000Z",
        }),
      ],
      auditLogs: [],
      now: new Date("2026-05-16T12:00:00.000Z"),
    });

    assert.equal(packets[0]?.stakeholderNotes.openTaskCount, 1);
    assert.equal(packets[0]?.stakeholderNotes.overdueTaskCount, 1);
    assert.equal(packets[0]?.nextAction, "Close remaining stakeholder tasks.");
  });
});

function createProject(input: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch Campaign",
    width: 1200,
    height: 630,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "draft",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T10:00:00.000Z",
    createdAt: "2026-05-16T09:00:00.000Z",
    ...input,
  };
}

function createAudit(
  input: Partial<ProjectAuditSummary> = {},
): ProjectAuditSummary {
  const score = input.overallScore ?? 90;

  return {
    projectId: "project-1",
    projectName: "Launch Campaign",
    updatedAt: "2026-05-16T10:00:00.000Z",
    overallScore: score,
    status: score >= 85 ? "ready" : "review",
    dimensions: [],
    ...input,
  };
}

function createExportJob(
  input: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "job-1",
    projectId: "project-1",
    projectName: "Launch Campaign",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "launch.pdf",
    status: "completed",
    progress: 100,
    artifactName: "launch.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 1200,
    artifactDataUrl: "data:application/pdf;base64,AA==",
    failureMessage: null,
    createdAt: "2026-05-16T10:00:00.000Z",
    updatedAt: "2026-05-16T10:01:00.000Z",
    completedAt: "2026-05-16T10:01:00.000Z",
    ...input,
  };
}

function createComment(
  input: Partial<ProjectHandoffCommentSignal> = {},
): ProjectHandoffCommentSignal {
  return {
    id: "comment-1",
    projectId: "project-1",
    body: "Looks good.",
    authorName: "Reviewer",
    resolved: true,
    taskStatus: "none",
    taskAssigneeName: null,
    taskDueAt: null,
    createdAt: "2026-05-16T10:00:00.000Z",
    updatedAt: "2026-05-16T10:02:00.000Z",
    ...input,
  };
}

function createAuditLog(
  input: Partial<ProjectHandoffAuditLogSignal> = {},
): ProjectHandoffAuditLogSignal {
  return {
    id: "audit-1",
    action: "approval.updated",
    targetType: "project",
    targetId: "project-1",
    summary: "Updated project approval to approved",
    actorEmail: "admin@mail.com",
    metadata: {},
    createdAt: "2026-05-16T10:03:00.000Z",
    ...input,
  };
}

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ExportFormat } from "@/features/editor/export-design";
import type { ProjectSummary, ReviewTaskStatus } from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ReviewTaskSummary } from "@/db/project-comments";
import { createExportCertificationCenter } from "@/features/export-certification/export-certification-workspaces";

describe("export certification workspaces", () => {
  test("builds artifact workspaces with QA matrices, signoff, and certification packets", () => {
    const center = createExportCertificationCenter({
      projects: [
        createProject({
          id: "brochure",
          name: "Investor brochure",
          approvalStatus: "approved",
          updatedAt: "2026-05-18T09:00:00.000Z",
        }),
        createProject({
          id: "campaign-video",
          name: "Campaign launch video",
          approvalStatus: "in-review",
          updatedAt: "2026-05-18T09:30:00.000Z",
        }),
        createProject({
          id: "email-drop",
          name: "Email launch drop",
          approvalStatus: "approved",
          updatedAt: "2026-05-18T09:45:00.000Z",
        }),
        createProject({
          id: "website",
          name: "Website launch page",
          approvalStatus: "approved",
          updatedAt: "2026-05-18T10:00:00.000Z",
        }),
        createProject({
          id: "print-card",
          name: "Print invite card",
          approvalStatus: "approved",
          updatedAt: "2026-05-18T10:10:00.000Z",
        }),
      ],
      projectAudits: [
        createAudit("brochure", "Investor brochure", "ready", 92, {
          accessibility: 96,
          brand: 90,
          print: 86,
        }),
        createAudit("campaign-video", "Campaign launch video", "review", 78, {
          accessibility: 82,
          brand: 78,
        }),
        createAudit("email-drop", "Email launch drop", "ready", 94, {
          email: 96,
          accessibility: 88,
        }),
        createAudit("website", "Website launch page", "ready", 91, {
          website: 94,
          seo: 90,
        }),
        createAudit("print-card", "Print invite card", "fix", 62, {
          print: 58,
          accessibility: 76,
        }),
      ],
      serverExportJobs: [
        createExportJob({
          id: "pdf-export",
          projectId: "brochure",
          projectName: "Investor brochure",
          format: "multipage-pdf",
          status: "completed",
          completedAt: "2026-05-18T10:30:00.000Z",
          artifactDataUrl: "data:application/pdf;base64,abc",
        }),
        createExportJob({
          id: "video-export",
          projectId: "campaign-video",
          projectName: "Campaign launch video",
          format: "mp4",
          status: "completed",
          completedAt: "2026-05-18T10:35:00.000Z",
          artifactDataUrl: "data:video/mp4;base64,abc",
        }),
        createExportJob({
          id: "email-export",
          projectId: "email-drop",
          projectName: "Email launch drop",
          format: "html",
          status: "completed",
          completedAt: "2026-05-18T10:40:00.000Z",
          artifactDataUrl: "data:text/html;base64,abc",
        }),
        createExportJob({
          id: "print-export",
          projectId: "print-card",
          projectName: "Print invite card",
          format: "print-pdf",
          status: "failed",
          completedAt: null,
          failureMessage: "Bleed check failed",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          projectId: "website",
          title: "Website launch page",
          status: "published",
          publishedAt: "2026-05-18T10:45:00.000Z",
        }),
      ],
      reviewTasks: [
        createReviewTask({
          id: "video-task",
          projectId: "campaign-video",
          projectName: "Campaign launch video",
          body: "Legal review still open",
          taskStatus: "in-progress",
          taskDueAt: "2026-05-17T10:00:00.000Z",
        }),
      ],
      projectHandoffPackets: [
        createHandoffPacket({
          projectId: "brochure",
          projectName: "Investor brochure",
          status: "ready",
          packetScore: 94,
        }),
        createHandoffPacket({
          projectId: "email-drop",
          projectName: "Email launch drop",
          status: "ready",
          packetScore: 92,
        }),
        createHandoffPacket({
          projectId: "website",
          projectName: "Website launch page",
          status: "ready",
          packetScore: 90,
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "approval-brochure",
          targetId: "brochure",
          summary: "Approval updated to approved for Investor brochure",
        }),
        createAuditLog({
          id: "approval-email",
          targetId: "email-drop",
          summary: "Approval updated to approved for Email launch drop",
        }),
        createAuditLog({
          id: "approval-website",
          targetId: "website",
          summary: "Approval updated to approved for Website launch page",
        }),
      ],
      now: "2026-05-18T11:00:00.000Z",
    });

    assert.equal(center.workspaces.length, 5);
    assert.equal(center.totals.artifacts, 5);
    assert.equal(center.totals.certificationPackets, 5);
    assert.equal(center.totals.readyWorkspaces, 3);
    assert.equal(center.status, "review");

    const pdf = center.workspaces.find(
      (workspace) => workspace.artifact === "pdf",
    );
    assert.ok(pdf);
    assert.equal(pdf.status, "ready");
    assert.equal(
      pdf.qaMatrix.checks.every((check) => check.status === "ready"),
      true,
    );
    assert.equal(pdf.stakeholderSignoff.status, "ready");
    assert.ok(
      pdf.certificationPacket.downloadJson.includes("Investor brochure"),
    );

    const video = center.workspaces.find(
      (workspace) => workspace.artifact === "video",
    );
    assert.ok(video);
    assert.equal(video.status, "blocked");
    assert.equal(video.stakeholderSignoff.overdueTasks, 1);
    assert.ok(video.nextAction.includes("Legal review still open"));

    const print = center.workspaces.find(
      (workspace) => workspace.artifact === "print",
    );
    assert.ok(print);
    assert.equal(print.status, "blocked");
    assert.ok(
      print.qaMatrix.checks.some((check) => check.id === "export-failures"),
    );

    assert.ok(
      center.nextActions.some((action) =>
        action.includes("Video certification: Campaign launch video"),
      ),
    );
  });

  test("blocks certification when no artifact evidence is available", () => {
    const center = createExportCertificationCenter({
      projects: [],
      projectAudits: [],
      serverExportJobs: [],
      websitePublishes: [],
      reviewTasks: [],
      projectHandoffPackets: [],
      auditLogs: [],
      now: "2026-05-18T11:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.readyWorkspaces, 0);
    assert.equal(center.totals.blockedWorkspaces, 5);
    assert.ok(center.score < 50);
    assert.ok(center.nextActions[0]?.includes("Create a completed PDF export"));
  });
});

function createProject(input: {
  id: string;
  name: string;
  approvalStatus: ProjectSummary["approvalStatus"];
  updatedAt: string;
}): ProjectSummary {
  return {
    id: input.id,
    name: input.name,
    width: 1200,
    height: 800,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: input.approvalStatus,
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: input.updatedAt,
  };
}

function createAudit(
  projectId: string,
  projectName: string,
  status: ProjectAuditSummary["status"],
  overallScore: number,
  dimensions: Partial<
    Record<ProjectAuditSummary["dimensions"][number]["id"], number>
  >,
): ProjectAuditSummary {
  return {
    projectId,
    projectName,
    updatedAt: "2026-05-18T10:20:00.000Z",
    overallScore,
    status,
    dimensions: Object.entries(dimensions).map(([id, score]) => ({
      id: id as ProjectAuditSummary["dimensions"][number]["id"],
      label: id,
      status: score >= 85 ? "ready" : score >= 70 ? "review" : "fix",
      score: score ?? 0,
      detail: `${id} scored ${score}/100.`,
    })),
  };
}

function createExportJob(input: {
  id: string;
  projectId: string;
  projectName: string;
  format: ExportFormat;
  status: ServerExportJobSummary["status"];
  completedAt: string | null;
  artifactDataUrl?: string | null;
  failureMessage?: string | null;
}): ServerExportJobSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    projectName: input.projectName,
    format: input.format,
    formatLabel: input.format,
    fileName: `${input.projectName}.${input.format}`,
    status: input.status,
    progress: input.status === "completed" ? 100 : 0,
    artifactName: `${input.projectName}.${input.format}`,
    artifactMimeType: "application/octet-stream",
    artifactSizeBytes: input.artifactDataUrl ? 1024 : null,
    artifactDataUrl: input.artifactDataUrl ?? null,
    failureMessage: input.failureMessage ?? null,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: input.completedAt ?? "2026-05-18T10:00:00.000Z",
    completedAt: input.completedAt,
  };
}

function createWebsitePublish(input: {
  projectId: string;
  title: string;
  status: WebsitePublishSummary["status"];
  publishedAt: string | null;
}): WebsitePublishSummary {
  return {
    id: `${input.projectId}-publish`,
    projectId: input.projectId,
    projectName: input.title,
    slug: input.projectId,
    title: input.title,
    seoTitle: input.title,
    seoDescription: "Launch page",
    status: input.status,
    publishedAt: input.publishedAt,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: input.publishedAt ?? "2026-05-18T09:00:00.000Z",
    viewCount: 120,
    clickCount: 16,
    lastAnalyticsAt: input.publishedAt,
    customDomains: [],
  };
}

function createReviewTask(input: {
  id: string;
  projectId: string;
  projectName: string;
  body: string;
  taskStatus: ReviewTaskStatus;
  taskDueAt: string | null;
}): ReviewTaskSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    projectName: input.projectName,
    pageId: "page",
    elementId: null,
    authorName: "Reviewer",
    body: input.body,
    resolved: false,
    taskStatus: input.taskStatus,
    taskAssigneeName: "Legal",
    taskDueAt: input.taskDueAt,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:30:00.000Z",
  };
}

function createHandoffPacket(input: {
  projectId: string;
  projectName: string;
  status: ProjectHandoffPacket["status"];
  packetScore: number;
}): ProjectHandoffPacket {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-18T10:20:00.000Z",
    approvalStatus: "approved",
    packetScore: input.packetScore,
    status: input.status,
    nextAction: "Ready for certification.",
    readinessReport: null,
    exportBundle: {
      status: "ready",
      completedCount: 1,
      storedArtifactCount: 1,
      failedCount: 0,
      latestFormatLabel: "PDF",
      latestArtifactName: "artifact",
      latestCompletedAt: "2026-05-18T10:30:00.000Z",
      totalStoredBytes: 1024,
    },
    stakeholderNotes: {
      totalCount: 1,
      unresolvedCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      latestNoteAt: "2026-05-18T10:30:00.000Z",
    },
    approvalHistory: [
      {
        id: `${input.projectId}-approval`,
        summary: "Approved",
        actorEmail: "approver@example.com",
        approvalStatus: "approved",
        createdAt: "2026-05-18T10:25:00.000Z",
      },
    ],
    checklist: [],
  };
}

function createAuditLog(input: {
  id: string;
  targetId: string;
  summary: string;
}): WorkspaceAuditLogSummary {
  return {
    id: input.id,
    action: "approval.updated",
    targetType: "project",
    targetId: input.targetId,
    summary: input.summary,
    actorEmail: "approver@example.com",
    metadata: {},
    createdAt: "2026-05-18T10:25:00.000Z",
  };
}

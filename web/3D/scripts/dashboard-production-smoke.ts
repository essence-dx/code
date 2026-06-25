import { strict as assert } from "node:assert";
import type { ProjectTemplateRecord } from "@/db/schema";
import { createProjectAuditLog } from "@/features/projects/project-audit-log";
import { createProjectComplianceDownload, createProjectComplianceReport } from "@/features/projects/project-compliance-download";
import { getProjectReviewGate } from "@/features/projects/project-review-gates";
import { createProjectDraftFromTemplate } from "@/features/projects/project-template-project";
import { createProjectTemplatePayload } from "@/features/projects/project-templates";
import { resolveShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";
import { getAdminSeedAccount, isAdminSeedAccountReady } from "@/lib/admin-seed";
import { emailPasswordAuthPolicy } from "@/lib/auth-policy";

const seededAdmin = getAdminSeedAccount({
  ADMIN_SEED_EMAIL: "admin@mail.com",
  ADMIN_SEED_NAME: "Essence Admin",
  ADMIN_SEED_PASSWORD: "password",
});

assert.equal(emailPasswordAuthPolicy.requireEmailVerification, true);
assert.equal(emailPasswordAuthPolicy.minPasswordLength, 8);
assert.equal(seededAdmin.email, "admin@mail.com");
assert.equal(isAdminSeedAccountReady(seededAdmin), true);

const now = new Date("2026-05-15T12:30:00.000Z");
const templatePayload = createProjectTemplatePayload({
  name: "Launch source",
  templateId: "product-launch-review",
});
const templateRecord: ProjectTemplateRecord = {
  createdAt: now,
  createdByUserId: "admin-user",
  description: templatePayload.description,
  exportPresetId: templatePayload.template.exportPresetId,
  folderName: templatePayload.template.workspaceDefaults.folderName,
  id: "template-dashboard",
  lastUsedAt: null,
  lastUsedByUserId: null,
  lastUsedProjectId: null,
  name: "Dashboard Launch Template",
  reviewPolicyPresetId: templatePayload.template.reviewPolicyPresetId,
  sceneData: templatePayload.sceneData,
  shareSettings: templatePayload.shareSettings,
  sourceProjectId: null,
  updatedAt: now,
  useCount: 0,
  version: 1,
  versionHistory: [
    {
      action: "created",
      actorUserId: "admin-user",
      at: "2026-05-15T12:30:00.000Z",
      version: 1,
    },
  ],
  workspaceId: "workspace-dashboard",
};

const projectDraft = createProjectDraftFromTemplate(templateRecord, {
  folderId: "folder-launch",
  name: "Dashboard Launch Copy",
  now,
  projectId: "project-dashboard",
  sceneId: "scene-dashboard",
  userId: seededAdmin.email,
});

assert.equal(projectDraft.id, "project-dashboard");
assert.equal(projectDraft.folderId, "folder-launch");
assert.equal(projectDraft.workspaceId, "workspace-dashboard");
assert.equal(projectDraft.name, "Dashboard Launch Copy");
assert.equal(projectDraft.sceneData.id, "scene-dashboard");
assert.equal(projectDraft.sceneData.name, "Dashboard Launch Copy");
assert.ok(projectDraft.sceneData.objects.length > 5);

const blockedPublicGate = getProjectReviewGate(projectDraft.shareSettings, "publicLink");

assert.equal(blockedPublicGate.allowed, false);
assert.equal(blockedPublicGate.status, "requested");
assert.match(blockedPublicGate.message, /requires approval/i);

const approvedShareSettings = {
  ...resolveShareSettings(projectDraft.shareSettings),
  reviewWorkflow: updateProjectReviewWorkflow(resolveShareSettings(projectDraft.shareSettings).reviewWorkflow, "publicLink", "approved", {
    reviewerName: "Essence Admin",
    updatedAt: now.toISOString(),
  }),
};

assert.equal(getProjectReviewGate(approvedShareSettings, "publicLink").allowed, true);

const projectForCompliance = {
  ...projectDraft,
  publishedAt: now,
  shareId: "share-dashboard",
  shareSettings: approvedShareSettings,
};
const auditLog = createProjectAuditLog({
  accessGrants: [],
  comments: [],
  project: projectForCompliance,
  sceneData: projectDraft.sceneData,
  versions: [],
});
const report = createProjectComplianceReport({
  accessGrants: [],
  auditLog,
  generatedAt: "2026-05-15T12:31:00.000Z",
  project: projectForCompliance,
  sceneData: projectDraft.sceneData,
});
const download = createProjectComplianceDownload(projectForCompliance.name, report);
const parsedDownload = JSON.parse(download.body) as typeof report;

assert.equal(report.project.id, "project-dashboard");
assert.equal(report.publishing.published, true);
assert.equal(report.review.approvedCount, 1);
assert.equal(download.fileName, "dashboard-launch-copy-compliance-report.json");
assert.equal(download.contentType, "application/json; charset=utf-8");
assert.match(download.contentDisposition, /attachment/);
assert.equal(parsedDownload.audit.eventCount, report.audit.eventCount);
assert.equal(parsedDownload.project.shareId, "share-dashboard");

console.log("dashboard production smoke passed");

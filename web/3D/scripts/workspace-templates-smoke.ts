import { strict as assert } from "node:assert";
import type { ProjectTemplateRecord } from "@/db/schema";
import { createProjectTemplatePayload } from "@/features/projects/project-templates";
import { toWorkspaceProjectTemplateSummary } from "@/features/projects/project-template-summary";

const payload = createProjectTemplatePayload({
  name: "Custom launch",
  templateId: "product-launch-review",
});
const now = new Date("2026-05-15T12:00:00.000Z");
const record: ProjectTemplateRecord = {
  createdAt: now,
  createdByUserId: "owner-1",
  description: "Reusable launch scene",
  exportPresetId: "full-package",
  folderName: "Launch Templates",
  id: "template-1",
  lastUsedAt: null,
  lastUsedByUserId: null,
  lastUsedProjectId: null,
  name: "Launch Template",
  reviewPolicyPresetId: "public-review",
  sceneData: payload.sceneData,
  shareSettings: payload.shareSettings,
  sourceProjectId: "project-1",
  updatedAt: now,
  useCount: 3,
  version: 2,
  versionHistory: [
    {
      action: "created",
      actorUserId: "owner-1",
      at: "2026-05-15T12:00:00.000Z",
      sourceProjectId: "project-1",
      version: 1,
    },
    {
      action: "updated",
      actorUserId: "owner-1",
      at: "2026-05-15T12:05:00.000Z",
      sourceProjectId: "project-1",
      version: 2,
    },
  ],
  workspaceId: "workspace-1",
};

const summary = toWorkspaceProjectTemplateSummary(record);

assert.equal(summary.id, "template-1");
assert.equal(summary.workspaceId, "workspace-1");
assert.equal(summary.sourceProjectId, "project-1");
assert.equal(summary.exportPresetId, "full-package");
assert.equal(summary.reviewPolicyPresetId, "public-review");
assert.equal(summary.folderName, "Launch Templates");
assert.equal(summary.useCount, 3);
assert.equal(summary.version, 2);
assert.equal(summary.lastUsedAt, null);
assert.equal(summary.versionHistory.length, 2);
assert.ok(summary.objectCount > 5);
assert.equal(summary.createdAt, "2026-05-15T12:00:00.000Z");

console.log("workspace templates smoke passed");

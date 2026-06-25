import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createTemplateInstancePropagationCenter } from "@/features/templates/template-instance-propagation";

describe("template instance propagation", () => {
  test("builds update previews with selective decisions and rollback packets", () => {
    const template = createTemplate({
      id: "template-launch",
      name: "Launch System",
      width: 1080,
      height: 1080,
      updatedAt: "2026-05-18T08:00:00.000Z",
    });
    const acceptedProject = createProject({
      id: "project-social",
      name: "Launch System Social",
      sourceProjectId: template.id,
      width: template.width,
      height: template.height,
      approvalStatus: "approved",
      updatedAt: "2026-05-18T07:00:00.000Z",
    });
    const rejectedProject = createProject({
      id: "project-story",
      name: "Launch System Story",
      sourceProjectId: template.id,
      width: 1080,
      height: 1920,
      approvalStatus: "changes-requested",
      updatedAt: "2026-05-18T07:15:00.000Z",
    });
    const campaign = createCampaign({
      id: "campaign-launch",
      name: "Launch campaign",
      deliverables: [
        createDeliverable({
          id: "deliverable-social",
          projectId: acceptedProject.id,
          projectName: acceptedProject.name,
          projectWidth: acceptedProject.width,
          projectHeight: acceptedProject.height,
          projectSourceProjectId: template.id,
          status: "done",
          approvalStatus: "approved",
        }),
        createDeliverable({
          id: "deliverable-story",
          projectId: rejectedProject.id,
          projectName: rejectedProject.name,
          projectWidth: rejectedProject.width,
          projectHeight: rejectedProject.height,
          projectSourceProjectId: template.id,
          status: "planned",
          approvalStatus: "changes-requested",
        }),
      ],
    });

    const center = createTemplateInstancePropagationCenter({
      templates: [template],
      projects: [acceptedProject, rejectedProject],
      projectVersions: [
        createVersion({
          id: "version-social",
          projectId: acceptedProject.id,
          createdAt: "2026-05-18T07:45:00.000Z",
        }),
      ],
      campaigns: [campaign],
      auditLogs: [
        createAuditLog({
          targetId: template.id,
          summary: "Launch System template approved for propagation.",
          createdAt: "2026-05-18T08:05:00.000Z",
        }),
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.templates, 1);
    assert.equal(center.totals.instances, 2);
    assert.equal(center.totals.acceptableUpdates, 1);
    assert.equal(center.totals.rejectedUpdates, 1);
    assert.equal(center.totals.breakingChanges, 4);
    assert.equal(center.totals.rollbackPackets, 1);

    const group = center.templateGroups[0];
    assert.equal(group?.templateId, template.id);
    assert.equal(group?.campaignCount, 1);
    assert.equal(group?.instanceCount, 2);
    assert.equal(group?.updatePreviews.length, 2);

    const acceptPreview = center.updatePreviews.find(
      (preview) => preview.projectId === acceptedProject.id,
    );
    const rejectPreview = center.updatePreviews.find(
      (preview) => preview.projectId === rejectedProject.id,
    );

    assert.equal(acceptPreview?.decision, "accept");
    assert.equal(acceptPreview?.rollbackPacketId, "rollback-template-launch");
    assert.ok(
      acceptPreview?.changes.some((change) =>
        change.detail.includes("Template updated"),
      ),
    );
    assert.equal(rejectPreview?.decision, "reject");
    assert.ok(
      rejectPreview?.breakingChanges.some(
        (change) => change.kind === "dimension-mismatch",
      ),
    );
    assert.ok(
      rejectPreview?.breakingChanges.some(
        (change) => change.kind === "missing-rollback-snapshot",
      ),
    );
    assert.ok(
      center.rollbackPackets[0]?.dataUrl.startsWith(
        "data:application/json;charset=utf-8",
      ),
    );
    assert.ok(
      center.nextActions.some((action) =>
        action.includes("Launch System Story"),
      ),
    );
  });
});

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch Kit",
    creatorName: "Essence",
    creatorEmail: "admin@mail.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "social",
    marketplaceSeason: "Evergreen",
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-18T08:00:00.000Z",
    marketplaceUseCount: 4,
    marketplaceViewCount: 20,
    createdAt: "2026-05-17T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch Kit design",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T07:00:00.000Z",
    updatedAt: "2026-05-18T07:30:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Propagation restore point",
    thumbnail: null,
    createdAt: "2026-05-18T07:45:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "template.marketplace.updated",
    targetType: "template",
    targetId: "template-1",
    summary: "Template updated.",
    actorEmail: "admin@mail.com",
    metadata: {},
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Launch campaign",
    brief: "Launch campaign creative system.",
    goal: "Ship the launch",
    audience: "Customers",
    status: "active",
    primaryBrandColor: "#2563eb",
    brandLogoName: null,
    brandFontFamily: null,
    launchAt: "2026-05-20T09:00:00.000Z",
    deliverables: [],
    createdAt: "2026-05-18T06:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createDeliverable(
  overrides: Partial<CampaignBoardSummary["deliverables"][number]> = {},
): CampaignBoardSummary["deliverables"][number] {
  return {
    id: "deliverable-1",
    projectId: "project-1",
    projectName: "Launch Kit design",
    projectWidth: 1080,
    projectHeight: 1080,
    projectSourceProjectId: null,
    role: "Social post",
    channel: "social",
    status: "planned",
    approvalStatus: "approved",
    projectThumbnail: null,
    projectVariantProfileId: null,
    projectVariantName: null,
    createdAt: "2026-05-18T06:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

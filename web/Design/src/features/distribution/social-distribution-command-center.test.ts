import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createSocialDistributionCommandCenter } from "@/features/distribution/social-distribution-command-center";

describe("social distribution command center", () => {
  test("creates platform crop previews, approval queues, caption history, and recovery packets", () => {
    const approvedProject = createProject({
      id: "project-instagram",
      name: "Launch square",
      width: 1080,
      height: 1080,
      approvalStatus: "approved",
    });
    const blockedProject = createProject({
      id: "project-tiktok",
      name: "Launch vertical",
      width: 1080,
      height: 1350,
      approvalStatus: "changes-requested",
    });
    const instagramPost = createScheduleItem({
      id: "schedule-instagram",
      projectId: approvedProject.id,
      projectName: approvedProject.name,
      channel: "Instagram",
      caption: "Launch day is here.",
      status: "published",
    });
    const tiktokPost = createScheduleItem({
      id: "schedule-tiktok",
      projectId: blockedProject.id,
      projectName: blockedProject.name,
      channel: "TikTok",
      caption: "",
      status: "planned",
    });

    const center = createSocialDistributionCommandCenter({
      projects: [approvedProject, blockedProject],
      projectVersions: [
        createVersion({
          id: "version-instagram",
          projectId: approvedProject.id,
          name: "Approved square post",
        }),
      ],
      contentScheduleItems: [instagramPost, tiktokPost],
      campaigns: [
        createCampaign({
          deliverables: [
            createDeliverable({
              id: "deliverable-tiktok",
              projectId: blockedProject.id,
              projectName: blockedProject.name,
              projectWidth: blockedProject.width,
              projectHeight: blockedProject.height,
              channel: "TikTok",
              status: "planned",
              approvalStatus: "changes-requested",
            }),
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "caption-log",
          action: "content.scheduled",
          targetType: "content",
          targetId: instagramPost.id,
          summary: "Caption drafted for Instagram.",
          metadata: {
            caption: "Original launch caption.",
          },
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.platforms, 2);
    assert.equal(center.totals.cropPreviews, 2);
    assert.equal(center.totals.approvalQueue, 2);
    assert.equal(center.totals.recoveryPackets, 1);
    assert.ok(center.totals.captionVersions >= 3);

    const instagramPreview = center.platformCropPreviews.find(
      (preview) => preview.projectId === approvedProject.id,
    );
    assert.equal(instagramPreview?.status, "ready");
    assert.equal(instagramPreview?.cropMode, "fit");
    assert.equal(instagramPreview?.safeAreaWarning, null);

    const tiktokPreview = center.platformCropPreviews.find(
      (preview) => preview.projectId === blockedProject.id,
    );
    assert.equal(tiktokPreview?.platformId, "tiktok");
    assert.equal(tiktokPreview?.status, "review");
    assert.match(tiktokPreview?.detail ?? "", /1080 x 1920/);

    const blockedQueueItem = center.approvalQueue.find(
      (item) => item.projectId === blockedProject.id,
    );
    assert.equal(blockedQueueItem?.status, "blocked");
    assert.equal(blockedQueueItem?.captionReady, false);
    assert.equal(blockedQueueItem?.approvalStatus, "changes-requested");

    const captionHistory = center.captionHistories.find(
      (history) => history.scheduleItemId === instagramPost.id,
    );
    assert.ok(
      captionHistory?.versions.some(
        (version) => version.source === "audit-log",
      ),
    );
    assert.ok(
      captionHistory?.versions.some(
        (version) => version.source === "project-version",
      ),
    );

    assert.equal(center.recoveryPackets[0]?.scheduleItemId, tiktokPost.id);
    assert.ok(
      center.recoveryPackets[0]?.dataUrl.startsWith(
        "data:application/json;charset=utf-8",
      ),
    );
    assert.ok(
      center.nextActions.some((action) => action.includes("Launch vertical")),
    );
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
    name: "Social post",
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
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createScheduleItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-1",
    projectName: "Social post",
    title: "Launch post",
    channel: "Instagram",
    caption: "Launch caption",
    status: "planned",
    scheduledAt: "2026-05-18T12:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Social version",
    thumbnail: null,
    createdAt: "2026-05-18T09:30:00.000Z",
    ...overrides,
  };
}

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Launch campaign",
    brief: "Launch the product.",
    goal: "Awareness",
    audience: "Creators",
    status: "active",
    primaryBrandColor: "#2563eb",
    brandLogoName: null,
    brandFontFamily: null,
    launchAt: "2026-05-20T09:00:00.000Z",
    deliverables: [],
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createDeliverable(
  overrides: Partial<CampaignBoardSummary["deliverables"][number]> = {},
): CampaignBoardSummary["deliverables"][number] {
  return {
    id: "deliverable-1",
    projectId: "project-1",
    projectName: "Social post",
    projectThumbnail: null,
    projectWidth: 1080,
    projectHeight: 1080,
    projectSourceProjectId: null,
    projectVariantProfileId: null,
    projectVariantName: null,
    role: "Social post",
    channel: "Instagram",
    status: "planned",
    approvalStatus: "approved",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "content.scheduled",
    targetType: "content",
    targetId: "schedule-1",
    summary: "Content scheduled.",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-18T08:45:00.000Z",
    ...overrides,
  };
}

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { ProjectSummary } from "@/features/editor/types";
import { createPublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";

describe("publishing channel depth", () => {
  test("creates ready rollups across social, website, email, and campaign channels", () => {
    const socialProject = createProject({
      id: "social-project",
      name: "Social launch",
      width: 1080,
      height: 1080,
    });
    const emailProject = createProject({
      id: "email-project",
      name: "Email launch",
      width: 1200,
      height: 1600,
    });
    const center = createPublishingChannelCenter({
      projects: [socialProject, emailProject],
      contentScheduleItems: [
        createScheduleItem({
          id: "social-item",
          projectId: socialProject.id,
          channel: "Instagram",
          caption: "Launch caption",
          status: "published",
        }),
        createScheduleItem({
          id: "email-item",
          projectId: emailProject.id,
          channel: "Email",
          caption: "Email send notes",
        }),
      ],
      campaigns: [
        createCampaign({
          deliverables: [
            createDeliverable({
              id: "social-deliverable",
              projectId: socialProject.id,
              channel: "Social",
              approvalStatus: "approved",
            }),
            createDeliverable({
              id: "email-deliverable",
              projectId: emailProject.id,
              channel: "Email",
              approvalStatus: "approved",
            }),
          ],
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          viewCount: 100,
          clickCount: 12,
          customDomains: [
            {
              id: "domain-1",
              publishId: "publish-1",
              projectId: "website-project",
              domain: "example.com",
              status: "verified",
              verificationName: "_essence.example.com",
              verificationValue: "token",
              verifiedAt: "2026-05-16T00:00:00.000Z",
              platformStatus: "attached",
              platformError: null,
              platformAttachedAt: "2026-05-16T00:00:00.000Z",
              createdAt: "2026-05-16T00:00:00.000Z",
              updatedAt: "2026-05-16T00:00:00.000Z",
            },
          ],
        }),
      ],
      websiteFormSubmissions: [createSubmission()],
    });

    assert.equal(center.status, "ready");
    assert.equal(center.channels.length, 4);
    assert.equal(center.totals.views, 100);
    assert.equal(center.totals.clicks, 12);
    assert.equal(center.totals.submissions, 1);
    assert.equal(center.analyticsWorkspace.goals.length, 4);
    assert.equal(center.analyticsWorkspace.snapshots.length, 3);
    assert.ok(center.analyticsWorkspace.attributionSources.length > 0);
    assert.ok(center.analyticsWorkspace.experiments.length > 0);
    assert.match(
      center.analyticsWorkspace.stakeholderPacket.summary,
      /channels are ready/,
    );
    assert.equal(
      center.channels.find((channel) => channel.id === "campaign")?.status,
      "ready",
    );
  });

  test("surfaces blocked actions when publishing channels have no real queue", () => {
    const center = createPublishingChannelCenter({
      projects: [],
      contentScheduleItems: [],
      campaigns: [],
      websitePublishes: [],
      websiteFormSubmissions: [],
    });

    assert.equal(center.status, "blocked");
    assert.ok(center.nextActions.length > 0);
    assert.equal(
      center.channels.find((channel) => channel.id === "website")?.status,
      "blocked",
    );
  });

  test("creates anomaly notes for stakeholder review packets", () => {
    const center = createPublishingChannelCenter({
      projects: [],
      contentScheduleItems: [
        createScheduleItem({
          id: "cancelled-social",
          channel: "Instagram",
          status: "cancelled",
        }),
      ],
      campaigns: [],
      websitePublishes: [
        createWebsitePublish({
          viewCount: 120,
          clickCount: 8,
        }),
      ],
      websiteFormSubmissions: [],
    });

    assert.ok(
      center.analyticsWorkspace.anomalies.some(
        (anomaly) => anomaly.id === "website-traffic-no-submissions",
      ),
    );
    assert.ok(center.analyticsWorkspace.stakeholderPacket.risks.length > 0);
    assert.ok(center.analyticsWorkspace.stakeholderPacket.nextActions.length > 0);
  });

  test("creates attribution and experiment views for reusable variants", () => {
    const center = createPublishingChannelCenter({
      projects: [
        createProject({
          id: "source-project",
          name: "Source launch",
        }),
        createProject({
          id: "variant-story",
          name: "Launch story",
          sourceProjectId: "source-project",
          variantProfileId: "instagram-story",
          variantName: "Story",
          approvalStatus: "approved",
        }),
        createProject({
          id: "variant-email",
          name: "Launch email",
          sourceProjectId: "source-project",
          variantProfileId: "email",
          variantName: "Email",
          approvalStatus: "in-review",
        }),
      ],
      contentScheduleItems: [],
      campaigns: [],
      websitePublishes: [],
      websiteFormSubmissions: [],
    });

    assert.ok(
      center.analyticsWorkspace.attributionSources.some(
        (source) => source.sourceType === "variant",
      ),
    );
    assert.ok(
      center.analyticsWorkspace.experiments.some(
        (experiment) => experiment.channelId === "variant",
      ),
    );
  });
});

function createScheduleItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-1",
    projectName: "Launch design",
    title: "Launch item",
    channel: "Instagram",
    caption: "",
    status: "planned",
    scheduledAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
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
    goal: "Drive signups",
    audience: "Operators",
    status: "active",
    primaryBrandColor: "#111111",
    brandLogoName: "Logo",
    brandFontFamily: "Inter",
    launchAt: "2026-05-16T00:00:00.000Z",
    deliverables: [createDeliverable()],
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createDeliverable(
  overrides: Partial<CampaignBoardSummary["deliverables"][number]> = {},
): CampaignBoardSummary["deliverables"][number] {
  return {
    id: "deliverable-1",
    projectId: "project-1",
    projectName: "Launch design",
    projectThumbnail: null,
    projectWidth: 1080,
    projectHeight: 1080,
    projectSourceProjectId: null,
    projectVariantProfileId: null,
    projectVariantName: null,
    role: "Hero deliverable",
    channel: "Social",
    status: "planned",
    approvalStatus: "approved",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish-1",
    projectId: "website-project",
    projectName: "Website design",
    slug: "launch",
    title: "Launch site",
    seoTitle: "Launch site",
    seoDescription: "Launch details",
    status: "published",
    publishedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createSubmission(
  overrides: Partial<WebsiteFormSubmissionSummary> = {},
): WebsiteFormSubmissionSummary {
  return {
    id: "submission-1",
    publishId: "publish-1",
    projectId: "website-project",
    websiteTitle: "Launch site",
    sectionId: "contact",
    payload: { email: "reader@example.com" },
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch design",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

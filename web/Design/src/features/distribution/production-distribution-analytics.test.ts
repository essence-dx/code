import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import { createContentDatabaseCenter } from "@/features/content-database/content-database";
import { createProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import { createPublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import type {
  CampaignGeneratedVariant,
  RuleBasedCampaignGenerationCenter,
} from "@/features/campaigns/rule-based-campaign-generation";

describe("production distribution analytics", () => {
  test("connects campaign variants, channel publishes, exports, forms, and content sources into attribution", () => {
    const campaign = createCampaign();
    const projects = [
      createProject({
        id: "project-social",
        name: "Pocket Garden Social Story",
        width: 1080,
        height: 1920,
      }),
      createProject({
        id: "project-website",
        name: "Pocket Garden Website Hero",
        width: 1440,
        height: 1200,
      }),
      createProject({
        id: "project-email",
        name: "Pocket Garden Launch Email",
        width: 1200,
        height: 800,
      }),
    ];
    const contentScheduleItems = [
      createSchedule({
        id: "schedule-social",
        projectId: "project-social",
        projectName: "Pocket Garden Social Story",
        channel: "Instagram",
        status: "published",
      }),
      createSchedule({
        id: "schedule-email",
        projectId: "project-email",
        projectName: "Pocket Garden Launch Email",
        channel: "Email",
        status: "published",
      }),
    ];
    const websitePublishes = [
      createWebsitePublish({
        id: "publish-website",
        projectId: "project-website",
        projectName: "Pocket Garden Website Hero",
        viewCount: 240,
        clickCount: 36,
      }),
    ];
    const websiteFormSubmissions = [
      createSubmission({
        id: "submission-1",
        publishId: "publish-website",
        projectId: "project-website",
      }),
      createSubmission({
        id: "submission-2",
        publishId: "publish-website",
        projectId: "project-website",
      }),
    ];
    const serverExportJobs = [
      createExportJob({
        id: "export-social",
        projectId: "project-social",
        projectName: "Pocket Garden Social Story",
        format: "png",
      }),
      createExportJob({
        id: "export-email",
        projectId: "project-email",
        projectName: "Pocket Garden Launch Email",
        format: "html",
      }),
    ];
    const contentDatabase = createContentDatabaseCenter({
      brandColors: [],
      brandFonts: [],
      brandLogos: [],
      templates: [],
      projects,
      campaigns: [campaign],
      contentScheduleItems,
      websitePublishes,
      generatedAt: "2026-05-18T10:00:00.000Z",
    });
    const campaignGeneration = createCampaignGeneration(campaign.id);
    const publishingChannelCenter = createPublishingChannelCenter({
      projects,
      contentScheduleItems,
      campaigns: [campaign],
      websitePublishes,
      websiteFormSubmissions,
    });

    const center = createProductionDistributionAnalyticsCenter({
      campaigns: [campaign],
      campaignGeneration,
      contentDatabase,
      publishingChannelCenter,
      contentScheduleItems,
      websitePublishes,
      websiteFormSubmissions,
      serverExportJobs,
      generatedAt: "2026-05-18T11:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.ok(center.score >= 80);
    assert.equal(center.totals.campaigns, 1);
    assert.equal(center.totals.variants, 3);
    assert.equal(center.totals.exportArtifacts, 2);
    assert.equal(center.totals.formSubmissions, 2);
    assert.equal(center.totals.contentSources, contentDatabase.totals.records);

    const row = center.campaignAttribution[0];
    assert.equal(row?.campaignId, campaign.id);
    assert.equal(row?.generatedVariants, 3);
    assert.equal(row?.scheduledPublishes, 2);
    assert.equal(row?.websitePublishes, 1);
    assert.equal(row?.emailPublishes, 1);
    assert.equal(row?.socialPublishes, 1);
    assert.equal(row?.exportArtifacts, 2);
    assert.equal(row?.formSubmissions, 2);
    assert.equal(row?.websiteViews, 240);
    assert.equal(row?.conversionRate, 1);

    assert.ok(
      center.funnelStages.some(
        (stage) =>
          stage.id === "audience-response" &&
          stage.current === 2 &&
          stage.status === "ready",
      ),
    );
    assert.ok(
      center.sourceInfluence.some(
        (source) =>
          source.variableKey === "early_bird_price" &&
          source.surfaces.includes("website") &&
          source.surfaces.includes("email"),
      ),
    );
    assert.ok(
      center.channelAttribution.some(
        (channel) => channel.id === "website" && channel.formSubmissions === 2,
      ),
    );
    assert.match(center.attributionPacket.dataUrl, /^data:application\/json/);
  });
});

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-pocket-garden",
    name: "Pocket Garden Launch",
    brief:
      "Launch Pocket Garden with early-bird $29 pricing for social, website, and email.",
    goal: "Drive preorder signups",
    audience: "Urban balcony growers",
    status: "active",
    primaryBrandColor: "#0f172a",
    brandLogoName: "Pocket Garden Mark",
    brandFontFamily: "Inter",
    launchAt: "2026-06-01T12:00:00.000Z",
    deliverables: [
      {
        id: "deliverable-social",
        projectId: "project-social",
        projectName: "Pocket Garden Social Story",
        projectThumbnail: null,
        projectWidth: 1080,
        projectHeight: 1920,
        projectSourceProjectId: null,
        projectVariantProfileId: "instagram-story",
        projectVariantName: "Story",
        role: "Launch story",
        channel: "Instagram",
        status: "done",
        approvalStatus: "approved",
        createdAt: "2026-05-18T09:00:00.000Z",
        updatedAt: "2026-05-18T09:30:00.000Z",
      },
      {
        id: "deliverable-website",
        projectId: "project-website",
        projectName: "Pocket Garden Website Hero",
        projectThumbnail: null,
        projectWidth: 1440,
        projectHeight: 1200,
        projectSourceProjectId: null,
        projectVariantProfileId: null,
        projectVariantName: null,
        role: "Website hero",
        channel: "Website",
        status: "done",
        approvalStatus: "approved",
        createdAt: "2026-05-18T09:00:00.000Z",
        updatedAt: "2026-05-18T09:30:00.000Z",
      },
      {
        id: "deliverable-email",
        projectId: "project-email",
        projectName: "Pocket Garden Launch Email",
        projectThumbnail: null,
        projectWidth: 1200,
        projectHeight: 800,
        projectSourceProjectId: null,
        projectVariantProfileId: null,
        projectVariantName: null,
        role: "Email announcement",
        channel: "Email",
        status: "done",
        approvalStatus: "approved",
        createdAt: "2026-05-18T09:00:00.000Z",
        updatedAt: "2026-05-18T09:30:00.000Z",
      },
    ],
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:30:00.000Z",
    ...overrides,
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Project",
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
    updatedAt: "2026-05-18T08:30:00.000Z",
    ...overrides,
  };
}

function createSchedule(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-social",
    projectName: "Pocket Garden Social Story",
    title: "Pocket Garden launch",
    channel: "Instagram",
    caption: "Early-bird $29 pricing opens Monday for balcony growers.",
    status: "planned",
    scheduledAt: "2026-06-01T12:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:30:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish-1",
    projectId: "project-website",
    projectName: "Pocket Garden Website Hero",
    slug: "pocket-garden",
    title: "Pocket Garden Launch",
    seoTitle: "Pocket Garden preorder",
    seoDescription: "Reserve Pocket Garden with early-bird $29 pricing.",
    status: "published",
    publishedAt: "2026-05-18T09:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    viewCount: 100,
    clickCount: 12,
    lastAnalyticsAt: "2026-05-18T10:00:00.000Z",
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
    projectId: "project-website",
    websiteTitle: "Pocket Garden Launch",
    sectionId: "hero-form",
    payload: { email: "buyer@example.com" },
    createdAt: "2026-05-18T10:10:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-social",
    projectName: "Pocket Garden Social Story",
    format: "png",
    formatLabel: "PNG",
    fileName: "pocket-garden.png",
    status: "completed",
    progress: 100,
    artifactName: "pocket-garden.png",
    artifactMimeType: "image/png",
    artifactSizeBytes: 82_000,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:10:00.000Z",
    completedAt: "2026-05-18T09:10:00.000Z",
    ...overrides,
  };
}

function createCampaignGeneration(
  campaignId: string,
): RuleBasedCampaignGenerationCenter {
  const variantInputs = [
    { surface: "social", format: "instagram-post" },
    { surface: "website", format: "website" },
    { surface: "email", format: "email-template" },
  ] as const;
  const variants: CampaignGeneratedVariant[] = variantInputs.map(({ surface, format }) => ({
    id: `variant-${surface}`,
    campaignId,
    templateId: `template-${surface}`,
    templateName: `Pocket Garden ${surface}`,
    format,
    surface,
    reviewStatus: "ready",
    title: `Pocket Garden ${surface}`,
    copyBlocks: ["Early-bird $29 pricing for balcony growers."],
    variableMap: {
      campaign_name: "Pocket Garden Launch",
      early_bird_price: "$29",
    },
    sourceTrace: [
      {
        id: `trace-${surface}`,
        sourceType: "content-record" as const,
        sourceId: "pricing-early_bird_price",
        label: "Early-bird price",
        field: "value",
        value: "$29",
      },
    ],
    checks: [
      {
        id: "copy",
        label: "Copy",
        status: "ready",
        detail: "Copy is ready.",
      },
    ],
  }));

  return {
    generatedAt: "2026-05-18T10:30:00.000Z",
    status: "ready",
    score: 95,
    engine: {
      mode: "deterministic-rules",
      paidAiDependency: false,
    },
    plans: [
      {
        id: `plan-${campaignId}`,
        campaignId,
        campaignName: "Pocket Garden Launch",
        status: "ready",
        score: 95,
        starterPack: {
          id: "launch-campaign-kit",
          name: "Launch campaign kit",
          templateIds: ["template-social", "template-website", "template-email"],
          formats: ["instagram-post", "website", "email-template"],
        },
        variants,
        sourceTrace: variants.flatMap((variant) => variant.sourceTrace),
      },
    ],
    variants,
    packet: {
      fileName: "campaign-generation.json",
      dataUrl: "data:application/json;charset=utf-8,%7B%7D",
    },
    nextActions: [],
    totals: {
      campaigns: 1,
      variants: variants.length,
      readyVariants: variants.length,
      reviewVariants: 0,
      blockedVariants: 0,
      starterPacks: 1,
      sourceTraces: variants.length,
    },
  } satisfies RuleBasedCampaignGenerationCenter;
}

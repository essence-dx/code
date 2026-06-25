import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import { createContentDatabaseCenter } from "@/features/content-database/content-database";
import { createRuleBasedCampaignGenerationCenter } from "@/features/campaigns/rule-based-campaign-generation";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { getTemplateCollectionResult } from "@/features/templates/template-collections";

describe("rule based campaign generation", () => {
  test("creates reviewable multi-format variants with source traceability and no paid AI dependency", () => {
    const campaign = createCampaign({
      name: "Pocket Garden Subscription Launch",
      brief:
        "Introduce the Pocket Garden subscription with early-bird $29 pricing for urban balcony growers.",
      goal: "Drive 500 preorders",
      audience: "Urban balcony growers",
    });
    const contentDatabase = createContentDatabaseCenter({
      brandColors: [createBrandColor({ color: "#0f172a" })],
      brandFonts: [createBrandFont({ role: "heading", fontFamily: "Inter" })],
      brandLogos: [createBrandLogo({ name: "Pocket Garden Mark" })],
      templates: [
        createTemplate({
          id: "template-launch-pack",
          name: "Pocket Garden Launch Pack",
          creatorName: "Ava Rahman",
          marketplaceStatus: "published",
        }),
      ],
      projects: [
        createProject({
          id: "project-story",
          name: "Pocket Garden Social Story",
          width: 1080,
          height: 1920,
          sourceProjectId: "template-launch-pack",
        }),
      ],
      campaigns: [campaign],
      contentScheduleItems: [
        createSchedule({
          channel: "Instagram",
          title: "Pocket Garden early-bird story",
          caption: "Early-bird $29 pricing opens Monday.",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          title: "Pocket Garden preorder",
          seoDescription:
            "Reserve the Pocket Garden subscription with early-bird $29 pricing.",
        }),
      ],
      generatedAt: "2026-05-18T10:00:00.000Z",
    });
    const starterPack = getTemplateCollectionResult("launch-campaign-kit");

    assert.ok(starterPack);

    const center = createRuleBasedCampaignGenerationCenter({
      campaigns: [campaign],
      contentDatabase,
      starterPacks: [starterPack],
      generatedAt: "2026-05-18T10:05:00.000Z",
    });

    assert.equal(center.engine.mode, "deterministic-rules");
    assert.equal(center.engine.paidAiDependency, false);
    assert.equal(center.status, "ready");
    assert.ok(center.score >= 90);
    assert.equal(center.plans[0]?.starterPack.id, "launch-campaign-kit");
    assert.ok(center.variants.length >= 5);
    assert.deepEqual(
      [...new Set(center.variants.map((variant) => variant.surface))].sort(),
      ["email", "presentation", "social", "video", "website"],
    );
    assert.ok(
      center.variants.every((variant) => variant.reviewStatus === "ready"),
    );
    assert.ok(
      center.variants.every(
        (variant) => !variant.copyBlocks.join(" ").includes("{{"),
      ),
    );
    assert.ok(
      center.variants.some(
        (variant) =>
          variant.surface === "email" &&
          variant.variableMap.early_bird_price === "$29",
      ),
    );
    assert.ok(
      center.variants.every((variant) =>
        variant.sourceTrace.some(
          (trace) => trace.sourceType === "content-record",
        ),
      ),
    );
    assert.ok(
      center.variants.every((variant) =>
        variant.sourceTrace.some(
          (trace) => trace.sourceType === "starter-pack",
        ),
      ),
    );
    assert.ok(
      center.plans[0]?.sourceTrace.some(
        (trace) => trace.sourceType === "campaign",
      ),
    );
    assert.match(center.packet.dataUrl, /^data:application\/json/);
    assert.ok(
      center.nextActions.includes(
        "Generated campaign variants are reviewable and source-traced without paid AI.",
      ),
    );
  });
});

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Pocket Garden Launch",
    brief: "Launch brief",
    goal: "Drive preorders",
    audience: "Balcony growers",
    status: "active",
    primaryBrandColor: "#0f172a",
    brandLogoName: "Pocket Garden Mark",
    brandFontFamily: "Inter",
    launchAt: "2026-06-01T12:00:00.000Z",
    deliverables: [
      {
        id: "deliverable-story",
        projectId: "project-story",
        projectName: "Pocket Garden Social Story",
        projectThumbnail: null,
        projectWidth: 1080,
        projectHeight: 1920,
        projectSourceProjectId: "template-launch-pack",
        projectVariantProfileId: null,
        projectVariantName: null,
        role: "Launch story",
        channel: "Instagram",
        status: "planned",
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
        status: "planned",
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
        status: "planned",
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

function createSchedule(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule-1",
    projectId: "project-story",
    projectName: "Pocket Garden Social Story",
    title: "Scheduled design",
    channel: "Instagram",
    caption: "Caption",
    status: "planned",
    scheduledAt: "2026-06-01T13:00:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:30:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "website-1",
    projectId: "project-website",
    projectName: "Pocket Garden Website Hero",
    slug: "pocket-garden",
    title: "Pocket Garden preorder",
    seoTitle: "Pocket Garden Subscription",
    seoDescription: "Reserve the Pocket Garden subscription.",
    status: "published",
    publishedAt: "2026-05-18T09:40:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:40:00.000Z",
    viewCount: 24,
    clickCount: 3,
    lastAnalyticsAt: "2026-05-18T09:50:00.000Z",
    customDomains: [],
    ...overrides,
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
    name: "Pocket Garden Social Story",
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
    updatedAt: "2026-05-18T09:45:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Pocket Garden Launch Pack",
    creatorName: "Ava Rahman",
    creatorEmail: "ava@example.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: false,
    isTeamTemplate: false,
    approvalStatus: "approved",
    marketplaceStatus: "draft",
    marketplaceCollection: null,
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: null,
    marketplaceUseCount: 0,
    marketplaceViewCount: 0,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:30:00.000Z",
    ...overrides,
  };
}

function createBrandColor(
  overrides: Partial<BrandColorSummary> = {},
): BrandColorSummary {
  return {
    id: "color-1",
    color: "#0f172a",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createBrandFont(
  overrides: Partial<BrandFontSummary> = {},
): BrandFontSummary {
  return {
    id: "font-heading",
    role: "heading",
    fontFamily: "Inter",
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: 0,
    lineHeight: 1.1,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createBrandLogo(
  overrides: Partial<BrandLogoSummary> = {},
): BrandLogoSummary {
  return {
    id: "logo-1",
    name: "Pocket Garden Mark",
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,AAAA",
    sizeBytes: 1200,
    width: 400,
    height: 120,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

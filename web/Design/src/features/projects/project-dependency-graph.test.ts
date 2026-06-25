import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { createProjectDependencyGraph } from "@/features/projects/project-dependency-graph";

describe("project dependency graph", () => {
  test("links projects to variants, packages, exports, websites, campaigns, and public links", () => {
    const graph = createProjectDependencyGraph({
      projects: [
        createProject({
          id: "source",
          name: "Launch Master",
          publicShareId: "public-launch",
        }),
        createProject({
          id: "story",
          name: "Launch Master Story",
          sourceProjectId: "source",
          variantName: "Story",
          variantProfileId: "story-reel",
        }),
      ],
      templates: [
        createTemplate({
          id: "launch-package",
          name: "Launch Master Package",
          width: 1080,
          height: 1080,
          marketplaceStatus: "published",
        }),
      ],
      exportJobs: [
        createExportJob({
          id: "export-1",
          projectId: "source",
          status: "completed",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "site-1",
          projectId: "source",
          slug: "launch",
        }),
      ],
      campaigns: [
        createCampaign({
          id: "campaign-1",
          name: "Launch Campaign",
          deliverables: [
            {
              id: "deliverable-1",
              projectId: "story",
              projectName: "Launch Master Story",
              projectThumbnail: null,
              projectWidth: 1080,
              projectHeight: 1920,
              projectSourceProjectId: "source",
              projectVariantProfileId: "story-reel",
              projectVariantName: "Story",
              role: "Social story",
              channel: "social",
              status: "planned",
              approvalStatus: "approved",
              createdAt: "2026-05-18T08:00:00.000Z",
              updatedAt: "2026-05-18T08:00:00.000Z",
            },
          ],
        }),
      ],
    });

    assert.equal(graph.totals.projects, 2);
    assert.equal(graph.totals.variants, 1);
    assert.equal(graph.totals.publicLinks, 1);
    assert.equal(
      graph.nodes.some((node) => node.id === "package-launch-package"),
      true,
    );
    assert.equal(
      graph.edges.some(
        (edge) =>
          edge.sourceNodeId === "project-source" &&
          edge.targetNodeId === "project-story" &&
          edge.type === "variant",
      ),
      true,
    );
    assert.equal(
      graph.edges.some(
        (edge) =>
          edge.sourceNodeId === "project-source" &&
          edge.targetNodeId === "export-export-1" &&
          edge.type === "export",
      ),
      true,
    );
    assert.equal(
      graph.edges.some(
        (edge) =>
          edge.sourceNodeId === "campaign-campaign-1" &&
          edge.targetNodeId === "project-story" &&
          edge.type === "campaign",
      ),
      true,
    );
  });

  test("surfaces graph risks and prioritized next actions", () => {
    const graph = createProjectDependencyGraph({
      projects: [
        createProject({
          id: "orphan",
          name: "Orphan Variant",
          sourceProjectId: "missing-source",
          variantName: "Website hero",
          editShareId: "edit-share",
          editSharePermission: "edit",
        }),
      ],
      templates: [],
      exportJobs: [
        createExportJob({
          id: "failed-export",
          projectId: "orphan",
          status: "failed",
          failureMessage: "Renderer timed out",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "paused-site",
          projectId: "orphan",
          status: "unpublished",
        }),
      ],
      campaigns: [],
    });

    assert.equal(graph.status, "blocked");
    assert.equal(
      graph.risks.some((risk) => risk.kind === "missing-source"),
      true,
    );
    assert.equal(
      graph.risks.some((risk) => risk.kind === "failed-export"),
      true,
    );
    assert.equal(
      graph.risks.some((risk) => risk.kind === "editable-public-surface"),
      true,
    );
    assert.equal(
      graph.nextActions.some((action) =>
        action.includes("Reconnect missing source designs"),
      ),
      true,
    );
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project",
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
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Template",
    creatorName: "Studio",
    creatorEmail: "studio@example.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: false,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "draft",
    marketplaceCollection: "business",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: null,
    marketplaceUseCount: 0,
    marketplaceViewCount: 0,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export",
    projectId: "project",
    projectName: "Project",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "project.pdf",
    status: "completed",
    progress: 100,
    artifactName: "project.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 42_000,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    completedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "site",
    projectId: "project",
    projectName: "Project",
    slug: "project",
    title: "Project",
    seoTitle: "Project",
    seoDescription: "Project website",
    status: "published",
    publishedAt: "2026-05-18T08:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createCampaign(
  overrides: Partial<CampaignBoardSummary> = {},
): CampaignBoardSummary {
  return {
    id: "campaign",
    name: "Campaign",
    brief: "Launch",
    goal: "Awareness",
    audience: "Customers",
    status: "active",
    primaryBrandColor: null,
    brandLogoName: null,
    brandFontFamily: null,
    launchAt: null,
    deliverables: [],
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

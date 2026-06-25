import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { createMultiBrandWorkspaceControlCenter } from "@/features/governance/multi-brand-workspace";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";

describe("multi-brand workspace", () => {
  test("creates ready brand kits with approved visible templates", () => {
    const project = createProject({ publicShareId: "share-1" });
    const center = createMultiBrandWorkspaceControlCenter({
      brandColors: [
        createBrandColor("#111111"),
        createBrandColor("#ffffff"),
        createBrandColor("#2563eb"),
      ],
      brandFonts: [
        createBrandFont("heading", "Inter"),
        createBrandFont("body", "Inter"),
      ],
      brandLogos: [createBrandLogo()],
      templates: [
        createTemplate({
          id: "brand-template",
          name: "Brand launch kit",
          isBrandTemplate: true,
          isTeamTemplate: true,
          approvalStatus: "approved",
          marketplaceStatus: "published",
        }),
      ],
      projects: [project],
      projectAudits: [createProjectAudit(project, 95)],
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.kits, 3);
    assert.equal(center.totals.hiddenTemplates, 0);
    assert.ok(center.totals.visibleTemplates >= 3);
    assert.equal(
      center.kits.find((kit) => kit.id === "published")?.status,
      "ready",
    );
  });

  test("hides draft and changes-requested templates behind approval gates", () => {
    const center = createMultiBrandWorkspaceControlCenter({
      brandColors: [createBrandColor("#111111")],
      brandFonts: [],
      brandLogos: [],
      templates: [
        createTemplate({
          id: "draft",
          name: "Draft brand kit",
          isBrandTemplate: true,
          approvalStatus: "draft",
          marketplaceStatus: "draft",
        }),
        createTemplate({
          id: "changes",
          name: "Needs updates",
          isBrandTemplate: true,
          approvalStatus: "changes-requested",
          marketplaceStatus: "review",
        }),
      ],
      projects: [createProject()],
      projectAudits: [],
    });

    assert.equal(center.status, "blocked");
    assert.ok(center.nextActions.length > 0);
    assert.equal(center.totals.hiddenTemplates, 5);
    assert.equal(
      center.kits
        .flatMap((kit) => kit.templateRules)
        .some(
          (rule) =>
            rule.templateId === "changes" && rule.visibility === "hidden",
        ),
      true,
    );
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch campaign",
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

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch template",
    creatorName: "Studio",
    creatorEmail: null,
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: false,
    isTeamTemplate: false,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "brand",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-16T00:00:00.000Z",
    marketplaceUseCount: 1,
    marketplaceViewCount: 1,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createBrandColor(color: string): BrandColorSummary {
  return {
    id: color,
    color,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  };
}

function createBrandFont(
  role: BrandFontSummary["role"],
  fontFamily: string,
): BrandFontSummary {
  return {
    id: role,
    role,
    fontFamily,
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.4,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  };
}

function createBrandLogo(): BrandLogoSummary {
  return {
    id: "logo",
    name: "Primary logo",
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,AAAA",
    sizeBytes: 100,
    width: 120,
    height: 40,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
  };
}

function createProjectAudit(
  project: ProjectSummary,
  brandScore: number,
): ProjectAuditSummary {
  return {
    projectId: project.id,
    projectName: project.name,
    updatedAt: project.updatedAt,
    overallScore: brandScore,
    status: brandScore >= 85 ? "ready" : brandScore >= 60 ? "review" : "fix",
    dimensions: [
      {
        id: "brand",
        label: "Brand",
        status: brandScore >= 85 ? "ready" : brandScore >= 60 ? "review" : "fix",
        score: brandScore,
        detail: "Brand audit score",
      },
    ],
  };
}

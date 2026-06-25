import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { createDesignGovernanceReport } from "@/features/governance/design-governance";

describe("design governance", () => {
  test("scores strong governance when brand, approval, lock, and audit inputs exist", () => {
    const report = createDesignGovernanceReport({
      projects: [
        createProject({ id: "project-1", approvalStatus: "approved" }),
        createProject({ id: "project-2", approvalStatus: "in-review" }),
      ],
      templates: [
        createTemplate({
          id: "template-1",
          isBrandTemplate: true,
          approvalStatus: "approved",
        }),
        createTemplate({
          id: "template-2",
          isTeamTemplate: true,
          approvalStatus: "approved",
        }),
      ],
      brandColors: [
        createBrandColor("#111111"),
        createBrandColor("#f5f5f5"),
        createBrandColor("#22c55e"),
      ],
      brandFonts: [
        createBrandFont("heading", "Inter"),
        createBrandFont("body", "Inter"),
      ],
      brandLogos: [createBrandLogo()],
      auditLogs: [
        createAuditLog({ action: "approval.updated" }),
        createAuditLog({ action: "template.marketplace.updated" }),
        createAuditLog({ action: "team.member.role.updated" }),
        createAuditLog({ action: "team.invite.created" }),
        createAuditLog({ action: "asset.duplicates_deleted" }),
      ],
    });

    assert.equal(report.status, "strong");
    assert.equal(report.totals.governedTemplates, 2);
    assert.equal(report.templateLockRules.length > 0, true);
    assert.equal(report.auditTrail.length, 5);
  });

  test("surfaces weak governance when reusable brand rules are absent", () => {
    const report = createDesignGovernanceReport({
      projects: [createProject({ approvalStatus: "draft" })],
      templates: [createTemplate({ approvalStatus: "draft" })],
      brandColors: [],
      brandFonts: [],
      brandLogos: [],
      auditLogs: [],
    });

    assert.equal(report.status, "needs-work");
    assert.equal(
      report.rules.some(
        (rule) => rule.id === "brand-colors" && rule.status === "needs-work",
      ),
      true,
    );
    assert.equal(report.approvalPolicies[0]?.draft, 1);
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
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
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Template",
    creatorName: null,
    creatorEmail: null,
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: false,
    isTeamTemplate: false,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "business",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: new Date().toISOString(),
    marketplaceUseCount: 0,
    marketplaceViewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createBrandColor(color: string): BrandColorSummary {
  return {
    id: color,
    color,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "approval.updated",
    targetType: "project",
    targetId: "project",
    summary: "Updated project approval",
    actorEmail: "admin@mail.com",
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

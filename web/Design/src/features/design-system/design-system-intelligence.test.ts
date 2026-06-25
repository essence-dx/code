import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createDesignSystemIntelligenceCenter } from "@/features/design-system/design-system-intelligence";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

describe("design system intelligence", () => {
  test("detects token drift and produces refactor packets from real workspace evidence", () => {
    const center = createDesignSystemIntelligenceCenter({
      brandColors: [createBrandColor({ color: "#0f172a" })],
      brandFonts: [createBrandFont({ role: "heading" })],
      brandLogos: [],
      templates: [
        createTemplate({
          id: "template-brand",
          name: "Launch Card",
          isBrandTemplate: true,
          approvalStatus: "changes-requested",
        }),
        createTemplate({
          id: "template-market",
          name: "Launch Story",
          marketplaceStatus: "published",
          marketplaceUseCount: 12,
          marketplaceViewCount: 90,
        }),
      ],
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch Card Q2",
          width: 1080,
          height: 1080,
          approvalStatus: "changes-requested",
          sourceProjectId: "template-brand",
        }),
      ],
      projectAudits: [
        createProjectAudit({
          projectId: "project-launch",
          projectName: "Launch Card Q2",
          brandScore: 42,
          brandStatus: "fix",
        }),
      ],
      projectVersions: [],
      auditLogs: [createAuditLog({ action: "template.marketplace.updated" })],
      generatedAt: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.ok(center.score < 80);
    assert.ok(center.componentDefinitions.length >= 2);
    assert.equal(center.componentDefinitions[0]?.status, "blocked");
    assert.ok(center.tokenDriftReports.some((item) => item.kind === "logo"));
    assert.ok(
      center.tokenDriftReports.some((item) => item.kind === "project-brand"),
    );
    assert.ok(
      center.usageMaps.some((map) => map.projectIds.includes("project-launch")),
    );
    assert.ok(center.refactorPackets.length >= 2);
    assert.match(
      center.refactorPackets[0]?.dataUrl ?? "",
      /^data:application\/json/,
    );
    assert.equal(center.totals.auditEvents, 1);
  });

  test("reports ready when tokens, approved components, usage, and snapshots align", () => {
    const projects = [
      createProject({
        id: "project-ready",
        name: "Launch Story Campaign",
        sourceProjectId: "template-ready",
        approvalStatus: "approved",
      }),
    ];
    const center = createDesignSystemIntelligenceCenter({
      brandColors: [
        createBrandColor({ color: "#0f172a" }),
        createBrandColor({ id: "color-2", color: "#22c55e" }),
        createBrandColor({ id: "color-3", color: "#f8fafc" }),
      ],
      brandFonts: [
        createBrandFont({ role: "heading" }),
        createBrandFont({ id: "font-body", role: "body", fontFamily: "Inter" }),
      ],
      brandLogos: [createBrandLogo()],
      templates: [
        createTemplate({
          id: "template-ready",
          name: "Launch Story",
          isBrandTemplate: true,
          approvalStatus: "approved",
          marketplaceStatus: "published",
          marketplaceUseCount: 8,
          marketplaceViewCount: 80,
        }),
      ],
      projects,
      projectAudits: [
        createProjectAudit({
          projectId: "project-ready",
          projectName: "Launch Story Campaign",
          brandScore: 95,
          brandStatus: "ready",
        }),
      ],
      projectVersions: [
        createVersion({
          projectId: "project-ready",
          createdAt: "2026-05-18T09:50:00.000Z",
        }),
      ],
      auditLogs: [createAuditLog({ targetId: "template-ready" })],
      generatedAt: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.tokenDriftReports.length, 0);
    assert.equal(center.componentDefinitions[0]?.status, "ready");
    assert.equal(center.refactorPackets.length, 0);
    assert.equal(
      center.nextActions[0],
      "Design system components and tokens are aligned.",
    );
  });
});

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch Card",
    creatorName: "Studio",
    creatorEmail: "studio@example.com",
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

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch Card Q2",
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

function createProjectAudit(input: {
  projectId: string;
  projectName: string;
  brandScore: number;
  brandStatus: ProjectAuditSummary["status"];
}): ProjectAuditSummary {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-18T09:45:00.000Z",
    overallScore: input.brandScore,
    status: input.brandStatus,
    dimensions: [
      {
        id: "brand",
        label: "Brand",
        status: input.brandStatus,
        score: input.brandScore,
        detail: `${input.projectName} brand audit.`,
      },
    ],
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
    fontFamily: "Geist",
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
    name: "Logo",
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

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Snapshot",
    thumbnail: null,
    createdAt: "2026-05-18T09:50:00.000Z",
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
    summary: "Updated template package.",
    actorEmail: "studio@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:55:00.000Z",
    ...overrides,
  };
}

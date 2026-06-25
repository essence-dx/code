import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { createDesignSystemIntelligenceCenter } from "@/features/design-system/design-system-intelligence";
import { createDesignSystemReleaseGovernanceCenter } from "@/features/design-system/design-system-release-governance";
import type {
  BrandColorSummary,
  BrandFontSummary,
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";

describe("design system release governance", () => {
  test("creates token migration plans, component adoption gates, breaking-change previews, and downstream impact packets", () => {
    const template = createTemplate({
      id: "template-launch",
      name: "Launch Design System",
      approvalStatus: "changes-requested",
      isBrandTemplate: true,
      marketplaceStatus: "review",
      updatedAt: "2026-05-19T09:30:00.000Z",
    });
    const publicProject = createProject({
      id: "project-public",
      name: "Launch Design System Public",
      sourceProjectId: template.id,
      publicShareId: "public-launch",
      approvalStatus: "changes-requested",
      updatedAt: "2026-05-19T09:45:00.000Z",
    });
    const privateProject = createProject({
      id: "project-private",
      name: "Launch Design System Internal",
      sourceProjectId: template.id,
      approvalStatus: "approved",
      updatedAt: "2026-05-19T09:40:00.000Z",
    });
    const auditLogs = [
      createAuditLog({
        id: "audit-template",
        targetId: template.id,
        summary: "Template moved into release review.",
        createdAt: "2026-05-19T09:50:00.000Z",
      }),
    ];
    const designSystem = createDesignSystemIntelligenceCenter({
      brandColors: [createBrandColor()],
      brandFonts: [createBrandFont({ role: "heading" })],
      brandLogos: [],
      templates: [template],
      projects: [publicProject, privateProject],
      projectAudits: [
        createProjectAudit({
          projectId: publicProject.id,
          projectName: publicProject.name,
          brandScore: 40,
          brandStatus: "fix",
        }),
      ],
      projectVersions: [
        createVersion({
          projectId: publicProject.id,
          createdAt: "2026-05-19T09:42:00.000Z",
        }),
      ],
      auditLogs,
      generatedAt: "2026-05-19T10:00:00.000Z",
    });

    const center = createDesignSystemReleaseGovernanceCenter({
      designSystem,
      templates: [template],
      projects: [publicProject, privateProject],
      projectVersions: [
        createVersion({
          projectId: publicProject.id,
          createdAt: "2026-05-19T09:42:00.000Z",
        }),
      ],
      auditLogs,
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.tokenMigrationPlans, 4);
    assert.equal(center.totals.componentAdoptionGates, 1);
    assert.equal(center.totals.breakingChangePreviews, 1);
    assert.equal(center.totals.downstreamImpactPackets, 1);
    assert.equal(center.totals.affectedProjects, 2);
    assert.equal(center.totals.publicSurfaces, 1);

    const logoPlan = center.tokenMigrationPlans.find(
      (plan) => plan.tokenKind === "logo",
    );
    assert.equal(logoPlan?.status, "blocked");
    assert.ok(
      logoPlan?.steps.some((step) => step.includes("Add at least one")),
    );

    const gate = center.componentAdoptionGates[0];
    assert.equal(gate?.componentName, "Launch Design System");
    assert.equal(gate?.status, "blocked");
    assert.ok(
      gate?.gateResults.some(
        (result) =>
          result.kind === "rollback" &&
          result.status === "review" &&
          result.detail.includes("1 of 2"),
      ),
    );
    assert.ok(
      gate?.gateResults.some(
        (result) => result.kind === "approval" && result.status === "blocked",
      ),
    );

    const preview = center.breakingChangePreviews[0];
    assert.equal(preview?.status, "blocked");
    assert.ok(
      preview?.changes.some((change) => change.kind === "token-migration"),
    );
    assert.ok(preview?.changes.some((change) => change.kind === "approval"));
    assert.equal(preview?.affectedProjectIds.length, 2);

    const packet = decodePacket(
      center.downstreamImpactPackets[0]?.dataUrl ?? "",
    );
    assert.equal(
      packet.kind,
      "essence-studio.design-system-release-governance",
    );
    assert.equal(packet.component.templateId, template.id);
    assert.equal(packet.downstreamImpact.publicSurfaces, 1);
    assert.equal(packet.tokenMigrationPlans.length, 4);
    assert.ok(
      center.nextActions.some((action) =>
        action.includes("Launch Design System"),
      ),
    );
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    component: { templateId: string };
    downstreamImpact: { publicSurfaces: number };
    tokenMigrationPlans: unknown[];
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch System",
    creatorName: "Studio",
    creatorEmail: "studio@example.com",
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
    marketplacePublishedAt: "2026-05-18T09:00:00.000Z",
    marketplaceUseCount: 12,
    marketplaceViewCount: 80,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-19T09:30:00.000Z",
    ...overrides,
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch System Social",
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
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T09:45:00.000Z",
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
    updatedAt: "2026-05-19T09:45:00.000Z",
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

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Design system release restore point",
    thumbnail: null,
    createdAt: "2026-05-19T09:42:00.000Z",
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
    actorEmail: "studio@example.com",
    metadata: {},
    createdAt: "2026-05-19T09:50:00.000Z",
    ...overrides,
  };
}

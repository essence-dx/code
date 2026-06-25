import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { DesignSystemIntelligenceCenter } from "@/features/design-system/design-system-intelligence";
import type { DesignSystemReleaseGovernanceCenter } from "@/features/design-system/design-system-release-governance";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createReusableComponentSectionLibraryCenter } from "@/features/libraries/reusable-component-section-library";
import type { TemplateInstancePropagationCenter } from "@/features/templates/template-instance-propagation";

describe("reusable component and section library center", () => {
  test("creates versioned component libraries, dependency-aware updates, safe insert plans, and packets", () => {
    const center = createReusableComponentSectionLibraryCenter({
      templates: [
        createTemplate({
          id: "template-hero",
          name: "Launch Hero Section",
          approvalStatus: "approved",
          marketplaceStatus: "published",
          marketplaceUseCount: 14,
          marketplaceViewCount: 220,
        }),
        createTemplate({
          id: "template-pricing",
          name: "Pricing Card Stack",
          approvalStatus: "changes-requested",
          marketplaceStatus: "review",
          marketplaceUseCount: 2,
          marketplaceViewCount: 40,
        }),
      ],
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch Hero Campaign",
          sourceProjectId: "template-hero",
          publicShareId: "public-launch",
          approvalStatus: "approved",
        }),
        createProject({
          id: "project-pricing",
          name: "Pricing Card Site",
          sourceProjectId: "template-pricing",
          publicShareId: "public-pricing",
          approvalStatus: "changes-requested",
        }),
      ],
      projectVersions: [
        createVersion({ id: "version-launch", projectId: "project-launch" }),
      ],
      designSystem: createDesignSystem(),
      releaseGovernance: createReleaseGovernance(),
      templateInstancePropagation: createTemplatePropagation(),
      now: "2026-05-19T16:00:00.000Z",
    });

    assert.equal(center.generatedAt, "2026-05-19T16:00:00.000Z");
    assert.equal(center.status, "blocked");
    assert.equal(center.totals.componentLibraries, 2);
    assert.equal(center.totals.sectionLibraries, 2);
    assert.equal(center.totals.versionedVariants, 4);
    assert.equal(center.totals.safeInsertPlans, 2);
    assert.equal(center.totals.dependencyUpdatePlans, 2);

    const heroLibrary = center.componentLibraries.find(
      (library) => library.templateId === "template-hero",
    );
    assert.equal(heroLibrary?.status, "ready");
    assert.equal(heroLibrary?.versionedVariants[0]?.label, "Published");
    assert.ok(
      heroLibrary?.safeInsertPlan.requiredGates.some(
        (gate) => gate.kind === "rollback" && gate.status === "ready",
      ),
    );

    const pricingLibrary = center.componentLibraries.find(
      (library) => library.templateId === "template-pricing",
    );
    assert.equal(pricingLibrary?.status, "blocked");
    assert.ok(
      pricingLibrary?.dependencyUpdatePlan.blockers.some((blocker) =>
        blocker.includes("Typography migration"),
      ),
    );
    assert.ok(
      pricingLibrary?.safeInsertPlan.requiredGates.some(
        (gate) => gate.kind === "approval" && gate.status === "blocked",
      ),
    );

    const heroSection = center.sectionLibraries.find(
      (section) => section.kind === "hero",
    );
    assert.equal(heroSection?.status, "ready");
    assert.ok(heroSection?.insertPacket.downloadJson.startsWith("data:"));

    const packet = decodePacket(heroSection?.insertPacket.downloadJson ?? "");
    assert.equal(packet.kind, "essence-studio.reusable-section-library");
    assert.equal(packet.sectionKind, "hero");
    assert.equal(packet.componentIds.length, 1);
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    sectionKind: string;
    componentIds: string[];
  };
}

function createDesignSystem(): DesignSystemIntelligenceCenter {
  return {
    generatedAt: "2026-05-19T15:00:00.000Z",
    status: "blocked",
    score: 72,
    componentDefinitions: [
      {
        id: "component-hero",
        templateId: "template-hero",
        name: "Launch Hero Section",
        kind: "marketplace-template",
        status: "ready",
        score: 94,
        href: "/templates/template-hero",
        tokenCoverage: {
          colors: 4,
          fonts: 2,
          logos: 1,
          complete: true,
        },
        usage: {
          projectIds: ["project-launch"],
          projectNames: ["Launch Hero Campaign"],
          relationKinds: ["source", "dimensions"],
        },
        recommendation: "Component is ready for reusable rollout.",
      },
      {
        id: "component-pricing",
        templateId: "template-pricing",
        name: "Pricing Card Stack",
        kind: "team-template",
        status: "blocked",
        score: 42,
        href: "/templates/template-pricing",
        tokenCoverage: {
          colors: 1,
          fonts: 1,
          logos: 0,
          complete: false,
        },
        usage: {
          projectIds: ["project-pricing"],
          projectNames: ["Pricing Card Site"],
          relationKinds: ["source"],
        },
        recommendation:
          "Resolve requested changes before promoting this template.",
      },
    ],
    tokenDriftReports: [],
    usageMaps: [],
    refactorPackets: [],
    nextActions: [],
    totals: {
      components: 2,
      readyComponents: 1,
      tokenDrift: 1,
      usageMaps: 0,
      refactorPackets: 0,
      auditEvents: 0,
    },
  };
}

function createReleaseGovernance(): DesignSystemReleaseGovernanceCenter {
  return {
    generatedAt: "2026-05-19T15:00:00.000Z",
    status: "blocked",
    score: 70,
    tokenMigrationPlans: [
      {
        id: "token-migration-font",
        tokenKind: "font",
        label: "Typography migration",
        status: "blocked",
        affectedProjectIds: ["project-pricing"],
        readinessScore: 35,
        blockerCount: 1,
        steps: ["Complete heading and body font tokens."],
      },
    ],
    componentAdoptionGates: [
      {
        id: "gate-hero",
        componentId: "component-hero",
        templateId: "template-hero",
        componentName: "Launch Hero Section",
        status: "ready",
        score: 96,
        affectedProjectIds: ["project-launch"],
        publicSurfaces: 1,
        gateResults: [
          {
            id: "gate-hero-approval",
            kind: "approval",
            status: "ready",
            label: "Approval",
            detail: "Template is approved.",
          },
          {
            id: "gate-hero-rollback",
            kind: "rollback",
            status: "ready",
            label: "Rollback",
            detail: "Project has a restore point.",
          },
        ],
        nextAction: "Ready to insert.",
      },
      {
        id: "gate-pricing",
        componentId: "component-pricing",
        templateId: "template-pricing",
        componentName: "Pricing Card Stack",
        status: "blocked",
        score: 35,
        affectedProjectIds: ["project-pricing"],
        publicSurfaces: 1,
        gateResults: [
          {
            id: "gate-pricing-approval",
            kind: "approval",
            status: "blocked",
            label: "Approval",
            detail: "Template has requested changes.",
          },
          {
            id: "gate-pricing-token",
            kind: "token",
            status: "blocked",
            label: "Token",
            detail: "Typography tokens are missing.",
          },
        ],
        nextAction: "Resolve approval and token blockers.",
      },
    ],
    breakingChangePreviews: [],
    downstreamImpactPackets: [],
    nextActions: [],
    totals: {
      tokenMigrationPlans: 1,
      componentAdoptionGates: 2,
      breakingChangePreviews: 0,
      downstreamImpactPackets: 0,
      affectedProjects: 2,
      publicSurfaces: 2,
      blockedGates: 1,
      reviewGates: 0,
      readyGates: 1,
    },
  };
}

function createTemplatePropagation(): TemplateInstancePropagationCenter {
  return {
    generatedAt: "2026-05-19T15:00:00.000Z",
    status: "blocked",
    score: 70,
    templateGroups: [],
    updatePreviews: [
      {
        id: "update-hero",
        templateId: "template-hero",
        templateName: "Launch Hero Section",
        projectId: "project-launch",
        projectName: "Launch Hero Campaign",
        projectHref: "/editor/project-launch",
        status: "ready",
        score: 96,
        decision: "accept",
        decisionLabel: "Accept",
        changes: [],
        breakingChanges: [],
        rollbackPacketId: "rollback-hero",
        latestVersionId: "version-launch",
        latestVersionAt: "2026-05-19T10:00:00.000Z",
        campaignIds: [],
        campaignNames: [],
        nextAction: "Accept update.",
      },
      {
        id: "update-pricing",
        templateId: "template-pricing",
        templateName: "Pricing Card Stack",
        projectId: "project-pricing",
        projectName: "Pricing Card Site",
        projectHref: "/editor/project-pricing",
        status: "blocked",
        score: 35,
        decision: "hold",
        decisionLabel: "Hold",
        changes: [],
        breakingChanges: [
          {
            id: "pricing-break",
            templateId: "template-pricing",
            templateName: "Pricing Card Stack",
            projectId: "project-pricing",
            projectName: "Pricing Card Site",
            kind: "project-changes-requested",
            severity: "blocked",
            detail: "Project approval is blocked.",
            remediation: "Resolve requested changes.",
          },
        ],
        rollbackPacketId: null,
        latestVersionId: null,
        latestVersionAt: null,
        campaignIds: [],
        campaignNames: [],
        nextAction: "Hold update until approval is resolved.",
      },
    ],
    breakingChanges: [],
    rollbackPackets: [],
    nextActions: [],
    totals: {
      templates: 2,
      instances: 2,
      campaigns: 0,
      acceptableUpdates: 1,
      heldUpdates: 1,
      rejectedUpdates: 0,
      breakingChanges: 1,
      rollbackPackets: 1,
    },
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> &
    Pick<DesignTemplateSummary, "id" | "name">,
): DesignTemplateSummary {
  return {
    id: overrides.id,
    name: overrides.name,
    creatorName: "Design Team",
    creatorEmail: "design@example.com",
    width: overrides.width ?? 1440,
    height: overrides.height ?? 900,
    thumbnail: null,
    isBrandTemplate: overrides.isBrandTemplate ?? true,
    isTeamTemplate: overrides.isTeamTemplate ?? true,
    approvalStatus: overrides.approvalStatus ?? "approved",
    marketplaceStatus: overrides.marketplaceStatus ?? "published",
    marketplaceCollection: "launch-system",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-19T10:00:00.000Z",
    marketplaceUseCount: overrides.marketplaceUseCount ?? 0,
    marketplaceViewCount: overrides.marketplaceViewCount ?? 0,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  };
}

function createProject(
  overrides: Partial<ProjectSummary> & Pick<ProjectSummary, "id" | "name">,
): ProjectSummary {
  return {
    id: overrides.id,
    name: overrides.name,
    width: overrides.width ?? 1440,
    height: overrides.height ?? 900,
    folderId: null,
    sourceProjectId: overrides.sourceProjectId ?? null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: overrides.publicShareId ?? null,
    editShareId: "edit-share",
    editSharePermission: "edit",
    approvalStatus: overrides.approvalStatus ?? "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  };
}

function createVersion(
  overrides: Pick<ProjectVersionSummary, "id" | "projectId">,
): ProjectVersionSummary {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    name: "Restore point",
    thumbnail: null,
    createdAt: "2026-05-19T10:00:00.000Z",
  };
}

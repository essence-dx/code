import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ReviewTaskSummary } from "@/db/project-comments";
import type { RuleBasedLayoutIntelligenceCenter } from "@/features/creation/rule-based-layout-intelligence";
import type { ProfessionalTypographySystemCenter } from "@/features/creation/professional-typography-system";
import type { ProjectSummary } from "@/features/editor/types";
import type { MediaBrandDeliveryKitCenter } from "@/features/media-delivery/media-brand-delivery-kits";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createProjectCoachingModeCenter } from "@/features/coaching/project-coaching-mode";
import type { VendorProductionHandoffCenter } from "@/features/print-production/vendor-production-handoff";

describe("project coaching mode", () => {
  test("creates contextual recipes, checklist progress, readiness coaching, and learning dashboards", () => {
    const center = createProjectCoachingModeCenter({
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch campaign",
          approvalStatus: "changes-requested",
        }),
        createProject({
          id: "project-ready",
          name: "Approved media kit",
          approvalStatus: "approved",
        }),
      ],
      layoutIntelligence: createLayoutCenter(),
      typographySystem: createTypographyCenter(),
      projectAudits: [
        createAudit({
          projectId: "project-launch",
          projectName: "Launch campaign",
          status: "fix",
          score: 58,
        }),
        createAudit({
          projectId: "project-ready",
          projectName: "Approved media kit",
          status: "ready",
          score: 94,
        }),
      ],
      projectHandoffPackets: [
        createHandoffPacket({
          projectId: "project-launch",
          projectName: "Launch campaign",
          status: "blocked",
          approvalStatus: "changes-requested",
          score: 42,
        }),
        createHandoffPacket({
          projectId: "project-ready",
          projectName: "Approved media kit",
          status: "ready",
          approvalStatus: "approved",
          score: 96,
        }),
      ],
      vendorProductionHandoff: createVendorCenter(),
      mediaBrandDeliveryKitCenter: createMediaCenter(),
      reviewTasks: [
        createReviewTask({
          id: "task-layout",
          projectId: "project-launch",
          projectName: "Launch campaign",
          body: "Fix layout spacing before approval.",
          taskStatus: "todo",
        }),
      ],
      now: "2026-05-19T14:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.projects, 2);
    assert.equal(center.totals.coachingSessions, 2);
    assert.equal(center.totals.blockedSessions, 1);
    assert.ok(center.totals.contextualRecipes >= 5);
    assert.equal(center.totals.learningDashboards, 2);

    const launch = center.sessions.find(
      (session) => session.projectId === "project-launch",
    );
    assert.equal(launch?.status, "blocked");
    assert.ok(launch?.nextAction.includes("Resolve"));
    assert.ok(
      launch?.contextualRecipes.some((recipe) => recipe.category === "layout"),
    );
    assert.ok(
      launch?.contextualRecipes.some(
        (recipe) => recipe.category === "typography",
      ),
    );
    assert.ok(
      launch?.contextualRecipes.some(
        (recipe) => recipe.category === "production",
      ),
    );
    assert.ok(
      launch?.checklist.items.some(
        (item) => item.id === "approval" && item.status === "blocked",
      ),
    );
    assert.ok(
      launch?.readinessCoaching.some((card) => card.dimension === "Print"),
    );
    assert.ok(
      launch?.learningDashboard.tracks.some(
        (track) => track.id === "production-delivery",
      ),
    );
    assert.ok((launch?.learningDashboard.progressPercent ?? 100) < 100);

    const packet = decodePacket(launch?.coachingPacket.downloadJson ?? "");
    assert.equal(packet.kind, "essence-studio.project-coaching-mode");
    assert.equal(packet.projectId, "project-launch");
    assert.ok(packet.contextualRecipes >= 5);
    assert.ok(packet.learningTracks >= 4);

    const ready = center.sessions.find(
      (session) => session.projectId === "project-ready",
    );
    assert.equal(ready?.status, "ready");
    assert.equal(ready?.checklist.progressPercent, 100);
    assert.equal(ready?.contextualRecipes[0]?.category, "maintenance");
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    projectId: string;
    contextualRecipes: number;
    learningTracks: number;
  };
}

function createProject(
  overrides: Partial<ProjectSummary> & Pick<ProjectSummary, "id" | "name">,
): ProjectSummary {
  return {
    id: overrides.id,
    name: overrides.name,
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: "data:image/png;base64,thumb",
    publicShareId: null,
    editShareId: "edit-share",
    editSharePermission: "comment",
    approvalStatus: overrides.approvalStatus ?? "in-review",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  };
}

function createLayoutCenter(): RuleBasedLayoutIntelligenceCenter {
  return {
    generatedAt: "2026-05-19T14:00:00.000Z",
    status: "blocked",
    score: 74,
    projectReports: [
      {
        id: "layout-project-launch",
        projectId: "project-launch",
        projectName: "Launch campaign",
        status: "blocked",
        score: 52,
        pageCount: 1,
        pageReportIds: ["layout-page-launch"],
        repairPlanIds: ["layout-repair-launch"],
        nextAction: "Scale launch elements back into the safe area.",
      },
      {
        id: "layout-project-ready",
        projectId: "project-ready",
        projectName: "Approved media kit",
        status: "ready",
        score: 96,
        pageCount: 1,
        pageReportIds: ["layout-page-ready"],
        repairPlanIds: [],
        nextAction: "Layout is ready.",
      },
    ],
    pageReports: [],
    spacingAudits: [],
    hierarchyChecks: [],
    responsiveSuggestions: [],
    repairPlans: [
      {
        id: "layout-repair-launch",
        projectId: "project-launch",
        pageId: "page-launch",
        title: "Restore layout spacing",
        status: "blocked",
        sourceIds: ["spacing-launch"],
        operations: [
          {
            kind: "scale-to-safe-area",
            targetElementIds: ["hero"],
            description: "Scale artwork into the safe area.",
          },
        ],
        fileName: "layout-repair.json",
        dataUrl: "data:application/json,%7B%7D",
        json: "{}",
      },
    ],
    nextActions: ["Scale launch elements back into the safe area."],
    totals: {
      projects: 2,
      pages: 2,
      spacingAudits: 1,
      hierarchyChecks: 1,
      responsiveSuggestions: 1,
      repairPlans: 1,
      blockedPages: 1,
      reviewPages: 0,
    },
  };
}

function createTypographyCenter(): ProfessionalTypographySystemCenter {
  return {
    generatedAt: "2026-05-19T14:00:00.000Z",
    status: "review",
    score: 82,
    typeScale: {
      id: "type-scale",
      status: "ready",
      tokens: [],
      missingBrandRoles: [],
      summary: "Brand type scale ready.",
    },
    fontPairings: [],
    readabilityChecks: [],
    repairPackets: [
      {
        id: "type-repair-launch",
        projectId: "project-launch",
        pageId: "page-launch",
        title: "Improve text readability",
        status: "review",
        sourceIds: ["text-launch"],
        operations: [
          {
            kind: "improve-readability",
            targetElementIds: ["headline"],
            description: "Increase contrast and line-height.",
          },
        ],
        fileName: "type-repair.json",
        dataUrl: "data:application/json,%7B%7D",
        json: "{}",
      },
    ],
    pageReports: [],
    projectReports: [
      {
        id: "type-project-launch",
        projectId: "project-launch",
        projectName: "Launch campaign",
        status: "review",
        score: 70,
        pageCount: 1,
        textLayerCount: 4,
        repairPacketIds: ["type-repair-launch"],
        nextAction: "Improve headline readability.",
      },
      {
        id: "type-project-ready",
        projectId: "project-ready",
        projectName: "Approved media kit",
        status: "ready",
        score: 94,
        pageCount: 1,
        textLayerCount: 4,
        repairPacketIds: [],
        nextAction: "Typography is ready.",
      },
    ],
    nextActions: ["Improve headline readability."],
    totals: {
      projects: 2,
      pages: 2,
      textLayers: 8,
      typeScaleTokens: 5,
      fontPairings: 1,
      readabilityChecks: 2,
      repairPackets: 1,
      blockedPages: 0,
      reviewPages: 1,
    },
  };
}

function createAudit(input: {
  projectId: string;
  projectName: string;
  status: ProjectAuditSummary["status"];
  score: number;
}): ProjectAuditSummary {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-19T10:00:00.000Z",
    overallScore: input.score,
    status: input.status,
    dimensions: [
      {
        id: "print",
        label: "Print",
        status: input.status,
        score: input.score,
        detail:
          input.status === "ready"
            ? "Print checks are ready."
            : "Print safe area needs review.",
      },
      {
        id: "brand",
        label: "Brand",
        status: input.status === "ready" ? "ready" : "review",
        score: input.status === "ready" ? 96 : 72,
        detail: "Brand usage evidence.",
      },
    ],
  };
}

function createHandoffPacket(input: {
  projectId: string;
  projectName: string;
  status: ProjectHandoffPacket["status"];
  approvalStatus: ProjectSummary["approvalStatus"];
  score: number;
}): ProjectHandoffPacket {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-19T10:00:00.000Z",
    approvalStatus: input.approvalStatus,
    packetScore: input.score,
    status: input.status,
    nextAction:
      input.status === "ready"
        ? "Ready for delivery."
        : "Resolve delivery blockers.",
    readinessReport: null,
    exportBundle: {
      status: input.status === "ready" ? "ready" : "failed",
      completedCount: input.status === "ready" ? 1 : 0,
      storedArtifactCount: input.status === "ready" ? 1 : 0,
      failedCount: input.status === "ready" ? 0 : 1,
      latestFormatLabel: input.status === "ready" ? "PDF" : null,
      latestArtifactName: input.status === "ready" ? "handoff.pdf" : null,
      latestCompletedAt:
        input.status === "ready" ? "2026-05-19T10:00:00.000Z" : null,
      totalStoredBytes: input.status === "ready" ? 1000 : 0,
    },
    stakeholderNotes: {
      totalCount: input.status === "ready" ? 1 : 2,
      unresolvedCount: input.status === "ready" ? 0 : 1,
      openTaskCount: input.status === "ready" ? 0 : 1,
      overdueTaskCount: 0,
      latestNoteAt: "2026-05-19T10:00:00.000Z",
    },
    approvalHistory: [],
    checklist: [],
  };
}

function createVendorCenter(): VendorProductionHandoffCenter {
  return {
    generatedAt: "2026-05-19T14:00:00.000Z",
    status: "blocked",
    score: 68,
    handoffs: [
      {
        id: "vendor-launch",
        projectId: "project-launch",
        projectName: "Launch campaign",
        status: "blocked",
        score: 48,
        nextAction: "Resolve print vendor blockers.",
        dieline: {
          id: "dieline-launch",
          productFamily: "poster",
          trimWidthInches: 8.5,
          trimHeightInches: 11,
          bleedInches: 0.125,
          safeMarginInches: 0.1875,
          resolutionDpi: 160,
          colorProfile: "RGB proof",
          panelCount: 1,
          cutPath: "straight trim",
          detail: "Poster trim needs higher resolution.",
        },
        proofSheet: {
          id: "proof-launch",
          status: "blocked",
          thumbnail: null,
          requiredViews: ["trim", "safe-area", "bleed", "wall-scale"],
          printAuditScore: 58,
          exportArtifactName: null,
          missingItems: ["successful export"],
          detail: "Export is missing.",
        },
        finishingNotes: [],
        skuMetadata: {
          sku: "ESS-LAUNCH",
          packageCode: "PST-20260519",
          revision: "20260519",
          dimensionsLabel: "1080 x 1080px",
          vendorFileName: "launch",
        },
        deliveryPacket: {
          id: "vendor-packet-launch",
          title: "Launch vendor packet",
          status: "blocked",
          generatedAt: "2026-05-19T14:00:00.000Z",
          manifest: [],
          downloadJson: "data:application/json,%7B%7D",
        },
      },
      {
        id: "vendor-ready",
        projectId: "project-ready",
        projectName: "Approved media kit",
        status: "ready",
        score: 96,
        nextAction: "Ready for vendor.",
        dieline: {
          id: "dieline-ready",
          productFamily: "card",
          trimWidthInches: 3.5,
          trimHeightInches: 2,
          bleedInches: 0.125,
          safeMarginInches: 0.1875,
          resolutionDpi: 300,
          colorProfile: "CMYK target",
          panelCount: 2,
          cutPath: "straight trim",
          detail: "Ready.",
        },
        proofSheet: {
          id: "proof-ready",
          status: "ready",
          thumbnail: "data:image/png;base64,thumb",
          requiredViews: ["trim", "safe-area", "bleed", "front", "back"],
          printAuditScore: 94,
          exportArtifactName: "ready.pdf",
          missingItems: [],
          detail: "Ready.",
        },
        finishingNotes: [],
        skuMetadata: {
          sku: "ESS-READY",
          packageCode: "CRD-20260519",
          revision: "20260519",
          dimensionsLabel: "1080 x 1080px",
          vendorFileName: "ready",
        },
        deliveryPacket: {
          id: "vendor-packet-ready",
          title: "Ready vendor packet",
          status: "ready",
          generatedAt: "2026-05-19T14:00:00.000Z",
          manifest: [],
          downloadJson: "data:application/json,%7B%7D",
        },
      },
    ],
    nextActions: ["Resolve print vendor blockers."],
    totals: {
      projects: 2,
      dielineSpecs: 2,
      proofSheets: 2,
      finishingNotes: 0,
      skuPackages: 2,
      deliveryPackets: 2,
      readyHandoffs: 1,
      reviewHandoffs: 0,
      blockedHandoffs: 1,
    },
  };
}

function createMediaCenter(): MediaBrandDeliveryKitCenter {
  return {
    generatedAt: "2026-05-19T14:00:00.000Z",
    status: "ready",
    score: 92,
    kits: [
      {
        id: "media-ready",
        projectId: "project-ready",
        projectName: "Approved media kit",
        status: "ready",
        score: 92,
        nextAction: "Ready for media delivery.",
        lowerThirdPresets: [],
        bumperOutroPresets: [],
        audioLoudness: {
          id: "audio-ready",
          status: "ready",
          targetLufs: -16,
          estimatedLufs: -16.2,
          peakVolume: 0.65,
          duckingCoveragePercent: 100,
          detail: "Ready.",
          action: "Ready.",
        },
        timelineQa: {
          id: "timeline-ready",
          status: "ready",
          score: 100,
          readiness: {
            status: "ready",
            score: 100,
            checks: [],
            needsAudioDucking: false,
            counts: {
              clips: 2,
              videos: 1,
              audio: 1,
              captions: 1,
              transitionedVideos: 1,
              duckedAudio: 1,
              timelineDurationSeconds: 10,
            },
          },
          checks: [],
        },
        exportSummary: {
          status: "ready",
          latestArtifactName: "ready.media.json",
          latestFormatLabel: "Media sequence",
          completedCount: 1,
          failedCount: 0,
        },
        deliveryPacket: {
          id: "media-packet-ready",
          title: "Media packet",
          status: "ready",
          generatedAt: "2026-05-19T14:00:00.000Z",
          manifest: [],
          downloadJson: "data:application/json,%7B%7D",
        },
      },
    ],
    nextActions: ["All media kits ready."],
    totals: {
      projects: 1,
      lowerThirdPresets: 0,
      bumperOutroPresets: 0,
      audioLoudnessChecks: 1,
      timelineQaReports: 1,
      deliveryPackets: 1,
      readyKits: 1,
      reviewKits: 0,
      blockedKits: 0,
    },
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> &
    Pick<ReviewTaskSummary, "id" | "projectId" | "projectName" | "body">,
): ReviewTaskSummary {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    projectName: overrides.projectName,
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: overrides.body,
    resolved: overrides.resolved ?? false,
    taskStatus: overrides.taskStatus ?? "todo",
    taskAssigneeName: overrides.taskAssigneeName ?? "Design owner",
    taskDueAt: overrides.taskDueAt ?? "2026-05-20T10:00:00.000Z",
    createdAt: overrides.createdAt ?? "2026-05-19T09:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-19T09:30:00.000Z",
  };
}

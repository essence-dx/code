import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import { createLargeWorkspacePerformanceIntelligenceCenter } from "@/features/performance/large-workspace-performance-intelligence";

describe("large workspace performance intelligence", () => {
  test("creates document budgets, slow-surface diagnostics, recovery recommendations, and telemetry packets", () => {
    const readyProject = createProject();
    const heavyProject = createProject({
      id: "project-heavy",
      name: "Heavy catalog",
      width: 8000,
      height: 8000,
      approvalStatus: "in-review",
    });
    const center = createLargeWorkspacePerformanceIntelligenceCenter({
      projects: [readyProject, heavyProject],
      projectAudits: [
        createAudit({
          projectId: readyProject.id,
          projectName: readyProject.name,
        }),
        createAudit({
          projectId: heavyProject.id,
          projectName: heavyProject.name,
          overallScore: 48,
          status: "fix",
        }),
      ],
      projectVersions: [
        ...createVersions(readyProject.id, 2),
        ...createVersions(heavyProject.id, 18),
      ],
      serverExportJobs: [
        createExportJob({
          id: "export-heavy-slow",
          projectId: heavyProject.id,
          projectName: heavyProject.name,
          createdAt: "2026-05-19T08:00:00.000Z",
          completedAt: "2026-05-19T08:06:30.000Z",
          updatedAt: "2026-05-19T08:06:30.000Z",
          artifactSizeBytes: 24 * 1024 * 1024,
        }),
      ],
      assetAudit: createAssetLibraryAudit({
        uploads: [],
        brandLogos: [],
        projectManifests: [
          {
            projectId: readyProject.id,
            projectName: readyProject.name,
            totalBytes: 4 * 1024 * 1024,
            entryCount: 24,
            skippedReferenceCount: 0,
            updatedAt: "2026-05-19T08:00:00.000Z",
          },
          {
            projectId: heavyProject.id,
            projectName: heavyProject.name,
            totalBytes: 86 * 1024 * 1024,
            entryCount: 420,
            skippedReferenceCount: 8,
            updatedAt: "2026-05-19T08:00:00.000Z",
          },
        ],
      }),
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.projects, 2);
    assert.equal(center.totals.documentBudgets, 2);
    assert.ok(center.totals.slowSurfaceDiagnostics >= 3);
    assert.ok(center.totals.recoveryRecommendations >= 3);
    assert.equal(center.totals.telemetryPackets, 1);

    const readyBudget = center.documentBudgets.find(
      (budget) => budget.projectId === readyProject.id,
    );
    assert.equal(readyBudget?.status, "ready");

    const heavyBudget = center.documentBudgets.find(
      (budget) => budget.projectId === heavyProject.id,
    );
    assert.equal(heavyBudget?.status, "blocked");
    assert.ok((heavyBudget?.canvasPixels ?? 0) > 60_000_000);
    assert.match(heavyBudget?.detail ?? "", /64,000,000/);

    assert.ok(
      center.slowSurfaceDiagnostics.some(
        (diagnostic) =>
          diagnostic.projectId === heavyProject.id &&
          diagnostic.surface === "editor-canvas" &&
          diagnostic.status === "blocked",
      ),
    );
    assert.ok(
      center.recoveryRecommendations.some(
        (recommendation) =>
          recommendation.projectId === heavyProject.id &&
          recommendation.steps.some((step) => step.includes("Window")),
      ),
    );

    const packet = decodePacket(center.telemetryPacket.dataUrl);
    assert.equal(packet.kind, "essence-studio.large-workspace-performance");
    assert.equal(packet.documentBudgets.length, 2);
    assert.ok(
      center.nextActions.some((action) => action.includes("Heavy catalog")),
    );
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    documentBudgets: unknown[];
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-ready",
    name: "Ready social kit",
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
    updatedAt: "2026-05-19T08:00:00.000Z",
    ...overrides,
  };
}

function createAudit(
  overrides: Partial<ProjectAuditSummary> = {},
): ProjectAuditSummary {
  return {
    projectId: "project-ready",
    projectName: "Ready social kit",
    updatedAt: "2026-05-19T08:00:00.000Z",
    overallScore: 94,
    status: "ready",
    dimensions: [
      {
        id: "accessibility",
        label: "Accessibility",
        status: "ready",
        score: 94,
        detail: "Ready.",
      },
    ],
    ...overrides,
  };
}

function createVersions(
  projectId: string,
  count: number,
): ProjectVersionSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${projectId}-version-${index}`,
    projectId,
    name: `Version ${index + 1}`,
    thumbnail: null,
    createdAt: `2026-05-19T0${Math.min(index, 9)}:00:00.000Z`,
  }));
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-ready",
    projectName: "Ready social kit",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "ready-social-kit.pdf",
    status: "completed",
    progress: 100,
    artifactName: "ready-social-kit.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 1024 * 1024,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-19T08:00:00.000Z",
    updatedAt: "2026-05-19T08:01:00.000Z",
    completedAt: "2026-05-19T08:01:00.000Z",
    ...overrides,
  };
}

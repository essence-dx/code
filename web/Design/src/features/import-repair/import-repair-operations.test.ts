import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import { createImportRepairOperationsCenter } from "@/features/import-repair/import-repair-operations";
import type { MixedFormatWorkspaceOrchestration } from "@/features/visual-suite/mixed-format-orchestration";

describe("import repair operations", () => {
  test("creates mapping diffs, retry strategies, and evidence packets for every supported format", () => {
    const center = createImportRepairOperationsCenter({
      projects: [
        createProject({
          id: "pdf-project",
          name: "Imported PDF brochure",
          updatedAt: "2026-05-18T09:30:00.000Z",
        }),
        createProject({
          id: "pptx-project",
          name: "PPTX sales deck",
          updatedAt: "2026-05-18T10:00:00.000Z",
        }),
        createProject({
          id: "xlsx-project",
          name: "XLSX metrics workbook",
          updatedAt: "2026-05-18T10:30:00.000Z",
        }),
      ],
      mixedFormatOrchestration: createWorkspaceOrchestration(),
      projectAudits: [
        createProjectAudit({
          projectId: "pdf-project",
          projectName: "Imported PDF brochure",
          status: "fix",
          score: 58,
        }),
        createProjectAudit({
          projectId: "pptx-project",
          projectName: "PPTX sales deck",
          status: "review",
          score: 76,
        }),
      ],
      projectVersions: [
        createProjectVersion({
          id: "version-pdf",
          projectId: "pdf-project",
          createdAt: "2026-05-18T10:40:00.000Z",
        }),
        createProjectVersion({
          id: "version-pptx",
          projectId: "pptx-project",
          createdAt: "2026-05-18T10:45:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "log-pdf",
          targetId: "pdf-project",
          summary: "Imported PDF and requested conversion review.",
          createdAt: "2026-05-18T10:50:00.000Z",
        }),
      ],
      generatedAt: "2026-05-18T11:00:00.000Z",
    });

    assert.equal(center.operations.length, 6);
    assert.equal(center.totals.formats, 6);
    assert.equal(center.totals.evidencePackets, 6);
    assert.equal(center.status, "review");
    assert.ok(center.score > 60);

    const pdf = center.operations.find(
      (operation) => operation.format === "pdf",
    );
    assert.ok(pdf);
    assert.equal(pdf.status, "blocked");
    assert.ok(pdf.mappingDiffs.some((diff) => diff.severity === "blocked"));
    assert.ok(pdf.retryStrategy.steps.some((step) => step.includes("Split")));
    assert.deepEqual(pdf.evidencePacket.projectIds, ["pdf-project"]);
    assert.ok(
      pdf.evidencePacket.downloadJson.includes("Imported PDF brochure"),
    );

    const pptx = center.operations.find(
      (operation) => operation.format === "pptx",
    );
    assert.ok(pptx);
    assert.ok(
      pptx.evidencePacket.checks.includes("Version snapshot available"),
    );
    assert.ok(
      pptx.mappingDiffs.some((diff) => diff.source.includes("Animations")),
    );

    assert.ok(
      center.nextActions.some((action) =>
        action.includes("PDF repair: Imported PDF brochure"),
      ),
    );
  });

  test("blocks production readiness when no workspace conversion evidence exists", () => {
    const center = createImportRepairOperationsCenter({
      projects: [],
      mixedFormatOrchestration: createEmptyWorkspaceOrchestration(),
      projectAudits: [],
      projectVersions: [],
      auditLogs: [],
      generatedAt: "2026-05-18T11:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.projectsWithEvidence, 0);
    assert.equal(center.totals.blockedFormats, 6);
    assert.ok(center.score < 50);
    assert.ok(center.nextActions[0]?.includes("Import a source PDF"));
    assert.ok(
      center.operations.every(
        (operation) => operation.evidencePacket.projectIds.length === 0,
      ),
    );
  });
});

function createProject(input: {
  id: string;
  name: string;
  updatedAt: string;
}): ProjectSummary {
  return {
    id: input.id,
    name: input.name,
    width: 1200,
    height: 800,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "draft",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: input.updatedAt,
  };
}

function createProjectAudit(input: {
  projectId: string;
  projectName: string;
  status: ProjectAuditSummary["status"];
  score: number;
}): ProjectAuditSummary {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-18T10:35:00.000Z",
    overallScore: input.score,
    status: input.status,
    dimensions: [
      {
        id: "accessibility",
        label: "Accessibility",
        status: input.status,
        score: input.score,
        detail: "Imported pages need remediation evidence.",
      },
    ],
  };
}

function createProjectVersion(input: {
  id: string;
  projectId: string;
  createdAt: string;
}): ProjectVersionSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    name: "Import repair snapshot",
    thumbnail: null,
    createdAt: input.createdAt,
  };
}

function createAuditLog(input: {
  id: string;
  targetId: string;
  summary: string;
  createdAt: string;
}): WorkspaceAuditLogSummary {
  return {
    id: input.id,
    action: "project.created",
    targetType: "project",
    targetId: input.targetId,
    summary: input.summary,
    actorEmail: "operator@example.com",
    metadata: {},
    createdAt: input.createdAt,
  };
}

function createWorkspaceOrchestration(): MixedFormatWorkspaceOrchestration {
  return {
    projects: [
      {
        projectId: "pdf-project",
        projectName: "Imported PDF brochure",
        updatedAt: "2026-05-18T09:30:00.000Z",
        pageCount: 2,
        pageTypes: ["docs", "print"],
        pageTypeLabels: ["Docs", "Print"],
        readinessScore: 54,
        status: "blocked",
        isMixedFormat: true,
        pageReadiness: [
          {
            pageId: "pdf-page-1",
            pageName: "PDF 1",
            pageType: "docs",
            pageTypeLabel: "Docs",
            score: 48,
            status: "blocked",
            signals: ["Document text"],
            gaps: ["Add alt text to rasterized PDF page images."],
          },
        ],
        nextBestActions: ["Repair PDF text flow and image accessibility."],
      },
      {
        projectId: "pptx-project",
        projectName: "PPTX sales deck",
        updatedAt: "2026-05-18T10:00:00.000Z",
        pageCount: 4,
        pageTypes: ["presentations"],
        pageTypeLabels: ["Presentations"],
        readinessScore: 78,
        status: "review",
        isMixedFormat: false,
        pageReadiness: [
          {
            pageId: "pptx-page-1",
            pageName: "PPTX 1",
            pageType: "presentations",
            pageTypeLabel: "Presentations",
            score: 78,
            status: "review",
            signals: ["Slide notes or interaction"],
            gaps: ["Add speaker notes, transitions, or audience interaction."],
          },
        ],
        nextBestActions: ["Review slide animation parity."],
      },
      {
        projectId: "xlsx-project",
        projectName: "XLSX metrics workbook",
        updatedAt: "2026-05-18T10:30:00.000Z",
        pageCount: 1,
        pageTypes: ["sheets"],
        pageTypeLabels: ["Sheets"],
        readinessScore: 88,
        status: "ready",
        isMixedFormat: false,
        pageReadiness: [
          {
            pageId: "xlsx-page-1",
            pageName: "XLSX Sheet 1",
            pageType: "sheets",
            pageTypeLabel: "Sheets",
            score: 88,
            status: "ready",
            signals: ["Data grid"],
            gaps: ["Ready for this first-pass orchestration view."],
          },
        ],
        nextBestActions: [],
      },
    ],
    suiteCoverage: [],
    totals: {
      projects: 3,
      mixedFormatProjects: 1,
      pageCount: 7,
      averageReadiness: 73,
    },
  };
}

function createEmptyWorkspaceOrchestration(): MixedFormatWorkspaceOrchestration {
  return {
    projects: [],
    suiteCoverage: [],
    totals: {
      projects: 0,
      mixedFormatProjects: 0,
      pageCount: 0,
      averageReadiness: 0,
    },
  };
}

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createVendorProductionHandoffCenter } from "@/features/print-production/vendor-production-handoff";

describe("vendor production handoff", () => {
  test("creates dieline specs, proof sheets, finishing notes, SKU metadata, and delivery packets", () => {
    const center = createVendorProductionHandoffCenter({
      projects: [
        createProject({
          id: "project-card",
          name: "Premium gift card",
          width: 1050,
          height: 600,
          approvalStatus: "approved",
          thumbnail: "data:image/png;base64,card",
        }),
        createProject({
          id: "project-sleeve",
          name: "Retail package sleeve",
          width: 1800,
          height: 1200,
          approvalStatus: "changes-requested",
          thumbnail: null,
        }),
      ],
      projectAudits: [
        createAudit({
          projectId: "project-card",
          projectName: "Premium gift card",
          printScore: 96,
          printStatus: "ready",
        }),
        createAudit({
          projectId: "project-sleeve",
          projectName: "Retail package sleeve",
          printScore: 48,
          printStatus: "fix",
        }),
      ],
      serverExportJobs: [
        createExportJob({
          id: "export-card-print",
          projectId: "project-card",
          projectName: "Premium gift card",
          status: "completed",
          format: "print-pdf",
          formatLabel: "Print PDF",
          artifactName: "premium-gift-card-print.pdf",
          artifactDataUrl: "data:application/pdf;base64,card",
          completedAt: "2026-05-19T09:30:00.000Z",
        }),
        createExportJob({
          id: "export-sleeve-failed",
          projectId: "project-sleeve",
          projectName: "Retail package sleeve",
          status: "failed",
          format: "print-pdf",
          formatLabel: "Print PDF",
          failureMessage: "Transparent background failed vendor preflight.",
        }),
      ],
      projectHandoffPackets: [
        createHandoffPacket({
          projectId: "project-card",
          projectName: "Premium gift card",
          status: "ready",
          approvalStatus: "approved",
        }),
        createHandoffPacket({
          projectId: "project-sleeve",
          projectName: "Retail package sleeve",
          status: "blocked",
          approvalStatus: "changes-requested",
        }),
      ],
      now: "2026-05-19T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.projects, 2);
    assert.equal(center.totals.dielineSpecs, 2);
    assert.equal(center.totals.proofSheets, 2);
    assert.equal(center.totals.skuPackages, 2);
    assert.equal(center.totals.deliveryPackets, 2);
    assert.equal(center.totals.readyHandoffs, 1);
    assert.equal(center.totals.blockedHandoffs, 1);

    const card = center.handoffs.find(
      (handoff) => handoff.projectId === "project-card",
    );
    assert.equal(card?.status, "ready");
    assert.equal(card?.dieline.productFamily, "card");
    assert.equal(card?.dieline.bleedInches, 0.125);
    assert.equal(card?.dieline.safeMarginInches, 0.1875);
    assert.equal(card?.proofSheet.status, "ready");
    assert.deepEqual(card?.proofSheet.requiredViews, [
      "trim",
      "safe-area",
      "bleed",
      "front",
      "back",
    ]);
    assert.match(card?.skuMetadata.sku ?? "", /^ESS-PREMIUM-GIFT-CARD-/);
    assert.ok(
      card?.finishingNotes.some((note) => note.label === "Coating"),
      "adds coating notes",
    );
    assert.ok(
      card?.deliveryPacket.manifest.some((item) => item.kind === "artifact"),
      "links the completed print artifact",
    );

    const packet = decodePacket(card?.deliveryPacket.downloadJson ?? "");
    assert.equal(packet.kind, "essence-studio.vendor-production-handoff");
    assert.equal(packet.projectId, "project-card");
    assert.equal(packet.dieline.productFamily, "card");
    assert.equal(packet.skuMetadata.sku, card?.skuMetadata.sku);

    const sleeve = center.handoffs.find(
      (handoff) => handoff.projectId === "project-sleeve",
    );
    assert.equal(sleeve?.status, "blocked");
    assert.equal(sleeve?.dieline.productFamily, "package-flat");
    assert.equal(sleeve?.proofSheet.status, "blocked");
    assert.ok(sleeve?.nextAction.includes("Resolve"));
    assert.ok(
      sleeve?.deliveryPacket.manifest.some((item) => item.kind === "blocker"),
      "blocked packets include vendor blockers",
    );
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    projectId: string;
    dieline: { productFamily: string };
    skuMetadata: { sku: string };
  };
}

function createProject(
  overrides: Partial<ProjectSummary> & Pick<ProjectSummary, "id" | "name">,
): ProjectSummary {
  return {
    id: overrides.id,
    name: overrides.name,
    width: overrides.width ?? 1080,
    height: overrides.height ?? 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: overrides.thumbnail ?? null,
    publicShareId: null,
    editShareId: "edit-share",
    editSharePermission: "comment",
    approvalStatus: overrides.approvalStatus ?? "in-review",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-19T10:00:00.000Z",
  };
}

function createAudit(input: {
  projectId: string;
  projectName: string;
  printScore: number;
  printStatus: ProjectAuditSummary["status"];
}): ProjectAuditSummary {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-19T10:00:00.000Z",
    overallScore: input.printScore,
    status: input.printStatus,
    dimensions: [
      {
        id: "print",
        label: "Print",
        status: input.printStatus,
        score: input.printScore,
        detail:
          input.printStatus === "ready"
            ? "5/5 print checks pass on the active page."
            : "2/5 print checks pass on the active page.",
      },
      {
        id: "brand",
        label: "Brand",
        status: "ready",
        score: 92,
        detail: "Brand checks are ready.",
      },
    ],
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> &
    Pick<ServerExportJobSummary, "id" | "projectId" | "projectName">,
): ServerExportJobSummary {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    projectName: overrides.projectName,
    format: overrides.format ?? "print-pdf",
    formatLabel: overrides.formatLabel ?? "Print PDF",
    fileName: overrides.fileName ?? `${overrides.projectId}.pdf`,
    status: overrides.status ?? "completed",
    progress: overrides.progress ?? 100,
    artifactName: overrides.artifactName ?? null,
    artifactMimeType: overrides.artifactMimeType ?? "application/pdf",
    artifactSizeBytes: overrides.artifactSizeBytes ?? 120_000,
    artifactDataUrl: overrides.artifactDataUrl ?? null,
    failureMessage: overrides.failureMessage ?? null,
    createdAt: overrides.createdAt ?? "2026-05-19T09:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-19T09:30:00.000Z",
    completedAt: overrides.completedAt ?? null,
  };
}

function createHandoffPacket(input: {
  projectId: string;
  projectName: string;
  status: ProjectHandoffPacket["status"];
  approvalStatus: ProjectSummary["approvalStatus"];
}): ProjectHandoffPacket {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-19T10:00:00.000Z",
    approvalStatus: input.approvalStatus,
    packetScore: input.status === "ready" ? 94 : 42,
    status: input.status,
    nextAction:
      input.status === "ready"
        ? "Ready for delivery."
        : "Resolve project handoff blockers.",
    readinessReport: null,
    exportBundle: {
      status: input.status === "ready" ? "ready" : "failed",
      completedCount: input.status === "ready" ? 1 : 0,
      storedArtifactCount: input.status === "ready" ? 1 : 0,
      failedCount: input.status === "ready" ? 0 : 1,
      latestFormatLabel: input.status === "ready" ? "Print PDF" : null,
      latestArtifactName:
        input.status === "ready" ? `${input.projectId}.pdf` : null,
      latestCompletedAt:
        input.status === "ready" ? "2026-05-19T09:30:00.000Z" : null,
      totalStoredBytes: input.status === "ready" ? 120_000 : 0,
    },
    stakeholderNotes: {
      totalCount: input.status === "ready" ? 1 : 2,
      unresolvedCount: input.status === "ready" ? 0 : 1,
      openTaskCount: input.status === "ready" ? 0 : 1,
      overdueTaskCount: 0,
      latestNoteAt: "2026-05-19T09:00:00.000Z",
    },
    approvalHistory: [],
    checklist: [],
  };
}

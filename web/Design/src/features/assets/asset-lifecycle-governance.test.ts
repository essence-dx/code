import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { createAdvancedBatchAssetOperationCenter } from "@/features/assets/advanced-batch-asset-operations";
import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import { createAssetLifecycleGovernanceCenter } from "@/features/assets/asset-lifecycle-governance";
import { createAssetProvenanceReviewCenter } from "@/features/assets/asset-provenance-review";
import { createCreativeAssetIntelligenceCenter } from "@/features/assets/creative-asset-intelligence";
import type { ProjectSummary } from "@/features/editor/types";

describe("asset lifecycle governance", () => {
  test("creates rights renewals, replacement propagation, bulk relinking, usage previews, and signed evidence packets", () => {
    const project = createProject({
      id: "project-launch",
      name: "Launch landing page",
      publicShareId: "public-launch",
      width: 1440,
      height: 1200,
    });
    const audit = createAssetLibraryAudit({
      uploads: [
        createStoredAsset({
          id: "hero-expiring",
          name: "Hero campaign image",
          mimeType: "image/png",
          sourceProvider: "Wikimedia Commons",
          sourceUrl: "https://commons.example/hero",
          authorName: "Archive team",
          licenseName: "Public Domain",
          licenseUrl: "https://example.com/public-domain",
          updatedAt: "2025-05-01T00:00:00.000Z",
        }),
        createStoredAsset({
          id: "hero-restricted",
          name: "Restricted hero variant",
          mimeType: "image/png",
          sourceProvider: "Vendor library",
          sourceUrl: "https://vendor.example/restricted",
          authorName: "Vendor",
          licenseName: "Editorial use only",
          licenseUrl: "https://vendor.example/license",
          updatedAt: "2026-05-01T00:00:00.000Z",
        }),
        createStoredAsset({
          id: "hero-renewed",
          name: "Renewed hero replacement",
          mimeType: "image/png",
          sourceProvider: "Internal shoot",
          sourceUrl: "https://assets.example/renewed-hero",
          authorName: "Studio",
          licenseName: "Internal commercial use",
          licenseUrl: "https://assets.example/license",
          updatedAt: "2026-05-18T00:00:00.000Z",
        }),
      ],
      brandLogos: [],
      projectManifests: [
        {
          projectId: project.id,
          projectName: project.name,
          totalBytes: 12_000_000,
          entryCount: 8,
          skippedReferenceCount: 2,
          updatedAt: "2026-05-18T08:00:00.000Z",
        },
      ],
    });
    const provenanceReview = createAssetProvenanceReviewCenter({
      audit,
      now: "2026-05-19T10:00:00.000Z",
    });
    const batchOperations = createAdvancedBatchAssetOperationCenter({
      audit,
      projects: [project],
      now: "2026-05-19T10:00:00.000Z",
    });
    const creativeIntelligence = createCreativeAssetIntelligenceCenter({
      audit,
      projects: [project],
      templates: [],
      serverExportJobs: [],
      websitePublishes: [],
      now: "2026-05-19T10:00:00.000Z",
    });

    const center = createAssetLifecycleGovernanceCenter({
      audit,
      provenanceReview,
      batchOperations,
      creativeIntelligence,
      auditLogs: [
        createAuditLog({
          id: "audit-expiry",
          targetType: "asset",
          targetId: "hero-expiring",
          summary: "Queued rights renewal for hero asset.",
        }),
        createAuditLog({
          id: "audit-restricted",
          targetType: "asset",
          targetId: "hero-restricted",
          summary: "Blocked restricted hero asset.",
        }),
        createAuditLog({
          id: "audit-project",
          targetType: "project",
          targetId: project.id,
          summary: "Previewed launch page asset relink impact.",
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.rightsRenewals, 1);
    assert.equal(center.totals.replacementPlans, 2);
    assert.equal(center.totals.bulkRelinkPlans, 1);
    assert.equal(center.totals.usageImpactPreviews, 1);
    assert.equal(center.totals.signedEvidencePackets, 1);
    assert.equal(center.totals.blockedAssets, 1);
    assert.equal(center.totals.affectedProjects, 1);
    assert.equal(center.totals.auditEvidence, 3);

    const renewal = center.rightsRenewals[0];
    assert.equal(renewal?.assetId, "hero-expiring");
    assert.equal(renewal?.status, "review");
    assert.ok(renewal?.renewalReason.includes("License review is due"));

    const restrictedReplacement = center.replacementPlans.find(
      (plan) => plan.sourceAssetId === "hero-restricted",
    );
    assert.equal(restrictedReplacement?.replacementAssetId, "hero-renewed");
    assert.equal(restrictedReplacement?.status, "blocked");
    assert.deepEqual(restrictedReplacement?.affectedProjectIds, [
      "project-launch",
    ]);

    const relinkPlan = center.bulkRelinkPlans[0];
    assert.deepEqual(relinkPlan?.sourceAssetIds.sort(), [
      "hero-expiring",
      "hero-restricted",
    ]);
    assert.equal(relinkPlan?.operationCount, 2);
    assert.ok(
      relinkPlan?.warnings.some((warning) => warning.includes("skipped")),
    );

    const preview = center.usageImpactPreviews[0];
    assert.equal(preview?.projectId, "project-launch");
    assert.equal(preview?.status, "review");
    assert.ok(preview?.relinkPlanIds.includes("bulk-relink-project-launch"));

    const packet = decodePacket(center.signedEvidencePackets[0]?.dataUrl ?? "");
    assert.equal(packet.kind, "essence-studio.asset-lifecycle-governance");
    assert.equal(packet.signature, center.signedEvidencePackets[0]?.signature);
    assert.deepEqual(packet.replacementPlanIds.sort(), [
      "replacement-hero-expiring",
      "replacement-hero-restricted",
    ]);
  });
});

function createStoredAsset(input: {
  id: string;
  name: string;
  mimeType: string;
  sourceProvider?: string | null;
  sourceUrl?: string | null;
  authorName?: string | null;
  licenseName?: string | null;
  licenseUrl?: string | null;
  updatedAt?: string;
}) {
  return {
    id: input.id,
    name: input.name,
    mimeType: input.mimeType,
    dataUrl: `data:${input.mimeType};base64,AAAA`,
    sizeBytes: 2_400_000,
    sourceProvider: input.sourceProvider,
    sourceUrl: input.sourceUrl,
    authorName: input.authorName,
    licenseName: input.licenseName,
    licenseUrl: input.licenseUrl,
    updatedAt: input.updatedAt ?? "2026-05-18T00:00:00.000Z",
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-1",
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
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-19T08:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "release.override.requested",
    targetType: "asset",
    targetId: "asset-1",
    summary: "Asset review changed.",
    actorEmail: "ops@example.com",
    metadata: {},
    createdAt: "2026-05-19T08:00:00.000Z",
    ...overrides,
  };
}

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    signature: string;
    replacementPlanIds: string[];
  };
}

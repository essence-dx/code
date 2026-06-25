import type {
  AssetAuditRecord,
  AssetDuplicateGroup,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type {
  AdvancedBatchAssetOperationCenter,
  AdvancedBatchAssetOperationStatus,
  AssetAltTextQueueItem,
  AssetLicenseMetadataQueueItem,
  AssetUsageImpactPreview,
  BatchAssetTransformPlan,
  ReversibleAssetCleanupPacket,
} from "@/features/assets/advanced-batch-asset-operations-types";
import type { ProjectSummary } from "@/features/editor/types";

export type {
  AdvancedBatchAssetOperationCenter,
  AdvancedBatchAssetOperationStatus,
  AssetAltTextQueueItem,
  AssetLicenseMetadataQueueItem,
  AssetUsageImpactPreview,
  BatchAssetTransformPlan,
  ReversibleAssetCleanupPacket,
} from "@/features/assets/advanced-batch-asset-operations-types";

export function createAdvancedBatchAssetOperationCenter(input: {
  audit: AssetLibraryAudit;
  projects: ProjectSummary[];
  now?: string | Date;
}): AdvancedBatchAssetOperationCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const transformPlans = createTransformPlans({
    records: input.audit.records,
    projects: input.projects,
  });
  const altTextQueue = createAltTextQueue(input.audit.records);
  const licenseMetadataQueue = createLicenseMetadataQueue(input.audit.records);
  const reversibleCleanupPackets = createReversibleCleanupPackets({
    groups: input.audit.duplicateGroups,
    projects: input.projects,
  });
  const usageImpactPreviews = createUsageImpactPreviews({
    records: input.audit.records,
    projects: input.projects,
    transformPlans,
    cleanupPackets: reversibleCleanupPackets,
  });
  const totals = {
    assets: input.audit.records.length,
    transformCandidates: unique(
      transformPlans.flatMap((plan) => plan.assetIds),
    ).length,
    metadataQueueItems: altTextQueue.length + licenseMetadataQueue.length,
    usagePreviews: usageImpactPreviews.length,
    cleanupPackets: reversibleCleanupPackets.length,
    estimatedReclaimBytes:
      transformPlans.reduce(
        (total, plan) => total + plan.estimatedReclaimBytes,
        0,
      ) +
      reversibleCleanupPackets.reduce(
        (total, packet) => total + packet.reclaimBytes,
        0,
      ),
  };
  const score = scoreCenter({
    assets: input.audit.records.length,
    transformPlans,
    altTextQueue,
    licenseMetadataQueue,
    usageImpactPreviews,
    cleanupPackets: reversibleCleanupPackets,
  });
  const status = scoreToStatus(score, {
    blocked:
      licenseMetadataQueue.some((item) => item.status === "blocked") ||
      usageImpactPreviews.some((preview) => preview.status === "blocked"),
  });

  return {
    generatedAt,
    status,
    score,
    transformPlans,
    altTextQueue,
    licenseMetadataQueue,
    usageImpactPreviews,
    reversibleCleanupPackets,
    nextActions: createNextActions({
      transformPlans,
      altTextQueue,
      licenseMetadataQueue,
      usageImpactPreviews,
      cleanupPackets: reversibleCleanupPackets,
    }),
    totals,
  };
}

function createTransformPlans(input: {
  records: AssetAuditRecord[];
  projects: ProjectSummary[];
}): BatchAssetTransformPlan[] {
  const rasterImages = input.records.filter(isRasterImage);
  const largeRasterImages = rasterImages.filter(
    (record) => record.sizeBytes >= 2_000_000,
  );
  const videoAssets = input.records.filter((record) =>
    record.mimeType.startsWith("video/"),
  );
  const nonSquareProjects = input.projects.filter(
    (project) => Math.abs(project.width / project.height - 1) > 0.08,
  );
  const plans: BatchAssetTransformPlan[] = [];

  if (rasterImages.some((record) => record.mimeType !== "image/webp")) {
    const assets = rasterImages.filter(
      (record) => record.mimeType !== "image/webp",
    );

    plans.push({
      id: "batch-format-webp",
      kind: "format-conversion",
      label: "Convert raster uploads to WebP",
      status: "review",
      assetIds: assets.map((asset) => asset.id),
      targetProjectIds: [],
      inputFormats: unique(assets.map((asset) => asset.mimeType)),
      outputFormat: "image/webp",
      operationCount: assets.length,
      estimatedReclaimBytes: estimateSavings(assets, 0.35),
      instructions: [
        "Create WebP derivatives while preserving the original source assets.",
        "Keep source, author, and license metadata attached to every derivative.",
      ],
    });
  }

  if (largeRasterImages.length) {
    plans.push({
      id: "batch-resize-large-raster",
      kind: "resize",
      label: "Resize oversized raster images",
      status: "review",
      assetIds: largeRasterImages.map((asset) => asset.id),
      targetProjectIds: input.projects.map((project) => project.id),
      inputFormats: unique(largeRasterImages.map((asset) => asset.mimeType)),
      outputFormat: "source-format",
      operationCount: largeRasterImages.length,
      estimatedReclaimBytes: estimateSavings(largeRasterImages, 0.4),
      instructions: [
        "Generate 2x display-size derivatives for web and social surfaces.",
        "Retain originals until all impacted projects have been re-exported.",
      ],
    });
  }

  if (nonSquareProjects.length && rasterImages.length) {
    plans.push({
      id: "batch-crop-project-aspects",
      kind: "crop",
      label: "Prepare aspect-aware crop derivatives",
      status: "review",
      assetIds: rasterImages.map((asset) => asset.id),
      targetProjectIds: nonSquareProjects.map((project) => project.id),
      inputFormats: unique(rasterImages.map((asset) => asset.mimeType)),
      outputFormat: "source-format",
      operationCount: rasterImages.length * nonSquareProjects.length,
      estimatedReclaimBytes: 0,
      instructions: [
        "Create non-destructive crop derivatives for story, website, and presentation aspect ratios.",
        "Keep focal-point review in the project usage preview before replacing references.",
      ],
    });
  }

  if (videoAssets.length) {
    plans.push({
      id: "batch-video-delivery-derivatives",
      kind: "format-conversion",
      label: "Prepare delivery video derivatives",
      status: "review",
      assetIds: videoAssets.map((asset) => asset.id),
      targetProjectIds: input.projects.map((project) => project.id),
      inputFormats: unique(videoAssets.map((asset) => asset.mimeType)),
      outputFormat: "video/mp4",
      operationCount: videoAssets.length,
      estimatedReclaimBytes: estimateSavings(videoAssets, 0.25),
      instructions: [
        "Create compressed delivery derivatives for exports and published pages.",
        "Retain raw uploads until release checks confirm the derivative is used.",
      ],
    });
  }

  return plans;
}

function createAltTextQueue(
  records: AssetAuditRecord[],
): AssetAltTextQueueItem[] {
  return records
    .filter((record) => isImage(record) && record.scope !== "projects")
    .map((record) => ({
      id: `alt-text-${record.id}`,
      assetId: record.id,
      assetName: record.name,
      scope: record.scope,
      suggestedAltText: createSuggestedAltText(record.name),
      status: "review" as const,
      reason: "Image assets need reusable alt text before website, email, or document handoff.",
    }))
    .sort(compareQueueItems)
    .slice(0, 12);
}

function createLicenseMetadataQueue(
  records: AssetAuditRecord[],
): AssetLicenseMetadataQueueItem[] {
  return records
    .filter((record) => record.scope === "uploads")
    .map((record) => {
      const missingFields: AssetLicenseMetadataQueueItem["missingFields"] = [];

      if (!record.sourceProvider && !record.sourceUrl) missingFields.push("source");
      if (!record.authorName) missingFields.push("author");
      if (!record.licenseName && !record.licenseUrl) missingFields.push("license");

      return {
        id: `license-metadata-${record.id}`,
        assetId: record.id,
        assetName: record.name,
        scope: record.scope,
        missingFields,
        status:
          missingFields.includes("license") || missingFields.includes("source")
            ? ("review" as const)
            : ("ready" as const),
        reason: missingFields.length
          ? `Missing ${missingFields.join(", ")} metadata.`
          : "Source, author, and license metadata are ready.",
      };
    })
    .filter((item) => item.missingFields.length > 0)
    .sort(compareQueueItems)
    .slice(0, 12);
}

function createUsageImpactPreviews(input: {
  records: AssetAuditRecord[];
  projects: ProjectSummary[];
  transformPlans: BatchAssetTransformPlan[];
  cleanupPackets: ReversibleAssetCleanupPacket[];
}): AssetUsageImpactPreview[] {
  const projectById = new Map(
    input.projects.map((project) => [project.id, project]),
  );

  return input.records
    .filter((record) => record.scope === "projects")
    .map((record) => {
      const project = projectById.get(record.id);
      const publicSurface = Boolean(project?.publicShareId);
      const skippedReferenceCount = record.skippedReferenceCount ?? 0;
      const transformPlanIds = input.transformPlans
        .filter((plan) => plan.targetProjectIds.includes(record.id))
        .map((plan) => plan.id);
      const cleanupPacketIds = input.cleanupPackets
        .filter((packet) => packet.affectedProjectIds.includes(record.id))
        .map((packet) => packet.id);
      const warnings = [
        publicSurface ? "Published project should be re-exported after asset changes." : null,
        skippedReferenceCount
          ? `${skippedReferenceCount} skipped asset reference needs manual review.`
          : null,
        transformPlanIds.length
          ? "Batch transforms may change project export output."
          : null,
      ].filter((warning): warning is string => Boolean(warning));

      const status: AdvancedBatchAssetOperationStatus = warnings.length
        ? "review"
        : "ready";

      return {
        id: `usage-impact-${record.id}`,
        projectId: record.id,
        projectName: record.name,
        status,
        publicSurface,
        referenceCount: record.referenceCount ?? 0,
        skippedReferenceCount,
        transformPlanIds,
        cleanupPacketIds,
        warnings,
      };
    })
    .sort(
      (first, second) =>
        statusWeight(second.status) - statusWeight(first.status) ||
        second.referenceCount - first.referenceCount ||
        first.projectName.localeCompare(second.projectName),
    )
    .slice(0, 10);
}

function createReversibleCleanupPackets(input: {
  groups: AssetDuplicateGroup[];
  projects: ProjectSummary[];
}): ReversibleAssetCleanupPacket[] {
  const affectedProjectIds = input.projects
    .filter((project) => project.publicShareId)
    .map((project) => project.id);

  return input.groups
    .map((group) => createCleanupPacket({ group, affectedProjectIds }))
    .filter((packet): packet is ReversibleAssetCleanupPacket => Boolean(packet));
}

function createCleanupPacket(input: {
  group: AssetDuplicateGroup;
  affectedProjectIds: string[];
}): ReversibleAssetCleanupPacket | null {
  const retainAsset = input.group.assets[0];
  const removableAssets = input.group.assets.slice(1);

  if (!retainAsset || !removableAssets.length) return null;

  const removeAssetIds = removableAssets.map((asset) => asset.id);
  const packet = {
    id: `reversible-cleanup-${input.group.key}`,
    status: "review" as const,
    duplicateKey: input.group.key,
    retainAssetId: retainAsset.id,
    removeAssetIds,
    reclaimBytes: removableAssets.reduce(
      (total, asset) => total + asset.sizeBytes,
      0,
    ),
    affectedProjectIds: input.affectedProjectIds,
    rollbackSteps: [
      "Keep the retained original asset and duplicate metadata snapshot.",
      "Store removed asset IDs in the cleanup packet before deletion.",
      "Restore removed assets from the packet if a project reference or export fails.",
    ],
  };

  return {
    ...packet,
    dataUrl: createPacketDataUrl(packet),
  };
}

function createNextActions(input: {
  transformPlans: BatchAssetTransformPlan[];
  altTextQueue: AssetAltTextQueueItem[];
  licenseMetadataQueue: AssetLicenseMetadataQueueItem[];
  usageImpactPreviews: AssetUsageImpactPreview[];
  cleanupPackets: ReversibleAssetCleanupPacket[];
}) {
  const cleanup = input.cleanupPackets[0];
  const license = input.licenseMetadataQueue[0];
  const altText = input.altTextQueue[0];
  const usage = input.usageImpactPreviews.find(
    (preview) => preview.status !== "ready",
  );
  const transform = input.transformPlans[0];

  return [
    cleanup
      ? `Review reversible cleanup packet before removing ${cleanup.removeAssetIds
          .map((assetId) => findAssetLabel(assetId, [...input.altTextQueue, ...input.licenseMetadataQueue]))
          .join(", ")}.`
      : null,
    license ? `Complete ${license.missingFields.join(", ")} metadata for ${license.assetName}.` : null,
    altText ? `Approve reusable alt text for ${altText.assetName}.` : null,
    usage ? `Preview project impact for ${usage.projectName}.` : null,
    transform ? `${transform.label}: prepare ${transform.operationCount} operations.` : null,
  ]
    .filter((action): action is string => Boolean(action))
    .slice(0, 5);
}

function scoreCenter(input: {
  assets: number;
  transformPlans: BatchAssetTransformPlan[];
  altTextQueue: AssetAltTextQueueItem[];
  licenseMetadataQueue: AssetLicenseMetadataQueueItem[];
  usageImpactPreviews: AssetUsageImpactPreview[];
  cleanupPackets: ReversibleAssetCleanupPacket[];
}) {
  if (!input.assets) return 100;

  const metadataPenalty = Math.min(
    20,
    input.altTextQueue.length + input.licenseMetadataQueue.length * 4,
  );
  const usagePenalty = Math.min(
    16,
    input.usageImpactPreviews.filter((preview) => preview.status !== "ready")
      .length * 4,
  );
  const cleanupPenalty = Math.min(12, input.cleanupPackets.length * 6);
  const transformCoverage = input.transformPlans.length ? 14 : 0;

  return Math.max(
    0,
    Math.min(
      100,
      86 + transformCoverage - metadataPenalty - usagePenalty - cleanupPenalty,
    ),
  );
}

function scoreToStatus(
  score: number,
  input: { blocked: boolean },
): AdvancedBatchAssetOperationStatus {
  if (input.blocked || score < 50) return "blocked";
  if (score < 86) return "review";

  return "ready";
}

function createPacketDataUrl(packet: Omit<ReversibleAssetCleanupPacket, "dataUrl">) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(packet, null, 2),
  )}`;
}

function createSuggestedAltText(name: string) {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findAssetLabel(
  assetId: string,
  items: Array<AssetAltTextQueueItem | AssetLicenseMetadataQueueItem>,
) {
  return items.find((item) => item.assetId === assetId)?.assetName ?? assetId;
}

function compareQueueItems(
  first: AssetAltTextQueueItem | AssetLicenseMetadataQueueItem,
  second: AssetAltTextQueueItem | AssetLicenseMetadataQueueItem,
) {
  return first.assetName.localeCompare(second.assetName);
}

function estimateSavings(records: AssetAuditRecord[], ratio: number) {
  return Math.round(
    records.reduce((total, record) => total + record.sizeBytes, 0) * ratio,
  );
}

function isImage(record: AssetAuditRecord) {
  return record.mimeType.startsWith("image/");
}

function isRasterImage(record: AssetAuditRecord) {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
    record.mimeType,
  );
}

function statusWeight(status: AdvancedBatchAssetOperationStatus) {
  if (status === "blocked") return 3;
  if (status === "review") return 2;

  return 1;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeDate(value: string | Date | undefined) {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

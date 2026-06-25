import type { WebsitePublishSummary } from "@/db/website-publishing";
import type {
  AssetAuditRecord,
  AssetDuplicateGroup,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type {
  CreativeAssetBatchCleanupPreview,
  CreativeAssetDependencyImpactSimulation,
  CreativeAssetImpactExport,
  CreativeAssetImpactProject,
  CreativeAssetImpactTemplate,
  CreativeAssetImpactWebsite,
  CreativeAssetIntelligenceCenter,
  CreativeAssetIntelligenceStatus,
  CreativeAssetRecommendation,
  CreativeAssetRemediationPacket,
} from "@/features/assets/creative-asset-intelligence-types";

export type {
  CreativeAssetBatchCleanupPreview,
  CreativeAssetDependencyImpactSimulation,
  CreativeAssetImpactExport,
  CreativeAssetImpactProject,
  CreativeAssetImpactTemplate,
  CreativeAssetImpactWebsite,
  CreativeAssetIntelligenceCenter,
  CreativeAssetIntelligenceStatus,
  CreativeAssetRecommendation,
  CreativeAssetRemediationPacket,
} from "@/features/assets/creative-asset-intelligence-types";

export type CreativeAssetIntelligenceInput = {
  audit: AssetLibraryAudit;
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  now?: string | Date;
};

export function createCreativeAssetIntelligenceCenter(
  input: CreativeAssetIntelligenceInput,
): CreativeAssetIntelligenceCenter {
  const checkedAt = normalizeNow(input.now).toISOString();
  const batchCleanupPreviews = createBatchCleanupPreviews(input.audit);
  const dependencyImpactSimulations = createDependencyImpactSimulations(input);
  const licenseGaps = input.audit.records.filter(isLicenseGap);
  const recommendations = createRecommendations({
    audit: input.audit,
    batchCleanupPreviews,
    dependencyImpactSimulations,
    licenseGaps,
  });
  const status = aggregateStatus([
    ...recommendations,
    ...batchCleanupPreviews,
    ...dependencyImpactSimulations,
  ]);
  const score = scoreIntelligence({
    status,
    recommendations,
    batchCleanupPreviews,
    dependencyImpactSimulations,
    assets: input.audit.records.length,
  });
  const affectedProjectIds = unique(
    dependencyImpactSimulations.flatMap((simulation) =>
      simulation.affectedProjects.map((project) => project.projectId),
    ),
  );
  const totals = {
    assets: input.audit.records.length,
    duplicateGroups: batchCleanupPreviews.length,
    cleanupCandidates: batchCleanupPreviews.reduce(
      (total, preview) => total + preview.removableAssetIds.length,
      0,
    ),
    reclaimBytes: batchCleanupPreviews.reduce(
      (total, preview) => total + preview.reclaimBytes,
      0,
    ),
    licenseGaps: licenseGaps.length,
    dependencyRisks: dependencyImpactSimulations.filter(
      (simulation) => simulation.status !== "ready",
    ).length,
    affectedProjects: affectedProjectIds.length,
    remediationActions: recommendations.length,
  };
  const nextActions = createNextActions(recommendations);
  const remediationPacket = createRemediationPacket({
    checkedAt,
    status,
    score,
    recommendations,
    batchCleanupPreviews,
    dependencyImpactSimulations,
    totals,
    nextActions,
  });

  return {
    status,
    score,
    checkedAt,
    recommendations,
    batchCleanupPreviews,
    dependencyImpactSimulations,
    remediationPacket,
    nextActions,
    totals,
  };
}

function createBatchCleanupPreviews(
  audit: AssetLibraryAudit,
): CreativeAssetBatchCleanupPreview[] {
  return audit.duplicateGroups.map((group) => {
    const retainAsset = group.assets[0];
    const candidates = group.assets.slice(1);
    const removableAssets = candidates.filter(canRemoveDuplicateAsset);
    const blockedAssets = candidates.filter(
      (asset) => !canRemoveDuplicateAsset(asset),
    );
    const reclaimBytes = removableAssets.reduce(
      (total, asset) => total + asset.sizeBytes,
      0,
    );
    const status: CreativeAssetIntelligenceStatus = removableAssets.length
      ? blockedAssets.length
        ? "review"
        : "ready"
      : "blocked";

    return {
      id: `cleanup-${group.key}`,
      title: `Duplicate cleanup for ${retainAsset?.name ?? group.mimeType}`,
      status,
      duplicateKey: group.key,
      retainAssetId: retainAsset?.id ?? "",
      removableAssetIds: removableAssets.map((asset) => asset.id),
      blockedAssetIds: blockedAssets.map((asset) => asset.id),
      reclaimBytes,
      reasons: createCleanupReasons({ group, removableAssets, blockedAssets }),
    };
  });
}

function createDependencyImpactSimulations(
  input: CreativeAssetIntelligenceInput,
): CreativeAssetDependencyImpactSimulation[] {
  const projectsById = new Map(
    input.projects.map((project) => [project.id, project]),
  );

  return input.audit.records
    .map((asset) =>
      createDependencyImpactSimulation({
        asset,
        projectsById,
        templates: input.templates,
        serverExportJobs: input.serverExportJobs,
        websitePublishes: input.websitePublishes,
      }),
    )
    .filter((simulation) => shouldKeepSimulation(simulation))
    .sort(compareSimulations)
    .slice(0, 10);
}

function createDependencyImpactSimulation(input: {
  asset: AssetAuditRecord;
  projectsById: Map<string, ProjectSummary>;
  templates: DesignTemplateSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
}): CreativeAssetDependencyImpactSimulation {
  const affectedProjects = createAffectedProjects({
    asset: input.asset,
    projectsById: input.projectsById,
  });
  const affectedProjectIds = new Set(
    affectedProjects.map((project) => project.projectId),
  );
  const affectedExports = input.serverExportJobs
    .filter((job) => affectedProjectIds.has(job.projectId))
    .map(
      (job): CreativeAssetImpactExport => ({
        exportJobId: job.id,
        projectId: job.projectId,
        status: job.status,
        fileName: job.fileName,
      }),
    );
  const affectedWebsites = input.websitePublishes
    .filter((publish) => affectedProjectIds.has(publish.projectId))
    .map(
      (publish): CreativeAssetImpactWebsite => ({
        publishId: publish.id,
        projectId: publish.projectId,
        title: publish.title,
        status: publish.status,
      }),
    );
  const affectedTemplates = input.templates
    .filter((template) =>
      affectedProjects.some(
        (project) =>
          template.name === project.projectName ||
          template.name === input.asset.name,
      ),
    )
    .map(
      (template): CreativeAssetImpactTemplate => ({
        templateId: template.id,
        name: template.name,
        status: template.marketplaceStatus,
      }),
    );
  const skippedReferences = input.asset.skippedReferenceCount ?? 0;
  const warnings = createDependencyWarnings({
    asset: input.asset,
    affectedExports,
    affectedWebsites,
    skippedReferences,
  });
  const riskScore = scoreDependencyImpact({
    asset: input.asset,
    affectedProjects,
    affectedExports,
    affectedWebsites,
    affectedTemplates,
    warnings,
  });
  const status = dependencyStatus({ riskScore, warnings });

  return {
    id: `impact-${input.asset.id}`,
    assetId: input.asset.id,
    assetName: input.asset.name,
    assetScope: input.asset.scope,
    status,
    riskScore,
    affectedProjects,
    affectedExports,
    affectedWebsites,
    affectedTemplates,
    skippedReferences,
    warnings,
  };
}

function createRecommendations(input: {
  audit: AssetLibraryAudit;
  batchCleanupPreviews: CreativeAssetBatchCleanupPreview[];
  dependencyImpactSimulations: CreativeAssetDependencyImpactSimulation[];
  licenseGaps: AssetAuditRecord[];
}): CreativeAssetRecommendation[] {
  const recommendations: CreativeAssetRecommendation[] = [];
  const cleanupPreviews = input.batchCleanupPreviews.filter(
    (preview) => preview.removableAssetIds.length > 0,
  );
  const reclaimBytes = cleanupPreviews.reduce(
    (total, preview) => total + preview.reclaimBytes,
    0,
  );
  const highImpactSimulations = input.dependencyImpactSimulations.filter(
    (simulation) => simulation.status !== "ready",
  );
  const unusedUploads = input.audit.records.filter(
    (asset) =>
      asset.scope === "uploads" &&
      !isDuplicateCandidate(asset, input.audit.duplicateGroups) &&
      (asset.referenceCount ?? 0) === 0 &&
      (isLicenseGap(asset) || asset.sizeBytes >= largeLooseUploadBytes),
  );

  if (cleanupPreviews.length) {
    recommendations.push({
      id: "duplicate-cleanup",
      kind: "duplicate-cleanup",
      title: "Clean duplicate creative assets",
      detail: `${cleanupPreviews.length} duplicate group${
        cleanupPreviews.length === 1 ? "" : "s"
      } can reclaim storage with newest assets retained.`,
      status: aggregateStatus(cleanupPreviews),
      priority: 90,
      assetIds: cleanupPreviews.flatMap((preview) => [
        preview.retainAssetId,
        ...preview.removableAssetIds,
      ]),
      affectedProjectIds: [],
      reclaimBytes,
      action:
        "Review duplicate cleanup preview before deleting removable copies.",
    });
  }

  if (input.licenseGaps.length) {
    const blocked = input.licenseGaps.some((asset) =>
      isRestrictedLicense(asset.licenseName),
    );

    recommendations.push({
      id: "license-remediation",
      kind: "license-remediation",
      title: "Repair source and license evidence",
      detail: `${input.licenseGaps.length} asset${
        input.licenseGaps.length === 1 ? "" : "s"
      } need source, author, or license metadata before confident export.`,
      status: blocked ? "blocked" : "review",
      priority: blocked ? 100 : 82,
      assetIds: input.licenseGaps.map((asset) => asset.id),
      affectedProjectIds: [],
      reclaimBytes: 0,
      action:
        "Attach provider, author, license, and source URL metadata to each flagged asset.",
    });
  }

  if (unusedUploads.length) {
    recommendations.push({
      id: "usage-optimization",
      kind: "usage-optimization",
      title: "Triage unreferenced uploads",
      detail: `${unusedUploads.length} upload${
        unusedUploads.length === 1 ? "" : "s"
      } are not tied to indexed project references.`,
      status: "review",
      priority: 64,
      assetIds: unusedUploads.map((asset) => asset.id),
      affectedProjectIds: [],
      reclaimBytes: unusedUploads.reduce(
        (total, asset) => total + asset.sizeBytes,
        0,
      ),
      action: "Move unreferenced uploads into a review shelf before cleanup.",
    });
  }

  if (highImpactSimulations.length) {
    recommendations.push({
      id: "dependency-impact",
      kind: "dependency-impact",
      title: "Simulate asset dependency impact",
      detail: `${highImpactSimulations.length} asset impact simulation${
        highImpactSimulations.length === 1 ? "" : "s"
      } include project, export, website, or skipped-reference risk.`,
      status: aggregateStatus(highImpactSimulations),
      priority: 88,
      assetIds: highImpactSimulations.map((simulation) => simulation.assetId),
      affectedProjectIds: unique(
        highImpactSimulations.flatMap((simulation) =>
          simulation.affectedProjects.map((project) => project.projectId),
        ),
      ),
      reclaimBytes: 0,
      action:
        "Open impact simulations before deleting, replacing, or relicensing affected assets.",
    });
  }

  return recommendations.sort(
    (left, right) =>
      statusWeight(left.status) - statusWeight(right.status) ||
      right.priority - left.priority ||
      left.title.localeCompare(right.title),
  );
}

function createAffectedProjects(input: {
  asset: AssetAuditRecord;
  projectsById: Map<string, ProjectSummary>;
}): CreativeAssetImpactProject[] {
  const project = input.projectsById.get(input.asset.id);

  if (input.asset.scope === "projects" && project) {
    return [
      {
        projectId: project.id,
        projectName: project.name,
        role: "manifest",
        href: `/editor/${project.id}`,
      },
    ];
  }

  if (input.asset.scope === "projects") {
    return [
      {
        projectId: input.asset.id,
        projectName: input.asset.name,
        role: "manifest",
        href: `/editor/${input.asset.id}`,
      },
    ];
  }

  return [];
}

function createDependencyWarnings(input: {
  asset: AssetAuditRecord;
  affectedExports: CreativeAssetImpactExport[];
  affectedWebsites: CreativeAssetImpactWebsite[];
  skippedReferences: number;
}) {
  const warnings: string[] = [];
  const failedExports = input.affectedExports.filter(
    (exportJob) => exportJob.status === "failed",
  );
  const publishedWebsites = input.affectedWebsites.filter(
    (website) => website.status === "published",
  );

  if (input.skippedReferences) {
    warnings.push(
      `${input.skippedReferences} skipped project asset reference${
        input.skippedReferences === 1 ? "" : "s"
      } need repair.`,
    );
  }

  if (failedExports.length) {
    warnings.push(
      `${failedExports.length} affected export job${
        failedExports.length === 1 ? "" : "s"
      } failed.`,
    );
  }

  if (publishedWebsites.length && input.skippedReferences) {
    warnings.push(
      "Published website surfaces depend on a manifest with skipped asset references.",
    );
  }

  if (isLicenseGap(input.asset)) {
    warnings.push("Asset metadata is missing source or license evidence.");
  }

  return warnings;
}

function createCleanupReasons(input: {
  group: AssetDuplicateGroup;
  removableAssets: AssetAuditRecord[];
  blockedAssets: AssetAuditRecord[];
}) {
  const reasons = [
    `${input.group.assets.length} assets share duplicate content metadata.`,
  ];

  if (input.removableAssets.length) {
    reasons.push(
      `${input.removableAssets.length} older upload${
        input.removableAssets.length === 1 ? "" : "s"
      } can be removed after preview.`,
    );
  }

  if (input.blockedAssets.length) {
    reasons.push(
      `${input.blockedAssets.length} duplicate${
        input.blockedAssets.length === 1 ? "" : "s"
      } are blocked by references, brand scope, or project manifests.`,
    );
  }

  return reasons;
}

function scoreDependencyImpact(input: {
  asset: AssetAuditRecord;
  affectedProjects: CreativeAssetImpactProject[];
  affectedExports: CreativeAssetImpactExport[];
  affectedWebsites: CreativeAssetImpactWebsite[];
  affectedTemplates: CreativeAssetImpactTemplate[];
  warnings: string[];
}) {
  const failedExports = input.affectedExports.filter(
    (exportJob) => exportJob.status === "failed",
  ).length;
  const publishedWebsites = input.affectedWebsites.filter(
    (website) => website.status === "published",
  ).length;

  return Math.min(
    100,
    input.affectedProjects.length * 18 +
      input.affectedExports.length * 8 +
      failedExports * 22 +
      publishedWebsites * 12 +
      input.affectedTemplates.length * 8 +
      input.warnings.length * 12 +
      (input.asset.skippedReferenceCount ?? 0) * 16,
  );
}

function dependencyStatus(input: {
  riskScore: number;
  warnings: string[];
}): CreativeAssetIntelligenceStatus {
  if (input.warnings.length >= 2) return "blocked";
  if (input.warnings.length || input.riskScore >= 85) return "review";

  return "ready";
}

function shouldKeepSimulation(
  simulation: CreativeAssetDependencyImpactSimulation,
) {
  return (
    simulation.assetScope === "projects" ||
    simulation.affectedProjects.length > 0 ||
    simulation.warnings.length > 0 ||
    simulation.riskScore > 0
  );
}

function canRemoveDuplicateAsset(asset: AssetAuditRecord) {
  return (
    asset.scope === "uploads" &&
    (asset.referenceCount ?? 0) === 0 &&
    !asset.skippedReferenceCount
  );
}

function isDuplicateCandidate(
  asset: AssetAuditRecord,
  duplicateGroups: AssetDuplicateGroup[],
) {
  return duplicateGroups.some((group) =>
    group.assets.slice(1).some((candidate) => candidate.id === asset.id),
  );
}

function isLicenseGap(asset: AssetAuditRecord) {
  if (asset.scope === "brand" || asset.scope === "projects") return false;

  return (
    !asset.sourceProvider ||
    !asset.sourceUrl ||
    !asset.authorName ||
    !asset.licenseName ||
    !asset.licenseUrl ||
    isRestrictedLicense(asset.licenseName)
  );
}

function isRestrictedLicense(value: string | null) {
  const normalized = (value ?? "").toLowerCase();

  return (
    normalized.includes("restricted") ||
    normalized.includes("editorial") ||
    normalized.includes("personal") ||
    normalized.includes("no commercial")
  );
}

const largeLooseUploadBytes = 5 * 1024 * 1024;

function scoreIntelligence(input: {
  status: CreativeAssetIntelligenceStatus;
  recommendations: CreativeAssetRecommendation[];
  batchCleanupPreviews: CreativeAssetBatchCleanupPreview[];
  dependencyImpactSimulations: CreativeAssetDependencyImpactSimulation[];
  assets: number;
}) {
  if (!input.assets) return 100;

  const blocked =
    input.recommendations.filter((item) => item.status === "blocked").length +
    input.batchCleanupPreviews.filter((item) => item.status === "blocked")
      .length +
    input.dependencyImpactSimulations.filter(
      (item) => item.status === "blocked",
    ).length;
  const review =
    input.recommendations.filter((item) => item.status === "review").length +
    input.batchCleanupPreviews.filter((item) => item.status === "review")
      .length +
    input.dependencyImpactSimulations.filter((item) => item.status === "review")
      .length;

  return Math.max(
    input.status === "ready" ? 86 : 20,
    Math.min(100, 100 - blocked * 18 - review * 7),
  );
}

function createNextActions(recommendations: CreativeAssetRecommendation[]) {
  return recommendations
    .filter((recommendation) => recommendation.status !== "ready")
    .slice(0, 6)
    .map(
      (recommendation) => `${recommendation.title}: ${recommendation.action}`,
    );
}

function createRemediationPacket(input: {
  checkedAt: string;
  status: CreativeAssetIntelligenceStatus;
  score: number;
  recommendations: CreativeAssetRecommendation[];
  batchCleanupPreviews: CreativeAssetBatchCleanupPreview[];
  dependencyImpactSimulations: CreativeAssetDependencyImpactSimulation[];
  totals: CreativeAssetIntelligenceCenter["totals"];
  nextActions: string[];
}): CreativeAssetRemediationPacket {
  const payload: CreativeAssetRemediationPacket["payload"] = {
    kind: "essence-studio.creative-asset-intelligence",
    version: 1,
    generatedAt: input.checkedAt,
    status: input.status,
    score: input.score,
    recommendations: input.recommendations.map((recommendation) => ({
      id: recommendation.id,
      kind: recommendation.kind,
      status: recommendation.status,
      priority: recommendation.priority,
      assetIds: recommendation.assetIds,
      affectedProjectIds: recommendation.affectedProjectIds,
      reclaimBytes: recommendation.reclaimBytes,
      action: recommendation.action,
    })),
    batchCleanupPreviews: input.batchCleanupPreviews.map((preview) => ({
      id: preview.id,
      status: preview.status,
      retainAssetId: preview.retainAssetId,
      removableAssetIds: preview.removableAssetIds,
      blockedAssetIds: preview.blockedAssetIds,
      reclaimBytes: preview.reclaimBytes,
    })),
    dependencyImpactSimulations: input.dependencyImpactSimulations.map(
      (simulation) => ({
        id: simulation.id,
        assetId: simulation.assetId,
        status: simulation.status,
        riskScore: simulation.riskScore,
        affectedProjectIds: simulation.affectedProjects.map(
          (project) => project.projectId,
        ),
        affectedExports: simulation.affectedExports.length,
        affectedWebsites: simulation.affectedWebsites.length,
        warnings: simulation.warnings,
      }),
    ),
    totals: input.totals,
    nextActions: input.nextActions,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    fileName: `essence-creative-asset-intelligence-${input.checkedAt.slice(0, 10)}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    payload,
  };
}

function compareSimulations(
  left: CreativeAssetDependencyImpactSimulation,
  right: CreativeAssetDependencyImpactSimulation,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.riskScore - left.riskScore ||
    left.assetName.localeCompare(right.assetName)
  );
}

function aggregateStatus(
  values: Array<{ status: CreativeAssetIntelligenceStatus }>,
): CreativeAssetIntelligenceStatus {
  if (values.some((value) => value.status === "blocked")) return "blocked";
  if (values.some((value) => value.status === "review")) return "review";

  return "ready";
}

function statusWeight(status: CreativeAssetIntelligenceStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

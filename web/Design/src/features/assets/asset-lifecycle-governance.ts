import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AdvancedBatchAssetOperationCenter } from "@/features/assets/advanced-batch-asset-operations";
import type {
  AssetAuditRecord,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type {
  AssetLifecycleGovernanceCenter,
  AssetLifecycleGovernanceStatus,
  AssetLifecycleSignedEvidencePacket,
  AssetLifecycleUsagePreview,
  AssetReplacementPlan,
  AssetRightsRenewal,
  AssetBulkRelinkPlan,
} from "@/features/assets/asset-lifecycle-governance-types";
import type {
  AssetProvenanceReviewCenter,
  AssetProvenanceReviewItem,
} from "@/features/assets/asset-provenance-review";
import type { CreativeAssetIntelligenceCenter } from "@/features/assets/creative-asset-intelligence";

export type {
  AssetBulkRelinkPlan,
  AssetLifecycleGovernanceCenter,
  AssetLifecycleGovernanceStatus,
  AssetLifecycleSignedEvidencePacket,
  AssetLifecycleUsagePreview,
  AssetReplacementPlan,
  AssetRightsRenewal,
} from "@/features/assets/asset-lifecycle-governance-types";

export function createAssetLifecycleGovernanceCenter(input: {
  audit: AssetLibraryAudit;
  provenanceReview: AssetProvenanceReviewCenter;
  batchOperations: AdvancedBatchAssetOperationCenter;
  creativeIntelligence: CreativeAssetIntelligenceCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
}): AssetLifecycleGovernanceCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const projectRegistry = createProjectRegistry(input);
  const riskItems = createRiskItems(input.provenanceReview.items);
  const riskAssetIds = new Set(riskItems.map((item) => item.id));
  const recordsById = new Map(
    input.audit.records.map((record) => [record.id, record]),
  );
  const rightsRenewals = createRightsRenewals({
    items: input.provenanceReview.expirationQueue,
    auditLogs: input.auditLogs,
  });
  const replacementPlans = createReplacementPlans({
    riskItems,
    records: input.audit.records,
    recordsById,
    riskAssetIds,
    projectRegistry,
    auditLogs: input.auditLogs,
  });
  const bulkRelinkPlans = createBulkRelinkPlans({
    replacementPlans,
    batchOperations: input.batchOperations,
    creativeIntelligence: input.creativeIntelligence,
  });
  const usageImpactPreviews = createUsageImpactPreviews({
    projectRegistry,
    replacementPlans,
    bulkRelinkPlans,
    batchOperations: input.batchOperations,
    creativeIntelligence: input.creativeIntelligence,
  });
  const status = aggregateStatus([
    ...rightsRenewals,
    ...replacementPlans,
    ...bulkRelinkPlans,
    ...usageImpactPreviews,
  ]);
  const auditEvidenceIds = unique([
    ...rightsRenewals.flatMap((renewal) => renewal.auditEvidenceIds),
    ...replacementPlans.flatMap((plan) => plan.auditEvidenceIds),
    ...createProjectAuditEvidence(input.auditLogs, projectRegistry),
  ]);
  const totals = {
    assets: input.audit.records.length,
    rightsRenewals: rightsRenewals.length,
    replacementPlans: replacementPlans.length,
    bulkRelinkPlans: bulkRelinkPlans.length,
    usageImpactPreviews: usageImpactPreviews.length,
    signedEvidencePackets: 0,
    blockedAssets: riskItems.filter((item) => item.status === "blocked").length,
    affectedProjects: projectRegistry.size,
    auditEvidence: auditEvidenceIds.length,
  };
  const score = scoreCenter({
    assets: input.audit.records.length,
    rightsRenewals,
    replacementPlans,
    bulkRelinkPlans,
    usageImpactPreviews,
  });
  const nextActions = createNextActions({
    rightsRenewals,
    replacementPlans,
    bulkRelinkPlans,
    usageImpactPreviews,
  });
  const signedEvidencePackets = createSignedEvidencePackets({
    generatedAt,
    status,
    score,
    rightsRenewals,
    replacementPlans,
    bulkRelinkPlans,
    usageImpactPreviews,
    auditEvidenceIds,
    totals: {
      ...totals,
      signedEvidencePackets: shouldCreatePacket({
        rightsRenewals,
        replacementPlans,
        bulkRelinkPlans,
        usageImpactPreviews,
      })
        ? 1
        : 0,
    },
    nextActions,
  });

  return {
    generatedAt,
    status,
    score,
    rightsRenewals,
    replacementPlans,
    bulkRelinkPlans,
    usageImpactPreviews,
    signedEvidencePackets,
    nextActions,
    totals: {
      ...totals,
      signedEvidencePackets: signedEvidencePackets.length,
    },
  };
}

function createRightsRenewals(input: {
  items: AssetProvenanceReviewItem[];
  auditLogs: WorkspaceAuditLogSummary[];
}): AssetRightsRenewal[] {
  return input.items.map((item) => ({
    id: `rights-renewal-${item.id}`,
    assetId: item.id,
    assetName: item.name,
    status: item.status === "blocked" ? "blocked" : "review",
    reviewDueAt: item.reviewDueAt,
    renewalReason:
      item.exportWarnings.find((warning) =>
        warning.toLowerCase().includes("license review"),
      ) ?? "License review is due before this asset is reused.",
    action: `Renew or confirm rights for ${item.name} before export reuse.`,
    auditEvidenceIds: matchAuditEvidence(input.auditLogs, [item.id]),
  }));
}

function createReplacementPlans(input: {
  riskItems: AssetProvenanceReviewItem[];
  records: AssetAuditRecord[];
  recordsById: Map<string, AssetAuditRecord>;
  riskAssetIds: Set<string>;
  projectRegistry: Map<string, string>;
  auditLogs: WorkspaceAuditLogSummary[];
}): AssetReplacementPlan[] {
  const affectedProjectIds = [...input.projectRegistry.keys()];

  return input.riskItems.map((item) => {
    const sourceRecord = input.recordsById.get(item.id);
    const replacement = sourceRecord
      ? findReplacementCandidate({
          source: sourceRecord,
          records: input.records,
          riskAssetIds: input.riskAssetIds,
        })
      : null;

    return {
      id: `replacement-${item.id}`,
      sourceAssetId: item.id,
      sourceAssetName: item.name,
      replacementAssetId: replacement?.id ?? null,
      replacementAssetName: replacement?.name ?? null,
      status:
        item.status === "blocked"
          ? "blocked"
          : replacement
            ? "review"
            : "blocked",
      affectedProjectIds,
      affectedProjectNames: affectedProjectIds.map(
        (projectId) => input.projectRegistry.get(projectId) ?? projectId,
      ),
      propagationSteps: createPropagationSteps({ item, replacement }),
      rollbackNotes: [
        "Keep original asset IDs in the evidence packet before changing references.",
        "Re-export affected projects and compare visual output before removing the old asset.",
        "Restore source asset references from the packet if any published surface regresses.",
      ],
      auditEvidenceIds: matchAuditEvidence(input.auditLogs, [
        item.id,
        ...affectedProjectIds,
      ]),
    };
  });
}

function createBulkRelinkPlans(input: {
  replacementPlans: AssetReplacementPlan[];
  batchOperations: AdvancedBatchAssetOperationCenter;
  creativeIntelligence: CreativeAssetIntelligenceCenter;
}): AssetBulkRelinkPlan[] {
  const relinkable = input.replacementPlans.filter(
    (plan) => plan.replacementAssetId && plan.affectedProjectIds.length,
  );

  if (!relinkable.length) return [];

  const projectIds = unique(
    relinkable.flatMap((plan) => plan.affectedProjectIds),
  );
  const warnings = unique([
    ...input.batchOperations.usageImpactPreviews.flatMap(
      (preview) => preview.warnings,
    ),
    ...input.creativeIntelligence.dependencyImpactSimulations.flatMap(
      (simulation) => simulation.warnings,
    ),
  ]);

  return projectIds.map((projectId) => {
    const plans = relinkable.filter((plan) =>
      plan.affectedProjectIds.includes(projectId),
    );

    return {
      id: `bulk-relink-${projectId}`,
      label: `Bulk relink ${plans.length} governed asset replacement${
        plans.length === 1 ? "" : "s"
      }`,
      status: plans.some((plan) => plan.status === "blocked")
        ? "blocked"
        : warnings.length
          ? "review"
          : "ready",
      sourceAssetIds: plans.map((plan) => plan.sourceAssetId),
      replacementAssetIds: unique(
        plans.flatMap((plan) =>
          plan.replacementAssetId ? [plan.replacementAssetId] : [],
        ),
      ),
      targetProjectIds: [projectId],
      operationCount: plans.length,
      warnings,
    };
  });
}

function createUsageImpactPreviews(input: {
  projectRegistry: Map<string, string>;
  replacementPlans: AssetReplacementPlan[];
  bulkRelinkPlans: AssetBulkRelinkPlan[];
  batchOperations: AdvancedBatchAssetOperationCenter;
  creativeIntelligence: CreativeAssetIntelligenceCenter;
}): AssetLifecycleUsagePreview[] {
  return [...input.projectRegistry.entries()].map(
    ([projectId, projectName]) => {
      const relinkPlanIds = input.bulkRelinkPlans
        .filter((plan) => plan.targetProjectIds.includes(projectId))
        .map((plan) => plan.id);
      const sourceAssetIds = unique(
        input.replacementPlans
          .filter((plan) => plan.affectedProjectIds.includes(projectId))
          .map((plan) => plan.sourceAssetId),
      );
      const warnings = unique([
        ...input.batchOperations.usageImpactPreviews
          .filter((preview) => preview.projectId === projectId)
          .flatMap((preview) => preview.warnings),
        ...input.creativeIntelligence.dependencyImpactSimulations
          .flatMap((simulation) => simulation.affectedProjects)
          .filter((project) => project.projectId === projectId)
          .map(
            (project) =>
              `${project.projectName} is in the asset dependency graph.`,
          ),
        ...input.creativeIntelligence.dependencyImpactSimulations
          .filter((simulation) =>
            simulation.affectedProjects.some(
              (project) => project.projectId === projectId,
            ),
          )
          .flatMap((simulation) => simulation.warnings),
      ]);

      return {
        id: `lifecycle-usage-${projectId}`,
        projectId,
        projectName,
        status: relinkPlanIds.some((planId) =>
          input.bulkRelinkPlans.some(
            (plan) => plan.id === planId && plan.status === "blocked",
          ),
        )
          ? "review"
          : warnings.length
            ? "review"
            : "ready",
        relinkPlanIds,
        sourceAssetIds,
        warnings,
      };
    },
  );
}

function createSignedEvidencePackets(input: {
  generatedAt: string;
  status: AssetLifecycleGovernanceStatus;
  score: number;
  rightsRenewals: AssetRightsRenewal[];
  replacementPlans: AssetReplacementPlan[];
  bulkRelinkPlans: AssetBulkRelinkPlan[];
  usageImpactPreviews: AssetLifecycleUsagePreview[];
  auditEvidenceIds: string[];
  totals: AssetLifecycleGovernanceCenter["totals"];
  nextActions: string[];
}): AssetLifecycleSignedEvidencePacket[] {
  if (!shouldCreatePacket(input)) return [];

  const renewalIds = input.rightsRenewals.map((renewal) => renewal.id);
  const replacementPlanIds = input.replacementPlans.map((plan) => plan.id);
  const relinkPlanIds = input.bulkRelinkPlans.map((plan) => plan.id);
  const usagePreviewIds = input.usageImpactPreviews.map(
    (preview) => preview.id,
  );
  const payloadWithoutSignature = {
    kind: "essence-studio.asset-lifecycle-governance",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    renewalIds,
    replacementPlanIds,
    relinkPlanIds,
    usagePreviewIds,
    auditEvidenceIds: input.auditEvidenceIds,
    totals: input.totals,
    nextActions: input.nextActions,
  };
  const signature = `essence-signature-${hashString(
    JSON.stringify(payloadWithoutSignature),
  )}`;
  const payload = {
    ...payloadWithoutSignature,
    signature,
  };
  const json = JSON.stringify(payload, null, 2);

  return [
    {
      id: "asset-lifecycle-governance-packet",
      status: input.status,
      generatedAt: input.generatedAt,
      signature,
      fileName: `essence-asset-lifecycle-governance-${input.generatedAt.slice(0, 10)}.json`,
      dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
      renewalIds,
      replacementPlanIds,
      relinkPlanIds,
      usagePreviewIds,
      auditEvidenceIds: input.auditEvidenceIds,
    },
  ];
}

function createRiskItems(items: AssetProvenanceReviewItem[]) {
  return items.filter(
    (item) =>
      item.status === "blocked" || item.licenseStatus === "expires-soon",
  );
}

function createProjectRegistry(input: {
  batchOperations: AdvancedBatchAssetOperationCenter;
  creativeIntelligence: CreativeAssetIntelligenceCenter;
}) {
  const registry = new Map<string, string>();

  for (const preview of input.batchOperations.usageImpactPreviews) {
    registry.set(preview.projectId, preview.projectName);
  }

  for (const simulation of input.creativeIntelligence
    .dependencyImpactSimulations) {
    for (const project of simulation.affectedProjects) {
      registry.set(project.projectId, project.projectName);
    }
  }

  return registry;
}

function findReplacementCandidate(input: {
  source: AssetAuditRecord;
  records: AssetAuditRecord[];
  riskAssetIds: Set<string>;
}) {
  return input.records.find(
    (record) =>
      record.id !== input.source.id &&
      record.mimeType === input.source.mimeType &&
      !input.riskAssetIds.has(record.id) &&
      isExportSafeReplacement(record),
  );
}

function isExportSafeReplacement(record: AssetAuditRecord) {
  return (
    record.scope !== "projects" &&
    Boolean(record.sourceProvider || record.sourceUrl) &&
    Boolean(record.authorName) &&
    Boolean(record.licenseName || record.licenseUrl) &&
    !isRestrictedLicense(record.licenseName)
  );
}

function createPropagationSteps(input: {
  item: AssetProvenanceReviewItem;
  replacement: AssetAuditRecord | null | undefined;
}) {
  if (!input.replacement) {
    return [
      `Hold ${input.item.name} in review until a compatible replacement is approved.`,
      "Export a dependency preview before removing or changing any existing reference.",
    ];
  }

  return [
    `Create a replacement derivative from ${input.replacement.name}.`,
    `Relink affected project references away from ${input.item.name}.`,
    "Run export previews for every affected project before publishing.",
  ];
}

function createProjectAuditEvidence(
  auditLogs: WorkspaceAuditLogSummary[],
  projectRegistry: Map<string, string>,
) {
  return matchAuditEvidence(auditLogs, [...projectRegistry.keys()]);
}

function matchAuditEvidence(
  auditLogs: WorkspaceAuditLogSummary[],
  ids: string[],
) {
  const idSet = new Set(ids.filter(Boolean));

  return auditLogs
    .filter((log) => {
      if (log.targetId && idSet.has(log.targetId)) return true;

      return Object.values(log.metadata).some(
        (value) => typeof value === "string" && idSet.has(value),
      );
    })
    .map((log) => log.id);
}

function scoreCenter(input: {
  assets: number;
  rightsRenewals: AssetRightsRenewal[];
  replacementPlans: AssetReplacementPlan[];
  bulkRelinkPlans: AssetBulkRelinkPlan[];
  usageImpactPreviews: AssetLifecycleUsagePreview[];
}) {
  if (!input.assets) return 100;

  const blocked =
    countStatus(input.rightsRenewals, "blocked") +
    countStatus(input.replacementPlans, "blocked") +
    countStatus(input.bulkRelinkPlans, "blocked") +
    countStatus(input.usageImpactPreviews, "blocked");
  const review =
    countStatus(input.rightsRenewals, "review") +
    countStatus(input.replacementPlans, "review") +
    countStatus(input.bulkRelinkPlans, "review") +
    countStatus(input.usageImpactPreviews, "review");

  return Math.max(0, Math.min(100, 100 - blocked * 16 - review * 6));
}

function createNextActions(input: {
  rightsRenewals: AssetRightsRenewal[];
  replacementPlans: AssetReplacementPlan[];
  bulkRelinkPlans: AssetBulkRelinkPlan[];
  usageImpactPreviews: AssetLifecycleUsagePreview[];
}) {
  return [
    input.rightsRenewals[0] ? `${input.rightsRenewals[0].action}` : null,
    input.replacementPlans.find((plan) => plan.status === "blocked")
      ? `Approve replacement propagation for ${
          input.replacementPlans.find((plan) => plan.status === "blocked")
            ?.sourceAssetName
        }.`
      : null,
    input.bulkRelinkPlans[0]
      ? `${input.bulkRelinkPlans[0].label}: preview ${input.bulkRelinkPlans[0].operationCount} relink operations.`
      : null,
    input.usageImpactPreviews.find((preview) => preview.warnings.length)
      ? `Review lifecycle usage warnings for ${
          input.usageImpactPreviews.find((preview) => preview.warnings.length)
            ?.projectName
        }.`
      : null,
  ]
    .filter((action): action is string => Boolean(action))
    .slice(0, 5);
}

function aggregateStatus(
  values: Array<{ status: AssetLifecycleGovernanceStatus }>,
) {
  if (values.some((value) => value.status === "blocked")) return "blocked";
  if (values.some((value) => value.status === "review")) return "review";

  return "ready";
}

function shouldCreatePacket(input: {
  rightsRenewals: AssetRightsRenewal[];
  replacementPlans: AssetReplacementPlan[];
  bulkRelinkPlans: AssetBulkRelinkPlan[];
  usageImpactPreviews: AssetLifecycleUsagePreview[];
}) {
  return Boolean(
    input.rightsRenewals.length ||
    input.replacementPlans.length ||
    input.bulkRelinkPlans.length ||
    input.usageImpactPreviews.length,
  );
}

function countStatus(
  values: Array<{ status: AssetLifecycleGovernanceStatus }>,
  status: AssetLifecycleGovernanceStatus,
) {
  return values.filter((value) => value.status === status).length;
}

function isRestrictedLicense(value: string | null) {
  const normalized = (value ?? "").toLowerCase();

  return (
    normalized.includes("restricted") ||
    normalized.includes("editorial") ||
    normalized.includes("non-commercial") ||
    normalized.includes("noncommercial") ||
    normalized.includes("personal") ||
    normalized.includes("trial") ||
    normalized.includes("unknown")
  );
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

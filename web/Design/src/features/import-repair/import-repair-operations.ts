import {
  importRepairCapabilities,
  importRepairFormats,
} from "@/features/import-repair/import-repair-capabilities";
import {
  createImportRepairEvidencePacket,
  createImportRepairEvidenceProjects,
} from "@/features/import-repair/import-repair-evidence";
import type {
  ImportRepairCapability,
  ImportRepairOperation,
  ImportRepairOperationsCenter,
  ImportRepairOperationsInput,
  ImportRepairStatus,
} from "@/features/import-repair/import-repair-operations-types";

export type {
  ImportRepairEvidencePacket,
  ImportRepairEvidenceProject,
  ImportRepairFormat,
  ImportRepairMappingDiff,
  ImportRepairOperation,
  ImportRepairOperationsCenter,
  ImportRepairOperationsInput,
  ImportRepairRetryStrategy,
  ImportRepairSeverity,
  ImportRepairStatus,
} from "@/features/import-repair/import-repair-operations-types";

export function createImportRepairOperationsCenter(
  input: ImportRepairOperationsInput,
): ImportRepairOperationsCenter {
  const generatedAt = input.generatedAt ?? createGeneratedAt(input);
  const operations = importRepairFormats.map((format) =>
    createImportRepairOperation({
      ...input,
      capability: importRepairCapabilities[format],
      generatedAt,
    }),
  );
  const evidencedOperations = operations.filter(
    (operation) => operation.evidenceProjects.length > 0,
  );
  const score = evidencedOperations.length
    ? clampScore(
        average(evidencedOperations.map((operation) => operation.score)) *
          0.78 +
          Math.round((evidencedOperations.length / operations.length) * 100) *
            0.22,
      )
    : average(operations.map((operation) => operation.score));
  const projectsWithEvidence = new Set(
    operations.flatMap((operation) =>
      operation.evidenceProjects.map((project) => project.projectId),
    ),
  ).size;

  return {
    status: scoreToCenterStatus(score, projectsWithEvidence),
    score,
    generatedAt,
    operations,
    nextActions: createImportRepairNextActions(operations),
    totals: {
      formats: operations.length,
      readyFormats: operations.filter(
        (operation) => operation.status === "ready",
      ).length,
      blockedFormats: operations.filter(
        (operation) => operation.status === "blocked",
      ).length,
      mappingDiffs: operations.reduce(
        (total, operation) => total + operation.mappingDiffs.length,
        0,
      ),
      retryStrategies: operations.length,
      evidencePackets: operations.length,
      projectsWithEvidence,
    },
  };
}

function createImportRepairOperation(
  input: ImportRepairOperationsInput & {
    capability: ImportRepairCapability;
    generatedAt: string;
  },
): ImportRepairOperation {
  const evidenceProjects = createImportRepairEvidenceProjects(input);
  const score = scoreOperation(input.capability, evidenceProjects);
  const status = scoreToStatus(
    score,
    evidenceProjects.length === 0 ||
      evidenceProjects.some((project) => project.status === "blocked"),
  );
  const evidencePacket = createImportRepairEvidencePacket({
    capability: input.capability,
    status,
    generatedAt: input.generatedAt,
    evidenceProjects,
  });

  return {
    format: input.capability.format,
    label: input.capability.label,
    sourceNoun: input.capability.sourceNoun,
    status,
    score,
    acceptedSources: input.capability.acceptedSources,
    sourceLimits: input.capability.sourceLimits,
    capabilitySummary: input.capability.capabilitySummary,
    mappingDiffs: input.capability.mappingDiffs,
    retryStrategy: input.capability.retryStrategy,
    evidenceProjects,
    evidencePacket,
    latestEvidenceAt:
      evidenceProjects
        .map((project) => project.latestAt)
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null,
  };
}

function scoreOperation(
  capability: ImportRepairCapability,
  evidenceProjects: ImportRepairOperation["evidenceProjects"],
) {
  if (!evidenceProjects.length) return 32;

  const averageReadiness = average(
    evidenceProjects.map((project) => project.readinessScore),
  );
  const versionCoverage =
    evidenceProjects.filter((project) => project.hasVersion).length /
    evidenceProjects.length;
  const auditCoverage =
    evidenceProjects.filter((project) => project.auditScore !== null).length /
    evidenceProjects.length;
  const logCoverage =
    evidenceProjects.filter((project) => project.auditLogCount > 0).length /
    evidenceProjects.length;
  const severityPenalty = capability.mappingDiffs.reduce((total, diff) => {
    if (diff.severity === "blocked") return total + 12;
    if (diff.severity === "review") return total + 6;

    return total + 2;
  }, 0);
  const evidenceBonus = Math.round(
    versionCoverage * 8 + auditCoverage * 8 + logCoverage * 4,
  );

  return clampScore(averageReadiness + evidenceBonus - severityPenalty);
}

function createImportRepairNextActions(operations: ImportRepairOperation[]) {
  return operations
    .filter((operation) => operation.status !== "ready")
    .sort(compareOperations)
    .map((operation) => {
      const project = operation.evidenceProjects[0];
      const diff =
        operation.mappingDiffs.find((item) => item.severity === "blocked") ??
        operation.mappingDiffs.find((item) => item.severity === "review") ??
        operation.mappingDiffs[0];

      if (!project) {
        return `${operation.label}: Import a ${operation.sourceNoun} and run a repair evidence packet.`;
      }

      return `${operation.label}: ${project.projectName} - ${diff?.repair ?? operation.retryStrategy.fallback}`;
    })
    .slice(0, 5);
}

function compareOperations(
  left: ImportRepairOperation,
  right: ImportRepairOperation,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    importRepairFormats.indexOf(left.format) -
      importRepairFormats.indexOf(right.format)
  );
}

function scoreToCenterStatus(
  score: number,
  projectsWithEvidence: number,
): ImportRepairStatus {
  if (projectsWithEvidence === 0 || score < 50) return "blocked";
  if (score < 88) return "review";

  return "ready";
}

function scoreToStatus(score: number, hasBlocked: boolean): ImportRepairStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 86) return "review";

  return "ready";
}

function average(values: number[]) {
  if (!values.length) return 0;

  return clampScore(
    Math.round(
      values.reduce((total, value) => total + value, 0) / values.length,
    ),
  );
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusWeight(status: ImportRepairStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function createGeneratedAt(input: ImportRepairOperationsInput) {
  return (
    [
      ...input.projects.map((project) => project.updatedAt),
      ...input.projectAudits.map((audit) => audit.updatedAt),
      ...input.projectVersions.map((version) => version.createdAt),
      ...input.auditLogs.map((log) => log.createdAt),
    ].sort((left, right) => Date.parse(right) - Date.parse(left))[0] ??
    new Date().toISOString()
  );
}

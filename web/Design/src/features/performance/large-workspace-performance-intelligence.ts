import type {
  AssetAuditRecord,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type {
  LargeWorkspaceDocumentBudget,
  LargeWorkspacePerformanceIntelligenceCenter,
  LargeWorkspacePerformanceStatus,
  LargeWorkspaceRecoveryRecommendation,
  LargeWorkspaceSlowSurface,
  LargeWorkspaceSlowSurfaceDiagnostic,
  LargeWorkspaceTelemetryPacket,
} from "@/features/performance/large-workspace-performance-intelligence-types";

export type {
  LargeWorkspaceDocumentBudget,
  LargeWorkspacePerformanceIntelligenceCenter,
  LargeWorkspacePerformanceStatus,
  LargeWorkspaceRecoveryRecommendation,
  LargeWorkspaceSlowSurface,
  LargeWorkspaceSlowSurfaceDiagnostic,
  LargeWorkspaceTelemetryPacket,
} from "@/features/performance/large-workspace-performance-intelligence-types";

const canvasReviewPixels = 16_000_000;
const canvasBlockedPixels = 50_000_000;
const assetReviewBytes = 24 * 1024 * 1024;
const assetBlockedBytes = 64 * 1024 * 1024;
const versionReviewCount = 10;
const versionBlockedCount = 20;
const skippedReferenceReviewCount = 1;
const skippedReferenceBlockedCount = 5;
const slowExportReviewMs = 2 * 60 * 1000;
const slowExportBlockedMs = 5 * 60 * 1000;
const exportArtifactReviewBytes = 12 * 1024 * 1024;
const exportArtifactBlockedBytes = 32 * 1024 * 1024;

export function createLargeWorkspacePerformanceIntelligenceCenter(input: {
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  assetAudit: AssetLibraryAudit;
  now?: Date | string;
}): LargeWorkspacePerformanceIntelligenceCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const auditByProject = new Map(
    input.projectAudits.map((audit) => [audit.projectId, audit]),
  );
  const projectAssetById = new Map(
    input.assetAudit.records
      .filter((record) => record.scope === "projects")
      .map((record) => [record.id, record]),
  );
  const documentBudgets = activeProjects
    .map((project) =>
      createDocumentBudget({
        project,
        audit: auditByProject.get(project.id) ?? null,
        versions: input.projectVersions.filter(
          (version) => version.projectId === project.id,
        ),
        exports: input.serverExportJobs.filter(
          (job) => job.projectId === project.id,
        ),
        assetRecord: projectAssetById.get(project.id) ?? null,
      }),
    )
    .sort(compareBudgets);
  const recoveryRecommendations =
    createRecoveryRecommendations(documentBudgets);
  const recommendationByProject = new Map(
    recoveryRecommendations.map((recommendation) => [
      recommendation.projectId,
      recommendation,
    ]),
  );
  const slowSurfaceDiagnostics = documentBudgets.flatMap((budget) =>
    createSlowSurfaceDiagnostics({
      budget,
      exports: input.serverExportJobs.filter(
        (job) => job.projectId === budget.projectId,
      ),
      recommendation:
        recommendationByProject.get(budget.projectId) ??
        createFallbackRecommendation(budget),
    }),
  );
  const status = aggregateStatus([
    ...documentBudgets.map((budget) => budget.status),
    ...slowSurfaceDiagnostics.map((diagnostic) => diagnostic.status),
  ]);
  const score = average(
    documentBudgets.map((budget) => budget.score),
    100,
  );
  const nextActions = createNextActions({
    documentBudgets,
    slowSurfaceDiagnostics,
    recoveryRecommendations,
  });

  return {
    generatedAt,
    status,
    score,
    documentBudgets,
    slowSurfaceDiagnostics,
    recoveryRecommendations,
    telemetryPacket: createTelemetryPacket({
      generatedAt,
      status,
      score,
      documentBudgets,
      slowSurfaceDiagnostics,
      recoveryRecommendations,
      nextActions,
    }),
    nextActions,
    totals: {
      projects: activeProjects.length,
      documentBudgets: documentBudgets.length,
      slowSurfaceDiagnostics: slowSurfaceDiagnostics.length,
      recoveryRecommendations: recoveryRecommendations.length,
      telemetryPackets: 1,
      blockedProjects: documentBudgets.filter(
        (budget) => budget.status === "blocked",
      ).length,
      totalAssetBytes: documentBudgets.reduce(
        (total, budget) => total + budget.assetBytes,
        0,
      ),
    },
  };
}

function createDocumentBudget(input: {
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  versions: ProjectVersionSummary[];
  exports: ServerExportJobSummary[];
  assetRecord: AssetAuditRecord | null;
}): LargeWorkspaceDocumentBudget {
  const canvasPixels = input.project.width * input.project.height;
  const assetBytes = input.assetRecord?.sizeBytes ?? 0;
  const exportArtifactBytes = input.exports.reduce(
    (total, job) => total + (job.artifactSizeBytes ?? 0),
    0,
  );
  const budgetStatuses: LargeWorkspacePerformanceStatus[] = [
    classifyNumber(canvasPixels, canvasReviewPixels, canvasBlockedPixels),
    classifyNumber(assetBytes, assetReviewBytes, assetBlockedBytes),
    classifyNumber(
      input.versions.length,
      versionReviewCount,
      versionBlockedCount,
    ),
    classifyNumber(
      input.assetRecord?.skippedReferenceCount ?? 0,
      skippedReferenceReviewCount,
      skippedReferenceBlockedCount,
    ),
    classifyNumber(
      exportArtifactBytes,
      exportArtifactReviewBytes,
      exportArtifactBlockedBytes,
    ),
    mapAuditStatus(input.audit?.status ?? null),
  ];
  const status = aggregateStatus(budgetStatuses);
  const score = average([
    inverseScore(canvasPixels, canvasReviewPixels, canvasBlockedPixels),
    inverseScore(assetBytes, assetReviewBytes, assetBlockedBytes),
    inverseScore(
      input.versions.length,
      versionReviewCount,
      versionBlockedCount,
    ),
    inverseScore(
      input.assetRecord?.skippedReferenceCount ?? 0,
      skippedReferenceReviewCount,
      skippedReferenceBlockedCount,
    ),
    inverseScore(
      exportArtifactBytes,
      exportArtifactReviewBytes,
      exportArtifactBlockedBytes,
    ),
    input.audit?.overallScore ?? 60,
  ]);

  return {
    id: `document-budget-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    status,
    score,
    canvasPixels,
    assetBytes,
    assetReferenceCount: input.assetRecord?.referenceCount ?? 0,
    skippedReferenceCount: input.assetRecord?.skippedReferenceCount ?? 0,
    versionCount: input.versions.length,
    exportArtifactBytes,
    auditScore: input.audit?.overallScore ?? null,
    detail: `${input.project.name} uses ${formatNumber(canvasPixels)} canvas pixels, ${formatBytes(assetBytes)} in project assets, ${input.versions.length} versions, and ${formatBytes(exportArtifactBytes)} in export artifacts.`,
  };
}

function createSlowSurfaceDiagnostics(input: {
  budget: LargeWorkspaceDocumentBudget;
  exports: ServerExportJobSummary[];
  recommendation: LargeWorkspaceRecoveryRecommendation;
}): LargeWorkspaceSlowSurfaceDiagnostic[] {
  const diagnostics: LargeWorkspaceSlowSurfaceDiagnostic[] = [];

  if (input.budget.canvasPixels >= canvasReviewPixels) {
    diagnostics.push(
      createDiagnostic({
        budget: input.budget,
        surface: "editor-canvas",
        status: classifyNumber(
          input.budget.canvasPixels,
          canvasReviewPixels,
          canvasBlockedPixels,
        ),
        metricLabel: `${formatNumber(input.budget.canvasPixels)} px`,
        detail:
          input.budget.canvasPixels >= canvasBlockedPixels
            ? "Canvas dimensions exceed the large-document budget and can slow selection, zooming, and thumbnail generation."
            : "Canvas dimensions are above the review budget for low-memory workstations.",
        recommendation: input.recommendation,
      }),
    );
  }

  if (
    input.budget.assetBytes >= assetReviewBytes ||
    input.budget.skippedReferenceCount >= skippedReferenceReviewCount
  ) {
    diagnostics.push(
      createDiagnostic({
        budget: input.budget,
        surface: "asset-manifest",
        status: aggregateStatus([
          classifyNumber(
            input.budget.assetBytes,
            assetReviewBytes,
            assetBlockedBytes,
          ),
          classifyNumber(
            input.budget.skippedReferenceCount,
            skippedReferenceReviewCount,
            skippedReferenceBlockedCount,
          ),
        ]),
        metricLabel: `${formatBytes(input.budget.assetBytes)} / ${input.budget.assetReferenceCount} refs`,
        detail: `${input.budget.skippedReferenceCount} skipped references and ${formatBytes(input.budget.assetBytes)} of project assets should be optimized before heavy editing.`,
        recommendation: input.recommendation,
      }),
    );
  }

  if (input.budget.versionCount >= versionReviewCount) {
    diagnostics.push(
      createDiagnostic({
        budget: input.budget,
        surface: "version-history",
        status: classifyNumber(
          input.budget.versionCount,
          versionReviewCount,
          versionBlockedCount,
        ),
        metricLabel: `${input.budget.versionCount} versions`,
        detail:
          "Large version history increases restore and dashboard scanning cost.",
        recommendation: input.recommendation,
      }),
    );
  }

  const slowExports = input.exports.filter((job) => {
    if (job.status !== "completed" || !job.completedAt) return false;

    return durationMs(job.createdAt, job.completedAt) >= slowExportReviewMs;
  });

  for (const job of slowExports.slice(0, 2)) {
    diagnostics.push(
      createDiagnostic({
        budget: input.budget,
        surface: "export-pipeline",
        status:
          durationMs(job.createdAt, job.completedAt ?? job.updatedAt) >=
          slowExportBlockedMs
            ? "blocked"
            : "review",
        metricLabel: formatDuration(
          durationMs(job.createdAt, job.completedAt ?? job.updatedAt),
        ),
        detail: `${job.formatLabel} export took ${formatDuration(
          durationMs(job.createdAt, job.completedAt ?? job.updatedAt),
        )}; consider splitting pages or reducing raster asset weight.`,
        recommendation: input.recommendation,
      }),
    );
  }

  if (input.budget.auditScore !== null && input.budget.auditScore < 70) {
    diagnostics.push(
      createDiagnostic({
        budget: input.budget,
        surface: "audit-readiness",
        status: input.budget.auditScore < 55 ? "blocked" : "review",
        metricLabel: `${input.budget.auditScore}/100 audit`,
        detail:
          "Project audit score is low enough that performance and readiness cleanup should be batched together.",
        recommendation: input.recommendation,
      }),
    );
  }

  return diagnostics;
}

function createDiagnostic(input: {
  budget: LargeWorkspaceDocumentBudget;
  surface: LargeWorkspaceSlowSurface;
  status: LargeWorkspacePerformanceStatus;
  metricLabel: string;
  detail: string;
  recommendation: LargeWorkspaceRecoveryRecommendation;
}): LargeWorkspaceSlowSurfaceDiagnostic {
  return {
    id: `${input.surface}-${input.budget.projectId}`,
    projectId: input.budget.projectId,
    projectName: input.budget.projectName,
    surface: input.surface,
    status: input.status,
    metricLabel: input.metricLabel,
    detail: input.detail,
    recoveryRecommendationId: input.recommendation.id,
  };
}

function createRecoveryRecommendations(
  budgets: LargeWorkspaceDocumentBudget[],
): LargeWorkspaceRecoveryRecommendation[] {
  return budgets.flatMap((budget) => {
    if (budget.status === "ready") return [];

    const recommendations: LargeWorkspaceRecoveryRecommendation[] = [];

    if (budget.canvasPixels >= canvasReviewPixels) {
      recommendations.push(
        createRecommendation({
          budget,
          id: "canvas-windowing",
          title: "Window heavy editor surfaces",
          impact:
            "Reduces editor stalls during selection, zooming, and thumbnail scans.",
          steps: [
            "Window page, layer, and thumbnail panels before opening the full document.",
            "Keep the selected page and active layers visible while hiding distant rows.",
            "Defer non-visible preview rendering until the user scrolls.",
          ],
        }),
      );
    }

    if (
      budget.assetBytes >= assetReviewBytes ||
      budget.skippedReferenceCount >= skippedReferenceReviewCount
    ) {
      recommendations.push(
        createRecommendation({
          budget,
          id: "asset-weight",
          title: "Reduce project asset pressure",
          impact:
            "Cuts manifest load cost and lowers memory pressure on low-end machines.",
          steps: [
            "Compress oversized project assets and convert eligible rasters to WebP derivatives.",
            "Repair skipped asset references so manifests stay resumable.",
            "Move unused source files out of the active project manifest.",
          ],
        }),
      );
    }

    if (budget.versionCount >= versionReviewCount) {
      recommendations.push(
        createRecommendation({
          budget,
          id: "version-history",
          title: "Trim version history pressure",
          impact: "Keeps restore, dashboard, and handoff scans responsive.",
          steps: [
            "Archive older project versions after creating a fresh handoff checkpoint.",
            "Keep the latest approved and latest working versions pinned.",
          ],
        }),
      );
    }

    if (budget.exportArtifactBytes >= exportArtifactReviewBytes) {
      recommendations.push(
        createRecommendation({
          budget,
          id: "export-artifacts",
          title: "Split heavy export artifacts",
          impact:
            "Reduces export retries and avoids oversized artifact storage.",
          steps: [
            "Split export runs by format or page range to avoid oversized artifacts.",
            "Regenerate only the stale format instead of rerunning every export.",
          ],
        }),
      );
    }

    if (budget.auditScore !== null && budget.auditScore < 70) {
      recommendations.push(
        createRecommendation({
          budget,
          id: "audit-cleanup",
          title: "Batch readiness and performance cleanup",
          impact:
            "Avoids inviting collaborators into a slow workspace with unresolved quality issues.",
          steps: [
            "Run project audit cleanup before inviting collaborators into the heavy document.",
            "Resolve blocked audit dimensions before running the next export.",
          ],
        }),
      );
    }

    return recommendations.length
      ? recommendations
      : [createFallbackRecommendation(budget)];
  });
}

function createRecommendation(input: {
  budget: LargeWorkspaceDocumentBudget;
  id: string;
  title: string;
  impact: string;
  steps: string[];
}): LargeWorkspaceRecoveryRecommendation {
  return {
    id: `performance-recovery-${input.budget.projectId}-${input.id}`,
    projectId: input.budget.projectId,
    projectName: input.budget.projectName,
    status: input.budget.status,
    title: input.title,
    impact: input.impact,
    steps: input.steps,
  };
}

function createFallbackRecommendation(
  budget: LargeWorkspaceDocumentBudget,
): LargeWorkspaceRecoveryRecommendation {
  return {
    id: `performance-recovery-${budget.projectId}`,
    projectId: budget.projectId,
    projectName: budget.projectName,
    status: budget.status,
    title: `${budget.projectName} performance recovery`,
    impact: "Keep the workspace within editing and export budgets.",
    steps: ["Keep monitoring document budget before the next export cycle."],
  };
}

function createTelemetryPacket(input: {
  generatedAt: string;
  status: LargeWorkspacePerformanceStatus;
  score: number;
  documentBudgets: LargeWorkspaceDocumentBudget[];
  slowSurfaceDiagnostics: LargeWorkspaceSlowSurfaceDiagnostic[];
  recoveryRecommendations: LargeWorkspaceRecoveryRecommendation[];
  nextActions: string[];
}): LargeWorkspaceTelemetryPacket {
  const payload = {
    kind: "essence-studio.large-workspace-performance",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    documentBudgets: input.documentBudgets,
    slowSurfaceDiagnostics: input.slowSurfaceDiagnostics,
    recoveryRecommendations: input.recoveryRecommendations,
    nextActions: input.nextActions,
  };

  return {
    id: "large-workspace-performance-telemetry-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    fileName: "large-workspace-performance-telemetry.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

function createNextActions(input: {
  documentBudgets: LargeWorkspaceDocumentBudget[];
  slowSurfaceDiagnostics: LargeWorkspaceSlowSurfaceDiagnostic[];
  recoveryRecommendations: LargeWorkspaceRecoveryRecommendation[];
}) {
  const actions = input.recoveryRecommendations
    .slice()
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        left.projectName.localeCompare(right.projectName),
    )
    .slice(0, 5)
    .map(
      (recommendation) =>
        `${recommendation.projectName}: ${recommendation.steps[0] ?? recommendation.impact}`,
    );

  if (actions.length) return actions;
  if (input.documentBudgets.length) {
    return ["Large-workspace performance budgets are within current limits."];
  }

  return [
    "Create a project before performance intelligence can score workspace budgets.",
  ];
}

function classifyNumber(
  value: number,
  reviewThreshold: number,
  blockedThreshold: number,
): LargeWorkspacePerformanceStatus {
  if (value >= blockedThreshold) return "blocked";
  if (value >= reviewThreshold) return "review";

  return "ready";
}

function inverseScore(
  value: number,
  reviewThreshold: number,
  blockedThreshold: number,
) {
  if (value >= blockedThreshold) return 24;
  if (value >= reviewThreshold) {
    const ratio =
      (value - reviewThreshold) /
      Math.max(1, blockedThreshold - reviewThreshold);

    return Math.max(45, Math.round(82 - ratio * 34));
  }

  return 100;
}

function mapAuditStatus(status: ProjectAuditSummary["status"] | null) {
  if (status === "ready") return "ready";
  if (status === "fix") return "blocked";

  return "review";
}

function compareBudgets(
  left: LargeWorkspaceDocumentBudget,
  right: LargeWorkspaceDocumentBudget,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    right.canvasPixels - left.canvasPixels ||
    left.projectName.localeCompare(right.projectName)
  );
}

function aggregateStatus(statuses: LargeWorkspacePerformanceStatus[]) {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

function statusWeight(status: LargeWorkspacePerformanceStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}

function durationMs(start: string, end: string) {
  return Math.max(0, Date.parse(end) - Date.parse(start));
}

function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (!minutes) return `${remainingSeconds}s`;

  return `${minutes}m ${remainingSeconds}s`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en");
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

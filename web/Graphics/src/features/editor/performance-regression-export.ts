import {
  getCanvasInteractionProfilerReport,
  type CanvasInteractionProfilerReport,
} from "@/features/editor/canvas-interaction-profiler";
import {
  getCanvasRenderBudgetTelemetry,
  type CanvasRenderBudgetTelemetry,
} from "@/features/editor/canvas-render-budget";
import {
  getCanvasViewportIntelligence,
} from "@/features/editor/canvas-viewport-intelligence";
import type {
  CanvasViewportIntelligenceReport,
} from "@/features/editor/canvas-viewport-intelligence-types";
import {
  getCollaborationSyncReplayReport,
  type CollaborationSyncReplayReport,
} from "@/features/editor/collaboration-sync-replay";
import {
  getSlowCommandTelemetryReport,
  type SlowCommandTelemetryReport,
} from "@/features/editor/command-telemetry";
import {
  getDocumentPerformanceReview,
  type DocumentPerformanceReview,
} from "@/features/editor/document-performance-review";
import {
  getLargeDocumentSafeModeReport,
  type LargeDocumentSafeModeReport,
} from "@/features/editor/large-document-safe-mode";
import {
  getLayerIndexReview,
  type LayerIndexReview,
} from "@/features/editor/layer-index";
import {
  getPerformanceBaselineReport,
  type PerformanceBaselineReport,
} from "@/features/editor/performance-baseline";
import {
  getProductionDeploySmokeReport,
  type ProductionDeploySmokeReport,
} from "@/features/editor/production-deploy-smoke";
import {
  getResponsiveConstraintsReview,
} from "@/features/editor/responsive-constraints-review";
import type {
  ResponsiveConstraintsReviewReport,
} from "@/features/editor/responsive-constraints-review-types";
import {
  getRuntimeObservabilityReport,
  type RuntimeIssue,
  type RuntimeObservabilityReport,
} from "@/features/editor/runtime-observability";
import type { DesignDocument, DesignPage } from "@/features/editor/types";

export type PerformanceRegressionStatus = "ready" | "review" | "blocked";

export type PerformanceRegressionExport = {
  generatedAt: string;
  status: PerformanceRegressionStatus;
  score: number;
  blockedCount: number;
  reviewCount: number;
  activePageName: string;
  documentPerformance: DocumentPerformanceReview;
  layerIndex: LayerIndexReview;
  canvasRenderBudget: CanvasRenderBudgetTelemetry;
  canvasInteractionProfiler: CanvasInteractionProfilerReport;
  canvasViewportIntelligence: CanvasViewportIntelligenceReport;
  largeDocumentSafeMode: LargeDocumentSafeModeReport;
  runtimeObservability: RuntimeObservabilityReport;
  commandTelemetry: SlowCommandTelemetryReport;
  performanceBaseline: PerformanceBaselineReport;
  collaborationSyncReplay: CollaborationSyncReplayReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  responsiveConstraints: ResponsiveConstraintsReviewReport;
  releaseNotes: string[];
};

export function getPerformanceRegressionExport({
  document,
  activePage,
  generatedAt = new Date().toISOString(),
  runtimeIssues,
}: {
  document: DesignDocument;
  activePage: DesignPage;
  generatedAt?: string;
  runtimeIssues?: RuntimeIssue[];
}): PerformanceRegressionExport {
  const documentPerformance = getDocumentPerformanceReview(document);
  const layerIndex = getLayerIndexReview(document);
  const canvasRenderBudget = getCanvasRenderBudgetTelemetry(activePage);
  const canvasInteractionProfiler = getCanvasInteractionProfilerReport({
    generatedAt,
    page: activePage,
  });
  const canvasViewportIntelligence = getCanvasViewportIntelligence(document);
  const largeDocumentSafeMode = getLargeDocumentSafeModeReport(
    document,
    activePage,
  );
  const runtimeObservability = getRuntimeObservabilityReport({
    issues: runtimeIssues ?? [],
    captured: Array.isArray(runtimeIssues),
  });
  const commandTelemetry = getSlowCommandTelemetryReport(
    document.activityEvents ?? [],
  );
  const performanceBaseline = getPerformanceBaselineReport(
    document,
    activePage,
  );
  const collaborationSyncReplay = getCollaborationSyncReplayReport(document);
  const productionDeploySmoke = getProductionDeploySmokeReport({
    document,
    activePage,
  });
  const responsiveConstraints = getResponsiveConstraintsReview(document);
  const reports = [
    documentPerformance,
    layerIndex,
    canvasRenderBudget,
    canvasInteractionProfiler,
    canvasViewportIntelligence,
    largeDocumentSafeMode,
    runtimeObservability,
    commandTelemetry,
    performanceBaseline,
    collaborationSyncReplay,
    productionDeploySmoke,
    responsiveConstraints,
  ];
  const blockedCount = reports.reduce(
    (total, report) => total + report.blockedCount,
    0,
  );
  const reviewCount = reports.reduce(
    (total, report) => total + report.reviewCount,
    0,
  );
  const score = Math.min(...reports.map((report) => report.score));

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    blockedCount,
    reviewCount,
    activePageName: activePage.name,
    documentPerformance,
    layerIndex,
    canvasRenderBudget,
    canvasInteractionProfiler,
    canvasViewportIntelligence,
    largeDocumentSafeMode,
    runtimeObservability,
    commandTelemetry,
    performanceBaseline,
    collaborationSyncReplay,
    productionDeploySmoke,
    responsiveConstraints,
    releaseNotes: getReleaseNotes({
      documentPerformance,
      layerIndex,
      canvasRenderBudget,
      canvasInteractionProfiler,
      canvasViewportIntelligence,
      largeDocumentSafeMode,
      runtimeObservability,
      commandTelemetry,
      performanceBaseline,
      collaborationSyncReplay,
      productionDeploySmoke,
      responsiveConstraints,
      blockedCount,
      reviewCount,
      score,
    }),
  };
}

export function getPerformanceRegressionJson(
  report: PerformanceRegressionExport,
) {
  return JSON.stringify(report, null, 2);
}

export function getPerformanceRegressionMarkdown(
  report: PerformanceRegressionExport,
) {
  return [
    "# Performance Regression Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active page: ${report.activePageName}`,
    `Blocked checks: ${report.blockedCount}`,
    `Review checks: ${report.reviewCount}`,
    "",
    "## Release Notes",
    ...report.releaseNotes.map((note) => `- ${note}`),
    "",
    "## Scores",
    `- Document performance: ${report.documentPerformance.score} (${report.documentPerformance.status})`,
    `- Layer index: ${report.layerIndex.score} (${report.layerIndex.status})`,
    `- Canvas viewport intelligence: ${report.canvasViewportIntelligence.score} (${report.canvasViewportIntelligence.status})`,
    `- Canvas render budget: ${report.canvasRenderBudget.score} (${report.canvasRenderBudget.status})`,
    `- Canvas interaction profiler: ${report.canvasInteractionProfiler.score} (${report.canvasInteractionProfiler.status})`,
    `- Large-document safe mode: ${report.largeDocumentSafeMode.score} (${report.largeDocumentSafeMode.status})`,
    `- Runtime observability: ${report.runtimeObservability.score} (${report.runtimeObservability.status})`,
    `- Command telemetry: ${report.commandTelemetry.score} (${report.commandTelemetry.status})`,
    `- Performance baseline: ${report.performanceBaseline.score} (${report.performanceBaseline.status})`,
    `- Collaboration sync replay: ${report.collaborationSyncReplay.score} (${report.collaborationSyncReplay.status})`,
    `- Production deploy smoke: ${report.productionDeploySmoke.score} (${report.productionDeploySmoke.status})`,
    `- Responsive constraints: ${report.responsiveConstraints.score} (${report.responsiveConstraints.status})`,
    "",
    "## Key Metrics",
    `- Pages: ${report.documentPerformance.pageCount}`,
    `- Document layers: ${report.documentPerformance.layerCount}`,
    `- Indexed layers: ${report.layerIndex.indexedLayerCount}`,
    `- Active visible layers: ${report.canvasRenderBudget.visibleLayerCount}`,
    `- Render windows: ${report.canvasViewportIntelligence.renderWindowCount}`,
    `- Viewport hit-test pairs: ${report.canvasViewportIntelligence.deepHitTestPairCount}`,
    `- Viewport safe-mode thresholds: ${report.canvasViewportIntelligence.safeModeThresholdCount}`,
    `- Estimated render cost: ${report.canvasRenderBudget.estimatedRenderCost}`,
    `- Selection latency estimate: ${report.canvasInteractionProfiler.estimatedSelectionLatencyMs}ms`,
    `- Pan/zoom frame estimate: ${report.canvasInteractionProfiler.panZoomFrameBudgetMs}ms`,
    `- Interaction hit-test hotspots: ${report.canvasInteractionProfiler.hitTestHotspotCount}`,
    `- Live effect layers: ${report.canvasRenderBudget.effectLayerCount}`,
    `- Safe-mode hidden layers: ${report.largeDocumentSafeMode.hiddenLayerCount}`,
    `- Runtime errors: ${report.runtimeObservability.errorCount}`,
    `- Runtime warnings: ${report.runtimeObservability.warningCount}`,
    `- Timed commands: ${report.commandTelemetry.telemetryCount}`,
    `- Slow commands: ${report.commandTelemetry.slowCommandCount}`,
    `- Failed commands: ${report.commandTelemetry.failedCommandCount}`,
    `- Saved performance baselines: ${report.performanceBaseline.baselineCount}`,
    `- Baseline blocked metrics: ${report.performanceBaseline.blockedCount}`,
    `- Baseline review metrics: ${report.performanceBaseline.reviewCount}`,
    `- Collaboration replay presence events: ${report.collaborationSyncReplay.presenceEventCount}`,
    `- Collaboration replay operation conflicts: ${report.collaborationSyncReplay.operationConflictCount}`,
    `- Collaboration replay unrecovered peers: ${report.collaborationSyncReplay.unrecoveredPeerCount}`,
    `- Deploy smoke routes: ${report.productionDeploySmoke.routeCount}`,
    `- Deploy smoke review routes: ${report.productionDeploySmoke.reviewCount}`,
    `- Deploy smoke blocked routes: ${report.productionDeploySmoke.blockedCount}`,
    `- Responsive constraint frames: ${report.responsiveConstraints.frameCount}`,
    `- Responsive constraint unstable previews: ${report.responsiveConstraints.unstableCount}`,
    `- Responsive constraint repair actions: ${report.responsiveConstraints.repairableCount}`,
    "",
    "## Review Queues",
    ...getQueueLines("Document performance", report.documentPerformance.rows),
    ...getQueueLines("Layer index", report.layerIndex.rows),
    ...getQueueLines("Canvas viewport intelligence", report.canvasViewportIntelligence.rows),
    ...getQueueLines("Canvas render budget", report.canvasRenderBudget.rows),
    ...getQueueLines("Canvas interaction profiler", report.canvasInteractionProfiler.rows),
    ...getQueueLines("Large-document safe mode", report.largeDocumentSafeMode.rows),
    ...getQueueLines("Runtime observability", report.runtimeObservability.rows),
    ...getQueueLines("Command telemetry", report.commandTelemetry.rows),
    ...getQueueLines("Performance baseline", report.performanceBaseline.rows),
    ...getQueueLines("Collaboration sync replay", report.collaborationSyncReplay.rows),
    ...getQueueLines("Production deploy smoke", report.productionDeploySmoke.rows),
    ...getQueueLines("Responsive constraints", report.responsiveConstraints.rows),
  ].join("\n");
}

function getReleaseNotes(input: {
  documentPerformance: DocumentPerformanceReview;
  layerIndex: LayerIndexReview;
  canvasRenderBudget: CanvasRenderBudgetTelemetry;
  canvasInteractionProfiler: CanvasInteractionProfilerReport;
  canvasViewportIntelligence: CanvasViewportIntelligenceReport;
  largeDocumentSafeMode: LargeDocumentSafeModeReport;
  runtimeObservability: RuntimeObservabilityReport;
  commandTelemetry: SlowCommandTelemetryReport;
  performanceBaseline: PerformanceBaselineReport;
  collaborationSyncReplay: CollaborationSyncReplayReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  responsiveConstraints: ResponsiveConstraintsReviewReport;
  blockedCount: number;
  reviewCount: number;
  score: number;
}) {
  if (input.blockedCount > 0) {
    return [
      `${input.blockedCount} blocking performance checks need remediation before release.`,
      "Run safe-mode actions or split heavy pages before updating visual QA baselines.",
      `Lowest release confidence score is ${input.score}.`,
    ];
  }

  if (input.reviewCount > 0) {
    return [
      `${input.reviewCount} performance checks should be reviewed before release.`,
      "Attach the JSON export to release notes so reviewers can compare scale metrics over time.",
      `Lowest release confidence score is ${input.score}.`,
    ];
  }

  return [
    "No blocking or review-level performance regressions were detected.",
    `Document layer index covers ${input.layerIndex.indexedLayerCount} layers.`,
    `Active-page render cost is ${input.canvasRenderBudget.estimatedRenderCost}.`,
    `Canvas interaction profiler status is ${input.canvasInteractionProfiler.status}.`,
    `Runtime capture status is ${input.runtimeObservability.status}.`,
    `Timed command telemetry captured ${input.commandTelemetry.telemetryCount} events.`,
    `Performance baseline status is ${input.performanceBaseline.status}.`,
    `Collaboration sync replay status is ${input.collaborationSyncReplay.status}.`,
    `Production deploy smoke status is ${input.productionDeploySmoke.status}.`,
    `Responsive constraints status is ${input.responsiveConstraints.status}.`,
  ];
}

function getQueueLines(
  label: string,
  rows: Array<{
    status: PerformanceRegressionStatus;
    label: string;
    detail: string;
    recommendation: string;
  }>,
) {
  return [
    "",
    `### ${label}`,
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ];
}

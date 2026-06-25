import type { CanvasInteractionProfilerReport } from "@/features/editor/canvas-interaction-profiler";
import type { DevModeIntegrationReviewReport } from "@/features/editor/dev-mode-integration-review";
import type { MultiplayerFollowSpotlightReport } from "@/features/editor/multiplayer-follow-spotlight";
import type { ReleaseReadinessDashboard } from "@/features/editor/release-readiness-dashboard";

export type ProductionReadinessSynthesisStatus =
  | "ready"
  | "review"
  | "blocked";

export type ProductionReadinessSynthesisArea =
  | "admin-release"
  | "canvas"
  | "collaboration"
  | "dev-mode"
  | "ship-gate";

export type ProductionReadinessShipDecision =
  | "ship"
  | "review-required"
  | "do-not-ship";

export type ProductionReadinessSynthesisRow = {
  id: string;
  area: ProductionReadinessSynthesisArea;
  status: ProductionReadinessSynthesisStatus;
  score: number;
  label: string;
  detail: string;
  blockerCount: number;
  reviewCount: number;
  evidenceCount: number;
  recommendation: string;
};

export type ProductionReadinessSynthesisPacket = {
  generatedAt: string;
  status: ProductionReadinessSynthesisStatus;
  shipDecision: ProductionReadinessShipDecision;
  score: number;
  sectionCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  blockerCount: number;
  reviewItemCount: number;
  evidenceCount: number;
  minimumScoreArea: ProductionReadinessSynthesisArea;
  releaseEvidenceBundle: string[];
  signoffChecklist: string[];
  executiveSummary: string[];
  rows: ProductionReadinessSynthesisRow[];
};

export function getProductionReadinessSynthesisPacket({
  canvasInteraction,
  collaboration,
  devModeIntegration,
  generatedAt = new Date().toISOString(),
  releaseReadiness,
}: {
  canvasInteraction: CanvasInteractionProfilerReport;
  collaboration: MultiplayerFollowSpotlightReport;
  devModeIntegration: DevModeIntegrationReviewReport;
  generatedAt?: string;
  releaseReadiness: ReleaseReadinessDashboard;
}): ProductionReadinessSynthesisPacket {
  const sourceRows = [
    getCollaborationRow(collaboration),
    getCanvasRow(canvasInteraction),
    getDevModeRow(devModeIntegration),
    getAdminReleaseRow(releaseReadiness),
  ];
  const releaseEvidenceBundle = getReleaseEvidenceBundle({
    canvasInteraction,
    collaboration,
    devModeIntegration,
    releaseReadiness,
  });
  const blockerCount = sourceRows.reduce(
    (total, row) => total + row.blockerCount,
    0,
  );
  const reviewItemCount = sourceRows.reduce(
    (total, row) => total + row.reviewCount,
    0,
  );
  const sourceBlockedCount = sourceRows.filter(
    (row) => row.status === "blocked",
  ).length;
  const sourceReviewCount = sourceRows.filter(
    (row) => row.status === "review",
  ).length;
  const status =
    sourceBlockedCount > 0
      ? "blocked"
      : sourceReviewCount > 0
        ? "review"
        : "ready";
  const score = Math.min(...sourceRows.map((row) => row.score));
  const shipDecision = getShipDecision(status);
  const shipGateRow = getShipGateRow({
    blockerCount,
    evidenceCount: releaseEvidenceBundle.length,
    reviewItemCount,
    score,
    shipDecision,
    sourceRows,
    status,
  });
  const rows = [...sourceRows, shipGateRow].sort(sortRows);
  const minimumScoreArea = rows.reduce((minimum, row) =>
    row.score < minimum.score ? row : minimum,
  ).area;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status,
    shipDecision,
    score,
    sectionCount: rows.length,
    readyCount,
    reviewCount,
    blockedCount,
    blockerCount,
    reviewItemCount,
    evidenceCount: releaseEvidenceBundle.length,
    minimumScoreArea,
    releaseEvidenceBundle,
    signoffChecklist: getSignoffChecklist(status, sourceRows),
    executiveSummary: getExecutiveSummary({
      blockerCount,
      reviewItemCount,
      score,
      shipDecision,
      sourceRows,
    }),
    rows,
  };
}

export function getProductionReadinessSynthesisCsv(
  report: ProductionReadinessSynthesisPacket,
  rows: ProductionReadinessSynthesisRow[] = report.rows,
) {
  const header: Array<keyof ProductionReadinessSynthesisRow> = [
    "id",
    "area",
    "status",
    "score",
    "label",
    "detail",
    "blockerCount",
    "reviewCount",
    "evidenceCount",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "ship_decision",
      "sections",
      "blockers",
      "review_items",
      "evidence",
      "minimum_area",
    ].join(","),
    [
      report.score,
      report.status,
      report.shipDecision,
      report.sectionCount,
      report.blockerCount,
      report.reviewItemCount,
      report.evidenceCount,
      report.minimumScoreArea,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header.map((key) => escapeCsvCell(row[key])).join(","),
    ),
  ].join("\n");
}

export function getProductionReadinessSynthesisMarkdown(
  report: ProductionReadinessSynthesisPacket,
  rows: ProductionReadinessSynthesisRow[] = report.rows,
) {
  return [
    "# Production Readiness Synthesis",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Ship decision: ${report.shipDecision}`,
    `Score: ${report.score}`,
    `Sections: ${report.sectionCount}`,
    `Blockers: ${report.blockerCount}`,
    `Review items: ${report.reviewItemCount}`,
    `Evidence items: ${report.evidenceCount}`,
    `Minimum score area: ${report.minimumScoreArea}`,
    "",
    "## Executive Summary",
    ...report.executiveSummary.map((item) => `- ${item}`),
    "",
    "## Signoff Checklist",
    ...report.signoffChecklist.map((item) => `- ${item}`),
    "",
    "## Ship Gate Rows",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.area} / ${row.label}: score ${row.score}, ${row.blockerCount} blockers, ${row.reviewCount} review items. ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Release Evidence Bundle",
    ...report.releaseEvidenceBundle.map((item) => `- ${item}`),
  ].join("\n");
}

export function getProductionReadinessSynthesisJson(
  report: ProductionReadinessSynthesisPacket,
  rows: ProductionReadinessSynthesisRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.production-readiness-synthesis",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        shipDecision: report.shipDecision,
        score: report.score,
        sectionCount: report.sectionCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
        blockerCount: report.blockerCount,
        reviewItemCount: report.reviewItemCount,
        evidenceCount: report.evidenceCount,
        minimumScoreArea: report.minimumScoreArea,
      },
      executiveSummary: report.executiveSummary,
      signoffChecklist: report.signoffChecklist,
      releaseEvidenceBundle: report.releaseEvidenceBundle,
      rows,
    },
    null,
    2,
  );
}

function getCollaborationRow(
  report: MultiplayerFollowSpotlightReport,
): ProductionReadinessSynthesisRow {
  return {
    id: "production-synthesis-collaboration",
    area: "collaboration",
    status: report.status,
    score: report.score,
    label: "Collaboration and presenter handoff",
    detail: `${report.activePeerCount} peers, ${report.activePresenterCount} active presenters, ${report.presenterStatus} presenter state, ${report.viewportSyncStatus} viewport sync, and ${report.adminExportEvidenceCount} admin evidence items.`,
    blockerCount: report.blockedCount + report.presenterConflictCount,
    reviewCount: report.reviewCount,
    evidenceCount:
      report.adminExportEvidenceCount +
      report.spotlightEventCount +
      report.followEventCount,
    recommendation:
      report.status === "ready"
        ? "Attach follow spotlight exports to the production handoff."
        : "Resolve presenter ownership, viewport sync, and handoff timer issues before live review.",
  };
}

function getCanvasRow(
  report: CanvasInteractionProfilerReport,
): ProductionReadinessSynthesisRow {
  return {
    id: "production-synthesis-canvas",
    area: "canvas",
    status: report.status,
    score: report.score,
    label: "Canvas interaction performance",
    detail: `${report.pageName} estimates ${report.estimatedSelectionLatencyMs}ms selection latency, ${report.panZoomFrameBudgetMs}ms pan/zoom frame cost, ${report.hitTestHotspotCount} hotspots, and ${report.pointerReplayStepCount} replay steps.`,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    evidenceCount:
      report.replayNotes.length +
      report.pointerReplayStepCount +
      report.optimizationNoteCount,
    recommendation:
      report.status === "ready"
        ? "Keep profiler replay notes with the ship packet."
        : "Clear canvas interaction blockers and replay the profiler before signoff.",
  };
}

function getDevModeRow(
  report: DevModeIntegrationReviewReport,
): ProductionReadinessSynthesisRow {
  return {
    id: "production-synthesis-dev-mode",
    area: "dev-mode",
    status: report.status,
    score: report.score,
    label: "Dev Mode integration handoff",
    detail: `${report.readyForDevLayerCount} ready-for-dev layers, ${report.variableHandoffCoveragePercent}% variable handoff coverage, ${report.linkHealthStatus} Storybook/GitHub/Jira link health, and ${report.exportBundleReadyCount} export bundles.`,
    blockerCount: report.blockedCount + report.invalidLinkCount,
    reviewCount: report.reviewCount + report.staleCodegenCount,
    evidenceCount:
      report.exportBundleEvidenceCount +
      report.storybookLinkCount +
      report.githubLinkCount +
      report.jiraLinkCount,
    recommendation:
      report.status === "ready"
        ? "Attach Dev Mode integration JSON, CSV, Markdown, and inspection bundle exports."
        : "Refresh codegen exports, token bindings, link health, and bundle readiness before engineering handoff.",
  };
}

function getAdminReleaseRow(
  report: ReleaseReadinessDashboard,
): ProductionReadinessSynthesisRow {
  return {
    id: "production-synthesis-admin-release",
    area: "admin-release",
    status: report.status,
    score: report.score,
    label: "Admin release evidence",
    detail: `${report.sectionCount} release readiness sections, ${report.evidenceCount} evidence points, ${report.minimumScoreArea} minimum area, and ${report.releaseNotes.length} admin release notes.`,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    evidenceCount: report.evidenceCount + report.releaseNotes.length,
    recommendation:
      report.status === "ready"
        ? "Bundle admin release readiness JSON with final ship notes."
        : "Clear blocked or review release readiness sections before production approval.",
  };
}

function getShipGateRow({
  blockerCount,
  evidenceCount,
  reviewItemCount,
  score,
  shipDecision,
  sourceRows,
  status,
}: {
  blockerCount: number;
  evidenceCount: number;
  reviewItemCount: number;
  score: number;
  shipDecision: ProductionReadinessShipDecision;
  sourceRows: ProductionReadinessSynthesisRow[];
  status: ProductionReadinessSynthesisStatus;
}): ProductionReadinessSynthesisRow {
  return {
    id: "production-synthesis-ship-gate",
    area: "ship-gate",
    status,
    score,
    label: "Production ship gate",
    detail: `${sourceRows.length} source systems roll up to ${shipDecision} with ${blockerCount} blockers, ${reviewItemCount} review items, and ${evidenceCount} evidence artifacts.`,
    blockerCount,
    reviewCount: reviewItemCount,
    evidenceCount,
    recommendation:
      status === "ready"
        ? "Ship with this synthesis packet attached to release notes."
        : status === "blocked"
          ? "Do not ship until blocked source systems are cleared and re-exported."
          : "Route review items to the release owner before final approval.",
  };
}

function getReleaseEvidenceBundle({
  canvasInteraction,
  collaboration,
  devModeIntegration,
  releaseReadiness,
}: {
  canvasInteraction: CanvasInteractionProfilerReport;
  collaboration: MultiplayerFollowSpotlightReport;
  devModeIntegration: DevModeIntegrationReviewReport;
  releaseReadiness: ReleaseReadinessDashboard;
}) {
  const canvasEvidence = [
    "Export canvas interaction profiler JSON.",
    "Export canvas interaction profiler CSV.",
    "Export canvas interaction profiler Markdown.",
    ...canvasInteraction.replayNotes.flatMap((note) => [
      `Replay ${note.label}.`,
      note.optimizationNote,
    ]),
  ];
  const collaborationEvidence = [
    "Export follow spotlight JSON.",
    "Export follow spotlight CSV.",
    "Export follow spotlight Markdown.",
    ...collaboration.adminExportEvidence,
  ];
  const devModeEvidence = [
    "Export Dev Mode integration JSON.",
    "Export Dev Mode integration CSV.",
    "Export Dev Mode integration Markdown.",
    ...devModeIntegration.exportBundleEvidence,
  ];
  const adminReleaseEvidence = [
    "Export admin release readiness JSON.",
    "Export admin release readiness CSV.",
    "Export admin release readiness Markdown.",
    ...releaseReadiness.releaseNotes.map((note) => `Admin release: ${note}`),
  ];

  return uniqueEvidence([
    ...collaborationEvidence,
    ...canvasEvidence,
    ...devModeEvidence,
    ...adminReleaseEvidence,
  ]);
}

function getSignoffChecklist(
  status: ProductionReadinessSynthesisStatus,
  sourceRows: ProductionReadinessSynthesisRow[],
) {
  const checklist = [
    "Attach collaboration follow spotlight JSON, CSV, and Markdown exports.",
    "Attach canvas interaction profiler replay notes and hotspot evidence.",
    "Attach Dev Mode integration JSON, CSV, Markdown, and inspection bundle exports.",
    "Attach admin release readiness JSON with deploy, review, visual QA, and governance evidence.",
    "Record the release owner decision with the production synthesis packet.",
  ];

  if (status === "ready") {
    return checklist;
  }

  return [
    ...sourceRows
      .filter((row) => row.status !== "ready")
      .map((row) => `Clear ${row.area}: ${row.recommendation}`),
    ...checklist,
  ];
}

function getExecutiveSummary({
  blockerCount,
  reviewItemCount,
  score,
  shipDecision,
  sourceRows,
}: {
  blockerCount: number;
  reviewItemCount: number;
  score: number;
  shipDecision: ProductionReadinessShipDecision;
  sourceRows: ProductionReadinessSynthesisRow[];
}) {
  const lowest = sourceRows.reduce((minimum, row) =>
    row.score < minimum.score ? row : minimum,
  );

  if (shipDecision === "do-not-ship") {
    return [
      `${blockerCount} blockers prevent production release.`,
      `${lowest.label} is the lowest source system at ${score}.`,
      "Regenerate source reports after clearing blockers, then export this synthesis packet again.",
    ];
  }

  if (shipDecision === "review-required") {
    return [
      `${reviewItemCount} review items need owner signoff before release.`,
      `${lowest.label} is the lowest source system at ${score}.`,
      "Route this packet to the release owner with the source exports attached.",
    ];
  }

  return [
    "Collaboration, canvas, Dev Mode, and admin release evidence are ready.",
    `${lowest.label} is the lowest source system at ${score}.`,
    "Ship with this synthesis packet attached to the final release notes.",
  ];
}

function getShipDecision(
  status: ProductionReadinessSynthesisStatus,
): ProductionReadinessShipDecision {
  if (status === "blocked") {
    return "do-not-ship";
  }

  return status === "review" ? "review-required" : "ship";
}

function uniqueEvidence(items: string[]) {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  );
}

function sortRows(
  left: ProductionReadinessSynthesisRow,
  right: ProductionReadinessSynthesisRow,
) {
  if (left.status !== right.status) {
    return getStatusRank(left.status) - getStatusRank(right.status);
  }

  return left.area.localeCompare(right.area);
}

function getStatusRank(status: ProductionReadinessSynthesisStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

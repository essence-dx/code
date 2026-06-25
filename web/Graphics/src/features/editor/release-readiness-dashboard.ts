import type { AssetMediaGovernanceReport } from "@/features/editor/asset-media-governance";
import type { ComponentUsageIntelligenceReport } from "@/features/editor/component-usage-intelligence";
import type { PerformanceRegressionExport } from "@/features/editor/performance-regression-export";
import type { PluginDeveloperOpsReport } from "@/features/editor/plugin-developer-operations";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { ResponsiveConstraintsReviewReport } from "@/features/editor/responsive-constraints-review-types";
import type { VariableGovernanceReviewReport } from "@/features/editor/variable-governance-review-types";
import type { DesignReviewApprovalReport } from "@/features/editor/design-review-approval-types";

export type ReleaseReadinessStatus = "ready" | "review" | "blocked";

export type ReleaseReadinessArea =
  | "assets"
  | "components"
  | "deploy-smoke"
  | "plugins"
  | "review-gate"
  | "responsive"
  | "variables"
  | "visual-qa";

export type ReleaseReadinessRow = {
  id: string;
  area: ReleaseReadinessArea;
  status: ReleaseReadinessStatus;
  score: number;
  label: string;
  detail: string;
  blockedCount: number;
  reviewCount: number;
  evidenceCount: number;
  recommendation: string;
};

export type ReleaseReadinessDashboard = {
  generatedAt: string;
  status: ReleaseReadinessStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  sectionCount: number;
  evidenceCount: number;
  minimumScoreArea: ReleaseReadinessArea;
  rows: ReleaseReadinessRow[];
  releaseNotes: string[];
};

export function getReleaseReadinessDashboard({
  assetMedia,
  componentUsage,
  designReviewApproval,
  generatedAt = new Date().toISOString(),
  performanceRegression,
  pluginDeveloperOps,
  productionDeploySmoke,
  responsiveConstraints,
  variableGovernance,
}: {
  assetMedia: AssetMediaGovernanceReport;
  componentUsage: ComponentUsageIntelligenceReport;
  designReviewApproval: DesignReviewApprovalReport;
  generatedAt?: string;
  performanceRegression: PerformanceRegressionExport;
  pluginDeveloperOps: PluginDeveloperOpsReport;
  productionDeploySmoke: ProductionDeploySmokeReport;
  responsiveConstraints: ResponsiveConstraintsReviewReport;
  variableGovernance: VariableGovernanceReviewReport;
}): ReleaseReadinessDashboard {
  const rows = [
    createRow({
      area: "variables",
      label: "Variable and token governance",
      score: variableGovernance.score,
      status: variableGovernance.status,
      blockedCount: variableGovernance.blockedCount,
      reviewCount: variableGovernance.reviewCount,
      evidenceCount:
        variableGovernance.variableCount +
        variableGovernance.modeCount +
        variableGovernance.collectionCount,
      detail: `${variableGovernance.variableCount} variables, ${variableGovernance.modeCount} modes, ${variableGovernance.collectionCount} collections, ${variableGovernance.repairableCount} repairable rows.`,
      recommendation:
        "Clear broken aliases, mode gaps, duplicate export names, and orphan token drift before publishing design-system releases.",
    }),
    createRow({
      area: "components",
      label: "Component usage and library readiness",
      score: componentUsage.score,
      status: componentUsage.status,
      blockedCount: componentUsage.blockedCount,
      reviewCount: componentUsage.reviewCount,
      evidenceCount: componentUsage.componentCount + componentUsage.instanceCount,
      detail: `${componentUsage.componentCount} components, ${componentUsage.instanceCount} instances, ${componentUsage.updateAvailableCount} available updates, ${componentUsage.detachedLibraryCount} detached libraries.`,
      recommendation:
        "Resolve orphan instances, variant drift, property gaps, and library update campaigns before marketplace-ready release.",
    }),
    createRow({
      area: "plugins",
      label: "Plugin and widget developer operations",
      score: pluginDeveloperOps.score,
      status: pluginDeveloperOps.status,
      blockedCount: pluginDeveloperOps.blockedCount,
      reviewCount: pluginDeveloperOps.reviewCount,
      evidenceCount:
        pluginDeveloperOps.manifestCount +
        pluginDeveloperOps.replayableApprovalCount +
        pluginDeveloperOps.runCount,
      detail: `${pluginDeveloperOps.manifestCount} manifests, ${pluginDeveloperOps.replayableApprovalCount} replayable approvals, ${pluginDeveloperOps.runCount} recorded runs, ${pluginDeveloperOps.blockedRunCount} blocked runs.`,
      recommendation:
        "Replay approvals, fix invalid manifests, and capture successful sandbox artifacts before enabling extension workflows in production.",
    }),
    createRow({
      area: "responsive",
      label: "Responsive constraints and resize previews",
      score: responsiveConstraints.score,
      status: responsiveConstraints.status,
      blockedCount: responsiveConstraints.blockedCount,
      reviewCount: responsiveConstraints.reviewCount,
      evidenceCount:
        responsiveConstraints.frameCount +
        responsiveConstraints.simulatedFrameCount +
        responsiveConstraints.repairableCount,
      detail: `${responsiveConstraints.frameCount} frames, ${responsiveConstraints.resizeScenarioCount} resize scenarios, ${responsiveConstraints.overflowCount} overflows, ${responsiveConstraints.unstableCount} unstable previews.`,
      recommendation:
        "Repair overflow, default constraints, mask behavior, grid evidence, and cross-page frame drift before release signoff.",
    }),
    createRow({
      area: "visual-qa",
      label: "Visual QA and regression evidence",
      score: performanceRegression.score,
      status: performanceRegression.status,
      blockedCount: performanceRegression.blockedCount,
      reviewCount: performanceRegression.reviewCount,
      evidenceCount:
        performanceRegression.canvasRenderBudget.visibleLayerCount +
        performanceRegression.performanceBaseline.baselineCount +
        performanceRegression.runtimeObservability.issueCount,
      detail: `${performanceRegression.activePageName} has render, viewport, runtime, command, baseline, sync, and responsive evidence in the performance release bundle.`,
      recommendation:
        "Attach visual snapshot, route health, runtime capture, and performance regression exports before approving release changes.",
    }),
    createRow({
      area: "review-gate",
      label: "Design review approval gate",
      score: designReviewApproval.score,
      status: designReviewApproval.status,
      blockedCount: designReviewApproval.blockedCount,
      reviewCount: designReviewApproval.reviewCount,
      evidenceCount: designReviewApproval.evidenceCount,
      detail: `${designReviewApproval.openCommentCount} open comments, ${designReviewApproval.approverCount} reviewers, ${designReviewApproval.overdueCommentCount} overdue approvals, ${designReviewApproval.blockedGateCount} blocked release gates.`,
      recommendation:
        "Assign reviewers, set due dates, resolve approved comments, and attach review evidence before release signoff.",
    }),
    createRow({
      area: "deploy-smoke",
      label: "Production deploy smoke",
      score: productionDeploySmoke.score,
      status: productionDeploySmoke.status,
      blockedCount: productionDeploySmoke.blockedCount,
      reviewCount: productionDeploySmoke.reviewCount,
      evidenceCount:
        productionDeploySmoke.routeCount + productionDeploySmoke.commands.length,
      detail: `${productionDeploySmoke.routeCount} routes, ${productionDeploySmoke.requiredRouteCount} required checks, ${productionDeploySmoke.prototypeHotspotCount} prototype hotspots, ${productionDeploySmoke.commands.length} smoke commands.`,
      recommendation:
        "Run the deploy smoke commands against the deployed Vercel URL and attach JSON, CSV, and Markdown evidence to release notes.",
    }),
    createRow({
      area: "assets",
      label: "Asset and media governance",
      score: assetMedia.score,
      status: assetMedia.status,
      blockedCount: assetMedia.blockedCount,
      reviewCount: assetMedia.reviewCount,
      evidenceCount:
        assetMedia.imageLayerCount +
        assetMedia.fontFamilyCount +
        assetMedia.optimizationQueueCount,
      detail: `${assetMedia.imageLayerCount} image layers, ${assetMedia.embeddedImageCount} embedded images, ${assetMedia.videoPlaceholderCount} video-like assets, ${assetMedia.fontFamilyCount} font families.`,
      recommendation:
        "Clear missing sources, provenance gaps, oversized embedded media, video placeholders, and unsafe font reviews before export packaging.",
    }),
  ].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const minimum = rows.reduce((lowest, row) =>
    row.score < lowest.score ? row : lowest,
  );

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: minimum.score,
    readyCount,
    reviewCount,
    blockedCount,
    sectionCount: rows.length,
    evidenceCount: rows.reduce((total, row) => total + row.evidenceCount, 0),
    minimumScoreArea: minimum.area,
    rows,
    releaseNotes: getReleaseNotes(rows, minimum),
  };
}

export function getReleaseReadinessDashboardCsv(
  report: ReleaseReadinessDashboard,
  rows: ReleaseReadinessRow[] = report.rows,
) {
  const header: Array<keyof ReleaseReadinessRow> = [
    "area",
    "status",
    "score",
    "label",
    "blockedCount",
    "reviewCount",
    "evidenceCount",
    "detail",
    "recommendation",
  ];

  return [
    ["score", "status", "sections", "blocked", "review", "minimum_area"].join(","),
    [
      report.score,
      report.status,
      report.sectionCount,
      report.blockedCount,
      report.reviewCount,
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

export function getReleaseReadinessDashboardMarkdown(
  report: ReleaseReadinessDashboard,
  rows: ReleaseReadinessRow[] = report.rows,
) {
  return [
    "# Unified Release Readiness Dashboard",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Sections: ${report.sectionCount}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    `Minimum score area: ${report.minimumScoreArea}`,
    "",
    "## Release Notes",
    ...report.releaseNotes.map((note) => `- ${note}`),
    "",
    "## Signoff Rows",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.area} / ${row.label}: score ${row.score}, ${row.blockedCount} blocked, ${row.reviewCount} review. ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

export function getReleaseReadinessDashboardJson(
  report: ReleaseReadinessDashboard,
  rows: ReleaseReadinessRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.release-readiness-dashboard",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
        sectionCount: report.sectionCount,
        evidenceCount: report.evidenceCount,
        minimumScoreArea: report.minimumScoreArea,
      },
      releaseNotes: report.releaseNotes,
      rows,
    },
    null,
    2,
  );
}

function createRow(input: Omit<ReleaseReadinessRow, "id">) {
  return {
    id: `${input.area}:${input.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...input,
  } satisfies ReleaseReadinessRow;
}

function getReleaseNotes(
  rows: ReleaseReadinessRow[],
  minimum: ReleaseReadinessRow,
) {
  const blockedRows = rows.filter((row) => row.status === "blocked");
  const reviewRows = rows.filter((row) => row.status === "review");

  if (blockedRows.length > 0) {
    return [
      `${blockedRows.length} release readiness areas are blocked.`,
      `${minimum.label} is the lowest-scoring area at ${minimum.score}.`,
      "Export this bundle with the area-specific handoff reports before reviewer signoff.",
    ];
  }

  if (reviewRows.length > 0) {
    return [
      `${reviewRows.length} release readiness areas need reviewer attention.`,
      `${minimum.label} is the lowest-scoring area at ${minimum.score}.`,
      "Attach the release dashboard JSON with review approval, deploy smoke, visual QA, plugin, component, variable, responsive, and asset exports.",
    ];
  }

  return [
    "All release readiness areas are ready.",
    `${minimum.label} is the lowest-scoring area at ${minimum.score}.`,
    "Keep this dashboard bundled with final release notes and deploy smoke evidence.",
  ];
}

function sortRows(left: ReleaseReadinessRow, right: ReleaseReadinessRow) {
  if (left.status !== right.status) {
    return getStatusRank(left.status) - getStatusRank(right.status);
  }

  return left.area.localeCompare(right.area);
}

function getStatusRank(status: ReleaseReadinessStatus) {
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

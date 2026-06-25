import { getDevModeInspection } from "@/features/editor/dev-mode-inspection";
import {
  getLayerDevLinkReport,
  type LayerDevLink,
} from "@/features/editor/layer-codegen";
import type {
  DesignDevLinkKind,
  DesignDocument,
  DesignLayer,
} from "@/features/editor/types";

export type DevModeIntegrationReviewStatus =
  | "ready"
  | "review"
  | "blocked";

export type DevModeIntegrationReviewCategory =
  | "codegen-freshness"
  | "export-bundle"
  | "link-health"
  | "variable-handoff";

export type DevModeIntegrationReviewRow = {
  id: string;
  status: DevModeIntegrationReviewStatus;
  category: DevModeIntegrationReviewCategory;
  label: string;
  detail: string;
  value: string;
  layerId: string | null;
  layerName: string | null;
  linkKind: DesignDevLinkKind | null;
  recommendation: string;
};

export type DevModeIntegrationReviewReport = {
  generatedAt: string;
  status: DevModeIntegrationReviewStatus;
  score: number;
  documentUpdatedAt: string;
  latestCodegenExportAt: string | null;
  codegenFreshnessStatus: DevModeIntegrationReviewStatus;
  staleCodegenCount: number;
  visibleLayerCount: number;
  readyForDevLayerCount: number;
  codeConnectReadyCount: number;
  variableCoveredLayerCount: number;
  variableHandoffCoveragePercent: number;
  linkHealthStatus: DevModeIntegrationReviewStatus;
  storybookLinkCount: number;
  githubLinkCount: number;
  jiraLinkCount: number;
  invalidLinkCount: number;
  missingRequiredLinkKindCount: number;
  exportBundleReadyCount: number;
  exportBundleCoveragePercent: number;
  exportBundleEvidenceCount: number;
  exportBundleEvidence: string[];
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: DevModeIntegrationReviewRow[];
};

type DevModeIntegrationReviewInput = {
  document: DesignDocument;
  generatedAt?: string;
};

type LinkKindHealth = {
  count: number;
  invalidCount: number;
  kind: DesignDevLinkKind;
  label: string;
};

const requiredLinkKinds = [
  {
    kind: "storybook",
    label: "Storybook",
  },
  {
    kind: "github",
    label: "GitHub",
  },
  {
    kind: "jira",
    label: "Jira",
  },
] as const satisfies ReadonlyArray<{
  kind: DesignDevLinkKind;
  label: string;
}>;

const exportBundleEvidence = [
  "Export Dev Mode integration review JSON.",
  "Export Dev Mode integration review CSV.",
  "Export Dev Mode integration review Markdown.",
  "Export Dev Mode inspection bundle JSON.",
];

export function getDevModeIntegrationReviewReport({
  document,
  generatedAt = new Date().toISOString(),
}: DevModeIntegrationReviewInput): DevModeIntegrationReviewReport {
  const inspection = getDevModeInspection(document);
  const readyRows = inspection.rows.filter((row) => row.readyForDev);
  const readyLayers = getReadyForDevLayers(document);
  const latestCodegenExportAt = getLatestCodegenExportAt(document);
  const codegenFreshnessStatus = getCodegenFreshnessStatus({
    documentUpdatedAt: document.updatedAt,
    latestCodegenExportAt,
    readyForDevLayerCount: readyRows.length,
  });
  const staleCodegenCount =
    codegenFreshnessStatus === "ready" ? 0 : readyRows.length;
  const variableCoveredLayerCount = readyLayers.filter(hasVariableBindings)
    .length;
  const variableHandoffCoveragePercent = getPercent(
    variableCoveredLayerCount,
    readyRows.length,
  );
  const variableHandoffStatus = getCoverageStatus({
    count: variableCoveredLayerCount,
    percentage: variableHandoffCoveragePercent,
    total: readyRows.length,
  });
  const linkHealth = getLinkHealth(document);
  const linkHealthStatus = getLinkHealthStatus(linkHealth);
  const exportBundleReadyCount = readyRows.filter(
    (row) => row.handoffBundleReady,
  ).length;
  const exportBundleCoveragePercent = getPercent(
    exportBundleReadyCount,
    readyRows.length,
  );
  const exportBundleStatus = getCoverageStatus({
    count: exportBundleReadyCount,
    percentage: exportBundleCoveragePercent,
    total: readyRows.length,
  });
  const rows = [
    getCodegenFreshnessRow({
      documentUpdatedAt: document.updatedAt,
      latestCodegenExportAt,
      readyForDevLayerCount: readyRows.length,
      status: codegenFreshnessStatus,
    }),
    getVariableHandoffRow({
      coveredCount: variableCoveredLayerCount,
      percentage: variableHandoffCoveragePercent,
      readyForDevLayerCount: readyRows.length,
      status: variableHandoffStatus,
    }),
    ...linkHealth.map(getLinkHealthRow),
    getExportBundleRow({
      bundleReadyCount: exportBundleReadyCount,
      percentage: exportBundleCoveragePercent,
      readyForDevLayerCount: readyRows.length,
      status: exportBundleStatus,
    }),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const storybookLinkCount =
    linkHealth.find((item) => item.kind === "storybook")?.count ?? 0;
  const githubLinkCount =
    linkHealth.find((item) => item.kind === "github")?.count ?? 0;
  const jiraLinkCount =
    linkHealth.find((item) => item.kind === "jira")?.count ?? 0;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    documentUpdatedAt: document.updatedAt,
    latestCodegenExportAt,
    codegenFreshnessStatus,
    staleCodegenCount,
    visibleLayerCount: inspection.inspectedLayerCount,
    readyForDevLayerCount: readyRows.length,
    codeConnectReadyCount: readyRows.filter((row) => row.codeConnectReady)
      .length,
    variableCoveredLayerCount,
    variableHandoffCoveragePercent,
    linkHealthStatus,
    storybookLinkCount,
    githubLinkCount,
    jiraLinkCount,
    invalidLinkCount: linkHealth.reduce(
      (total, item) => total + item.invalidCount,
      0,
    ),
    missingRequiredLinkKindCount: linkHealth.filter((item) => item.count === 0)
      .length,
    exportBundleReadyCount,
    exportBundleCoveragePercent,
    exportBundleEvidenceCount: exportBundleEvidence.length,
    exportBundleEvidence,
    blockedCount,
    reviewCount,
    readyCount,
    rows,
  };
}

export function getDevModeIntegrationReviewCsv(
  report: DevModeIntegrationReviewReport,
  rows: DevModeIntegrationReviewRow[] = report.rows,
) {
  const header: Array<keyof DevModeIntegrationReviewRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "value",
    "layerId",
    "layerName",
    "linkKind",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "document_updated_at",
      "latest_codegen_export_at",
      "codegen_freshness_status",
      "variable_coverage_percent",
      "link_health_status",
      "storybook_links",
      "github_links",
      "jira_links",
      "invalid_links",
      "export_bundle_ready",
      "export_bundle_coverage_percent",
      "export_bundle_evidence",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.documentUpdatedAt,
      report.latestCodegenExportAt ?? "",
      report.codegenFreshnessStatus,
      report.variableHandoffCoveragePercent,
      report.linkHealthStatus,
      report.storybookLinkCount,
      report.githubLinkCount,
      report.jiraLinkCount,
      report.invalidLinkCount,
      report.exportBundleReadyCount,
      report.exportBundleCoveragePercent,
      report.exportBundleEvidenceCount,
      report.blockedCount,
      report.reviewCount,
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

export function getDevModeIntegrationReviewMarkdown(
  report: DevModeIntegrationReviewReport,
  rows: DevModeIntegrationReviewRow[] = report.rows,
) {
  return [
    "# Dev Mode Integration Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Document updated: ${report.documentUpdatedAt}`,
    `Latest codegen export: ${report.latestCodegenExportAt ?? "none"}`,
    `Codegen freshness: ${report.codegenFreshnessStatus}`,
    `Variable handoff coverage: ${report.variableHandoffCoveragePercent}%`,
    `Link health: ${report.linkHealthStatus}`,
    `Storybook links: ${report.storybookLinkCount}`,
    `GitHub links: ${report.githubLinkCount}`,
    `Jira links: ${report.jiraLinkCount}`,
    `Invalid links: ${report.invalidLinkCount}`,
    `Export bundles: ${report.exportBundleReadyCount}`,
    "",
    "## Review Rows",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No Dev Mode integration rows found."]),
    "",
    "## Export Bundle Evidence",
    ...report.exportBundleEvidence.map((item) => `- ${item}`),
  ].join("\n");
}

export function getDevModeIntegrationReviewJson(
  report: DevModeIntegrationReviewReport,
  rows: DevModeIntegrationReviewRow[] = report.rows,
) {
  return JSON.stringify(
    {
      generatedAt: report.generatedAt,
      summary: {
        score: report.score,
        status: report.status,
        documentUpdatedAt: report.documentUpdatedAt,
        latestCodegenExportAt: report.latestCodegenExportAt,
        codegenFreshnessStatus: report.codegenFreshnessStatus,
        staleCodegenCount: report.staleCodegenCount,
        visibleLayerCount: report.visibleLayerCount,
        readyForDevLayerCount: report.readyForDevLayerCount,
        codeConnectReadyCount: report.codeConnectReadyCount,
        variableCoveredLayerCount: report.variableCoveredLayerCount,
        variableHandoffCoveragePercent:
          report.variableHandoffCoveragePercent,
        linkHealthStatus: report.linkHealthStatus,
        storybookLinkCount: report.storybookLinkCount,
        githubLinkCount: report.githubLinkCount,
        jiraLinkCount: report.jiraLinkCount,
        invalidLinkCount: report.invalidLinkCount,
        missingRequiredLinkKindCount: report.missingRequiredLinkKindCount,
        exportBundleReadyCount: report.exportBundleReadyCount,
        exportBundleCoveragePercent: report.exportBundleCoveragePercent,
        exportBundleEvidenceCount: report.exportBundleEvidenceCount,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
      },
      exportBundleEvidence: report.exportBundleEvidence,
      rows,
    },
    null,
    2,
  );
}

function getLatestCodegenExportAt(document: DesignDocument) {
  const matchingEvents = (document.activityEvents ?? []).filter(
    (event) =>
      /dev mode/i.test(`${event.label} ${event.detail ?? ""}`) &&
      /export|handoff|bundle|inspection|integration/i.test(
        `${event.label} ${event.detail ?? ""}`,
      ),
  );
  const latest = matchingEvents
    .map((event) => event.createdAt)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];

  return latest ?? null;
}

function getCodegenFreshnessStatus({
  documentUpdatedAt,
  latestCodegenExportAt,
  readyForDevLayerCount,
}: {
  documentUpdatedAt: string;
  latestCodegenExportAt: string | null;
  readyForDevLayerCount: number;
}): DevModeIntegrationReviewStatus {
  if (readyForDevLayerCount === 0) {
    return "review";
  }

  if (!latestCodegenExportAt) {
    return "blocked";
  }

  return latestCodegenExportAt >= documentUpdatedAt ? "ready" : "review";
}

function getCoverageStatus({
  count,
  percentage,
  total,
}: {
  count: number;
  percentage: number;
  total: number;
}): DevModeIntegrationReviewStatus {
  if (total === 0) {
    return "review";
  }

  if (count === 0) {
    return "blocked";
  }

  return percentage >= 80 ? "ready" : "review";
}

function getLinkHealth(document: DesignDocument): LinkKindHealth[] {
  const readyLayers = getReadyForDevLayers(document);
  const links = readyLayers.flatMap((layer) => getLayerDevLinkReport(layer));

  return requiredLinkKinds.map((required) => {
    const kindLinks = links.filter((link) => link.kind === required.kind);

    return {
      count: kindLinks.length,
      invalidCount: kindLinks.filter((link) => !isHealthyLink(link)).length,
      kind: required.kind,
      label: required.label,
    };
  });
}

function getLinkHealthStatus(
  linkHealth: LinkKindHealth[],
): DevModeIntegrationReviewStatus {
  if (linkHealth.some((item) => item.invalidCount > 0)) {
    return "blocked";
  }

  if (linkHealth.some((item) => item.count === 0)) {
    return "review";
  }

  return "ready";
}

function getCodegenFreshnessRow({
  documentUpdatedAt,
  latestCodegenExportAt,
  readyForDevLayerCount,
  status,
}: {
  documentUpdatedAt: string;
  latestCodegenExportAt: string | null;
  readyForDevLayerCount: number;
  status: DevModeIntegrationReviewStatus;
}): DevModeIntegrationReviewRow {
  return {
    id: "dev-mode-codegen-freshness",
    status,
    category: "codegen-freshness",
    label: "Codegen freshness",
    detail: latestCodegenExportAt
      ? `Latest Dev Mode export ${latestCodegenExportAt} compared with document update ${documentUpdatedAt}.`
      : `${readyForDevLayerCount} ready-for-dev layer${readyForDevLayerCount === 1 ? "" : "s"} have no recorded Dev Mode export.`,
    value: latestCodegenExportAt ?? "missing",
    layerId: null,
    layerName: null,
    linkKind: null,
    recommendation:
      status === "ready"
        ? "Codegen exports are fresh enough for handoff."
        : "Export Dev Mode code and bundle evidence after the latest design change.",
  };
}

function getVariableHandoffRow({
  coveredCount,
  percentage,
  readyForDevLayerCount,
  status,
}: {
  coveredCount: number;
  percentage: number;
  readyForDevLayerCount: number;
  status: DevModeIntegrationReviewStatus;
}): DevModeIntegrationReviewRow {
  return {
    id: "dev-mode-variable-handoff",
    status,
    category: "variable-handoff",
    label: "Variable handoff coverage",
    detail: `${coveredCount}/${readyForDevLayerCount} ready-for-dev layers include token or variable evidence.`,
    value: `${percentage}%`,
    layerId: null,
    layerName: null,
    linkKind: null,
    recommendation:
      status === "ready"
        ? "Variable coverage is ready for implementation handoff."
        : "Bind design tokens to ready-for-dev layers before exporting Dev Mode evidence.",
  };
}

function getLinkHealthRow(
  health: LinkKindHealth,
): DevModeIntegrationReviewRow {
  const status: DevModeIntegrationReviewStatus =
    health.invalidCount > 0
      ? "blocked"
      : health.count === 0
        ? "review"
        : "ready";

  return {
    id: `dev-mode-link-health-${health.kind}`,
    status,
    category: "link-health",
    label: `${health.label} link health`,
    detail:
      health.count === 0
        ? `${health.label} links are missing from ready-for-dev layers.`
        : `${health.count} ${health.label} link${health.count === 1 ? "" : "s"} checked with ${health.invalidCount} invalid URL${health.invalidCount === 1 ? "" : "s"}.`,
    value: `${health.count} links`,
    layerId: null,
    layerName: null,
    linkKind: health.kind,
    recommendation:
      status === "ready"
        ? `${health.label} references are ready for Dev Mode handoff.`
        : `Attach a valid ${health.label} reference to the implementation handoff.`,
  };
}

function getExportBundleRow({
  bundleReadyCount,
  percentage,
  readyForDevLayerCount,
  status,
}: {
  bundleReadyCount: number;
  percentage: number;
  readyForDevLayerCount: number;
  status: DevModeIntegrationReviewStatus;
}): DevModeIntegrationReviewRow {
  return {
    id: "dev-mode-export-bundle",
    status,
    category: "export-bundle",
    label: "Export bundle readiness",
    detail: `${bundleReadyCount}/${readyForDevLayerCount} ready-for-dev layers have Code Connect, links, assets, and closed annotation state for bundle export.`,
    value: `${percentage}%`,
    layerId: null,
    layerName: null,
    linkKind: null,
    recommendation:
      status === "ready"
        ? "Dev Mode inspection bundle can be attached to release evidence."
        : "Resolve missing Code Connect, links, annotations, or asset data before exporting the bundle.",
  };
}

function getReadyForDevLayers(document: DesignDocument) {
  return document.pages.flatMap((page) =>
    page.layers.filter((layer) => layer.visible && layer.readyForDev),
  );
}

function hasVariableBindings(layer: DesignLayer) {
  return Object.keys(layer.variableBindings ?? {}).length > 0;
}

function isHealthyLink(link: LayerDevLink) {
  try {
    const url = new URL(link.url);

    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    if (link.kind === "github") {
      return /(^|\.)github\.com$/i.test(url.hostname);
    }

    if (link.kind === "jira") {
      return /atlassian\.net$/i.test(url.hostname) || /jira/i.test(url.hostname);
    }

    if (link.kind === "storybook") {
      return /storybook|chromatic|localhost|127\.0\.0\.1/i.test(url.hostname);
    }

    return true;
  } catch {
    return false;
  }
}

function getPercent(count: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
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

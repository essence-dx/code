import type { AdminEmbedSecurityReport } from "@/features/admin/admin-embed-security";
import type { AdminPluginPermissionGovernanceReport } from "@/features/admin/admin-plugin-permission-governance";
import type { AdminPublicLinkObservabilityReport } from "@/features/admin/admin-public-link-observability";
import type { AdminPublicRouteAnalyticsReport } from "@/features/admin/admin-public-route-analytics";
import type { RetentionPrivacyReport } from "@/features/admin/admin-retention-privacy";
import type { WorkspacePolicyReviewReport } from "@/features/admin/workspace-policy";
import type {
  DesignComment,
  DesignDocument,
  DesignLayer,
} from "@/features/editor/types";

export type AdminDataLossPreventionStatus = "ready" | "review" | "blocked";

export type AdminDataLossPreventionCategory =
  | "downloads"
  | "embeds"
  | "exports"
  | "plugin-runs"
  | "public-routes"
  | "sensitive-metadata";

export type AdminDataLossPreventionRow = {
  id: string;
  category: AdminDataLossPreventionCategory;
  status: AdminDataLossPreventionStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  workflow: string;
  latestAt: string | null;
};

export type AdminDataLossPreventionWorkflow = {
  id: string;
  status: AdminDataLossPreventionStatus;
  title: string;
  scope: string;
  owner: string;
  evidence: string;
  action: string;
};

export type AdminDataLossPreventionFile = {
  id: string;
  name: string;
  ownerEmail: string;
  updatedAt: string;
  trashedAt: string | null;
  document: DesignDocument;
};

export type AdminDataLossPreventionReport = {
  generatedAt: string;
  status: AdminDataLossPreventionStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  activeFileCount: number;
  sensitiveFindingCount: number;
  sensitiveFileCount: number;
  exportEventCount: number;
  sensitiveExportEventCount: number;
  downloadExposureCount: number;
  embedReviewCount: number;
  pluginRiskCount: number;
  publicRouteRiskCount: number;
  supportBundleSensitiveCount: number;
  rows: AdminDataLossPreventionRow[];
  workflows: AdminDataLossPreventionWorkflow[];
  commands: string[];
};

export type AdminDataLossPreventionInput = {
  embedSecurity: AdminEmbedSecurityReport;
  files: AdminDataLossPreventionFile[];
  generatedAt?: string;
  pluginPermissionGovernance: AdminPluginPermissionGovernanceReport;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
  publicRouteAnalytics: AdminPublicRouteAnalyticsReport;
  retentionPrivacy: RetentionPrivacyReport;
  workspacePolicy: WorkspacePolicyReviewReport;
};

type SensitiveDocumentSummary = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  findingCount: number;
  categories: string[];
  latestAt: string;
};

type SensitiveMetadataSummary = {
  findingCount: number;
  fileCount: number;
  files: SensitiveDocumentSummary[];
};

export function getAdminDataLossPreventionReport({
  embedSecurity,
  files,
  generatedAt = new Date().toISOString(),
  pluginPermissionGovernance,
  publicLinkObservability,
  publicRouteAnalytics,
  retentionPrivacy,
  workspacePolicy,
}: AdminDataLossPreventionInput): AdminDataLossPreventionReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const metadataSummary = getSensitiveMetadataSummary(activeFiles);
  const exportSummary = getExportSummary(activeFiles, metadataSummary.files);
  const downloadExposureCount = publicLinkObservability.downloadExposureCount;
  const embedReviewCount =
    embedSecurity.blockedObservedOriginCount +
    embedSecurity.missingHostEvidenceCount +
    embedSecurity.trustedSandboxCount;
  const pluginRiskCount =
    pluginPermissionGovernance.riskyWriteActivityCount +
    pluginPermissionGovernance.unknownActivityCount +
    pluginPermissionGovernance.staleApprovalCount;
  const publicRouteRiskCount =
    publicRouteAnalytics.externalReferrerCount +
    publicRouteAnalytics.unknownReferrerCount +
    publicRouteAnalytics.botEventCount +
    publicRouteAnalytics.missingCoverageCount +
    (publicRouteAnalytics.storageAvailable ? 0 : 1);
  const supportBundleSensitiveCount =
    retentionPrivacy.supportBundleSensitiveAuditMetadataCount +
    retentionPrivacy.supportBundleSensitiveSessionCount;
  const rows = [
    getDownloadExposureRow({
      downloadExposureCount,
      publicLinkObservability,
      workspacePolicy,
    }),
    getEmbedRow(embedSecurity),
    getPluginRunRow(pluginPermissionGovernance),
    getPublicRouteRow(publicRouteAnalytics),
    getSensitiveMetadataRow({
      downloadExposureCount,
      metadataSummary,
      retentionPrivacy,
      supportBundleSensitiveCount,
    }),
    getExportRow({
      exportSummary,
      metadataSummary,
      publicLinkObservability,
    }),
  ].sort(sortRows);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminDataLossPreventionStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const workflows = getDataLossPreventionWorkflows(rows);

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    readyCount,
    reviewCount,
    blockedCount,
    activeFileCount: activeFiles.length,
    sensitiveFindingCount: metadataSummary.findingCount,
    sensitiveFileCount: metadataSummary.fileCount,
    exportEventCount: exportSummary.exportEventCount,
    sensitiveExportEventCount: exportSummary.sensitiveExportEventCount,
    downloadExposureCount,
    embedReviewCount,
    pluginRiskCount,
    publicRouteRiskCount,
    supportBundleSensitiveCount,
    rows,
    workflows,
    commands: getDataLossPreventionCommands(),
  };
}

function getDownloadExposureRow({
  downloadExposureCount,
  publicLinkObservability,
  workspacePolicy,
}: {
  downloadExposureCount: number;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
  workspacePolicy: WorkspacePolicyReviewReport;
}): AdminDataLossPreventionRow {
  const policyBlocksDownloads = !workspacePolicy.settings.allowPublicDownloads;
  const status: AdminDataLossPreventionStatus =
    policyBlocksDownloads && downloadExposureCount > 0
      ? "blocked"
      : downloadExposureCount > 0 || publicLinkObservability.noExpiryCount > 0
        ? "review"
        : "ready";

  return {
    id: "dlp-public-downloads",
    category: "downloads",
    status,
    label: "Public download exposure",
    value: `${downloadExposureCount}`,
    detail: `${downloadExposureCount} active public surface${downloadExposureCount === 1 ? "" : "s"} allow downloads and ${publicLinkObservability.noExpiryCount} active surface${publicLinkObservability.noExpiryCount === 1 ? "" : "s"} have no expiry. Workspace policy ${policyBlocksDownloads ? "blocks" : "allows"} public downloads.`,
    recommendation:
      status === "ready"
        ? "Keep public downloads disabled by default and grant per handoff only."
        : "Disable broad download access, add expiries, and record approval evidence before publishing external handoff links.",
    workflow: "Public download quarantine",
    latestAt: publicLinkObservability.generatedAt,
  };
}

function getEmbedRow(
  embedSecurity: AdminEmbedSecurityReport,
): AdminDataLossPreventionRow {
  const status: AdminDataLossPreventionStatus =
    embedSecurity.blockedObservedOriginCount > 0 || embedSecurity.blockedCount > 0
      ? "blocked"
      : embedSecurity.missingHostEvidenceCount > 0 ||
          embedSecurity.trustedSandboxCount > 0 ||
          embedSecurity.reviewCount > 0
        ? "review"
        : "ready";

  return {
    id: "dlp-embed-exfiltration",
    category: "embeds",
    status,
    label: "Embed exfiltration guard",
    value: `${embedSecurity.embedShareCount}`,
    detail: `${embedSecurity.embedShareCount} embed share${embedSecurity.embedShareCount === 1 ? "" : "s"}, ${embedSecurity.blockedObservedOriginCount} blocked observed origin${embedSecurity.blockedObservedOriginCount === 1 ? "" : "s"}, ${embedSecurity.missingHostEvidenceCount} missing host evidence row${embedSecurity.missingHostEvidenceCount === 1 ? "" : "s"}, and ${embedSecurity.trustedSandboxCount} trusted sandbox preset${embedSecurity.trustedSandboxCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Embed allowlists, host evidence, and sandbox posture are ready for external distribution."
        : "Quarantine risky embeds until host evidence, frame policy, and sandbox settings match the intended destination.",
    workflow: "Embed host quarantine",
    latestAt: embedSecurity.generatedAt,
  };
}

function getPluginRunRow(
  report: AdminPluginPermissionGovernanceReport,
): AdminDataLossPreventionRow {
  const status: AdminDataLossPreventionStatus =
    report.unknownActivityCount > 0
      ? "blocked"
      : report.riskyWriteActivityCount > 0 ||
          report.writePermissionCount > 0 ||
          report.staleApprovalCount > 0
        ? "review"
        : "ready";

  return {
    id: "dlp-plugin-runs",
    category: "plugin-runs",
    status,
    label: "Plugin write activity",
    value: `${report.riskyWriteActivityCount}`,
    detail: `${report.writePermissionCount} write-capable permission${report.writePermissionCount === 1 ? "" : "s"}, ${report.riskyWriteActivityCount} recent risky write run${report.riskyWriteActivityCount === 1 ? "" : "s"}, ${report.staleApprovalCount} stale approval${report.staleApprovalCount === 1 ? "" : "s"}, and ${report.unknownActivityCount} unknown extension event${report.unknownActivityCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Plugin capability grants and recent runs are clear for release."
        : "Review write-capable extension runs and revoke stale or unknown grants before exporting sensitive files.",
    workflow: "Plugin run approval",
    latestAt: report.generatedAt,
  };
}

function getPublicRouteRow(
  report: AdminPublicRouteAnalyticsReport,
): AdminDataLossPreventionRow {
  const status: AdminDataLossPreventionStatus =
    !report.storageAvailable
      ? "blocked"
      : report.externalReferrerCount > 0 ||
          report.unknownReferrerCount > 0 ||
          report.botEventCount > 0 ||
          report.missingCoverageCount > 0
        ? "review"
        : "ready";

  return {
    id: "dlp-public-routes",
    category: "public-routes",
    status,
    label: "Public route telemetry",
    value: `${report.eventCount}`,
    detail: `${report.eventCount} retained event${report.eventCount === 1 ? "" : "s"}, ${report.externalReferrerCount} external referrer event${report.externalReferrerCount === 1 ? "" : "s"}, ${report.unknownReferrerCount} unknown referrer event${report.unknownReferrerCount === 1 ? "" : "s"}, ${report.botEventCount} bot event${report.botEventCount === 1 ? "" : "s"}, and ${report.missingCoverageCount} missing coverage route${report.missingCoverageCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Route analytics are privacy-safe and complete enough for DLP review."
        : "Refresh route telemetry, inspect external referrers, and block publication when analytics storage is unavailable.",
    workflow: "Public route telemetry refresh",
    latestAt: report.generatedAt,
  };
}

function getSensitiveMetadataRow({
  downloadExposureCount,
  metadataSummary,
  retentionPrivacy,
  supportBundleSensitiveCount,
}: {
  downloadExposureCount: number;
  metadataSummary: SensitiveMetadataSummary;
  retentionPrivacy: RetentionPrivacyReport;
  supportBundleSensitiveCount: number;
}): AdminDataLossPreventionRow {
  const diagnosticExposure =
    retentionPrivacy.settings.supportBundlePrivacyMode === "diagnostic" ||
    retentionPrivacy.settings.includeSupportBundleAuditMetadata ||
    retentionPrivacy.settings.includeSupportBundleNetworkDetails;
  const status: AdminDataLossPreventionStatus =
    diagnosticExposure && supportBundleSensitiveCount > 0
      ? "blocked"
      : metadataSummary.findingCount > 0 || supportBundleSensitiveCount > 0
        ? "review"
        : "ready";

  return {
    id: "dlp-sensitive-metadata",
    category: "sensitive-metadata",
    status:
      status === "review" &&
      metadataSummary.findingCount > 0 &&
      downloadExposureCount > 0
        ? "blocked"
        : status,
    label: "Sensitive design metadata",
    value: `${metadataSummary.findingCount}`,
    detail: `${metadataSummary.findingCount} sensitive-looking metadata marker${metadataSummary.findingCount === 1 ? "" : "s"} across ${metadataSummary.fileCount} active file${metadataSummary.fileCount === 1 ? "" : "s"}, plus ${supportBundleSensitiveCount} sensitive support-bundle record${supportBundleSensitiveCount === 1 ? "" : "s"}.`,
    recommendation:
      metadataSummary.findingCount > 0
        ? "Redact emails, tokens, private URLs, and internal identifiers from layer text, comments, links, variables, and Code Connect metadata before external export."
        : "Keep support bundles redacted and continue scanning design metadata before publication.",
    workflow: "Sensitive metadata redaction",
    latestAt:
      metadataSummary.files[0]?.latestAt ?? retentionPrivacy.generatedAt,
  };
}

function getExportRow({
  exportSummary,
  metadataSummary,
  publicLinkObservability,
}: {
  exportSummary: ReturnType<typeof getExportSummary>;
  metadataSummary: SensitiveMetadataSummary;
  publicLinkObservability: AdminPublicLinkObservabilityReport;
}): AdminDataLossPreventionRow {
  const status: AdminDataLossPreventionStatus =
    exportSummary.sensitiveExportEventCount > 0 &&
    publicLinkObservability.downloadExposureCount > 0
      ? "blocked"
      : exportSummary.sensitiveExportEventCount > 0 ||
          exportSummary.failedExportEventCount > 0 ||
          (exportSummary.exportEventCount > 0 &&
            metadataSummary.findingCount > 0)
        ? "review"
        : "ready";

  return {
    id: "dlp-export-workflows",
    category: "exports",
    status,
    label: "Export workflow review",
    value: `${exportSummary.exportEventCount}`,
    detail: `${exportSummary.exportEventCount} export activity event${exportSummary.exportEventCount === 1 ? "" : "s"}, ${exportSummary.sensitiveExportEventCount} tied to files with sensitive metadata, and ${exportSummary.failedExportEventCount} failed export telemetry event${exportSummary.failedExportEventCount === 1 ? "" : "s"}.`,
    recommendation:
      status === "ready"
        ? "Export activity is clear of current DLP blockers."
        : "Run redaction review before public downloads, export bundles, or release handoff packages leave the workspace.",
    workflow: "Pre-export evidence review",
    latestAt: exportSummary.latestAt ?? publicLinkObservability.generatedAt,
  };
}

function getSensitiveMetadataSummary(
  files: AdminDataLossPreventionFile[],
): SensitiveMetadataSummary {
  const summaries = files
    .map((file) => getSensitiveDocumentSummary(file))
    .filter((summary): summary is SensitiveDocumentSummary =>
      Boolean(summary && summary.findingCount > 0),
    )
    .sort((first, second) => second.findingCount - first.findingCount);

  return {
    findingCount: summaries.reduce(
      (total, summary) => total + summary.findingCount,
      0,
    ),
    fileCount: summaries.length,
    files: summaries,
  };
}

function getSensitiveDocumentSummary(file: AdminDataLossPreventionFile) {
  const categoryCounts = new Map<string, number>();

  for (const page of file.document.pages) {
    for (const layer of page.layers) {
      collectLayerSensitiveMarkers(layer, categoryCounts);
    }

    for (const comment of page.comments ?? []) {
      collectCommentSensitiveMarkers(comment, categoryCounts);
    }
  }

  for (const value of Object.values(file.document.variables)) {
    collectSensitiveMarkers("variables", value, categoryCounts);
  }

  for (const style of Object.values(file.document.textStyles ?? {})) {
    collectSensitiveMarkers("styles", style.name, categoryCounts);
  }

  const findingCount = [...categoryCounts.values()].reduce(
    (total, count) => total + count,
    0,
  );

  if (findingCount === 0) {
    return null;
  }

  return {
    fileId: file.id,
    fileName: file.name,
    ownerEmail: file.ownerEmail,
    findingCount,
    categories: [...categoryCounts.keys()].sort(),
    latestAt: file.updatedAt,
  };
}

function collectLayerSensitiveMarkers(
  layer: DesignLayer,
  categoryCounts: Map<string, number>,
) {
  collectSensitiveMarkers("layer text", layer.text, categoryCounts);
  collectSensitiveMarkers("image metadata", layer.imageAlt, categoryCounts);

  for (const link of layer.devLinks ?? []) {
    collectSensitiveMarkers("dev links", link.url, categoryCounts);
    collectSensitiveMarkers("dev links", link.label, categoryCounts);
  }

  if (layer.codeConnect) {
    collectSensitiveMarkers(
      "code connect",
      layer.codeConnect.componentName,
      categoryCounts,
    );
    collectSensitiveMarkers(
      "code connect",
      layer.codeConnect.importPath,
      categoryCounts,
    );
    collectSensitiveMarkers("code connect", layer.codeConnect.props, categoryCounts);
  }
}

function collectCommentSensitiveMarkers(
  comment: DesignComment,
  categoryCounts: Map<string, number>,
) {
  collectSensitiveMarkers("comments", comment.text, categoryCounts);
  collectSensitiveMarkers("comments", comment.assigneeEmail, categoryCounts);

  for (const mention of comment.mentions ?? []) {
    collectSensitiveMarkers("comments", mention, categoryCounts);
  }

  for (const reply of comment.replies ?? []) {
    collectSensitiveMarkers("comments", reply.text, categoryCounts);

    for (const mention of reply.mentions ?? []) {
      collectSensitiveMarkers("comments", mention, categoryCounts);
    }
  }
}

function collectSensitiveMarkers(
  category: string,
  value: string | null | undefined,
  categoryCounts: Map<string, number>,
) {
  if (!value || !hasSensitiveMarker(value)) {
    return;
  }

  categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
}

function hasSensitiveMarker(value: string) {
  return (
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value) ||
    /\b(token|secret|api[_-]?key|password|bearer)\b/i.test(value) ||
    /\b(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|10\.|172\.(?:1[6-9]|2\d|3[0-1])\.|192\.168\.)/i.test(
      value,
    ) ||
    /\b[A-Za-z0-9_-]{32,}\b/.test(value)
  );
}

function getExportSummary(
  files: AdminDataLossPreventionFile[],
  sensitiveFiles: SensitiveDocumentSummary[],
) {
  const sensitiveFileIds = new Set(sensitiveFiles.map((file) => file.fileId));
  const exportEvents = files.flatMap((file) =>
    (file.document.activityEvents ?? [])
      .filter((event) => event.kind === "export")
      .map((event) => ({
        fileId: file.id,
        createdAt: event.createdAt,
        failed: event.telemetry?.status === "failed",
      })),
  );

  return {
    exportEventCount: exportEvents.length,
    sensitiveExportEventCount: exportEvents.filter((event) =>
      sensitiveFileIds.has(event.fileId),
    ).length,
    failedExportEventCount: exportEvents.filter((event) => event.failed).length,
    latestAt:
      exportEvents
        .map((event) => event.createdAt)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ??
      null,
  };
}

function getDataLossPreventionWorkflows(
  rows: AdminDataLossPreventionRow[],
): AdminDataLossPreventionWorkflow[] {
  return rows.map((row) => ({
    id: `${row.id}-workflow`,
    status: row.status,
    title: row.workflow,
    scope: row.category,
    owner: row.status === "ready" ? "Release owner" : "Security reviewer",
    evidence: row.detail,
    action: row.recommendation,
  }));
}

function getDataLossPreventionCommands() {
  return [
    "Export Admin > Governance data-loss prevention JSON before external release.",
    "Disable public downloads for links that do not have explicit handoff approval.",
    "Review embed host evidence and route analytics before publishing iframe URLs.",
    "Revoke stale write-capable plugin approvals before exporting sensitive workspaces.",
    "Use redacted or minimal support bundles when sensitive metadata is present.",
  ];
}

function sortRows(
  first: AdminDataLossPreventionRow,
  second: AdminDataLossPreventionRow,
) {
  return (
    getStatusWeight(first.status) - getStatusWeight(second.status) ||
    first.category.localeCompare(second.category)
  );
}

function getStatusWeight(status: AdminDataLossPreventionStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

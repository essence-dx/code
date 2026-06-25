import type { RetentionPrivacyReport } from "@/features/admin/admin-retention-privacy";
import {
  getDocumentAccessibilityAudit,
  type AccessibilityAudit,
} from "@/features/editor/accessibility-audit";
import {
  getPrototypeFlowDiagnostics,
  type PrototypeFlowDiagnostics,
} from "@/features/editor/prototype-flow-diagnostics";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { DesignDocument } from "@/features/editor/types";

export type AccessibilityPrivacyReleaseSurface =
  | "admin"
  | "editor"
  | "prototype"
  | "share";

export type AccessibilityPrivacyReleaseStatus =
  | "ready"
  | "review"
  | "blocked";

export type AccessibilityPrivacyReleaseRow = {
  id: string;
  surface: AccessibilityPrivacyReleaseSurface;
  status: AccessibilityPrivacyReleaseStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  evidenceCount: number;
};

export type AccessibilityPrivacyReleaseChecklist = {
  generatedAt: string;
  status: AccessibilityPrivacyReleaseStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  surfaceCount: number;
  documentCount: number;
  checkedLayerCount: number;
  textLayerCount: number;
  interactiveLayerCount: number;
  highAccessibilityIssueCount: number;
  mediumAccessibilityIssueCount: number;
  lowAccessibilityIssueCount: number;
  prototypeIssueCount: number;
  prototypeBrokenCount: number;
  privacyReviewCount: number;
  rows: AccessibilityPrivacyReleaseRow[];
};

export type AccessibilityPrivacyReleaseInput = {
  documents: Array<{
    id: string;
    name: string;
    document: DesignDocument;
  }>;
  productionDeploySmoke: ProductionDeploySmokeReport;
  retentionPrivacy: RetentionPrivacyReport;
  generatedAt?: string;
};

export function getAccessibilityPrivacyReleaseChecklist({
  documents,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  retentionPrivacy,
}: AccessibilityPrivacyReleaseInput): AccessibilityPrivacyReleaseChecklist {
  const accessibility = getWorkspaceAccessibilityAudit(documents);
  const prototype = getWorkspacePrototypeDiagnostics(documents);
  const rows = [
    getEditorAccessibilityRow({ accessibility, documentCount: documents.length }),
    getEditorRouteSmokeRow(productionDeploySmoke),
    getAdminPrivacyRow(retentionPrivacy),
    getAdminRouteSmokeRow(productionDeploySmoke),
    getSharePrivacyRow(retentionPrivacy),
    getShareRouteSmokeRow(productionDeploySmoke),
    getPrototypeFlowRow(prototype),
    getPrototypeInteractionRow({ accessibility, prototype }),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    readyCount,
    reviewCount,
    blockedCount,
    surfaceCount: new Set(rows.map((row) => row.surface)).size,
    documentCount: documents.length,
    checkedLayerCount: accessibility.checkedLayerCount,
    textLayerCount: accessibility.textLayerCount,
    interactiveLayerCount: accessibility.interactiveLayerCount,
    highAccessibilityIssueCount: accessibility.highCount,
    mediumAccessibilityIssueCount: accessibility.mediumCount,
    lowAccessibilityIssueCount: accessibility.lowCount,
    prototypeIssueCount: prototype.issues.length,
    prototypeBrokenCount: prototype.brokenCount,
    privacyReviewCount: retentionPrivacy.reviewCount + retentionPrivacy.blockedCount,
    rows,
  };
}

function getWorkspaceAccessibilityAudit(
  documents: AccessibilityPrivacyReleaseInput["documents"],
): AccessibilityAudit {
  const pages = documents.flatMap((item) => item.document.pages);

  return getDocumentAccessibilityAudit(pages);
}

function getWorkspacePrototypeDiagnostics(
  documents: AccessibilityPrivacyReleaseInput["documents"],
): PrototypeFlowDiagnostics {
  const reports = documents.map((item) =>
    getPrototypeFlowDiagnostics(item.document),
  );
  const issues = reports
    .flatMap((report) => report.issues)
    .sort((left, right) => {
      if (left.severity !== right.severity) {
        return getSeverityRank(left.severity) - getSeverityRank(right.severity);
      }

      return left.pageName.localeCompare(right.pageName);
    });

  return {
    pageCount: reports.reduce((total, report) => total + report.pageCount, 0),
    startPageCount: reports.reduce(
      (total, report) => total + report.startPageCount,
      0,
    ),
    hotspotCount: reports.reduce(
      (total, report) => total + report.hotspotCount,
      0,
    ),
    brokenCount: reports.reduce(
      (total, report) => total + report.brokenCount,
      0,
    ),
    warningCount: issues.length,
    deadEndCount: reports.reduce(
      (total, report) => total + report.deadEndCount,
      0,
    ),
    unreachableCount: reports.reduce(
      (total, report) => total + report.unreachableCount,
      0,
    ),
    pages: reports.flatMap((report) => report.pages),
    issues,
  };
}

function getEditorAccessibilityRow({
  accessibility,
  documentCount,
}: {
  accessibility: AccessibilityAudit;
  documentCount: number;
}): AccessibilityPrivacyReleaseRow {
  return {
    id: "editor-accessibility-audit",
    surface: "editor",
    status:
      documentCount === 0
        ? "review"
        : accessibility.highCount > 0
          ? "blocked"
          : accessibility.mediumCount + accessibility.lowCount > 0
            ? "review"
            : "ready",
    label: "Editor accessibility audit",
    value: `${accessibility.score}/100`,
    detail:
      documentCount === 0
        ? "No saved documents are available for editor accessibility release review."
        : `${accessibility.checkedLayerCount} visible layers, ${accessibility.textLayerCount} text layers, and ${accessibility.interactiveLayerCount} interactive layers were checked.`,
    recommendation:
      "Resolve high contrast, missing alt text, and interactive label issues before release approval.",
    evidenceCount: accessibility.issues.length,
  };
}

function getEditorRouteSmokeRow(
  productionDeploySmoke: ProductionDeploySmokeReport,
): AccessibilityPrivacyReleaseRow {
  return getSmokeRow({
    id: "editor-route-smoke-accessibility",
    surface: "editor",
    label: "Editor route release smoke",
    kind: "editor",
    productionDeploySmoke,
    recommendation:
      "Run the editor route smoke with seeded content after deployment so accessibility fixes are exercised in the actual shell.",
  });
}

function getAdminPrivacyRow(
  retentionPrivacy: RetentionPrivacyReport,
): AccessibilityPrivacyReleaseRow {
  return {
    id: "admin-retention-privacy-release",
    surface: "admin",
    status: retentionPrivacy.status,
    label: "Admin retention privacy",
    value: `${retentionPrivacy.score}/100`,
    detail: `${retentionPrivacy.retainedAuditEventCount} audit events, ${retentionPrivacy.retainedNotificationDeliveryCount} notification records, and ${retentionPrivacy.supportBundleSensitiveAuditMetadataCount} sensitive audit metadata rows are covered.`,
    recommendation:
      "Export retention privacy controls before release and keep support bundle redaction enabled for production diagnostics.",
    evidenceCount: retentionPrivacy.rows.length,
  };
}

function getAdminRouteSmokeRow(
  productionDeploySmoke: ProductionDeploySmokeReport,
): AccessibilityPrivacyReleaseRow {
  return getSmokeRow({
    id: "admin-route-smoke-privacy",
    surface: "admin",
    label: "Admin route release smoke",
    kind: "admin",
    productionDeploySmoke,
    recommendation:
      "Verify the admin dashboard loads release, audit, user, notification, and privacy panels for the seeded admin.",
  });
}

function getSharePrivacyRow(
  retentionPrivacy: RetentionPrivacyReport,
): AccessibilityPrivacyReleaseRow {
  const sensitiveCount =
    retentionPrivacy.supportBundleSensitiveSessionCount +
    retentionPrivacy.supportBundleSensitiveAuditMetadataCount;

  return {
    id: "share-privacy-evidence",
    surface: "share",
    status:
      sensitiveCount > 0 && !retentionPrivacy.supportBundleRedactionEnabled
        ? "review"
        : "ready",
    label: "Share and support evidence privacy",
    value: retentionPrivacy.supportBundleRedactionEnabled
      ? retentionPrivacy.settings.supportBundlePrivacyMode
      : "diagnostic",
    detail: `${sensitiveCount} sensitive support evidence records are visible in release scope; support bundle privacy mode is ${retentionPrivacy.settings.supportBundlePrivacyMode}.`,
    recommendation:
      "Use redacted or minimal support evidence when attaching share diagnostics to external release handoffs.",
    evidenceCount: sensitiveCount,
  };
}

function getShareRouteSmokeRow(
  productionDeploySmoke: ProductionDeploySmokeReport,
): AccessibilityPrivacyReleaseRow {
  return getSmokeRow({
    id: "share-route-smoke-privacy",
    surface: "share",
    label: "Public share route smoke",
    kind: "share",
    productionDeploySmoke,
    recommendation:
      "Confirm public share handoff renders without leaking admin-only data or authenticated controls.",
  });
}

function getPrototypeFlowRow(
  prototype: PrototypeFlowDiagnostics,
): AccessibilityPrivacyReleaseRow {
  return {
    id: "prototype-flow-release",
    surface: "prototype",
    status:
      prototype.brokenCount > 0
        ? "blocked"
        : prototype.warningCount > 0
          ? "review"
          : "ready",
    label: "Prototype flow release",
    value: `${prototype.hotspotCount} hotspots`,
    detail: `${prototype.startPageCount} start pages, ${prototype.brokenCount} broken targets, ${prototype.unreachableCount} unreachable pages, and ${prototype.deadEndCount} dead ends were found.`,
    recommendation:
      "Fix broken hotspots and mark one clear start page before publishing prototype release links.",
    evidenceCount: prototype.issues.length,
  };
}

function getPrototypeInteractionRow({
  accessibility,
  prototype,
}: {
  accessibility: AccessibilityAudit;
  prototype: PrototypeFlowDiagnostics;
}): AccessibilityPrivacyReleaseRow {
  const interactiveIssueCount = accessibility.issues.filter((issue) =>
    /prototype|interactive|target|keyboard|trigger/i.test(
      `${issue.label} ${issue.detail}`,
    ),
  ).length;

  return {
    id: "prototype-interaction-accessibility",
    surface: "prototype",
    status:
      prototype.hotspotCount === 0
        ? "review"
        : interactiveIssueCount > 0
          ? "review"
          : "ready",
    label: "Prototype interaction accessibility",
    value: `${accessibility.interactiveLayerCount} interactions`,
    detail: `${interactiveIssueCount} interaction-focused accessibility issue${interactiveIssueCount === 1 ? "" : "s"} are included in the release audit.`,
    recommendation:
      "Check target sizes, visible labels, and click fallbacks for all prototype interactions.",
    evidenceCount: interactiveIssueCount,
  };
}

function getSmokeRow({
  id,
  surface,
  label,
  kind,
  productionDeploySmoke,
  recommendation,
}: {
  id: string;
  surface: AccessibilityPrivacyReleaseSurface;
  label: string;
  kind: ProductionDeploySmokeReport["rows"][number]["kind"];
  productionDeploySmoke: ProductionDeploySmokeReport;
  recommendation: string;
}): AccessibilityPrivacyReleaseRow {
  const rows = productionDeploySmoke.rows.filter((row) => row.kind === kind);
  const status = getRowsStatus(rows.map((row) => row.status));

  return {
    id,
    surface,
    status,
    label,
    value: `${rows.length} checks`,
    detail:
      rows.length > 0
        ? rows.map((row) => `${row.label}: ${row.detail}`).join(" ")
        : `No ${kind} route smoke rows are registered.`,
    recommendation,
    evidenceCount: rows.length,
  };
}

function getRowsStatus(
  statuses: ProductionDeploySmokeReport["rows"][number]["status"][],
) {
  if (statuses.length === 0) {
    return "review";
  }

  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getSeverityRank(severity: "high" | "low" | "medium") {
  if (severity === "high") {
    return 0;
  }

  return severity === "medium" ? 1 : 2;
}

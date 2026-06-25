import type { DesignFileVersionSummary } from "@/features/files/actions";
import {
  getVersionCompareReview,
  type VersionCompareRisk,
} from "@/features/editor/version-compare-review";
import {
  getVersionMergeReview,
  type VersionMergeSection,
} from "@/features/editor/version-merge";
import type {
  DesignDocument,
  DesignMergeReviewRecord,
  DesignMergeReviewSectionId,
} from "@/features/editor/types";

export type BranchCompareMergeWorkbenchStatus =
  | "ready"
  | "review"
  | "blocked";

export type BranchCompareMergeWorkbenchCategory =
  | "audit-export"
  | "merge-conflict"
  | "reviewer-signoff"
  | "rollback-anchor"
  | "visual-diff";

export type BranchCompareMergeWorkbenchRow = {
  id: string;
  status: BranchCompareMergeWorkbenchStatus;
  category: BranchCompareMergeWorkbenchCategory;
  label: string;
  detail: string;
  value: string;
  versionId: string | null;
  versionName: string | null;
  sectionId: DesignMergeReviewSectionId | null;
  conflictFamily: string | null;
  recommendation: string;
};

export type BranchCompareMergeWorkbenchReport = {
  generatedAt: string;
  status: BranchCompareMergeWorkbenchStatus;
  score: number;
  versionCount: number;
  comparedVersionCount: number;
  selectedVersionId: string | null;
  selectedVersionName: string | null;
  visualDiffCount: number;
  highRiskVisualDiffCount: number;
  conflictSectionCount: number;
  unresolvedConflictCount: number;
  reviewerSignoffCount: number;
  rollbackAnchorCount: number;
  auditExportEvidenceCount: number;
  auditExportEvidence: string[];
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: BranchCompareMergeWorkbenchRow[];
};

type BranchCompareMergeWorkbenchInput = {
  currentDocument: DesignDocument;
  generatedAt?: string;
  selectedVersionId?: string | null;
  versions: DesignFileVersionSummary[];
};

type BranchCompareTarget = {
  version: DesignFileVersionSummary;
  compareRisk: VersionCompareRisk;
  visualDiffCount: number;
  sections: VersionMergeSection[];
  changedSections: VersionMergeSection[];
  mergeReview: DesignMergeReviewRecord | null;
  rollbackAnchored: boolean;
};

const auditExportEvidence = [
  "Export Branch compare workbench JSON.",
  "Export Branch compare workbench CSV.",
  "Export Branch compare workbench Markdown.",
  "Attach merge review, rollback anchor, and visual diff evidence to release gates.",
];

export function getBranchCompareMergeWorkbenchReport({
  currentDocument,
  generatedAt = new Date().toISOString(),
  selectedVersionId = null,
  versions,
}: BranchCompareMergeWorkbenchInput): BranchCompareMergeWorkbenchReport {
  const targets = getCompareTargets({
    currentDocument,
    selectedVersionId,
    versions,
  });
  const targetRows = targets.flatMap((target) =>
    getRowsForTarget(currentDocument, target),
  );
  const rows = [...targetRows, getAuditExportRow(targets.length)];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const visualDiffCount = targets.reduce(
    (total, target) => total + target.visualDiffCount,
    0,
  );
  const highRiskVisualDiffCount = targets.filter(
    (target) => target.compareRisk === "high",
  ).length;
  const conflictSectionCount = targets.reduce(
    (total, target) => total + target.changedSections.length,
    0,
  );
  const unresolvedConflictCount = targets.reduce(
    (total, target) =>
      total +
      target.changedSections.filter(
        (section) => !hasSectionDecision(target.mergeReview, section.id),
      ).length,
    0,
  );
  const reviewerSignoffCount = targets.filter((target) =>
    hasReviewerSignoff(target.mergeReview),
  ).length;
  const rollbackAnchorCount = targets.filter(
    (target) => target.rollbackAnchored,
  ).length;
  const selectedTarget =
    targets.find((target) => target.version.id === selectedVersionId) ??
    targets[0] ??
    null;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    versionCount: versions.length,
    comparedVersionCount: targets.length,
    selectedVersionId: selectedTarget?.version.id ?? null,
    selectedVersionName: selectedTarget?.version.name ?? null,
    visualDiffCount,
    highRiskVisualDiffCount,
    conflictSectionCount,
    unresolvedConflictCount,
    reviewerSignoffCount,
    rollbackAnchorCount,
    auditExportEvidenceCount: auditExportEvidence.length,
    auditExportEvidence,
    blockedCount,
    reviewCount,
    readyCount,
    rows,
  };
}

export function getBranchCompareMergeWorkbenchCsv(
  report: BranchCompareMergeWorkbenchReport,
  rows: BranchCompareMergeWorkbenchRow[] = report.rows,
) {
  const header: Array<keyof BranchCompareMergeWorkbenchRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "value",
    "versionId",
    "versionName",
    "sectionId",
    "conflictFamily",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "versions",
      "compared_versions",
      "selected_version",
      "visual_diffs",
      "high_risk_visual_diffs",
      "conflict_sections",
      "unresolved_conflicts",
      "reviewer_signoffs",
      "rollback_anchors",
      "audit_exports",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.versionCount,
      report.comparedVersionCount,
      report.selectedVersionName ?? "",
      report.visualDiffCount,
      report.highRiskVisualDiffCount,
      report.conflictSectionCount,
      report.unresolvedConflictCount,
      report.reviewerSignoffCount,
      report.rollbackAnchorCount,
      report.auditExportEvidenceCount,
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

export function getBranchCompareMergeWorkbenchMarkdown(
  report: BranchCompareMergeWorkbenchReport,
  rows: BranchCompareMergeWorkbenchRow[] = report.rows,
) {
  return [
    "# Branch Compare Merge Workbench",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Versions: ${report.versionCount}`,
    `Compared versions: ${report.comparedVersionCount}`,
    `Selected version: ${report.selectedVersionName ?? "none"}`,
    `Visual diffs: ${report.visualDiffCount}`,
    `High-risk visual diffs: ${report.highRiskVisualDiffCount}`,
    `Conflict sections: ${report.conflictSectionCount}`,
    `Unresolved conflicts: ${report.unresolvedConflictCount}`,
    `Reviewer Signoff: ${report.reviewerSignoffCount}`,
    `Rollback anchors: ${report.rollbackAnchorCount}`,
    "",
    "## Workbench Rows",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No branch compare rows found."]),
    "",
    "## Audit Export Evidence",
    ...report.auditExportEvidence.map((item) => `- ${item}`),
  ].join("\n");
}

export function getBranchCompareMergeWorkbenchJson(
  report: BranchCompareMergeWorkbenchReport,
  rows: BranchCompareMergeWorkbenchRow[] = report.rows,
) {
  return JSON.stringify(
    {
      generatedAt: report.generatedAt,
      summary: {
        score: report.score,
        status: report.status,
        versionCount: report.versionCount,
        comparedVersionCount: report.comparedVersionCount,
        selectedVersionId: report.selectedVersionId,
        selectedVersionName: report.selectedVersionName,
        visualDiffCount: report.visualDiffCount,
        highRiskVisualDiffCount: report.highRiskVisualDiffCount,
        conflictSectionCount: report.conflictSectionCount,
        unresolvedConflictCount: report.unresolvedConflictCount,
        reviewerSignoffCount: report.reviewerSignoffCount,
        rollbackAnchorCount: report.rollbackAnchorCount,
        auditExportEvidenceCount: report.auditExportEvidenceCount,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
      },
      auditExportEvidence: report.auditExportEvidence,
      rows,
    },
    null,
    2,
  );
}

function getCompareTargets({
  currentDocument,
  selectedVersionId,
  versions,
}: {
  currentDocument: DesignDocument;
  selectedVersionId: string | null;
  versions: DesignFileVersionSummary[];
}) {
  const preferredIds = [
    selectedVersionId,
    currentDocument.branchMetadata?.sourceVersionId,
    currentDocument.branchMetadata?.restorePointVersionId,
  ].filter(Boolean) as string[];
  const orderedVersions = [
    ...preferredIds.flatMap((versionId) =>
      versions.filter((version) => version.id === versionId),
    ),
    ...versions,
  ];
  const seen = new Set<string>();

  return orderedVersions
    .filter((version) => {
      if (seen.has(version.id)) {
        return false;
      }

      seen.add(version.id);
      return true;
    })
    .slice(0, 4)
    .map((version) => {
      const compareReview = getVersionCompareReview(
        currentDocument,
        version.document,
      );
      const mergeReview = getVersionMergeReview(
        currentDocument,
        version.document,
      );
      const matchingReview = getMatchingMergeReview(currentDocument, version.id);

      return {
        version,
        compareRisk: compareReview.risk,
        visualDiffCount: compareReview.totalChangeCount,
        sections: mergeReview.sections,
        changedSections: mergeReview.sections.filter(
          (section) => section.changed,
        ),
        mergeReview: matchingReview,
        rollbackAnchored: hasRollbackAnchor({
          currentDocument,
          mergeReview: matchingReview,
          versionId: version.id,
        }),
      } satisfies BranchCompareTarget;
    });
}

function getRowsForTarget(
  currentDocument: DesignDocument,
  target: BranchCompareTarget,
): BranchCompareMergeWorkbenchRow[] {
  return [
    getVisualDiffRow(target),
    ...target.changedSections.map((section) =>
      getMergeConflictRow(section, target),
    ),
    getReviewerSignoffRow(target),
    getRollbackAnchorRow(currentDocument, target),
  ];
}

function getVisualDiffRow(
  target: BranchCompareTarget,
): BranchCompareMergeWorkbenchRow {
  const status: BranchCompareMergeWorkbenchStatus =
    target.visualDiffCount === 0
      ? "ready"
      : target.compareRisk === "low"
        ? "review"
        : "review";

  return {
    id: `visual-diff-${target.version.id}`,
    status,
    category: "visual-diff",
    label: "Visual diff",
    detail:
      target.visualDiffCount > 0
        ? `${target.version.name} has ${target.visualDiffCount} current-vs-version visual, layer, metric, or component differences.`
        : `${target.version.name} matches the current document.`,
    value: `${target.visualDiffCount} diffs`,
    versionId: target.version.id,
    versionName: target.version.name,
    sectionId: null,
    conflictFamily: null,
    recommendation:
      target.visualDiffCount > 0
        ? "Review visual diffs before approving the merge target."
        : "No visual diff review is needed for this version.",
  };
}

function getMergeConflictRow(
  section: VersionMergeSection,
  target: BranchCompareTarget,
): BranchCompareMergeWorkbenchRow {
  const resolved = hasSectionDecision(target.mergeReview, section.id);

  return {
    id: `merge-conflict-${target.version.id}-${section.id}`,
    status: resolved ? "ready" : "blocked",
    category: "merge-conflict",
    label: `${section.label} conflict`,
    detail: `${section.description}: current ${section.currentCount}, incoming ${section.incomingCount}.`,
    value: resolved ? "resolved" : "unresolved",
    versionId: target.version.id,
    versionName: target.version.name,
    sectionId: section.id,
    conflictFamily: section.conflictFamily,
    recommendation: resolved
      ? "Merge review decision is recorded for this changed section."
      : "Record a reviewer decision before merging this changed section.",
  };
}

function getReviewerSignoffRow(
  target: BranchCompareTarget,
): BranchCompareMergeWorkbenchRow {
  const signed = hasReviewerSignoff(target.mergeReview);
  const hasChanges = target.changedSections.length > 0;
  const status: BranchCompareMergeWorkbenchStatus = signed
    ? target.mergeReview?.notes
      ? "ready"
      : "review"
    : hasChanges
      ? "blocked"
      : "ready";

  return {
    id: `reviewer-signoff-${target.version.id}`,
    status,
    category: "reviewer-signoff",
    label: "Reviewer Signoff",
    detail: signed
      ? `${target.mergeReview?.reviewerName} signed ${target.mergeReview?.decisions.length ?? 0} merge decisions.`
      : "No reviewer signoff is recorded for this compare target.",
    value: signed ? target.mergeReview?.reviewerName ?? "signed" : "missing",
    versionId: target.version.id,
    versionName: target.version.name,
    sectionId: null,
    conflictFamily: null,
    recommendation: signed
      ? "Keep reviewer notes attached to the branch audit packet."
      : "Capture reviewer signoff before release merge.",
  };
}

function getRollbackAnchorRow(
  currentDocument: DesignDocument,
  target: BranchCompareTarget,
): BranchCompareMergeWorkbenchRow {
  const hasChanges = target.changedSections.length > 0;
  const status: BranchCompareMergeWorkbenchStatus = target.rollbackAnchored
    ? "ready"
    : hasChanges
      ? "blocked"
      : "review";

  return {
    id: `rollback-anchor-${target.version.id}`,
    status,
    category: "rollback-anchor",
    label: "Rollback anchor",
    detail: target.rollbackAnchored
      ? `${target.version.name} is available as a rollback anchor.`
      : getMissingRollbackAnchorDetail(currentDocument, target.version.name),
    value: target.rollbackAnchored ? "anchored" : "missing",
    versionId: target.version.id,
    versionName: target.version.name,
    sectionId: null,
    conflictFamily: null,
    recommendation: target.rollbackAnchored
      ? "Keep this version linked in the merge audit packet."
      : "Create or link a restore point before approving merge work.",
  };
}

function getAuditExportRow(
  targetCount: number,
): BranchCompareMergeWorkbenchRow {
  return {
    id: "branch-compare-audit-export",
    status: targetCount > 0 ? "ready" : "review",
    category: "audit-export",
    label: "Audit export evidence",
    detail:
      targetCount > 0
        ? `${auditExportEvidence.length} export paths cover branch compare, merge decisions, rollback anchors, and audit evidence.`
        : "No named versions are available for branch compare export.",
    value: `${auditExportEvidence.length} exports`,
    versionId: null,
    versionName: null,
    sectionId: null,
    conflictFamily: null,
    recommendation:
      targetCount > 0
        ? "Attach JSON, CSV, and Markdown exports to the merge approval."
        : "Save a named version before exporting branch compare evidence.",
  };
}

function getMatchingMergeReview(
  currentDocument: DesignDocument,
  versionId: string,
) {
  return (
    currentDocument.mergeReviews?.find(
      (review) => review.sourceVersionId === versionId,
    ) ?? null
  );
}

function hasReviewerSignoff(review: DesignMergeReviewRecord | null) {
  return Boolean(review && review.reviewerName && review.decisions.length > 0);
}

function hasSectionDecision(
  review: DesignMergeReviewRecord | null,
  sectionId: DesignMergeReviewSectionId,
) {
  return Boolean(
    review?.decisions.some(
      (decision) => decision.sectionId === sectionId && decision.changed,
    ),
  );
}

function hasRollbackAnchor({
  currentDocument,
  mergeReview,
  versionId,
}: {
  currentDocument: DesignDocument;
  mergeReview: DesignMergeReviewRecord | null;
  versionId: string;
}) {
  return (
    currentDocument.branchMetadata?.restorePointVersionId === versionId ||
    mergeReview?.rollbackVersionId === versionId
  );
}

function getMissingRollbackAnchorDetail(
  currentDocument: DesignDocument,
  versionName: string,
) {
  if (!currentDocument.branchMetadata) {
    return `${versionName} is not linked from branch metadata or a merge review.`;
  }

  return `${currentDocument.branchMetadata.branchName} does not link ${versionName} as a restore point.`;
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

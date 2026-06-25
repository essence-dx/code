import {
  getDocumentAccessibilityAudit,
  type AccessibilityAudit,
  type AccessibilityIssue,
} from "@/features/editor/accessibility-audit";
import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import type {
  ProductionDeploySmokeReport,
  ProductionDeploySmokeRow,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";
import {
  getShortcutCustomizationCenterReport,
  type ShortcutCustomizationCenterReport,
} from "@/features/editor/shortcut-customization-center";
import type { ToolShortcutPreferences } from "@/features/editor/shortcut-preferences";
import type { DesignDocument, DesignPage } from "@/features/editor/types";

export type AccessibilityKeyboardAuthoringStatus = ProductionDeploySmokeStatus;

export type AccessibilityKeyboardSurface =
  | "admin"
  | "editor"
  | "public-embed"
  | "public-prototype"
  | "public-share";

export type AccessibilityKeyboardAuthoringRowCategory =
  | "keyboard-authoring"
  | "route-keyboard-smoke"
  | "surface-accessibility";

export type AccessibilityKeyboardSurfaceReview = {
  id: string;
  status: AccessibilityKeyboardAuthoringStatus;
  surface: AccessibilityKeyboardSurface;
  label: string;
  route: string;
  routeStatus: ProductionDeploySmokeStatus;
  accessibilityScore: number | null;
  highIssueCount: number;
  keyboardIssueCount: number;
  commandEvidenceCount: number;
  detail: string;
  recommendation: string;
};

export type AccessibilityKeyboardReview = {
  id: string;
  status: AccessibilityKeyboardAuthoringStatus;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type AccessibilityKeyboardAuthoringReviewRow = {
  id: string;
  status: AccessibilityKeyboardAuthoringStatus;
  category: AccessibilityKeyboardAuthoringRowCategory;
  surface?: AccessibilityKeyboardSurface;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type AccessibilityKeyboardAuthoringReviewReport = {
  generatedAt: string;
  status: AccessibilityKeyboardAuthoringStatus;
  score: number;
  surfaceCount: number;
  readySurfaceCount: number;
  routeSmokeSurfaceCount: number;
  keyboardReviewCount: number;
  shortcutConflictCount: number;
  commandPaletteEvidenceCount: number;
  highIssueCount: number;
  keyboardIssueCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  surfaceReviews: AccessibilityKeyboardSurfaceReview[];
  keyboardReviews: AccessibilityKeyboardReview[];
  rows: AccessibilityKeyboardAuthoringReviewRow[];
};

const surfaceOrder: AccessibilityKeyboardSurface[] = [
  "editor",
  "admin",
  "public-share",
  "public-prototype",
  "public-embed",
];

const surfaceLabels: Record<AccessibilityKeyboardSurface, string> = {
  admin: "admin surface",
  editor: "editor surface",
  "public-embed": "public embed",
  "public-prototype": "public prototype",
  "public-share": "public share",
};

const routeKindBySurface: Record<
  AccessibilityKeyboardSurface,
  ProductionDeploySmokeRow["kind"]
> = {
  admin: "admin",
  editor: "editor",
  "public-embed": "embed",
  "public-prototype": "prototype",
  "public-share": "share",
};

const statusRank: Record<AccessibilityKeyboardAuthoringStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getAccessibilityKeyboardAuthoringReviewReport({
  activePage,
  commandPaletteCommands,
  document,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  toolShortcuts,
}: {
  activePage: DesignPage;
  commandPaletteCommands: CommandPaletteCommand[];
  document: DesignDocument;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  toolShortcuts: ToolShortcutPreferences;
}): AccessibilityKeyboardAuthoringReviewReport {
  const accessibilityAudit = getDocumentAccessibilityAudit(document.pages);
  const shortcutReport = getShortcutCustomizationCenterReport({
    commands: commandPaletteCommands,
    toolShortcuts,
  });
  const keyboardIssues = getKeyboardIssues(accessibilityAudit);
  const surfaceReviews = surfaceOrder.map((surface) =>
    getSurfaceReview({
      accessibilityAudit,
      activePage,
      keyboardIssues,
      productionDeploySmoke,
      shortcutReport,
      surface,
    }),
  );
  const keyboardReviews = getKeyboardReviews({
    accessibilityAudit,
    keyboardIssues,
    shortcutReport,
  });
  const rows = [
    ...surfaceReviews.map(getSurfaceRow),
    ...surfaceReviews.map(getRouteSmokeRow),
    ...keyboardReviews.map(getKeyboardReviewRow),
  ].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(
      0,
      100 -
        blockedCount * 14 -
        reviewCount * 4 -
        accessibilityAudit.highCount * 4 -
        keyboardIssues.length * 3,
    ),
    surfaceCount: surfaceReviews.length,
    readySurfaceCount: surfaceReviews.filter(
      (surface) => surface.status === "ready",
    ).length,
    routeSmokeSurfaceCount: surfaceReviews.filter(
      (surface) => surface.routeStatus === "ready",
    ).length,
    keyboardReviewCount: keyboardReviews.length,
    shortcutConflictCount: shortcutReport.conflictCount,
    commandPaletteEvidenceCount: shortcutReport.commandPaletteEvidenceCount,
    highIssueCount: accessibilityAudit.highCount,
    keyboardIssueCount: keyboardIssues.length,
    readyCount,
    reviewCount,
    blockedCount,
    surfaceReviews,
    keyboardReviews,
    rows,
  };
}

export function getAccessibilityKeyboardAuthoringReviewJson(
  report: AccessibilityKeyboardAuthoringReviewReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAccessibilityKeyboardAuthoringReviewCsv(
  report: AccessibilityKeyboardAuthoringReviewReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "surface",
      "label",
      "metric",
      "evidence",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.surface ?? "",
        row.label,
        row.metric,
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAccessibilityKeyboardAuthoringReviewMarkdown(
  report: AccessibilityKeyboardAuthoringReviewReport,
) {
  return [
    "# Accessibility Keyboard Authoring Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Surfaces: ${report.readySurfaceCount}/${report.surfaceCount} ready`,
    `Route smoke surfaces: ${report.routeSmokeSurfaceCount}`,
    `Keyboard authoring checks: ${report.keyboardReviewCount}`,
    `Command palette evidence: ${report.commandPaletteEvidenceCount}`,
    `Shortcut conflicts: ${report.shortcutConflictCount}`,
    "",
    "This handoff reviews editor surface, admin surface, public share, public prototype, and public embed accessibility plus keyboard authoring evidence.",
    "",
    "## Surfaces",
    "",
    ...report.surfaceReviews.map(
      (surface) =>
        `- [${surface.status}] ${surface.label} (${surface.route}) - ${surface.detail} ${surface.recommendation}`,
    ),
    "",
    "## keyboard authoring",
    "",
    ...report.keyboardReviews.map(
      (review) =>
        `- [${review.status}] ${review.label}: ${review.detail} Evidence: ${review.evidence}. ${review.recommendation}`,
    ),
  ].join("\n");
}

function getSurfaceReview({
  accessibilityAudit,
  activePage,
  keyboardIssues,
  productionDeploySmoke,
  shortcutReport,
  surface,
}: {
  accessibilityAudit: AccessibilityAudit;
  activePage: DesignPage;
  keyboardIssues: AccessibilityIssue[];
  productionDeploySmoke: ProductionDeploySmokeReport;
  shortcutReport: ShortcutCustomizationCenterReport;
  surface: AccessibilityKeyboardSurface;
}): AccessibilityKeyboardSurfaceReview {
  const route = productionDeploySmoke.rows.find(
    (row) => row.kind === routeKindBySurface[surface],
  );
  const routeStatus = route?.status ?? "blocked";
  const surfaceKeyboardIssueCount =
    surface === "public-prototype"
      ? keyboardIssues.length
      : surface === "editor"
        ? keyboardIssues.length
        : 0;
  const highIssueCount =
    surface === "admin" ? 0 : accessibilityAudit.highCount;
  const accessibilityStatus = getAccessibilityStatus({
    highIssueCount,
    keyboardIssueCount: surfaceKeyboardIssueCount,
  });
  const keyboardStatus =
    surface === "editor" ? shortcutReport.status : accessibilityStatus;
  const status = getWorstStatus([routeStatus, accessibilityStatus, keyboardStatus]);
  const accessibilityScore = surface === "admin" ? null : accessibilityAudit.score;

  return {
    id: `surface:${surface}`,
    status,
    surface,
    label: surfaceLabels[surface],
    route: route?.route ?? "missing-route-smoke",
    routeStatus,
    accessibilityScore,
    highIssueCount,
    keyboardIssueCount: surfaceKeyboardIssueCount,
    commandEvidenceCount:
      surface === "editor" ? shortcutReport.commandPaletteEvidenceCount : 0,
    detail: getSurfaceDetail({
      activePage,
      accessibilityAudit,
      route,
      shortcutReport,
      surface,
      surfaceKeyboardIssueCount,
    }),
    recommendation: getSurfaceRecommendation(status, surface),
  };
}

function getKeyboardReviews({
  accessibilityAudit,
  keyboardIssues,
  shortcutReport,
}: {
  accessibilityAudit: AccessibilityAudit;
  keyboardIssues: AccessibilityIssue[];
  shortcutReport: ShortcutCustomizationCenterReport;
}): AccessibilityKeyboardReview[] {
  return [
    {
      id: "shortcut-collision-review",
      status: shortcutReport.conflictCount > 0 ? "blocked" : "ready",
      label: "Shortcut collision review",
      detail: `${shortcutReport.conflictCount} shortcut collision${shortcutReport.conflictCount === 1 ? "" : "s"} detected across authoring scopes.`,
      evidence: `${shortcutReport.bindingCount} bindings / ${shortcutReport.scopeCount} scopes`,
      recommendation:
        shortcutReport.conflictCount > 0
          ? "Resolve duplicate shortcut bindings before release."
          : "Keep shortcut export evidence attached to authoring review.",
      metric: shortcutReport.conflictCount,
    },
    {
      id: "command-palette-keyboard-evidence",
      status:
        shortcutReport.commandPaletteEvidenceCount > 0 ? "ready" : "review",
      label: "Command palette keyboard evidence",
      detail: `${shortcutReport.commandPaletteEvidenceCount} command palette shortcut${shortcutReport.commandPaletteEvidenceCount === 1 ? "" : "s"} are documented.`,
      evidence: shortcutReport.commandPaletteEvidence
        .slice(0, 6)
        .map((binding) => `${binding.label}:${binding.shortcut.toUpperCase()}`)
        .join(" | "),
      recommendation:
        "Keep common editor commands discoverable through the command palette.",
      metric: shortcutReport.commandPaletteEvidenceCount,
    },
    {
      id: "prototype-keyboard-fallbacks",
      status:
        keyboardIssues.length > 0
          ? keyboardIssues.some((issue) => issue.severity === "high")
            ? "blocked"
            : "review"
          : "ready",
      label: "Prototype keyboard fallbacks",
      detail: `${keyboardIssues.length} interactive keyboard issue${keyboardIssues.length === 1 ? "" : "s"} found in prototype layers.`,
      evidence:
        keyboardIssues.map((issue) => issue.label).join(" | ") ||
        "All interactive prototype layers have keyboard-compatible labels and click targets.",
      recommendation:
        keyboardIssues.length > 0
          ? "Add labels, click fallbacks, or larger targets before public preview."
          : "Attach prototype keyboard coverage to public preview handoff.",
      metric: keyboardIssues.length,
    },
    {
      id: "document-accessibility-score",
      status: getAccessibilityStatus({
        highIssueCount: accessibilityAudit.highCount,
        keyboardIssueCount: keyboardIssues.length,
      }),
      label: "Document accessibility score",
      detail: `${accessibilityAudit.checkedLayerCount} visible layer${accessibilityAudit.checkedLayerCount === 1 ? "" : "s"} checked with score ${accessibilityAudit.score}.`,
      evidence: `${accessibilityAudit.highCount} high / ${accessibilityAudit.mediumCount} medium / ${accessibilityAudit.lowCount} low issues`,
      recommendation:
        accessibilityAudit.highCount > 0
          ? "Clear high accessibility issues before public release."
          : "Keep document accessibility export attached to release evidence.",
      metric: accessibilityAudit.score,
    },
  ];
}

function getSurfaceRow(
  review: AccessibilityKeyboardSurfaceReview,
): AccessibilityKeyboardAuthoringReviewRow {
  return {
    id: `${review.id}:accessibility`,
    status: review.status,
    category: "surface-accessibility",
    surface: review.surface,
    label: `${review.label} accessibility`,
    detail: review.detail,
    evidence:
      review.accessibilityScore === null
        ? "Route and admin shell smoke evidence"
        : `accessibilityScore=${review.accessibilityScore}`,
    recommendation: review.recommendation,
    metric: review.accessibilityScore ?? review.commandEvidenceCount,
  };
}

function getRouteSmokeRow(
  review: AccessibilityKeyboardSurfaceReview,
): AccessibilityKeyboardAuthoringReviewRow {
  return {
    id: `${review.id}:route-smoke`,
    status: review.routeStatus,
    category: "route-keyboard-smoke",
    surface: review.surface,
    label: `${review.label} route keyboard smoke`,
    detail: `${review.route} is ${review.routeStatus} for authoring handoff.`,
    evidence: review.route,
    recommendation:
      review.routeStatus === "ready"
        ? "Keep this route in the keyboard authoring smoke packet."
        : "Re-run public route smoke before approving keyboard release.",
    metric: review.routeStatus === "ready" ? 1 : 0,
  };
}

function getKeyboardReviewRow(
  review: AccessibilityKeyboardReview,
): AccessibilityKeyboardAuthoringReviewRow {
  return {
    id: `keyboard:${review.id}`,
    status: review.status,
    category: "keyboard-authoring",
    label: review.label,
    detail: review.detail,
    evidence: review.evidence,
    recommendation: review.recommendation,
    metric: review.metric,
  };
}

function getKeyboardIssues(accessibilityAudit: AccessibilityAudit) {
  return accessibilityAudit.issues.filter((issue) =>
    /keyboard|target|trigger/i.test(`${issue.label} ${issue.detail}`),
  );
}

function getAccessibilityStatus({
  highIssueCount,
  keyboardIssueCount,
}: {
  highIssueCount: number;
  keyboardIssueCount: number;
}): AccessibilityKeyboardAuthoringStatus {
  if (highIssueCount > 0 || keyboardIssueCount > 0) {
    return highIssueCount > 0 ? "blocked" : "review";
  }

  return "ready";
}

function getSurfaceDetail({
  activePage,
  accessibilityAudit,
  route,
  shortcutReport,
  surface,
  surfaceKeyboardIssueCount,
}: {
  activePage: DesignPage;
  accessibilityAudit: AccessibilityAudit;
  route: ProductionDeploySmokeRow | undefined;
  shortcutReport: ShortcutCustomizationCenterReport;
  surface: AccessibilityKeyboardSurface;
  surfaceKeyboardIssueCount: number;
}) {
  if (surface === "editor") {
    return `${activePage.name} uses ${shortcutReport.bindingCount} keyboard binding${shortcutReport.bindingCount === 1 ? "" : "s"}, ${shortcutReport.commandPaletteEvidenceCount} command palette shortcut${shortcutReport.commandPaletteEvidenceCount === 1 ? "" : "s"}, and document accessibility score ${accessibilityAudit.score}.`;
  }

  if (surface === "admin") {
    return route
      ? `${route.label} route smoke waits for ${route.waitFor}.`
      : "Admin route smoke evidence is missing.";
  }

  return route
    ? `${route.label} route smoke is ${route.status} with ${surfaceKeyboardIssueCount} keyboard issue${surfaceKeyboardIssueCount === 1 ? "" : "s"} in public content.`
    : "Public route smoke evidence is missing.";
}

function getSurfaceRecommendation(
  status: AccessibilityKeyboardAuthoringStatus,
  surface: AccessibilityKeyboardSurface,
) {
  if (status === "blocked") {
    return `Fix blocking accessibility or keyboard issues before approving ${surfaceLabels[surface]}.`;
  }

  if (status === "review") {
    return `Attach reviewer evidence before treating ${surfaceLabels[surface]} as release-ready.`;
  }

  return `Keep ${surfaceLabels[surface]} in the accessibility keyboard handoff.`;
}

function getWorstStatus(statuses: AccessibilityKeyboardAuthoringStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function sortRows(
  first: AccessibilityKeyboardAuthoringReviewRow,
  second: AccessibilityKeyboardAuthoringReviewRow,
) {
  if (first.status !== second.status) {
    return statusRank[first.status] - statusRank[second.status];
  }

  if (first.category !== second.category) {
    return first.category.localeCompare(second.category);
  }

  return first.label.localeCompare(second.label);
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

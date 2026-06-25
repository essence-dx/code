export type RuntimeIssueSource =
  | "visual-snapshot"
  | "route-probe"
  | "release-review"
  | "manual";

export type RuntimeIssueKind = "console" | "page-error";

export type RuntimeIssueSeverity = "info" | "warning" | "error";

export type RuntimeIssue = {
  id: string;
  source: RuntimeIssueSource;
  surfaceId: string;
  surfaceLabel: string;
  url: string;
  kind: RuntimeIssueKind;
  severity: RuntimeIssueSeverity;
  message: string;
  location?: {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
  capturedAt: string;
};

export type RuntimeObservabilityStatus = "ready" | "review" | "blocked";

export type RuntimeObservabilityRow = {
  id: string;
  status: RuntimeObservabilityStatus;
  label: string;
  detail: string;
  issueIds: string[];
  metric: number;
  recommendation: string;
};

export type RuntimeObservabilityReport = {
  captured: boolean;
  status: RuntimeObservabilityStatus;
  score: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: RuntimeObservabilityRow[];
  issues: RuntimeIssue[];
};

export function getRuntimeObservabilityReport({
  issues = [],
  captured = true,
}: {
  issues?: RuntimeIssue[];
  captured?: boolean;
}): RuntimeObservabilityReport {
  const normalizedIssues = issues.map(normalizeRuntimeIssue);
  const errorIssues = normalizedIssues.filter(
    (issue) => issue.severity === "error",
  );
  const warningIssues = normalizedIssues.filter(
    (issue) => issue.severity === "warning",
  );
  const infoIssues = normalizedIssues.filter(
    (issue) => issue.severity === "info",
  );
  const rows: RuntimeObservabilityRow[] = [
    ...getMissingCaptureRows(captured),
    ...getErrorRows(errorIssues),
    ...getWarningRows(warningIssues),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 28 - reviewCount * 8);

  return {
    captured,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    issueCount: normalizedIssues.length,
    errorCount: errorIssues.length,
    warningCount: warningIssues.length,
    infoCount: infoIssues.length,
    blockedCount,
    reviewCount,
    readyCount,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "runtime-observability-ready",
              status: "ready",
              label: "Runtime evidence clean",
              detail:
                "No console errors, page errors, or warning-level runtime signals were captured.",
              issueIds: [],
              metric: score,
              recommendation:
                "Attach this runtime evidence to visual QA and release-review exports.",
            } satisfies RuntimeObservabilityRow,
          ],
    issues: normalizedIssues,
  };
}

export function getRuntimeObservabilityMarkdown(
  report: RuntimeObservabilityReport,
) {
  return [
    "# Runtime Observability",
    "",
    `Captured: ${report.captured ? "yes" : "no"}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Issues: ${report.issueCount}`,
    `Errors: ${report.errorCount}`,
    `Warnings: ${report.warningCount}`,
    `Info: ${report.infoCount}`,
    "",
    "## Review Queue",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Captured Issues",
    ...(report.issues.length > 0
      ? report.issues.map(
          (issue) =>
            `- [${issue.severity}] ${issue.surfaceLabel} ${issue.kind}: ${issue.message}`,
        )
      : ["- No runtime issues captured."]),
  ].join("\n");
}

function normalizeRuntimeIssue(issue: RuntimeIssue): RuntimeIssue {
  return {
    ...issue,
    message: issue.message.trim() || "Runtime issue captured without message.",
    url: issue.url || "unknown",
  };
}

function getMissingCaptureRows(captured: boolean) {
  if (captured) {
    return [];
  }

  return [
    {
      id: "runtime-capture-missing",
      status: "review",
      label: "Runtime evidence missing",
      detail:
        "No browser runtime capture was attached to this release-review export.",
      issueIds: [],
      metric: 1,
      recommendation:
        "Run visual route probes or snapshot capture with runtime issue output before release approval.",
    } satisfies RuntimeObservabilityRow,
  ];
}

function getErrorRows(issues: RuntimeIssue[]) {
  if (issues.length === 0) {
    return [];
  }

  return [
    {
      id: "runtime-errors",
      status: "blocked",
      label: "Runtime errors",
      detail: `${issues.length} console or page error${issues.length === 1 ? "" : "s"} were captured.`,
      issueIds: issues.map((issue) => issue.id),
      metric: issues.length,
      recommendation:
        "Fix runtime errors before updating visual QA baselines or approving release handoff.",
    } satisfies RuntimeObservabilityRow,
  ];
}

function getWarningRows(issues: RuntimeIssue[]) {
  if (issues.length === 0) {
    return [];
  }

  return [
    {
      id: "runtime-warnings",
      status: "review",
      label: "Runtime warnings",
      detail: `${issues.length} warning-level console signal${issues.length === 1 ? "" : "s"} were captured.`,
      issueIds: issues.map((issue) => issue.id),
      metric: issues.length,
      recommendation:
        "Review warning-level runtime signals before marking visual QA as clean.",
    } satisfies RuntimeObservabilityRow,
  ];
}

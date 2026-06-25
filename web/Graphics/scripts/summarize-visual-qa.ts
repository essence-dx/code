import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  RuntimeIssue,
  RuntimeObservabilityReport,
} from "../src/features/editor/runtime-observability";

type StatusCounts = Record<string, number>;

type VisualQaInput = {
  comparison?: SnapshotComparisonReport;
  routeHealth?: RouteHealthReport;
  runtime?: RuntimeObservabilityReport;
};

type SnapshotComparisonReport = {
  comparedAt?: string;
  baselineRunId?: string;
  currentRunId?: string;
  summary?: StatusCounts;
  rows?: Array<{
    id?: string;
    label?: string;
    status?: string;
    notes?: string[];
    pixelDiff?: {
      changedPixels?: number;
      comparedPixels?: number;
      changedRatio?: number;
      passed?: boolean;
    };
  }>;
};

type RouteHealthReport = {
  checkedAt?: string;
  summary?: StatusCounts;
  results?: Array<{
    id?: string;
    label?: string;
    status?: string;
    httpStatus?: number | null;
    detail?: string;
    url?: string;
    runtimeErrorCount?: number;
    runtimeWarningCount?: number;
    runtimeIssues?: RuntimeIssue[];
  }>;
  runtime?: RuntimeObservabilityReport;
};

type VisualQaSummary = {
  status: "passed" | "review" | "failed";
  generatedAt: string;
  reviewer: string;
  reviewerNotes: string;
  sources: {
    comparisonPath?: string;
    routeHealthPath?: string;
    runtimePath?: string;
  };
  metrics: {
    changedSnapshots: number;
    missingSnapshots: number;
    failedRoutes: number;
    skippedRoutes: number;
    runtimeErrors: number;
    runtimeWarnings: number;
  };
  markdown: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(
    args.outputDir ??
      process.env.ESSENCE_VISUAL_SUMMARY_DIR ??
      "artifacts/visual-regression/summary",
  );
  const input = await readInputs({
    comparisonPath: args.comparison ?? process.env.ESSENCE_VISUAL_COMPARISON,
    routeHealthPath: args.routes ?? process.env.ESSENCE_VISUAL_ROUTE_HEALTH,
    runtimePath: args.runtime ?? process.env.ESSENCE_VISUAL_RUNTIME,
  });
  const summary = createVisualQaSummary(input, {
    comparisonPath: args.comparison ?? process.env.ESSENCE_VISUAL_COMPARISON,
    routeHealthPath: args.routes ?? process.env.ESSENCE_VISUAL_ROUTE_HEALTH,
    runtimePath: args.runtime ?? process.env.ESSENCE_VISUAL_RUNTIME,
    reviewer: args.reviewer ?? process.env.ESSENCE_VISUAL_REVIEWER ?? "Unassigned",
    reviewerNotes:
      args.notes ?? process.env.ESSENCE_VISUAL_REVIEWER_NOTES ?? "No reviewer notes.",
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "visual-qa-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "visual-qa-summary.md"),
    `${summary.markdown}\n`,
    "utf8",
  );

  console.log(
    [
      `Visual QA summary: ${summary.status}`,
      `changed snapshots ${summary.metrics.changedSnapshots}`,
      `failed routes ${summary.metrics.failedRoutes}`,
      `Output: ${outputDir}`,
    ].join(" / "),
  );

  if (summary.status === "failed") {
    process.exitCode = 1;
  }
}

async function readInputs(input: {
  comparisonPath?: string;
  routeHealthPath?: string;
  runtimePath?: string;
}): Promise<VisualQaInput> {
  return {
    comparison: input.comparisonPath
      ? await readJson<SnapshotComparisonReport>(input.comparisonPath)
      : undefined,
    routeHealth: input.routeHealthPath
      ? await readJson<RouteHealthReport>(input.routeHealthPath)
      : undefined,
    runtime: input.runtimePath
      ? await readJson<RuntimeObservabilityReport>(input.runtimePath)
      : undefined,
  };
}

async function readJson<TValue>(file: string) {
  const content = await readFile(path.resolve(file), "utf8");

  return JSON.parse(content.replace(/^\uFEFF/, "")) as TValue;
}

function createVisualQaSummary(
  input: VisualQaInput,
  options: {
    comparisonPath?: string;
    routeHealthPath?: string;
    runtimePath?: string;
    reviewer: string;
    reviewerNotes: string;
  },
): VisualQaSummary {
  const changedSnapshots = getCount(input.comparison?.summary, "changed");
  const missingSnapshots = getCount(input.comparison?.summary, "missing");
  const failedRoutes = getCount(input.routeHealth?.summary, "failed");
  const skippedRoutes = getCount(input.routeHealth?.summary, "skipped");
  const runtime = input.runtime ?? input.routeHealth?.runtime;
  const runtimeErrors =
    runtime?.errorCount ?? getCount(input.routeHealth?.summary, "runtimeErrors");
  const runtimeWarnings =
    runtime?.warningCount ??
    getCount(input.routeHealth?.summary, "runtimeWarnings");
  const status =
    missingSnapshots > 0 || failedRoutes > 0 || runtimeErrors > 0
      ? "failed"
      : changedSnapshots > 0 || skippedRoutes > 0 || runtimeWarnings > 0
        ? "review"
        : "passed";
  const summary = {
    status,
    generatedAt: new Date().toISOString(),
    reviewer: options.reviewer,
    reviewerNotes: options.reviewerNotes,
    sources: {
      comparisonPath: options.comparisonPath,
      routeHealthPath: options.routeHealthPath,
      runtimePath: options.runtimePath,
    },
    metrics: {
      changedSnapshots,
      missingSnapshots,
      failedRoutes,
      skippedRoutes,
      runtimeErrors,
      runtimeWarnings,
    },
    markdown: "",
  } satisfies VisualQaSummary;

  return {
    ...summary,
    markdown: getVisualQaMarkdown(summary, input),
  };
}

function getVisualQaMarkdown(
  summary: Omit<VisualQaSummary, "markdown">,
  input: VisualQaInput,
) {
  return [
    "# Visual QA Summary",
    "",
    `Status: ${summary.status}`,
    `Generated: ${summary.generatedAt}`,
    `Reviewer: ${summary.reviewer}`,
    `Reviewer notes: ${summary.reviewerNotes}`,
    "",
    "## Metrics",
    "",
    `- Changed snapshots: ${summary.metrics.changedSnapshots}`,
    `- Missing snapshots: ${summary.metrics.missingSnapshots}`,
    `- Failed routes: ${summary.metrics.failedRoutes}`,
    `- Skipped routes: ${summary.metrics.skippedRoutes}`,
    `- Runtime errors: ${summary.metrics.runtimeErrors}`,
    `- Runtime warnings: ${summary.metrics.runtimeWarnings}`,
    "",
    "## Snapshot Comparison",
    "",
    ...getSnapshotLines(input.comparison),
    "",
    "## Route Health",
    "",
    ...getRouteLines(input.routeHealth),
    "",
    "## Runtime",
    "",
    ...getRuntimeLines(input.runtime ?? input.routeHealth?.runtime),
    "",
    "## Sources",
    "",
    `- Snapshot comparison: ${summary.sources.comparisonPath ?? "Not provided"}`,
    `- Route health: ${summary.sources.routeHealthPath ?? "Not provided"}`,
    `- Runtime issues: ${summary.sources.runtimePath ?? "Not provided"}`,
  ].join("\n");
}

function getSnapshotLines(report: SnapshotComparisonReport | undefined) {
  if (!report) {
    return ["- No snapshot comparison report was provided."];
  }

  const rows = report.rows ?? [];
  const reviewRows = rows.filter((row) => row.status && row.status !== "unchanged");

  return [
    `- Baseline: ${report.baselineRunId ?? "unknown"}`,
    `- Current: ${report.currentRunId ?? "unknown"}`,
    `- Compared: ${report.comparedAt ?? "unknown"}`,
    ...getSummaryLines(report.summary),
    ...(reviewRows.length > 0
      ? reviewRows.map((row) => {
          const pixelDiff = row.pixelDiff
            ? ` Pixel diff ${row.pixelDiff.changedPixels ?? 0}/${row.pixelDiff.comparedPixels ?? 0} (${formatRatio(row.pixelDiff.changedRatio ?? 0)}).`
            : "";

          return `- [${row.status}] ${row.label ?? row.id ?? "surface"}:${pixelDiff} ${(row.notes ?? []).join(" ")}`;
        })
      : ["- No changed, added, or missing snapshot rows."]),
  ];
}

function getRouteLines(report: RouteHealthReport | undefined) {
  if (!report) {
    return ["- No route health report was provided."];
  }

  const results = report.results ?? [];
  const reviewRows = results.filter((row) => row.status !== "passed");

  return [
    `- Checked: ${report.checkedAt ?? "unknown"}`,
    ...getSummaryLines(report.summary),
    ...(reviewRows.length > 0
      ? reviewRows.map(
          (row) =>
            `- [${row.status ?? "unknown"}] ${row.label ?? row.id ?? "route"} (${row.httpStatus ?? "no status"}): ${row.detail ?? row.url ?? "No detail"}`,
        )
      : ["- All provided route probes passed."]),
  ];
}

function getRuntimeLines(report: RuntimeObservabilityReport | undefined) {
  if (!report) {
    return ["- No runtime issue report was provided."];
  }

  const reviewIssues = report.issues.filter(
    (issue) => issue.severity !== "info",
  );

  return [
    `- Captured: ${report.captured ? "yes" : "no"}`,
    `- Status: ${report.status}`,
    `- Score: ${report.score}`,
    `- Errors: ${report.errorCount}`,
    `- Warnings: ${report.warningCount}`,
    ...(reviewIssues.length > 0
      ? reviewIssues.slice(0, 12).map(
          (issue) =>
            `- [${issue.severity}] ${issue.surfaceLabel} ${issue.kind}: ${issue.message}`,
        )
      : ["- No runtime errors or warnings captured."]),
  ];
}

function getSummaryLines(summary: StatusCounts | undefined) {
  if (!summary) {
    return ["- Summary unavailable."];
  }

  return Object.entries(summary).map(([key, value]) => `- ${key}: ${value}`);
}

function getCount(summary: StatusCounts | undefined, key: string) {
  return summary?.[key] ?? 0;
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(4)}%`;
}

function parseArgs(args: string[]) {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];

    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return {
    comparison: parsed.comparison,
    routes: parsed.routes,
    runtime: parsed.runtime,
    outputDir: parsed["output-dir"],
    reviewer: parsed.reviewer,
    notes: parsed.notes,
  };
}

void main();

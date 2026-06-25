import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ensureSignedIn,
  loadPlaywright,
  normalizeBaseUrl,
  waitForBodyText,
  type PageLike,
} from "./visual-browser";
import {
  getRuntimeIssueSummary,
  startRuntimeIssueCapture,
} from "./visual-runtime";
import type { RuntimeIssue } from "../src/features/editor/runtime-observability";

type RouteProbe = {
  id: string;
  label: string;
  path: string;
  waitForText: string;
  authenticated: boolean;
  optionalReason?: string;
};

type RouteProbeResult = {
  id: string;
  label: string;
  url: string;
  status: "passed" | "failed" | "skipped";
  httpStatus: number | null;
  checkedAt: string;
  detail: string;
  runtimeIssueCount: number;
  runtimeErrorCount: number;
  runtimeWarningCount: number;
  runtimeIssues: RuntimeIssue[];
};

type RouteProbeReport = {
  baseUrl: string;
  runId: string;
  checkedAt: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    runtimeErrors: number;
    runtimeWarnings: number;
  };
  results: RouteProbeResult[];
  runtime: ReturnType<typeof getRuntimeIssueSummary>;
};

async function main() {
  const playwright = await loadPlaywright();
  const baseUrl = normalizeBaseUrl(
    process.env.ESSENCE_VISUAL_BASE_URL ?? "http://localhost:3000",
  );
  const outputRoot = path.resolve(
    process.env.ESSENCE_VISUAL_OUTPUT_DIR ?? "artifacts/visual-regression",
  );
  const runId = `route-health-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const outputDir = path.join(outputRoot, runId);
  const probes = getRouteProbes();

  await mkdir(outputDir, { recursive: true });

  const browser = await playwright.chromium.launch({
    headless: process.env.ESSENCE_VISUAL_HEADLESS !== "0",
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const results: RouteProbeResult[] = [];

  try {
    await ensureSignedIn(page, baseUrl);

    for (const probe of probes) {
      results.push(await runRouteProbe(page, baseUrl, probe));
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const report = {
    baseUrl,
    runId,
    checkedAt: new Date().toISOString(),
    summary: getSummary(results),
    results,
    runtime: getRuntimeIssueSummary(
      results.flatMap((result) => result.runtimeIssues),
    ),
  } satisfies RouteProbeReport;
  const reportPath = path.join(outputDir, "route-health.json");

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    [
      `Probed ${report.summary.total} visual routes.`,
      `${report.summary.passed} passed`,
      `${report.summary.failed} failed`,
      `${report.summary.skipped} skipped`,
      `${report.summary.runtimeErrors} runtime errors`,
      `Report: ${reportPath}`,
    ].join(" / "),
  );

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

async function runRouteProbe(
  page: PageLike,
  baseUrl: string,
  probe: RouteProbe,
): Promise<RouteProbeResult> {
  const url = `${baseUrl}${probe.path}`;
  const checkedAt = new Date().toISOString();

  if (probe.optionalReason) {
    return {
      id: probe.id,
      label: probe.label,
      url,
      status: "skipped",
      httpStatus: null,
      checkedAt,
      detail: probe.optionalReason,
      runtimeIssueCount: 0,
      runtimeErrorCount: 0,
      runtimeWarningCount: 0,
      runtimeIssues: [],
    };
  }

  const runtimeCapture = startRuntimeIssueCapture(page, {
    source: "route-probe",
    surfaceId: probe.id,
    surfaceLabel: probe.label,
    url,
  });

  try {
    const response = await page.goto(url, { waitUntil: "networkidle" });
    const httpStatus = response?.status() ?? null;

    if (!httpStatus || httpStatus < 200 || httpStatus >= 400) {
      const runtimeReport = runtimeCapture.report();
      runtimeCapture.stop();
      return {
        id: probe.id,
        label: probe.label,
        url,
        status: "failed",
        httpStatus,
        checkedAt,
        detail: `Unexpected HTTP status ${httpStatus ?? "unknown"}.`,
        runtimeIssueCount: runtimeReport.issueCount,
        runtimeErrorCount: runtimeReport.errorCount,
        runtimeWarningCount: runtimeReport.warningCount,
        runtimeIssues: runtimeReport.issues,
      };
    }

    await waitForBodyText(page, probe.waitForText);
    const runtimeReport = runtimeCapture.report();
    runtimeCapture.stop();
    const hasRuntimeErrors = runtimeReport.errorCount > 0;

    return {
      id: probe.id,
      label: probe.label,
      url,
      status: hasRuntimeErrors ? "failed" : "passed",
      httpStatus,
      checkedAt,
      detail: hasRuntimeErrors
        ? `${runtimeReport.errorCount} runtime error${runtimeReport.errorCount === 1 ? "" : "s"} captured after finding expected text: ${probe.waitForText}`
        : `Found expected text: ${probe.waitForText}`,
      runtimeIssueCount: runtimeReport.issueCount,
      runtimeErrorCount: runtimeReport.errorCount,
      runtimeWarningCount: runtimeReport.warningCount,
      runtimeIssues: runtimeReport.issues,
    };
  } catch (error) {
    const runtimeReport = runtimeCapture.report();
    runtimeCapture.stop();
    return {
      id: probe.id,
      label: probe.label,
      url,
      status: "failed",
      httpStatus: null,
      checkedAt,
      detail: error instanceof Error ? error.message : "Route probe failed.",
      runtimeIssueCount: runtimeReport.issueCount,
      runtimeErrorCount: runtimeReport.errorCount,
      runtimeWarningCount: runtimeReport.warningCount,
      runtimeIssues: runtimeReport.issues,
    };
  }
}

function getRouteProbes(): RouteProbe[] {
  const shareToken = process.env.ESSENCE_VISUAL_SHARE_TOKEN?.trim();
  const missingShareToken =
    "Set ESSENCE_VISUAL_SHARE_TOKEN to include shared handoff and prototype URLs.";

  return [
    {
      id: "editor",
      label: "Authenticated editor",
      path: "/",
      waitForText: "Files",
      authenticated: true,
    },
    {
      id: "admin-dashboard",
      label: "Authenticated admin dashboard",
      path: "/dashboard",
      waitForText: "Admin",
      authenticated: true,
    },
    {
      id: "share-handoff",
      label: "Public share handoff",
      path: shareToken ? `/share/${shareToken}` : "/share/<token>",
      waitForText: "shared file",
      authenticated: false,
      optionalReason: shareToken ? undefined : missingShareToken,
    },
    {
      id: "share-prototype",
      label: "Public share prototype",
      path: shareToken ? `/share/${shareToken}/prototype` : "/share/<token>/prototype",
      waitForText: "Prototype",
      authenticated: false,
      optionalReason: shareToken ? undefined : missingShareToken,
    },
  ];
}

function getSummary(results: RouteProbeResult[]) {
  return results.reduce(
    (summary, result) => ({
      ...summary,
      [result.status]: summary[result.status] + 1,
    }),
    {
      total: results.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      runtimeErrors: results.reduce(
        (total, result) => total + result.runtimeErrorCount,
        0,
      ),
      runtimeWarnings: results.reduce(
        (total, result) => total + result.runtimeWarningCount,
        0,
      ),
    },
  );
}

void main();

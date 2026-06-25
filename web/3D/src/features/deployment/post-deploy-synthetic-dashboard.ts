import type { PostDeploySyntheticSmokeCheckResult, PostDeploySyntheticSmokeReport, PostDeploySyntheticSmokeStatus } from "./post-deploy-synthetic-smoke";

export type PostDeploySyntheticDashboardStatus = "missing" | PostDeploySyntheticSmokeStatus;

export interface PostDeploySyntheticCheckRow {
  durationMs: number;
  httpStatus: number | null;
  issues: string[];
  key: string;
  label: string;
  status: PostDeploySyntheticSmokeStatus;
  url: string;
}

export interface PostDeploySyntheticDashboardSummary {
  actionCommand: string;
  baseUrl: string | null;
  checkRows: PostDeploySyntheticCheckRow[];
  completionPercent: number;
  currentPassStreak: number;
  failedRunCount: number;
  generatedAt: string | null;
  historyCount: number;
  issueRows: PostDeploySyntheticCheckRow[];
  latestFailedAt: string | null;
  latestPassedAt: string | null;
  passedRunCount: number;
  projectId: string | null;
  shareId: string | null;
  status: PostDeploySyntheticDashboardStatus;
  statusLabel: string;
  totalRunCount: number;
}

function reportTime(report: PostDeploySyntheticSmokeReport) {
  const time = new Date(report.generatedAt).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function sortReports(reports: PostDeploySyntheticSmokeReport[]) {
  return [...reports].sort((first, second) => reportTime(second) - reportTime(first));
}

function statusLabel(status: PostDeploySyntheticDashboardStatus) {
  if (status === "pass") {
    return "Passing";
  }

  return status === "fail" ? "Failing" : "No report";
}

function toCheckRow(check: PostDeploySyntheticSmokeCheckResult): PostDeploySyntheticCheckRow {
  return {
    durationMs: check.durationMs,
    httpStatus: check.httpStatus,
    issues: check.issues,
    key: check.key,
    label: check.label,
    status: check.status,
    url: check.url,
  };
}

function currentPassStreak(reports: PostDeploySyntheticSmokeReport[]) {
  let streak = 0;

  for (const report of reports) {
    if (report.status !== "pass") {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function createPostDeploySyntheticDashboardSummary(input: {
  actionCommand?: string;
  history?: PostDeploySyntheticSmokeReport[];
  latestReport?: PostDeploySyntheticSmokeReport | null;
}): PostDeploySyntheticDashboardSummary {
  const history = sortReports(input.history ?? []);
  const latestReport = input.latestReport ?? history[0] ?? null;
  const completeHistory = sortReports(latestReport && !history.some((report) => report.generatedAt === latestReport.generatedAt) ? [latestReport, ...history] : history);
  const checkRows = latestReport?.checks.map(toCheckRow) ?? [];
  const passedRunCount = completeHistory.filter((report) => report.status === "pass").length;
  const failedRunCount = completeHistory.filter((report) => report.status === "fail").length;
  const latestPassedAt = completeHistory.find((report) => report.status === "pass")?.generatedAt ?? null;
  const latestFailedAt = completeHistory.find((report) => report.status === "fail")?.generatedAt ?? null;

  return {
    actionCommand: input.actionCommand ?? "bun run release:post-deploy:smoke -- --write-report",
    baseUrl: latestReport?.baseUrl ?? null,
    checkRows,
    completionPercent: latestReport && latestReport.checks.length > 0 ? Math.round((latestReport.passedCount / latestReport.checks.length) * 100) : 0,
    currentPassStreak: currentPassStreak(completeHistory),
    failedRunCount,
    generatedAt: latestReport?.generatedAt ?? null,
    historyCount: completeHistory.length,
    issueRows: checkRows.filter((check) => check.status !== "pass"),
    latestFailedAt,
    latestPassedAt,
    passedRunCount,
    projectId: latestReport?.projectId ?? null,
    shareId: latestReport?.shareId ?? null,
    status: latestReport?.status ?? "missing",
    statusLabel: statusLabel(latestReport?.status ?? "missing"),
    totalRunCount: completeHistory.length,
  };
}

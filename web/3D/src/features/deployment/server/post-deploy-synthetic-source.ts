import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createPostDeploySyntheticDashboardSummary, type PostDeploySyntheticDashboardSummary } from "../post-deploy-synthetic-dashboard";
import type { PostDeploySyntheticSmokeReport } from "../post-deploy-synthetic-smoke";

export function getDefaultPostDeploySyntheticSmokeReportPath(cwd = process.cwd()) {
  return join(cwd, ".release", "post-deploy-synthetic-smoke.json");
}

export function getDefaultPostDeploySyntheticSmokeHistoryPath(cwd = process.cwd()) {
  return join(cwd, ".release", "post-deploy-synthetic-smoke-history.json");
}

function isCheckResult(value: unknown) {
  const candidate = value as Partial<PostDeploySyntheticSmokeReport["checks"][number]> | null;

  return Boolean(candidate && typeof candidate.key === "string" && typeof candidate.label === "string" && ["pass", "fail"].includes(String(candidate.status)) && typeof candidate.url === "string");
}

function isPostDeploySyntheticSmokeReport(value: unknown): value is PostDeploySyntheticSmokeReport {
  const candidate = value as Partial<PostDeploySyntheticSmokeReport> | null;

  return Boolean(
    candidate &&
      typeof candidate.baseUrl === "string" &&
      Array.isArray(candidate.checks) &&
      candidate.checks.every(isCheckResult) &&
      typeof candidate.generatedAt === "string" &&
      typeof candidate.projectId === "string" &&
      typeof candidate.shareId === "string" &&
      ["pass", "fail"].includes(String(candidate.status)),
  );
}

function readJson(path: string) {
  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export function readPostDeploySyntheticSmokeReport(path = getDefaultPostDeploySyntheticSmokeReportPath()) {
  const parsed = readJson(path);

  return isPostDeploySyntheticSmokeReport(parsed) ? parsed : null;
}

export function readPostDeploySyntheticSmokeHistory(path = getDefaultPostDeploySyntheticSmokeHistoryPath()) {
  const parsed = readJson(path);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isPostDeploySyntheticSmokeReport);
}

export function writePostDeploySyntheticSmokeReport(report: PostDeploySyntheticSmokeReport, path = getDefaultPostDeploySyntheticSmokeReportPath()) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);

  return path;
}

export function appendPostDeploySyntheticSmokeHistory(report: PostDeploySyntheticSmokeReport, path = getDefaultPostDeploySyntheticSmokeHistoryPath(), limit = 30) {
  const existing = readPostDeploySyntheticSmokeHistory(path);
  const next = [report, ...existing.filter((entry) => entry.generatedAt !== report.generatedAt)].slice(0, limit);

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);

  return path;
}

export function createDashboardPostDeploySyntheticSmokeSummary(options: {
  actionCommand?: string;
  historyPath?: string;
  reportPath?: string;
} = {}): PostDeploySyntheticDashboardSummary {
  return createPostDeploySyntheticDashboardSummary({
    actionCommand: options.actionCommand,
    history: readPostDeploySyntheticSmokeHistory(options.historyPath),
    latestReport: readPostDeploySyntheticSmokeReport(options.reportPath),
  });
}

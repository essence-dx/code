import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import {
  appendPostDeploySyntheticSmokeHistory,
  createDashboardPostDeploySyntheticSmokeSummary,
  readPostDeploySyntheticSmokeHistory,
  readPostDeploySyntheticSmokeReport,
  writePostDeploySyntheticSmokeReport,
} from "@/features/deployment/server/post-deploy-synthetic-source";
import type { PostDeploySyntheticSmokeReport } from "@/features/deployment/post-deploy-synthetic-smoke";

function makeReport(input: {
  generatedAt: string;
  issue?: string;
  status: "fail" | "pass";
}): PostDeploySyntheticSmokeReport {
  const checks = [
    {
      contentType: "text/html; charset=utf-8",
      durationMs: 30,
      httpStatus: 200,
      issues: [],
      key: "public-viewer" as const,
      label: "Public viewer",
      status: "pass" as const,
      url: "https://example.com/share/share-smoke",
    },
    {
      contentType: input.status === "pass" ? "application/json; charset=utf-8" : "text/plain",
      durationMs: 42,
      httpStatus: input.status === "pass" ? 200 : 500,
      issues: input.issue ? [input.issue] : [],
      key: "api-helper" as const,
      label: "API helper",
      status: input.status,
      url: "https://example.com/api/public/scenes/share-smoke/code",
    },
  ];
  const passedCount = checks.filter((check) => check.status === "pass").length;

  return {
    baseUrl: "https://example.com",
    checks,
    durationMs: 72,
    failedCount: checks.length - passedCount,
    generatedAt: input.generatedAt,
    passedCount,
    projectId: "project-smoke",
    sceneId: null,
    shareId: "share-smoke",
    status: input.status,
  };
}

const fixtureDir = mkdtempSync(join(tmpdir(), "essence-post-deploy-dashboard-"));
const reportPath = join(fixtureDir, "latest.json");
const historyPath = join(fixtureDir, "history.json");

try {
  const firstPass = makeReport({ generatedAt: "2026-05-16T08:00:00.000Z", status: "pass" });
  const failure = makeReport({ generatedAt: "2026-05-16T09:00:00.000Z", issue: "API helper returned 500.", status: "fail" });
  const latestPass = makeReport({ generatedAt: "2026-05-16T10:00:00.000Z", status: "pass" });

  writePostDeploySyntheticSmokeReport(latestPass, reportPath);
  appendPostDeploySyntheticSmokeHistory(firstPass, historyPath);
  appendPostDeploySyntheticSmokeHistory(failure, historyPath);
  appendPostDeploySyntheticSmokeHistory(latestPass, historyPath);

  const report = readPostDeploySyntheticSmokeReport(reportPath);
  const history = readPostDeploySyntheticSmokeHistory(historyPath);
  const summary = createDashboardPostDeploySyntheticSmokeSummary({ historyPath, reportPath });

  assert.equal(report?.status, "pass");
  assert.equal(history.length, 3);
  assert.equal(summary.status, "pass");
  assert.equal(summary.completionPercent, 100);
  assert.equal(summary.currentPassStreak, 1);
  assert.equal(summary.passedRunCount, 2);
  assert.equal(summary.failedRunCount, 1);
  assert.equal(summary.latestFailedAt, failure.generatedAt);
  assert.equal(summary.issueRows.length, 0);

  const missingSummary = createPostDeploySyntheticDashboardSummary({});

  assert.equal(missingSummary.status, "missing");
  assert.equal(missingSummary.completionPercent, 0);
} finally {
  rmSync(fixtureDir, { force: true, recursive: true });
}

console.log("post-deploy synthetic dashboard smoke passed");

import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import { createReleaseReadinessDashboardSummary } from "@/features/deployment/release-readiness-dashboard";
import { createDashboardReleaseDeploymentChecklist, writeReleaseDeploymentChecklistReport } from "@/features/deployment/server/release-deployment-source";

const readyChecklist = createReleaseDeploymentChecklist({
  env: {
    BETTER_AUTH_SECRET: "0123456789abcdefghijklmnopqrstuvwxyz",
    BETTER_AUTH_URL: "https://essence-spline.vercel.app",
    BREVO_API_KEY: `xkeysib-${"a".repeat(48)}`,
    BREVO_SENDER_EMAIL: "ajju40959@gmail.com",
    BREVO_SENDER_NAME: "Essence Spline",
    DATABASE_AUTH_TOKEN: "turso-token-with-release-length",
    DATABASE_URL: "libsql://essence-spline-example.turso.io",
    NEXT_PUBLIC_BETTER_AUTH_URL: "https://essence-spline.vercel.app",
  },
  expectedVercelProjectName: "essence-spline",
  generatedAt: "2026-05-16T07:00:00.000Z",
  target: "production",
  tursoConnectivity: {
    checked: true,
    latencyMs: 31,
    message: "ok",
    ok: true,
  },
  vercelLinkage: {
    orgId: "team_example",
    projectId: "prj_example",
    projectName: "essence-spline",
  },
});

const readySummary = createReleaseReadinessDashboardSummary(readyChecklist);

assert.equal(readySummary.status, "pass");
assert.equal(readySummary.statusLabel, "Ready");
assert.equal(readySummary.completionPercent, 100);
assert.equal(readySummary.issueChecks.length, 0);
assert.equal(readySummary.categories.length, 4);
assert.ok(readySummary.categories.every((category) => category.status === "pass"));

const blockedChecklist = createReleaseDeploymentChecklist({
  env: {
    BETTER_AUTH_SECRET: "short",
    BETTER_AUTH_URL: "http://localhost:3000",
    BREVO_API_KEY: "replace-with-key",
    BREVO_SENDER_EMAIL: "not-an-email",
    DATABASE_AUTH_TOKEN: "",
    DATABASE_URL: "postgres://wrong-database",
  },
  expectedVercelProjectName: "essence-spline",
  generatedAt: "2026-05-16T07:01:00.000Z",
  target: "production",
  tursoConnectivity: {
    checked: true,
    message: "missing auth token",
    ok: false,
  },
  vercelLinkage: {
    orgId: "team_example",
    projectId: "prj_example",
    projectName: "wrong-project",
  },
});

const blockedSummary = createReleaseReadinessDashboardSummary(blockedChecklist, {
  actionCommand: "bun run release:deployment:check --json",
});

assert.equal(blockedSummary.status, "fail");
assert.equal(blockedSummary.statusLabel, "Blocked");
assert.equal(blockedSummary.actionCommand, "bun run release:deployment:check --json");
assert.ok(blockedSummary.completionPercent < 50);
assert.ok(blockedSummary.issueChecks.length >= 7);
assert.ok(blockedSummary.categories.some((category) => category.category === "database" && category.status === "fail"));

const reportDir = mkdtempSync(join(tmpdir(), "essence-release-readiness-"));
const reportPath = join(reportDir, "deployment-checklist.json");
writeReleaseDeploymentChecklistReport(readyChecklist, reportPath);

const dashboardChecklist = createDashboardReleaseDeploymentChecklist({
  env: { NODE_ENV: "test" },
  generatedAt: "2026-05-16T07:02:00.000Z",
  reportPath,
});

assert.equal(dashboardChecklist.generatedAt, readyChecklist.generatedAt);
assert.equal(dashboardChecklist.status, "pass");

console.log("release readiness dashboard smoke passed");

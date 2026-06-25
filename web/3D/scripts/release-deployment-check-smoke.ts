import { strict as assert } from "node:assert";
import { createReleaseDeploymentChecklist, formatReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";

const readyReport = createReleaseDeploymentChecklist({
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
  generatedAt: "2026-05-15T13:00:00.000Z",
  target: "production",
  tursoConnectivity: {
    checked: true,
    latencyMs: 42,
    message: "ok",
    ok: true,
  },
  vercelLinkage: {
    orgId: "team_example",
    projectId: "prj_example",
    projectName: "essence-spline",
  },
});

assert.equal(readyReport.status, "pass");
assert.equal(readyReport.blockerCount, 0);
assert.equal(readyReport.warningCount, 0);
assert.match(formatReleaseDeploymentChecklist(readyReport), /Release deployment checklist: PASS/);

const blockedReport = createReleaseDeploymentChecklist({
  env: {
    BETTER_AUTH_SECRET: "short",
    BETTER_AUTH_URL: "http://localhost:3000",
    BREVO_API_KEY: "replace-with-brevo-api-key",
    DATABASE_AUTH_TOKEN: "",
    DATABASE_URL: "postgres://wrong-database",
  },
  expectedVercelProjectName: "essence-spline",
  generatedAt: "2026-05-15T13:01:00.000Z",
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

assert.equal(blockedReport.status, "fail");
assert.ok(blockedReport.blockerCount >= 7);
assert.ok(blockedReport.checks.some((check) => check.key === "vercel-project-name" && check.status === "fail"));
assert.ok(blockedReport.checks.some((check) => check.key === "brevo-sender-email" && check.status === "fail"));

const warningReport = createReleaseDeploymentChecklist({
  env: {
    BETTER_AUTH_SECRET: "0123456789abcdefghijklmnopqrstuvwxyz",
    BETTER_AUTH_URL: "http://localhost:3000",
    BREVO_API_KEY: `xkeysib-${"b".repeat(48)}`,
    BREVO_SENDER_EMAIL: "ajju40959@gmail.com",
    DATABASE_AUTH_TOKEN: "turso-token-with-release-length",
    DATABASE_URL: "libsql://essence-spline-example.turso.io",
  },
  target: "local",
  tursoConnectivity: {
    checked: false,
    message: "skipped",
    ok: false,
  },
  vercelLinkage: {
    orgId: "team_example",
    projectId: "prj_example",
    projectName: "essence-spline",
  },
});

assert.equal(warningReport.status, "warning");
assert.ok(warningReport.warningCount >= 2);

console.log("release deployment checklist smoke passed");

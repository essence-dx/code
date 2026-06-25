import { strict as assert } from "node:assert";
import type { ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import {
  createDeploymentEnvironmentDriftMonitor,
  type DeploymentEnvironmentDriftReleaseOperationsSource,
} from "@/features/projects/deployment-environment-drift";

const generatedAt = "2026-05-16T16:00:00.000Z";

const readyChecklist: ReleaseDeploymentChecklist = {
  blockerCount: 0,
  checks: [
    {
      category: "auth",
      key: "better-auth-secret",
      message: "Auth secret is set.",
      status: "pass",
      title: "Better Auth secret",
    },
    {
      category: "database",
      key: "database-url",
      message: "Database URL is present.",
      status: "pass",
      title: "Turso database URL",
    },
    {
      category: "database",
      key: "turso-connectivity",
      message: "Turso query succeeded.",
      status: "pass",
      title: "Turso connectivity",
    },
    {
      category: "email",
      key: "brevo-sender-email",
      message: "Sender is verified.",
      status: "pass",
      title: "Brevo sender email",
    },
    {
      category: "vercel",
      key: "vercel-project-name",
      message: "Linked Vercel project matches.",
      status: "pass",
      title: "Vercel project name",
    },
  ],
  generatedAt,
  status: "pass",
  summary: "Release deployment checklist passed.",
  target: "production",
  warningCount: 0,
};

const releaseOperations: DeploymentEnvironmentDriftReleaseOperationsSource = {
  blockedChannelCount: 0,
  envRows: [
    { key: "DESKTOP_UPDATE_VERSION", value: "1.0.0" },
    { key: "DESKTOP_UPDATE_URL_WINDOWS_X86_64", value: "https://essence-spline.vercel.app/desktop/releases/windows.exe" },
    { key: "DESKTOP_UPDATE_SIGNATURE_WINDOWS_X86_64", value: "windows-signature" },
    { key: "DESKTOP_UPDATE_URL_DARWIN_AARCH64", value: "https://essence-spline.vercel.app/desktop/releases/macos.app.tar.gz" },
    { key: "DESKTOP_UPDATE_SIGNATURE_DARWIN_AARCH64", value: "darwin-signature" },
    { key: "DESKTOP_UPDATE_URL_LINUX_X86_64", value: "https://essence-spline.vercel.app/desktop/releases/linux.AppImage" },
    { key: "DESKTOP_UPDATE_SIGNATURE_LINUX_X86_64", value: "linux-signature" },
  ],
  readyChannelCount: 3,
  selectedArtifactCount: 3,
  targetRows: [
    { artifactCount: 1, missing: false, target: "windows" },
    { artifactCount: 1, missing: false, target: "darwin" },
    { artifactCount: 1, missing: false, target: "linux" },
  ],
  unsignedArtifactCount: 0,
};

const readyEnv = {
  BETTER_AUTH_SECRET: "s".repeat(40),
  BETTER_AUTH_URL: "https://essence-spline.vercel.app",
  BREVO_API_KEY: `xkeysib-${"a".repeat(48)}`,
  BREVO_SENDER_EMAIL: "ajju40959@gmail.com",
  BREVO_SENDER_NAME: "Essence Spline",
  DATABASE_AUTH_TOKEN: "t".repeat(32),
  DATABASE_URL: "libsql://essence-spline.turso.io",
  DESKTOP_UPDATE_SIGNATURE_DARWIN_AARCH64: "darwin-signature",
  DESKTOP_UPDATE_SIGNATURE_LINUX_X86_64: "linux-signature",
  DESKTOP_UPDATE_SIGNATURE_WINDOWS_X86_64: "windows-signature",
  DESKTOP_UPDATE_URL_DARWIN_AARCH64: "https://essence-spline.vercel.app/desktop/releases/macos.app.tar.gz",
  DESKTOP_UPDATE_URL_LINUX_X86_64: "https://essence-spline.vercel.app/desktop/releases/linux.AppImage",
  DESKTOP_UPDATE_URL_WINDOWS_X86_64: "https://essence-spline.vercel.app/desktop/releases/windows.exe",
  DESKTOP_UPDATE_VERSION: "1.0.0",
  NEXT_PUBLIC_BETTER_AUTH_URL: "https://essence-spline.vercel.app",
  VERCEL_PROJECT_NAME: "essence-spline",
};

const readyReport = createDeploymentEnvironmentDriftMonitor({
  env: readyEnv,
  expectedBrevoSenderEmail: "ajju40959@gmail.com",
  expectedVercelProjectName: "essence-spline",
  generatedAt,
  releaseDeploymentChecklist: readyChecklist,
  releaseOperationsDashboard: releaseOperations,
});

assert.equal(readyReport.summary.totalCount, 4);
assert.equal(readyReport.summary.readyCount, 4);
assert.equal(readyReport.summary.blockedCount, 0);
assert.equal(readyReport.summary.driftCount, 0);
assert.equal(readyReport.summary.environmentScore, 100);
assert.equal(readyReport.rows.find((row) => row.id === "updater-endpoints")?.status, "ready");

const driftReport = createDeploymentEnvironmentDriftMonitor({
  env: {
    BETTER_AUTH_SECRET: "replace-with-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    BREVO_API_KEY: "bad-key",
    BREVO_SENDER_EMAIL: "wrong@example.com",
    DATABASE_URL: "postgres://wrong-target",
    DESKTOP_UPDATE_URL_WINDOWS_X86_64: "https://old.example.net/windows.exe",
    VERCEL_PROJECT_NAME: "wrong-project",
  },
  expectedBrevoSenderEmail: "ajju40959@gmail.com",
  expectedVercelProjectName: "essence-spline",
  generatedAt,
  releaseDeploymentChecklist: {
    ...readyChecklist,
    blockerCount: 3,
    checks: readyChecklist.checks.map((check) =>
      check.category === "database" || check.category === "email" || check.category === "vercel" ? { ...check, status: "fail" as const } : check,
    ),
    status: "fail",
    warningCount: 0,
  },
  releaseOperationsDashboard: {
    ...releaseOperations,
    blockedChannelCount: 2,
    targetRows: releaseOperations.targetRows.map((row) => (row.target === "linux" ? { ...row, artifactCount: 0, missing: true } : row)),
    unsignedArtifactCount: 1,
  },
});

assert.equal(driftReport.summary.blockedCount, 4);
assert.equal(driftReport.summary.worstStatus, "blocked");
assert.ok(driftReport.summary.driftCount >= 12);
assert.ok(driftReport.summary.environmentScore < 40);
assert.equal(driftReport.rows.find((row) => row.id === "brevo-sender")?.status, "blocked");
assert.match(driftReport.rows.find((row) => row.id === "updater-endpoints")?.nextAction ?? "", /Apply the generated updater/);

console.log("deployment environment drift smoke passed");

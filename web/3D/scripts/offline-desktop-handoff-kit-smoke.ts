import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { scanDesktopReleaseArtifacts } from "@/features/projects/desktop-release-artifacts";
import { createDesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import {
  createOfflineDesktopHandoffKit,
  createOfflineDesktopHandoffKitDownload,
  createOfflineDesktopHandoffKitPreview,
} from "@/features/projects/offline-desktop-handoff-kit";
import { createReleaseOperationsDashboard } from "@/features/projects/release-operations-dashboard";

const generatedAt = "2026-05-17T01:00:00.000Z";
const metadata = {
  notes: "Offline desktop handoff fixture",
  pubDate: generatedAt,
  version: "0.6.0",
};
const workspace = {
  id: "workspace-handoff",
  name: "Desktop Launch Workspace",
  role: "owner" as const,
};
const fixtureDir = mkdtempSync(join(tmpdir(), "essence-spline-handoff-"));

function writeArtifact(relativePath: string, signature?: string) {
  const artifactPath = join(fixtureDir, relativePath);

  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, "fixture-artifact");

  if (signature !== undefined) {
    writeFileSync(`${artifactPath}.sig`, signature);
  }
}

const readyCertificates: ProjectAppPackageCertificateReport = {
  generatedAt,
  rows: [],
  summary: {
    blockedCount: 0,
    expiredCount: 0,
    expiringCount: 0,
    missingCount: 0,
    mismatchCount: 0,
    nativeBundleCount: 2,
    readyCount: 3,
    revokedCount: 0,
    totalRequiredCount: 3,
    validCount: 3,
  },
};
const blockedCertificates: ProjectAppPackageCertificateReport = {
  ...readyCertificates,
  summary: {
    ...readyCertificates.summary,
    blockedCount: 2,
    missingCount: 2,
    readyCount: 1,
    validCount: 1,
  },
};
const readyCadQueue: ProjectCadConversionQueueReport = {
  generatedAt,
  jobs: [],
  summary: {
    failedCount: 0,
    queuedCount: 0,
    retryableCount: 0,
    runningCount: 0,
    succeededCount: 2,
    totalCount: 2,
  },
};
const blockedCadQueue: ProjectCadConversionQueueReport = {
  ...readyCadQueue,
  summary: {
    failedCount: 1,
    queuedCount: 1,
    retryableCount: 1,
    runningCount: 1,
    succeededCount: 0,
    totalCount: 4,
  },
};
const configuredSigningEnv = {
  APPLE_APP_SPECIFIC_PASSWORD: "configured",
  APPLE_CERTIFICATE_BASE64: "configured",
  APPLE_CERTIFICATE_PASSWORD: "configured",
  APPLE_ID: "configured",
  APPLE_SIGNING_IDENTITY: "configured",
  APPLE_TEAM_ID: "configured",
  TAURI_SIGNING_PRIVATE_KEY: "configured",
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "configured",
  WINDOWS_CERTIFICATE_BASE64: "configured",
  WINDOWS_CERTIFICATE_PASSWORD: "configured",
  WINDOWS_TIMESTAMP_URL: "http://timestamp.digicert.com",
};

try {
  writeArtifact("nsis/Essence_0.6.0_x64-setup.exe", "windows-signature");
  writeArtifact("macos/Essence.app.tar.gz", "mac-signature");
  writeArtifact("appimage/Essence_0.6.0_x86_64.AppImage", "linux-signature");
  writeArtifact("deb/Essence_0.6.0_amd64.deb");

  const scan = scanDesktopReleaseArtifacts({
    baseUrl: "https://cdn.example.com/releases",
    bundleDir: fixtureDir,
    requiredTargets: ["windows", "darwin", "linux"],
  });
  const releaseOperationsDashboard = createReleaseOperationsDashboard({
    currentVersions: {
      beta: "0.5.0",
      nightly: "0.5.0",
      stable: "0.5.0",
    },
    metadata,
    scan,
  });
  const blockedPreview = createOfflineDesktopHandoffKitPreview({
    appPackageCertificateReport: blockedCertificates,
    cadConversionQueueReport: blockedCadQueue,
    generatedAt,
    metadata,
    releaseOperationsDashboard,
    scan,
    signingPlan: createDesktopSigningPlan({}),
    workspace,
  });

  assert.equal(blockedPreview.unsignedDesktopArtifactCount, 1);
  assert.equal(blockedPreview.appPackageBlockedCount, 2);
  assert.equal(blockedPreview.cadUnresolvedCount, 4);
  assert.ok(blockedPreview.signingMissingSecretCount > 0);
  assert.ok(blockedPreview.releaseBlockerCount > 5);
  assert.ok(blockedPreview.handoffScore < 60);

  const readyScan = scanDesktopReleaseArtifacts({
    baseUrl: "https://cdn.example.com/releases",
    bundleDir: fixtureDir,
    requiredTargets: ["windows", "darwin", "linux"],
  });
  const readyReleaseOperationsDashboard = {
    ...releaseOperationsDashboard,
    blockedChannelCount: 0,
    unsignedArtifactCount: 0,
  };
  const kit = createOfflineDesktopHandoffKit({
    appPackageCertificateReport: readyCertificates,
    cadConversionQueueReport: readyCadQueue,
    generatedAt,
    metadata,
    releaseOperationsDashboard: readyReleaseOperationsDashboard,
    scan: {
      ...readyScan,
      unsignedArtifacts: [],
    },
    signingPlan: createDesktopSigningPlan(configuredSigningEnv),
    workspace,
  });

  assert.equal(kit.schemaVersion, 1);
  assert.equal(kit.summary.releaseBlockerCount, 0);
  assert.equal(kit.summary.fileCount, 10);
  assert.equal(kit.summary.handoffScore, 100);
  assert.match(kit.summary.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(kit.files.some((file) => file.path === "desktop-handoff/tauri-updater-manifest.json"));
  assert.ok(kit.files.some((file) => file.path === "desktop-handoff/signing-checklist.md" && file.body.includes("Signed Desktop Release Checklist")));
  assert.ok(kit.files.some((file) => file.path === "desktop-handoff/updater-env.env" && file.body.includes("DESKTOP_UPDATE_VERSION=0.6.0")));
  assert.ok(kit.files.every((file) => /^sha256:[a-f0-9]{64}$/.test(file.contentHash)));

  const download = createOfflineDesktopHandoffKitDownload(kit);

  assert.equal(download.fileName, "offline-desktop-handoff-desktop-launch-workspace-workspace-handoff-20260517.json");
  assert.match(download.body, /desktop-handoff\/app-package-readiness\.json/);
  assert.match(download.contentHash, /^sha256:[a-f0-9]{64}$/);
} finally {
  rmSync(fixtureDir, { force: true, recursive: true });
}

console.log("offline desktop handoff kit smoke passed");

import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { scanDesktopReleaseArtifacts } from "../src/features/projects/desktop-release-artifacts";
import { createReleaseOperationsDashboard } from "../src/features/projects/release-operations-dashboard";

const fixtureDir = mkdtempSync(join(tmpdir(), "essence-spline-release-dashboard-"));

function writeArtifact(relativePath: string, signature?: string) {
  const artifactPath = join(fixtureDir, relativePath);

  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, "fixture-artifact");

  if (signature !== undefined) {
    writeFileSync(`${artifactPath}.sig`, signature);
  }
}

try {
  writeArtifact("nsis/Essence_0.5.0_x64-setup.exe", "windows-signature");
  writeArtifact("macos/Essence.app.tar.gz", "mac-signature");
  writeArtifact("appimage/Essence_0.5.0_x86_64.AppImage", "linux-signature");
  writeArtifact("deb/Essence_0.5.0_amd64.deb");

  const scan = scanDesktopReleaseArtifacts({
    baseUrl: "https://cdn.example.com/releases",
    bundleDir: fixtureDir,
    requiredTargets: ["windows", "darwin", "linux"],
  });
  const dashboard = createReleaseOperationsDashboard({
    currentVersions: {
      beta: "0.4.0",
      nightly: "0.4.9",
      stable: "0.4.0",
    },
    metadata: {
      notes: "Dashboard release",
      pubDate: "2026-05-15T00:00:00.000Z",
      version: "0.5.0",
    },
    scan,
  });

  assert.equal(dashboard.channelRows.length, 3);
  assert.equal(dashboard.readyChannelCount, 0);
  assert.equal(dashboard.blockedChannelCount, 3);
  assert.equal(dashboard.selectedArtifactCount, 3);
  assert.equal(dashboard.unsignedArtifactCount, 1);
  assert.equal(dashboard.targetRows.every((row) => !row.missing), true);
  assert.ok(dashboard.artifactRows[0]?.signed);
  assert.ok(dashboard.envRows.some((row) => row.key === "DESKTOP_UPDATE_SIGNATURE_WINDOWS_X86_64"));
} finally {
  rmSync(fixtureDir, { force: true, recursive: true });
}

console.log("release operations dashboard smoke passed");

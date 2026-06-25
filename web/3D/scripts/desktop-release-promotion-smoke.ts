import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { scanDesktopReleaseArtifacts, type DesktopReleaseManifestMetadata } from "../src/features/projects/desktop-release-artifacts";
import { createDesktopReleasePromotionReport } from "../src/features/projects/desktop-release-promotion";

function createFixture() {
  const fixtureDir = mkdtempSync(join(tmpdir(), "essence-spline-promotion-"));

  function writeArtifact(relativePath: string, signature?: string) {
    const artifactPath = join(fixtureDir, relativePath);

    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, "fixture-artifact");

    if (signature !== undefined) {
      writeFileSync(`${artifactPath}.sig`, signature);
    }
  }

  return { fixtureDir, writeArtifact };
}

const metadata: DesktopReleaseManifestMetadata = {
  notes: "Promote signed desktop release",
  pubDate: "2026-05-15T00:00:00.000Z",
  version: "0.4.0",
};

const readyFixture = createFixture();

try {
  readyFixture.writeArtifact("nsis/Essence_0.4.0_x64-setup.exe", "windows-nsis-signature");
  readyFixture.writeArtifact("macos/Essence.app.tar.gz", "mac-app-signature");
  readyFixture.writeArtifact("appimage/Essence_0.4.0_x86_64.AppImage", "linux-appimage-signature");

  const scan = scanDesktopReleaseArtifacts({
    baseUrl: "https://cdn.example.com/releases",
    bundleDir: readyFixture.fixtureDir,
    requiredTargets: ["windows", "darwin", "linux"],
  });
  const promotion = createDesktopReleasePromotionReport(scan, metadata, {
    channel: "stable",
    currentVersion: "0.3.0",
  });

  assert.equal(promotion.ready, true);
  assert.equal(promotion.issueCount, 0);
  assert.equal(promotion.artifactCount, 3);
  assert.deepEqual(
    promotion.targetCoverage.map((coverage) => [coverage.target, coverage.artifactCount]),
    [
      ["windows", 1],
      ["darwin", 1],
      ["linux", 1],
    ],
  );

  const staleVersion = createDesktopReleasePromotionReport(scan, { ...metadata, version: "0.3.0" }, { channel: "stable", currentVersion: "0.3.0" });

  assert.equal(staleVersion.ready, false);
  assert.ok(staleVersion.issues.some((issue) => issue.code === "version-not-newer"));
} finally {
  rmSync(readyFixture.fixtureDir, { force: true, recursive: true });
}

const blockedFixture = createFixture();

try {
  blockedFixture.writeArtifact("nsis/Essence_0.4.0_x64-setup.exe", "windows-nsis-signature");
  blockedFixture.writeArtifact("dmg/Essence_0.4.0_aarch64.dmg");

  const blockedScan = scanDesktopReleaseArtifacts({
    baseUrl: "http://cdn.example.com/releases",
    bundleDir: blockedFixture.fixtureDir,
    requiredTargets: ["windows", "darwin", "linux"],
  });
  const blockedPromotion = createDesktopReleasePromotionReport(blockedScan, metadata, {
    channel: "stable",
    currentVersion: "0.3.0",
  });

  assert.equal(blockedPromotion.ready, false);
  assert.ok(blockedPromotion.issues.some((issue) => issue.code === "missing-target"));
  assert.ok(blockedPromotion.issues.some((issue) => issue.code === "unsigned-artifacts"));
  assert.ok(blockedPromotion.issues.some((issue) => issue.code === "insecure-artifact-url"));
} finally {
  rmSync(blockedFixture.fixtureDir, { force: true, recursive: true });
}

console.log("desktop release promotion smoke passed");

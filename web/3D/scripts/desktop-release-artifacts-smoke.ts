import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createDesktopReleaseManifestPayload, scanDesktopReleaseArtifacts } from "../src/features/projects/desktop-release-artifacts";

const fixtureDir = mkdtempSync(join(tmpdir(), "essence-spline-release-"));

function writeArtifact(relativePath: string, signature?: string) {
  const artifactPath = join(fixtureDir, relativePath);

  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, "fixture-artifact");

  if (signature !== undefined) {
    writeFileSync(`${artifactPath}.sig`, signature);
  }
}

try {
  writeArtifact("nsis/Essence_0.3.0_x64-setup.exe", "windows-nsis-signature");
  writeArtifact("msi/Essence_0.3.0_x64_en-US.msi", "windows-msi-signature");
  writeArtifact("macos/Essence.app.tar.gz", "mac-app-signature");
  writeArtifact("dmg/Essence_0.3.0_aarch64.dmg", "mac-dmg-signature");
  writeArtifact("appimage/Essence_0.3.0_x86_64.AppImage", "linux-appimage-signature");
  writeArtifact("deb/Essence_0.3.0_amd64.deb");

  const scan = scanDesktopReleaseArtifacts({
    baseUrl: "https://cdn.example.com/releases/",
    bundleDir: fixtureDir,
    requiredTargets: ["windows", "darwin", "linux"],
  });

  assert.equal(scan.artifactCandidates.length, 6);
  assert.equal(scan.signedArtifacts.length, 5);
  assert.equal(scan.unsignedArtifacts.length, 1);
  assert.equal(scan.ready, false);
  assert.deepEqual(scan.missingTargets, []);
  assert.ok(scan.selectedArtifacts.some((artifact) => artifact.target === "windows" && artifact.relativePath.includes("nsis")));
  assert.ok(scan.selectedArtifacts.some((artifact) => artifact.target === "darwin" && artifact.arch === "aarch64"));
  assert.ok(scan.selectedArtifacts.some((artifact) => artifact.target === "linux" && artifact.relativePath.endsWith(".AppImage")));

  const payload = createDesktopReleaseManifestPayload(scan, {
    notes: "Fixture release",
    pubDate: "2026-05-15T00:00:00.000Z",
    version: "0.3.0",
  });

  assert.equal(payload.env.DESKTOP_UPDATE_VERSION, "0.3.0");
  assert.equal(payload.env.DESKTOP_UPDATE_SIGNATURE_WINDOWS_X86_64, "windows-nsis-signature");
  assert.equal(payload.env.DESKTOP_UPDATE_SIGNATURE_LINUX_X86_64, "linux-appimage-signature");
  assert.match(payload.env.DESKTOP_UPDATE_URL_DARWIN_AARCH64, /^https:\/\/cdn\.example\.com\/releases\/dmg\//);
  assert.equal(payload.unsignedArtifacts.length, 1);
} finally {
  rmSync(fixtureDir, { force: true, recursive: true });
}

console.log("desktop release artifacts smoke passed");

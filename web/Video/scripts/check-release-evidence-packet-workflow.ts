import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { desktopLaunchProofRequirements } from "../src/lib/desktop/desktop-launch-proof";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";
import type { ReleaseEvidencePacket } from "../src/lib/product/release-evidence";
import { createReleaseEvidencePacketPayload, selectReleaseEvidenceFromPacket } from "../src/lib/product/release-evidence";
import { createReleaseEvidenceHistoryEntry, releaseEvidenceHistoryLabel } from "../src/lib/product/release-evidence-history";
import { createReleaseReadinessReport } from "../src/lib/product/release-readiness";

const report = createReleaseReadinessReport({
  productReport: {
    score: 100,
    total: 1,
    ready: 1,
    needsVerification: 0,
    partial: 0,
    missing: 0,
    statusCounts: [{ status: "ready", count: 1 }],
    areas: [],
    nextCapabilities: [],
  },
  textAiConfigured: true,
  imageGenerationConfigured: true,
  databaseConfigured: true,
  vercelLinked: true,
  deploymentUrlCaptured: true,
  deploymentScreenshotCaptured: true,
  desktopLaunchVerified: true,
});
const evidence = selectReleaseEvidenceFromPacket({
  deploymentUrl: "https://essence-studio.vercel.app",
  deploymentScreenshotUrl: "",
  deploymentScreenshotArtifact: "G:\\Kapwing\\artifacts\\release-home.png",
  desktopLaunchVerified: true,
  desktopVerificationId: "desktop_verification_ready",
  desktopVerificationCheckedAt: 1,
  desktopVerificationStepCount: desktopLaunchProofRequirements.length,
  updatedAt: 2,
});

assert.ok(evidence);
assert.equal(createReleaseEvidencePacketPayload(report, evidence).schemaVersion, 1);
const packetPayload = createReleaseEvidencePacketPayload(report, evidence, { desktopVerification: readyDesktopEntry() });
assert.equal(releaseEvidenceHistoryLabel(createReleaseEvidenceHistoryEntry(packetPayload, 2)), "Ready");

const tempDir = mkdtempSync(join(tmpdir(), "essence-release-evidence-"));

try {
  const screenshotPath = join(tempDir, "release-home.png");
  const desktopEvidencePath = join(tempDir, "desktop-evidence.json");
  const outputPath = join(tempDir, "release-evidence.json");
  writeFileSync(screenshotPath, "screenshot bytes");
  writeFileSync(
    desktopEvidencePath,
    JSON.stringify({
      schemaVersion: 1,
      exportedAt: Date.now(),
      entryCount: 1,
      entries: [readyDesktopEntry()],
    }),
  );

  const result = spawnSync(process.execPath, [
    "scripts/write-release-evidence-packet.ts",
    "--deployment-url",
    "https://essence-studio.vercel.app",
    "--screenshot-proof",
    screenshotPath,
    "--desktop-evidence",
    desktopEvidencePath,
    "--output",
    outputPath,
    "--allow-blocked",
  ]);

  assert.equal(result.status, 0, result.stderr.toString());
  const summary = JSON.parse(result.stdout.toString());
  assert.equal(summary.auditStatus, "blocked");
  assert.equal(typeof summary.blockerCount, "number");
  const packet = JSON.parse(readFileSync(outputPath, "utf8")) as ReleaseEvidencePacket;
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.evidence.deploymentUrl, "https://essence-studio.vercel.app");
  assert.equal(packet.evidence.deploymentScreenshotArtifact, screenshotPath);
  assert.equal(typeof packet.evidence.updatedAt, "number");
  assert.equal(packet.desktopVerification?.id, "desktop_verification_ready");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

const packageJson = readFileSync("package.json", "utf8");
const packetScript = readFileSync("scripts/write-release-evidence-packet.ts", "utf8");
const releaseEvidence = readFileSync("src/lib/product/release-evidence.ts", "utf8");
const releaseEvidenceHistory = readFileSync("src/lib/product/release-evidence-history.ts", "utf8");

assert.match(packageJson, /release:evidence/);
assert.match(packageJson, /release:evidence:strict/);
assert.match(packageJson, /check:release-evidence-packet-workflow/);
assert.match(packetScript, /deployment-url/);
assert.match(packetScript, /screenshot-proof/);
assert.match(packetScript, /desktop-evidence/);
assert.match(packetScript, /strict/);
assert.match(packetScript, /allow-blocked/);
assert.match(packetScript, /createReleaseEvidencePacketPayload/);
assert.match(packetScript, /auditReleaseEvidencePacket/);
assert.match(releaseEvidence, /createReleaseEvidencePacketPayload/);
assert.match(releaseEvidenceHistory, /createReleaseEvidenceHistoryEntry/);
assert.match(releaseEvidenceHistory, /releaseEvidenceHistoryLabel/);
assert.match(releaseEvidenceHistory, /saveReleaseEvidenceHistoryEntry/);

console.log("Release evidence packet workflow checks passed.");

function readyDesktopEntry(): DesktopVerificationHistoryEntry {
  return {
    id: "desktop_verification_ready",
    checkedAt: 1,
    status: "ready",
    stepCount: desktopLaunchProofRequirements.length,
    readyCount: desktopLaunchProofRequirements.length,
    limitedCount: 0,
    failedCount: 0,
    steps: desktopLaunchProofRequirements.map((requirement) => ({
      id: requirement.id,
      label: requirement.label,
      source: "workflow",
      status: "ready",
      detail: `${requirement.label} checked.`,
    })),
  };
}

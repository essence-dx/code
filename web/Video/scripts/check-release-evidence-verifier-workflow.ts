import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { desktopLaunchProofRequirements } from "../src/lib/desktop/desktop-launch-proof";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";
import { auditReleaseEvidencePacket } from "../src/lib/product/release-evidence-audit";
import { createReleaseEvidencePacketPayload, selectReleaseEvidenceFromPacket } from "../src/lib/product/release-evidence";
import { createReleaseReadinessReport } from "../src/lib/product/release-readiness";

const checkedAt = Date.now();
const readyEntry = readyDesktopEntry(checkedAt);
const readyReport = createReleaseReadinessReport({
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
const readyEvidence = selectReleaseEvidenceFromPacket({
  deploymentUrl: "https://essence-studio.vercel.app",
  deploymentScreenshotUrl: "https://example.com/release.png",
  deploymentScreenshotArtifact: "",
  desktopLaunchVerified: true,
  desktopVerificationId: readyEntry.id,
  desktopVerificationCheckedAt: readyEntry.checkedAt,
  desktopVerificationStepCount: readyEntry.stepCount,
  updatedAt: checkedAt,
});

assert.ok(readyEvidence);

const readyPacket = createReleaseEvidencePacketPayload(readyReport, readyEvidence, {
  desktopVerification: readyEntry,
});
const readyAudit = auditReleaseEvidencePacket(readyPacket, checkedAt);
assert.equal(readyAudit.status, "ready");
assert.equal(readyAudit.errors.length, 0);

const blockedPacket = createReleaseEvidencePacketPayload(
  createReleaseReadinessReport({
    productReport: {
      score: 75,
      total: 40,
      ready: 30,
      needsVerification: 0,
      partial: 10,
      missing: 0,
      statusCounts: [{ status: "partial", count: 10 }],
      areas: [],
      nextCapabilities: [],
    },
    textAiConfigured: true,
    imageGenerationConfigured: false,
    databaseConfigured: false,
    vercelLinked: true,
    deploymentUrlCaptured: true,
    deploymentScreenshotCaptured: false,
    desktopLaunchVerified: false,
  }),
  {
    deploymentUrl: "https://essence-studio.vercel.app",
    deploymentScreenshotUrl: "",
    deploymentScreenshotArtifact: "",
    desktopLaunchVerified: false,
    desktopVerificationId: "",
    desktopVerificationCheckedAt: null,
    desktopVerificationStepCount: 0,
    updatedAt: checkedAt,
  },
);
const blockedAudit = auditReleaseEvidencePacket(blockedPacket, checkedAt);
assert.equal(blockedAudit.status, "blocked");
assert.ok(blockedAudit.missingRequirements.some((requirement) => requirement.id === "deployment-screenshot"));
assert.ok(blockedAudit.blockedGates.length > 0 || blockedAudit.warningGates.length > 0);

const tempDir = mkdtempSync(join(tmpdir(), "essence-release-verifier-"));

try {
  const readyPath = join(tempDir, "ready-release-evidence.json");
  const blockedPath = join(tempDir, "blocked-release-evidence.json");

  writeFileSync(readyPath, `${JSON.stringify(readyPacket, null, 2)}\n`);
  writeFileSync(blockedPath, `${JSON.stringify(blockedPacket, null, 2)}\n`);

  const readyResult = spawnSync(process.execPath, ["scripts/verify-release-evidence-packet.ts", readyPath], {
    encoding: "utf8",
  });
  assert.equal(readyResult.status, 0, readyResult.stderr);
  assert.match(readyResult.stdout, /Status: READY/);

  const blockedResult = spawnSync(process.execPath, ["scripts/verify-release-evidence-packet.ts", blockedPath], {
    encoding: "utf8",
  });
  assert.equal(blockedResult.status, 1);
  assert.match(blockedResult.stdout, /Status: BLOCKED/);

  const jsonResult = spawnSync(process.execPath, ["scripts/verify-release-evidence-packet.ts", "--allow-blocked", "--json", "--packet", blockedPath], {
    encoding: "utf8",
  });
  assert.equal(jsonResult.status, 0, jsonResult.stderr);
  assert.equal(JSON.parse(jsonResult.stdout).status, "blocked");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

const packageJson = readFileSync("package.json", "utf8");
const verifier = readFileSync("scripts/verify-release-evidence-packet.ts", "utf8");
const auditModule = readFileSync("src/lib/product/release-evidence-audit.ts", "utf8");

assert.match(packageJson, /release:verify/);
assert.match(packageJson, /check:release-evidence-verifier-workflow/);
assert.match(verifier, /allow-blocked/);
assert.match(verifier, /auditReleaseEvidencePacket/);
assert.match(auditModule, /warningGates/);
assert.match(auditModule, /staleRequirements/);

console.log("Release evidence verifier workflow checks passed.");

function readyDesktopEntry(checkedAtValue: number): DesktopVerificationHistoryEntry {
  return {
    id: `desktop_verification_${checkedAtValue}`,
    checkedAt: checkedAtValue,
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

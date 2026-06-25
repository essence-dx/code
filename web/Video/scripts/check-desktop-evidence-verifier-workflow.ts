import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { desktopLaunchProofRequirements } from "../src/lib/desktop/desktop-launch-proof";
import { auditDesktopVerificationEvidencePacket } from "../src/lib/desktop/desktop-evidence-audit";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";

const checkedAt = Date.now();
const readyPacket = {
  schemaVersion: 1,
  exportedAt: checkedAt,
  entryCount: 1,
  entries: [createEntry("desktop_verification_ready", checkedAt, "ready", desktopLaunchProofRequirements.map((requirement) => requirement.id))],
};
const missingPacket = {
  schemaVersion: 1,
  exportedAt: checkedAt,
  entryCount: 1,
  entries: [
    createEntry(
      "desktop_verification_missing",
      checkedAt,
      "ready",
      desktopLaunchProofRequirements.filter((requirement) => requirement.id !== "native-export-output").map((requirement) => requirement.id),
    ),
  ],
};
const stalePacket = {
  schemaVersion: 1,
  exportedAt: 1,
  entryCount: 1,
  entries: [createEntry("desktop_verification_stale", 1, "ready", desktopLaunchProofRequirements.map((requirement) => requirement.id))],
};

assert.equal(auditDesktopVerificationEvidencePacket(readyPacket, checkedAt).status, "ready");
assert.equal(auditDesktopVerificationEvidencePacket(missingPacket, checkedAt).status, "blocked");
assert.equal(auditDesktopVerificationEvidencePacket(stalePacket, checkedAt).stale, true);
assert.equal(auditDesktopVerificationEvidencePacket({ ...readyPacket, entryCount: 99 }, checkedAt).status, "blocked");

const tempDir = mkdtempSync(join(tmpdir(), "essence-desktop-evidence-verifier-"));

try {
  const readyPath = join(tempDir, "ready-desktop-evidence.json");
  const missingPath = join(tempDir, "missing-desktop-evidence.json");

  writeFileSync(readyPath, `${JSON.stringify(readyPacket, null, 2)}\n`);
  writeFileSync(missingPath, `${JSON.stringify(missingPacket, null, 2)}\n`);

  const readyResult = spawnSync(process.execPath, ["scripts/verify-desktop-evidence-packet.ts", readyPath], {
    encoding: "utf8",
  });
  assert.equal(readyResult.status, 0, readyResult.stderr);
  assert.match(readyResult.stdout, /Status: READY/);

  const blockedResult = spawnSync(process.execPath, ["scripts/verify-desktop-evidence-packet.ts", missingPath], {
    encoding: "utf8",
  });
  assert.equal(blockedResult.status, 1);
  assert.match(blockedResult.stdout, /Status: BLOCKED/);

  const jsonResult = spawnSync(process.execPath, ["scripts/verify-desktop-evidence-packet.ts", "--allow-blocked", "--json", "--packet", missingPath], {
    encoding: "utf8",
  });
  assert.equal(jsonResult.status, 0, jsonResult.stderr);
  assert.equal(JSON.parse(jsonResult.stdout).status, "blocked");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

const packageJson = readFileSync("package.json", "utf8");
const verifier = readFileSync("scripts/verify-desktop-evidence-packet.ts", "utf8");
const auditModule = readFileSync("src/lib/desktop/desktop-evidence-audit.ts", "utf8");

assert.match(packageJson, /desktop:evidence:verify/);
assert.match(packageJson, /check:desktop-evidence-verifier-workflow/);
assert.match(verifier, /allow-blocked/);
assert.match(verifier, /auditDesktopVerificationEvidencePacket/);
assert.match(auditModule, /desktopEvidenceFreshnessWindowMs/);
assert.match(auditModule, /entryCount/);

console.log("Desktop evidence verifier workflow checks passed.");

function createEntry(
  id: string,
  checkedAtValue: number,
  status: DesktopVerificationHistoryEntry["status"],
  readyStepIds: string[],
): DesktopVerificationHistoryEntry {
  const steps = readyStepIds.map((stepId) => ({
    id: stepId,
    label: stepId,
    source: "workflow" as const,
    status: "ready" as const,
    detail: `${stepId} checked.`,
  }));

  return {
    id,
    status,
    checkedAt: checkedAtValue,
    stepCount: steps.length,
    readyCount: steps.length,
    limitedCount: 0,
    failedCount: status === "failed" ? steps.length : 0,
    steps,
  };
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { desktopLaunchProofRequirements } from "../src/lib/desktop/desktop-launch-proof";
import {
  createDesktopProofFreshnessReminder,
  desktopProofRefreshCommand,
} from "../src/lib/desktop/desktop-proof-freshness";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const readyEntry = createEntry("desktop_verification_ready", now - 4 * day);
const renewSoonEntry = createEntry("desktop_verification_renew_soon", now - 12 * day);
const staleEntry = createEntry("desktop_verification_stale", now - 15 * day);

assert.equal(desktopProofRefreshCommand, "bun run desktop:proof:refresh");
assert.equal(createDesktopProofFreshnessReminder({ schemaVersion: 1, exportedAt: now, entryCount: 1, entries: [readyEntry] }, now).status, "ready");
assert.equal(
  createDesktopProofFreshnessReminder({ schemaVersion: 1, exportedAt: now, entryCount: 1, entries: [renewSoonEntry] }, now).status,
  "renew-soon",
);
assert.equal(createDesktopProofFreshnessReminder({ schemaVersion: 1, exportedAt: now, entryCount: 1, entries: [staleEntry] }, now).status, "stale");
assert.equal(createDesktopProofFreshnessReminder({ schemaVersion: 1, exportedAt: now, entryCount: 0, entries: [] }, now).status, "missing");
assert.equal(
  createDesktopProofFreshnessReminder({ schemaVersion: 1, exportedAt: now, entryCount: 99, entries: [readyEntry] }, now).status,
  "blocked",
);

const packageJson = read("package.json");
const proofRunner = read("scripts/run-desktop-proof-dev.ts");
const freshnessModule = read("src/lib/desktop/desktop-proof-freshness.ts");
const desktopCard = read("src/features/settings/components/desktop-readiness-card.tsx");
const lightweight = read("scripts/check-lightweight.mjs");

assert.match(packageJson, /desktop:proof:refresh/);
assert.match(packageJson, /--existing-binary-only/);
assert.match(packageJson, /check:desktop-proof-freshness-workflow/);
assert.match(proofRunner, /existing-binary-only/);
assert.match(proofRunner, /No existing Tauri debug binary/);
assert.match(proofRunner, /desktop:proof:refresh/);
assert.match(freshnessModule, /desktopProofRefreshCommand/);
assert.match(freshnessModule, /renew-soon/);
assert.match(freshnessModule, /desktopProofFreshnessWindowMs/);
assert.match(desktopCard, /createDesktopProofFreshnessReminder/);
assert.match(desktopCard, /Proof freshness/);
assert.match(desktopCard, /Refresh without rebuilding/);
assert.match(lightweight, /check:desktop-proof-freshness-workflow/);

console.log("Desktop proof freshness workflow checks passed.");

function createEntry(id: string, checkedAt: number): DesktopVerificationHistoryEntry {
  return {
    id,
    checkedAt,
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

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

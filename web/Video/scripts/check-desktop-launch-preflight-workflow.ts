import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";
import { createDesktopLaunchProofSummary, desktopLaunchProofRequirements } from "../src/lib/desktop/desktop-launch-proof";
import { createDesktopLaunchPreflight } from "../src/lib/desktop/desktop-launch-preflight";

const missingPreflight = createDesktopLaunchPreflight(createDesktopLaunchProofSummary(null));
assert.equal(missingPreflight.status, "missing");
assert.equal(missingPreflight.steps.length, 4);
assert.match(missingPreflight.summary, /Tauri session/);
assert.deepEqual(
  missingPreflight.steps.map((step) => step.id),
  ["launch-desktop", "import-local-media", "reopen-project", "save-native-export"],
);

const readyEntry = createEntry(desktopLaunchProofRequirements.map((requirement) => requirement.id));
const readyPreflight = createDesktopLaunchPreflight(createDesktopLaunchProofSummary(readyEntry));
assert.equal(readyPreflight.status, "ready");
assert.equal(readyPreflight.steps.every((step) => step.status === "ready"), true);

const partialEntry = createEntry(["local-project-persistence", "desktop-storage", "media-library"]);
const partialPreflight = createDesktopLaunchPreflight(createDesktopLaunchProofSummary(partialEntry));
assert.equal(partialPreflight.status, "missing");
assert.equal(partialPreflight.steps.find((step) => step.id === "reopen-project")?.status, "ready");
assert.equal(partialPreflight.steps.find((step) => step.id === "save-native-export")?.status, "missing");

const moduleSource = read("src/lib/desktop/desktop-launch-preflight.ts");
assert.match(moduleSource, /createDesktopLaunchPreflight/);
assert.match(moduleSource, /launch-desktop/);
assert.match(moduleSource, /import-local-media/);
assert.match(moduleSource, /reopen-project/);
assert.match(moduleSource, /save-native-export/);

const cardSource = read("src/features/settings/components/desktop-readiness-card.tsx");
assert.match(cardSource, /createDesktopLaunchPreflight/);
assert.match(cardSource, /Launch preflight/);
assert.match(cardSource, /launchPreflight\.steps/);

console.log("Desktop launch preflight workflow checks passed.");

function createEntry(readyStepIds: string[]): DesktopVerificationHistoryEntry {
  const steps = readyStepIds.map((stepId) => ({
    id: stepId,
    label: stepId,
    source: stepId === "local-project-persistence" ? ("project" as const) : ("runtime" as const),
    status: "ready" as const,
    detail: `${stepId} checked.`,
  }));

  return {
    id: "desktop_verification_preflight",
    status: "ready",
    checkedAt: 1,
    stepCount: steps.length,
    readyCount: steps.length,
    limitedCount: 0,
    failedCount: 0,
    steps,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

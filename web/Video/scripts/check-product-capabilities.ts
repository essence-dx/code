import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { productCapabilities } from "../src/lib/product/capability-registry";
import { capabilityAreas, type ProductCapability } from "../src/lib/product/capability-types";
import { createProductReadinessReport } from "../src/lib/product/capability-summary";

const ids = new Set<string>();
const duplicateIds: string[] = [];
const missingLocalOwners: string[] = [];
const weakEntries: string[] = [];

for (const capability of productCapabilities) {
  const status = capability.status as ProductCapability["status"];
  if (ids.has(capability.id)) {
    duplicateIds.push(capability.id);
  }
  ids.add(capability.id);

  if (!capability.label.trim() || !capability.userValue.trim() || !capability.nextStep.trim()) {
    weakEntries.push(`${capability.id}: missing label, user value, or next step`);
  }

  if (status !== "missing" && capability.evidence.length === 0) {
    weakEntries.push(`${capability.id}: non-missing capability has no evidence`);
  }

  for (const ownerPath of localOwnerPaths(capability.ownerPath)) {
    if (!existsSync(join(process.cwd(), ownerPath))) {
      missingLocalOwners.push(`${capability.id}: ${ownerPath}`);
    }
  }
}

const report = createProductReadinessReport(productCapabilities);
const areasWithoutCapabilities = capabilityAreas.filter((area) => !productCapabilities.some((capability) => capability.area === area));

assert.deepEqual(duplicateIds, [], "Capability ids must be unique.");
assert.deepEqual(weakEntries, [], "Capability entries must stay specific and actionable.");
assert.deepEqual(missingLocalOwners, [], "Capability owner paths must point at existing project files or folders.");
assert.deepEqual(areasWithoutCapabilities, [], "Every capability area needs at least one registry entry.");
assert.ok(report.total >= 20, "Readiness report should cover the product surface, not just a small sample.");
assert.ok(report.nextCapabilities.length > 0, "Readiness report should expose next work while parity is incomplete.");

console.log(`Product capability checks passed. ${report.score}/100 readiness across ${report.total} capabilities.`);

function localOwnerPaths(ownerPath: string) {
  return ownerPath
    .split(",")
    .map((path) => path.trim())
    .filter((path) => /^(?:src|src-tauri|scripts|\.vercel|package\.json|todo\.md|changelog\.md)(?:\/|\\|$)/.test(path))
    .map((path) => path.replaceAll("\\", "/"));
}

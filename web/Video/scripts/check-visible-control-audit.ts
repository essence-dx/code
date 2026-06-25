import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { visibleControlAuditEntries } from "../src/lib/product/visible-control-audit";

const ids = new Set<string>();
const duplicateIds: string[] = [];
const invalidEntries: string[] = [];
const missingEvidence: string[] = [];

for (const entry of visibleControlAuditEntries) {
  if (ids.has(entry.id)) duplicateIds.push(entry.id);
  ids.add(entry.id);

  if (!entry.label.trim() || !entry.behavior.trim() || entry.wiringEvidence.length === 0) {
    invalidEntries.push(`${entry.id}: missing label, behavior, or wiring evidence`);
  }

  const absolutePath = join(process.cwd(), entry.ownerPath);
  if (!existsSync(absolutePath)) {
    invalidEntries.push(`${entry.id}: owner path does not exist`);
    continue;
  }

  const source = readFileSync(absolutePath, "utf8");
  for (const evidence of entry.wiringEvidence) {
    if (!source.includes(evidence)) {
      missingEvidence.push(`${entry.id}: ${entry.ownerPath} does not include ${evidence}`);
    }
  }
}

assert.deepEqual(duplicateIds, [], "Visible control audit ids must be unique.");
assert.deepEqual(invalidEntries, [], "Visible control audit entries must be specific and owned.");
assert.deepEqual(missingEvidence, [], "Visible control audit evidence must remain wired in source.");
assert.ok(visibleControlAuditEntries.length >= 20, "Visible control audit should cover the main product controls.");

const bannedControlPatterns = [
  /coming soon/i,
  /not implemented/i,
  /dummy/i,
  /href="#"/i,
  /disabled=\{true\}/i,
  /onClick=\{\(\) => \{\}\}/i,
];
const bannedMatches = scanSourceFiles(["src/app", "src/features"]).flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");
  return bannedControlPatterns.flatMap((pattern) => (pattern.test(source) ? [`${filePath}: ${pattern}`] : []));
});

assert.deepEqual(bannedMatches, [], "Visible product controls should not use placeholder wiring or dummy language.");

console.log(`Visible control audit checks passed. ${visibleControlAuditEntries.length} controls covered.`);

function scanSourceFiles(paths: string[]) {
  return paths.flatMap((path) => scanDirectory(join(process.cwd(), path)));
}

function scanDirectory(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return scanDirectory(path);
    return path.endsWith(".tsx") || path.endsWith(".ts") ? [path] : [];
  });
}

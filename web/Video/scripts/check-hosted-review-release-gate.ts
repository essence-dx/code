import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const checks = [
  "check:hosted-review-runtime-smoke",
  "check:hosted-share-freshness-workflow",
  "check:release-packet-import-conflicts-workflow",
  "check:release-operations-gate",
];

for (const check of checks) {
  const result = spawnSync(process.execPath, ["run", check], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${check} failed.`);
  }
}

const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(packageJson, /check:hosted-review-release-gate/);
assert.match(lightweight, /check:hosted-review-release-gate/);
assert.match(todo, /Next feature set status: 0\/100 for review handoff runtime UX and evidence recovery/);
assert.match(todo, /\[x\] Add a final hosted-review release check/);
assert.match(changelog, /Hosted Review Release Gate/);

console.log("Hosted review release gate checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

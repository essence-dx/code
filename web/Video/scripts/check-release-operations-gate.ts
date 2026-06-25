import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const command = process.execPath;
const tasks = [
  { label: "review runtime smoke", args: ["run", "check:export-review-runtime-smoke"] },
  { label: "proof export and maintenance runtime actions", args: ["run", "check:proof-maintenance-runtime-actions"] },
  { label: "maintenance recovery completion", args: ["run", "check:local-maintenance-recovery-completion-workflow"] },
  { label: "release operations history", args: ["run", "check:release-operations-history-workflow"] },
  { label: "stale review package detection", args: ["run", "check:stale-review-package-workflow"] },
  { label: "release review handoff comparison", args: ["run", "check:release-review-handoff-workflow"] },
] as const;

for (const task of tasks) {
  const result = spawnSync(command, task.args, { stdio: "inherit" });
  if (result.status !== 0) {
    if (result.error) console.error(result.error.message);
    console.error(`Release operations gate failed during ${task.label}.`);
    process.exit(result.status ?? 1);
  }
}

const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("TODO.md");
const changelog = read("CHANGELOG.md");

assert.match(packageJson, /check:release-operations-gate/);
assert.match(lightweight, /check:release-operations-gate/);
assert.match(todo, /\[x\] Add a final lightweight release-operations check/);
assert.match(todo, /Next 100% Feature Set - Hosted Review Polish And Release Sharing Hardening/);
assert.match(changelog, /Release Operations Gate/);

console.log("Release operations gate checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { LocalMaintenanceRecoveryItem } from "../src/lib/operations/local-maintenance-recovery-queue";
import {
  createLocalMaintenanceRecoveryCompletionReport,
  localMaintenanceRecoveryCompletionLabel,
} from "../src/lib/operations/local-maintenance-recovery-completion";

const pendingRecoveries: LocalMaintenanceRecoveryItem[] = [
  {
    id: "refresh-proof",
    sourceItemId: "stale-proof",
    label: "Refresh proof",
    status: "attention",
    count: 2,
    detail: "Release proof is stale.",
    actionLabel: "Refresh proof scan",
    targets: ["Release proof"],
  },
  {
    id: "relink-media",
    sourceItemId: "missing-sources",
    label: "Relink media",
    status: "blocked",
    count: 1,
    detail: "Reconnect missing media.",
    actionLabel: "Open media relink",
    targets: ["missing.mp4"],
  },
  {
    id: "retry-exports",
    sourceItemId: "failed-exports",
    label: "Retry failed exports",
    status: "blocked",
    count: 1,
    detail: "One export needs retry.",
    actionLabel: "Re-queue exports",
    targets: ["broken-export.mp4"],
  },
  {
    id: "review-cloud-conflicts",
    sourceItemId: "cloud-version-conflicts",
    label: "Clear reviewed conflicts",
    status: "blocked",
    count: 1,
    detail: "One cloud conflict needs cleanup.",
    actionLabel: "Clear reviewed",
    targets: ["project-1"],
  },
];

const blockedReport = createLocalMaintenanceRecoveryCompletionReport(pendingRecoveries);
const partiallyResolvedReport = createLocalMaintenanceRecoveryCompletionReport(pendingRecoveries.filter((item) => item.id !== "retry-exports"));
const resolvedReport = createLocalMaintenanceRecoveryCompletionReport([]);

assert.equal(blockedReport.status, "pending");
assert.equal(blockedReport.pendingCount, 4);
assert.equal(blockedReport.items.find((item) => item.id === "retry-exports")?.status, "pending");
assert.equal(partiallyResolvedReport.pendingCount, 3);
assert.equal(partiallyResolvedReport.items.find((item) => item.id === "retry-exports")?.status, "resolved");
assert.match(partiallyResolvedReport.items.find((item) => item.id === "retry-exports")?.detail ?? "", /Failed export jobs are resolved/);
assert.equal(resolvedReport.status, "resolved");
assert.equal(resolvedReport.resolvedCount, 4);
assert.equal(localMaintenanceRecoveryCompletionLabel("pending"), "Pending");
assert.equal(localMaintenanceRecoveryCompletionLabel("resolved"), "Resolved");

const completionModule = read("src/lib/operations/local-maintenance-recovery-completion.ts");
const recoveryQueue = read("src/features/settings/components/local-maintenance-recovery-queue.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("TODO.md");
const changelog = read("CHANGELOG.md");

assert.match(completionModule, /createLocalMaintenanceRecoveryCompletionReport/);
assert.match(completionModule, /Proof refresh/);
assert.match(completionModule, /Media relink/);
assert.match(completionModule, /Export retry/);
assert.match(completionModule, /Cloud conflict cleanup/);
assert.match(recoveryQueue, /Completion checks/);
assert.match(recoveryQueue, /createLocalMaintenanceRecoveryCompletionReport/);
assert.match(packageJson, /check:local-maintenance-recovery-completion-workflow/);
assert.match(lightweight, /check:local-maintenance-recovery-completion-workflow/);
assert.match(todo, /\[x\] Add maintenance recovery completion tracking/);
assert.match(changelog, /Maintenance Recovery Completion/);

console.log("Local maintenance recovery completion workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

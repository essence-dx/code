import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createInMemoryHostedReviewRuntimeStore,
  runHostedReviewRuntimeSmoke,
} from "../src/lib/projects/hosted-review-runtime-smoke";

const report = await runHostedReviewRuntimeSmoke(
  createInMemoryHostedReviewRuntimeStore("https://reviews.example"),
  new Date("2026-05-16T07:00:00.000Z"),
);

assert.equal(report.status, "passed");
assert.equal(report.failedCount, 0);
assert.equal(report.passedCount, 7);
assert.deepEqual(
  report.steps.map((step) => step.id),
  ["public-load", "comment-create", "view-only-access", "download-comment-access", "revoke-link", "renew-link", "expiry-block"],
);

const smokeModule = read("src/lib/projects/hosted-review-runtime-smoke.ts");
const contracts = read("src/lib/projects/hosted-review-link-contracts.ts");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("TODO.md");
const changelog = read("CHANGELOG.md");

assert.match(smokeModule, /runHostedReviewRuntimeSmoke/);
assert.match(smokeModule, /createInMemoryHostedReviewRuntimeStore/);
assert.match(smokeModule, /view-only-access/);
assert.match(smokeModule, /download-comment-access/);
assert.match(smokeModule, /revoke-link/);
assert.match(smokeModule, /renew-link/);
assert.match(smokeModule, /expiry-block/);
assert.match(contracts, /isHostedReviewExpired/);
assert.match(packageJson, /check:hosted-review-runtime-smoke/);
assert.match(lightweight, /check:hosted-review-runtime-smoke/);
assert.match(todo, /\[x\] Add a hosted-review runtime smoke/);
assert.match(changelog, /Hosted Review Runtime Smoke/);

console.log("Hosted review runtime smoke checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hostedLinksPanel = read("src/features/projects/components/hosted-review-links-panel.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(hostedLinksPanel, /Search hosted review links/);
assert.match(hostedLinksPanel, /Sort hosted review links/);
assert.match(hostedLinksPanel, /Filter hosted review links/);
assert.match(hostedLinksPanel, /proof-attention/);
assert.match(hostedLinksPanel, /stale-proof/);
assert.match(hostedLinksPanel, /matchesSearch/);
assert.match(hostedLinksPanel, /matchesFilter/);
assert.match(hostedLinksPanel, /compareRows/);
assert.match(hostedLinksPanel, /No hosted links match these filters/);
assert.match(packageJson, /check:hosted-review-link-controls-workflow/);
assert.match(lightweight, /check:hosted-review-link-controls-workflow/);
assert.match(todo, /\[x\] Add owner-side hosted review link search, sorting, and stale-proof filters/);
assert.match(changelog, /Hosted Review Link Controls/);

console.log("Hosted review link controls workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

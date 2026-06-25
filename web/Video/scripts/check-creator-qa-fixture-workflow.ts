import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createCreatorQaSampleProjectFixture,
  createCreatorQaSampleProjectReport,
} from "../src/lib/product/creator-qa-fixture";

const fixture = createCreatorQaSampleProjectFixture();
const report = createCreatorQaSampleProjectReport(fixture);

assert.equal(report.status, "ready");
assert.equal(report.deliveryQa.status, "ready");
assert.equal(report.renderPlan.supported, true);
assert.equal(report.renderPlan.mode, "composite");
assert.equal(report.browserHandoff.status, "desktop-required");
assert.equal(report.browserHandoff.reasons.includes("desktop-media"), true);
assert.equal(report.desktopHandoff.status, "desktop-ready");
assert.equal(report.nativeGraph.layers.length, fixture.project.layers.length);
assert.equal(report.nativeGraph.media.some((asset) => asset.source === "tauri-fs"), true);
assert.equal(report.nativeGraph.media.some((asset) => asset.source === "self-hosted-url"), true);
assert.equal(report.nativeGraph.layers.some((layer) => layer.kind === "subtitle" && layer.cueCount === 4), true);
assert.equal(report.nativeGraph.layers.some((layer) => layer.kind === "audio" && layer.name === "Voiceover master"), true);
assert.equal(report.reviewLinkCount, 2);
assert.equal(report.uploadEvidenceCount, 3);
assert.equal(fixture.reviewLinks.some((link) => link.permission === "comment-only"), true);
assert.equal(fixture.reviewLinks.some((link) => link.permission === "download"), true);
assert.equal(fixture.uploadEvidence.verifiedCount, 3);

for (const ready of Object.values(report.coverage)) {
  assert.equal(ready, true);
}

const project = fixture.project;
assert.equal(project.layers.filter((layer) => layer.kind === "video").length >= 3, true);
assert.equal(project.layers.filter((layer) => layer.kind === "audio").length >= 2, true);
assert.equal(project.layers.some((layer) => layer.kind === "subtitle" && (layer.cues?.length ?? 0) >= 4), true);
assert.equal(project.mediaCollections?.some((collection) => collection.id === "collection_stock" && collection.assetIds.length >= 3), true);

const packageJson = read("package.json");
const fixtureModule = read("src/lib/product/creator-qa-fixture.ts");
const fixtureData = read("src/lib/product/creator-qa-fixture-data.ts");
const todo = read("todo.md");

assert.match(packageJson, /check:creator-qa-fixture-workflow/);
assert.match(fixtureModule, /createCreatorQaSampleProjectFixture/);
assert.match(fixtureModule, /createCreatorQaSampleProjectReport/);
assert.match(fixtureModule, /createDeliveryQaReport/);
assert.match(fixtureModule, /createRenderHandoffPlan/);
assert.match(fixtureModule, /createNativeRenderGraph/);
assert.match(fixtureData, /HostedReviewLinkSummary/);
assert.match(fixtureData, /SelfHostedUploadEvidencePacket/);
assert.match(fixtureData, /asset_stock_broll/);
assert.match(fixtureData, /review_link_comment/);
assert.match(todo, /larger sample-project QA fixtures/);

console.log("Creator QA fixture workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

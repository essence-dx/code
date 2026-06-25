import { strict as assert } from "node:assert";
import type { RuntimeDeployVerificationHistory } from "@/features/projects/runtime-deploy-verification-history";
import type { RuntimeQaPacket } from "@/features/projects/runtime-qa-packet";
import { createRuntimeEvidenceDashboardDownloads } from "@/features/projects/runtime-evidence-dashboard-downloads";

const runtimeQaPacket = {
  csvDataUri: "data:text/csv;charset=utf-8,section",
  csvFileName: "runtime-qa.csv",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "runtime-qa.json",
  markdownDataUri: "data:text/markdown;charset=utf-8,%23%20Runtime",
  markdownFileName: "runtime-qa.md",
  summary: {
    packetHash: "sha256:packet",
    qaScore: 100,
    status: "ready",
  },
} as RuntimeQaPacket;

const deployHistory = {
  csvDataUri: "data:text/csv;charset=utf-8,checked_at",
  csvFileName: "deploy-history.csv",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "deploy-history.json",
  summary: {
    historyHash: "sha256:history",
    recordCount: 2,
    status: "ready",
  },
} as RuntimeDeployVerificationHistory;

const downloads = createRuntimeEvidenceDashboardDownloads({
  deployHistory,
  runtimeQaPacket,
});

assert.equal(downloads.length, 5);
assert.deepEqual(
  downloads.map((download) => download.id),
  ["runtime-qa-markdown", "runtime-qa-csv", "runtime-qa-json", "deploy-history-csv", "deploy-history-json"],
);
assert.ok(downloads.every((download) => download.href.startsWith("data:")));
assert.ok(downloads.every((download) => download.download.length > 0));
assert.ok(downloads.every((download) => download.label.length > 0));
assert.equal(downloads.find((download) => download.id === "runtime-qa-markdown")?.format, "markdown");
assert.equal(downloads.find((download) => download.id === "runtime-qa-csv")?.download, "runtime-qa.csv");
assert.equal(downloads.find((download) => download.id === "deploy-history-json")?.download, "deploy-history.json");
assert.equal(downloads.find((download) => download.id === "deploy-history-json")?.hash, "sha256:history");
assert.equal(downloads.find((download) => download.id === "runtime-qa-json")?.hash, "sha256:packet");

const packetOnlyDownloads = createRuntimeEvidenceDashboardDownloads({
  runtimeQaPacket,
});

assert.equal(packetOnlyDownloads.length, 3);
assert.equal(packetOnlyDownloads.some((download) => download.id === "deploy-history-csv"), false);

console.log("runtime evidence dashboard downloads smoke passed");

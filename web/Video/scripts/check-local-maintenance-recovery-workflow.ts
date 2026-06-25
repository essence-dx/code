import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DesktopLaunchProofSummary } from "../src/lib/desktop/desktop-launch-proof";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import type { ExportJob, MediaAsset } from "../src/lib/editor/types";
import { createMediaHealthReport } from "../src/lib/media/media-health";
import { createLocalMaintenanceReport } from "../src/lib/operations/local-maintenance-center";
import { createLocalMaintenanceRecoveryQueue } from "../src/lib/operations/local-maintenance-recovery-queue";
import type { ReleaseEvidenceSummary } from "../src/lib/product/release-evidence";
import type { ProjectSyncConflictHistoryEntry } from "../src/lib/projects/project-sync-conflict-history";

const now = "2026-05-16T05:09:54.840Z";
const availableAsset = createMediaAsset({ id: "asset-used", name: "used.mp4", objectUrl: "blob:used" });
const missingAsset = createMediaAsset({ id: "asset-missing", name: "missing.mp4", objectUrl: "" });
const project = createProject("Recovery queue sample", "16:9");
project.layers = [
  createLayerFromAsset(availableAsset, 0),
  createLayerFromAsset(missingAsset, 1),
  {
    ...createLayerFromAsset(availableAsset, 2),
    id: "layer-missing-reference",
    name: "Missing reference",
    assetId: "asset-reference-missing",
  },
];

const releaseEvidenceSummary: ReleaseEvidenceSummary = {
  score: 33,
  status: "missing",
  readyCount: 1,
  total: 3,
  requirements: [
    { id: "deployment-url", label: "Deployment URL", status: "ready", detail: "Deployment URL is saved." },
    { id: "deployment-screenshot", label: "Screenshot proof", status: "stale", detail: "Screenshot is stale." },
    { id: "desktop-proof", label: "Desktop proof", status: "missing", detail: "Desktop proof is missing." },
  ],
};
const desktopProofSummary: DesktopLaunchProofSummary = {
  status: "failed",
  readyCount: 7,
  limitedCount: 1,
  failedCount: 1,
  missingCount: 0,
  total: 9,
  requirements: [{ id: "native-export-output", label: "Export output", status: "failed", detail: "Native export output failed." }],
};
const exportJobs: ExportJob[] = [
  {
    id: "export-failed",
    projectId: project.id,
    format: "mp4",
    preset: "youtube-1080p",
    status: "failed",
    progress: 52,
    outputName: "broken-export.mp4",
    error: "Render failed.",
    createdAt: now,
    updatedAt: now,
  },
];
const cloudConflicts: ProjectSyncConflictHistoryEntry[] = [
  {
    id: "conflict-1",
    code: "project_conflict",
    projectId: project.id,
    baseUpdatedAt: "2026-05-16T04:00:00.000Z",
    remoteUpdatedAt: "2026-05-16T04:30:00.000Z",
    localUpdatedAt: "2026-05-16T05:00:00.000Z",
    recordedAt: now,
  },
];
const mediaHealth = createMediaHealthReport(project, [availableAsset, missingAsset]);
const report = createLocalMaintenanceReport({
  project,
  mediaAssets: [availableAsset, missingAsset],
  exportJobs,
  releaseEvidenceSummary,
  desktopProofSummary,
  cloudConflicts,
});
const queue = createLocalMaintenanceRecoveryQueue({ report, mediaHealth, exportJobs, cloudConflicts });

assert.deepEqual(
  queue.map((item) => item.id),
  ["refresh-proof", "relink-media", "retry-exports", "review-cloud-conflicts"],
);
assert.equal(queue.find((item) => item.id === "relink-media")?.targets[0], "asset-reference-missing");
assert.equal(queue.find((item) => item.id === "retry-exports")?.targets[0], "broken-export.mp4");
assert.match(queue.find((item) => item.id === "review-cloud-conflicts")?.targets[0] ?? "", /Recovery queue sample|project_/);
assert.equal(
  createLocalMaintenanceRecoveryQueue({
    report: {
      score: 100,
      status: "ready",
      readyCount: 5,
      attentionCount: 0,
      blockedCount: 0,
      items: report.items.map((item) => ({ ...item, status: "ready", count: 0 })),
    },
    mediaHealth,
    exportJobs: [],
    cloudConflicts: [],
  }).length,
  0,
);

const recoveryModule = read("src/lib/operations/local-maintenance-recovery-queue.ts");
const recoveryQueue = read("src/features/settings/components/local-maintenance-recovery-queue.tsx");
const maintenanceCard = read("src/features/settings/components/local-maintenance-center-card.tsx");
const editorShell = read("src/features/editor/components/editor-shell.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");
const todo = read("todo.md");
const changelog = read("changelog.md");

assert.match(recoveryModule, /createLocalMaintenanceRecoveryQueue/);
assert.match(recoveryModule, /refresh-proof/);
assert.match(recoveryModule, /relink-media/);
assert.match(recoveryModule, /retry-exports/);
assert.match(recoveryModule, /review-cloud-conflicts/);
assert.match(recoveryQueue, /Recovery queue/);
assert.match(recoveryQueue, /missing-media/);
assert.match(recoveryModule, /Re-queue exports/);
assert.match(maintenanceCard, /retryFailedExports/);
assert.match(maintenanceCard, /updateExportJob/);
assert.match(editorShell, /recovery/);
assert.match(packageJson, /check:local-maintenance-recovery-workflow/);
assert.match(lightweight, /check:local-maintenance-recovery-workflow/);
assert.match(todo, /\[x\] Add guided recovery queues/);
assert.match(changelog, /Guided Maintenance Recovery/);

console.log("Local maintenance recovery workflow checks passed.");

function createMediaAsset(input: Partial<MediaAsset>): MediaAsset {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name ?? "media.mp4",
    type: input.type ?? "video",
    mimeType: input.mimeType ?? "video/mp4",
    size: input.size ?? 512_000,
    duration: input.duration ?? 5,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    storageKey: input.storageKey ?? input.name ?? "media.mp4",
    source: input.source ?? "browser-indexeddb",
    objectUrl: input.objectUrl,
    createdAt: input.createdAt ?? now,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

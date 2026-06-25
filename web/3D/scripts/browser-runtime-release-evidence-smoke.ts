import { strict as assert } from "node:assert";
import {
  createBrowserRuntimeReleaseEvidenceReport,
  createBrowserRuntimeReleaseEvidenceRows,
} from "@/features/projects/browser-runtime-release-evidence";

const capturedAt = "2026-06-05T14:00:00.000Z";
const sceneVersionHash = "sha256:scene-version";

const rows = createBrowserRuntimeReleaseEvidenceRows({
  captures: [
    {
      capturedAt,
      consoleEntries: [
        {
          level: "info",
          message: "Essence runtime ready",
          timestamp: capturedAt,
        },
      ],
      routePath: "/editor/project-runtime",
      sceneVersionHash,
      screenshot: {
        byteSize: 83000,
        height: 960,
        path: ".runtime-release/editor.png",
        screenshotHash: "sha256:editor-shot",
        width: 1440,
      },
      surface: "editor",
      targetUrl: "https://essence-spline.example/editor/project-runtime",
    },
    {
      capturedAt,
      consoleEntries: [],
      routePath: "/share/share-runtime?scene=scene-runtime",
      sceneVersionHash,
      screenshot: {
        byteSize: 71000,
        height: 900,
        path: ".runtime-release/public-viewer.png",
        screenshotHash: "sha256:viewer-shot",
        width: 1440,
      },
      surface: "public-viewer",
      targetUrl: "https://essence-spline.example/share/share-runtime?scene=scene-runtime",
    },
    {
      capturedAt,
      consoleEntries: [],
      routePath: "/embed/share-runtime?scene=scene-runtime",
      sceneVersionHash,
      screenshot: {
        byteSize: 69000,
        height: 900,
        path: ".runtime-release/embed.png",
        screenshotHash: "sha256:embed-shot",
        width: 1440,
      },
      surface: "embed",
      targetUrl: "https://essence-spline.example/embed/share-runtime?scene=scene-runtime",
    },
    {
      capturedAt,
      consoleEntries: [
        {
          level: "log",
          message: "Package shell mounted",
          timestamp: capturedAt,
        },
      ],
      routePath: "/api/public/scenes/share-runtime/app-package/web?scene=scene-runtime",
      sceneVersionHash,
      screenshot: {
        byteSize: 47000,
        height: 860,
        path: ".runtime-release/app-package.png",
        screenshotHash: "sha256:package-shot",
        width: 1280,
      },
      surface: "app-package",
      targetUrl: "https://essence-spline.example/api/public/scenes/share-runtime/app-package/web?scene=scene-runtime",
    },
  ],
  expectedSceneVersionHash: sceneVersionHash,
});

assert.equal(rows.length, 4);
assert.deepEqual(
  rows.map((row) => row.surface),
  ["editor", "public-viewer", "embed", "app-package"],
);
assert.ok(rows.every((row) => row.status === "ready"));
assert.ok(rows.every((row) => row.screenshotHash?.startsWith("sha256:")));
assert.ok(rows.every((row) => row.sceneVersionHash === sceneVersionHash));
assert.ok(rows.every((row) => row.evidenceHash.startsWith("sha256:")));
assert.equal(rows.find((row) => row.surface === "editor")?.consoleErrorCount, 0);

const driftRows = createBrowserRuntimeReleaseEvidenceRows({
  captures: [
    {
      capturedAt,
      consoleEntries: [],
      routePath: "/editor/project-runtime",
      sceneVersionHash,
      screenshot: null,
      surface: "editor",
      targetUrl: "https://essence-spline.example/editor/project-runtime",
    },
    {
      capturedAt,
      consoleEntries: [
        {
          level: "error",
          message: "Runtime scene failed",
          timestamp: capturedAt,
        },
      ],
      routePath: "/share/share-runtime?scene=scene-runtime",
      sceneVersionHash: "sha256:drifted",
      screenshot: {
        byteSize: 71000,
        height: 900,
        path: ".runtime-release/public-viewer.png",
        screenshotHash: "sha256:viewer-shot",
        width: 1440,
      },
      surface: "public-viewer",
      targetUrl: "https://essence-spline.example/share/share-runtime?scene=scene-runtime",
    },
  ],
  expectedSceneVersionHash: sceneVersionHash,
});

assert.equal(driftRows.find((row) => row.surface === "editor")?.status, "blocked");
assert.match(driftRows.find((row) => row.surface === "editor")?.nextAction ?? "", /Capture editor screenshot/);
assert.equal(driftRows.find((row) => row.surface === "public-viewer")?.sceneVersionMatches, false);
assert.equal(driftRows.find((row) => row.surface === "public-viewer")?.consoleErrorCount, 1);

const report = createBrowserRuntimeReleaseEvidenceReport({
  generatedAt: "2026-06-05T14:05:00.000Z",
  rows,
  workspaceId: "Workspace Runtime Release Evidence",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.readyCount, 4);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.captureCount, 4);
assert.equal(report.summary.releaseEvidenceScore, 100);
assert.equal(report.summary.sceneVersionHash, sceneVersionHash);
assert.match(report.summary.releaseEvidenceHash, /^sha256:/);
assert.match(report.csvContent, /^surface,status,scene_version_hash,scene_version_matches,screenshot_hash,console_errors,evidence_hash,next_action/);
assert.match(report.jsonContent, /"releaseEvidenceHash"/);
assert.equal(report.csvFileName, "workspace-runtime-release-evidence-browser-runtime-release-evidence-20260605.csv");
assert.equal(report.jsonFileName, "workspace-runtime-release-evidence-browser-runtime-release-evidence-20260605.json");

console.log("browser runtime release evidence smoke passed");

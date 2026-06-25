import { readFileSync } from "node:fs";
import type { CanvasInteractionProfilerReport } from "../src/features/editor/canvas-interaction-profiler";
import type { DevModeIntegrationReviewReport } from "../src/features/editor/dev-mode-integration-review";
import type { MultiplayerFollowSpotlightReport } from "../src/features/editor/multiplayer-follow-spotlight";
import type { ReleaseReadinessDashboard } from "../src/features/editor/release-readiness-dashboard";
import {
  getProductionReadinessSynthesisCsv,
  getProductionReadinessSynthesisJson,
  getProductionReadinessSynthesisMarkdown,
  getProductionReadinessSynthesisPacket,
} from "../src/features/editor/production-readiness-synthesis";

const generatedAt = "2026-05-19T12:00:00.000Z";
const readyPacket = getProductionReadinessSynthesisPacket({
  canvasInteraction: canvasReport({ score: 96, status: "ready" }),
  collaboration: collaborationReport({ score: 94, status: "ready" }),
  devModeIntegration: devModeReport({ score: 98, status: "ready" }),
  generatedAt,
  releaseReadiness: releaseReadinessReport({ score: 93, status: "ready" }),
});
const blockedPacket = getProductionReadinessSynthesisPacket({
  canvasInteraction: canvasReport({
    blockedCount: 1,
    score: 62,
    status: "blocked",
  }),
  collaboration: collaborationReport({ score: 86, status: "review" }),
  devModeIntegration: devModeReport({
    blockedCount: 1,
    score: 58,
    status: "blocked",
  }),
  generatedAt,
  releaseReadiness: releaseReadinessReport({
    blockedCount: 1,
    score: 54,
    status: "blocked",
  }),
});
const markdown = getProductionReadinessSynthesisMarkdown(readyPacket);
const csv = getProductionReadinessSynthesisCsv(readyPacket);
const json = JSON.parse(getProductionReadinessSynthesisJson(readyPacket)) as {
  rows: unknown[];
  summary: {
    evidenceCount: number;
    shipDecision: string;
    status: string;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(readyPacket.status === "ready", "Ready fixtures should pass the ship gate.");
assert(readyPacket.shipDecision === "ship", "Ready fixtures should produce a ship decision.");
assert(readyPacket.score === 93, "Synthesis score should use the lowest subsystem score.");
assert(readyPacket.sectionCount === 5, "Synthesis should include four source sections plus the aggregate ship gate.");
assert(readyPacket.evidenceCount >= 14, "Synthesis packet should retain export and replay evidence.");
assert(readyPacket.rows.some((row) => row.area === "collaboration"), "Rows should include collaboration evidence.");
assert(readyPacket.rows.some((row) => row.area === "canvas"), "Rows should include canvas evidence.");
assert(readyPacket.rows.some((row) => row.area === "dev-mode"), "Rows should include Dev Mode evidence.");
assert(readyPacket.rows.some((row) => row.area === "admin-release"), "Rows should include admin release evidence.");
assert(readyPacket.rows.some((row) => row.area === "ship-gate"), "Rows should include a ship gate row.");
assert(readyPacket.signoffChecklist.length >= 5, "Ready packet should include a signoff checklist.");
assert(
  readyPacket.releaseEvidenceBundle.some((item) => item.includes("follow spotlight")),
  "Evidence bundle should reference follow spotlight exports.",
);
assert(
  readyPacket.releaseEvidenceBundle.some((item) => item.includes("Dev Mode integration")),
  "Evidence bundle should reference Dev Mode integration exports.",
);
assert(blockedPacket.status === "blocked", "Blocked fixtures should block the synthesis packet.");
assert(blockedPacket.shipDecision === "do-not-ship", "Blocked fixtures should produce a do-not-ship decision.");
assert(blockedPacket.blockerCount >= 3, "Blocked fixtures should preserve blocker counts.");
assert(markdown.includes("Production Readiness Synthesis"), "Markdown should include a clear title.");
assert(markdown.includes("admin release"), "Markdown should mention admin release evidence.");
assert(csv.includes("ship-gate"), "CSV should include the aggregate ship gate row.");
assert(json.rows.length === readyPacket.rows.length, "JSON should preserve all rows.");
assert(json.summary.status === "ready", "JSON summary should include ready status.");
assert(json.summary.shipDecision === "ship", "JSON summary should include ship decision.");
assert(json.summary.evidenceCount === readyPacket.evidenceCount, "JSON summary should preserve evidence count.");
assert(
  /ProductionReadinessSynthesisPanel/.test(extensionsSource) &&
    /getProductionReadinessSynthesisPacket/.test(extensionsSource),
  "Extensions should wire the production readiness synthesis panel and report.",
);
assert(
  packageJson.scripts["editor:production-readiness-synthesis-packet-smoke"]?.includes(
    "production-readiness-synthesis-packet-smoke",
  ),
  "Targeted production readiness synthesis smoke command should be listed.",
);

console.log(
  `Production readiness synthesis smoke passed: ${readyPacket.shipDecision}, ${readyPacket.evidenceCount} evidence item(s).`,
);

function canvasReport(
  overrides: Partial<CanvasInteractionProfilerReport>,
): CanvasInteractionProfilerReport {
  return {
    generatedAt,
    score: 96,
    status: "ready",
    pageId: "page-main",
    pageName: "Main canvas",
    selectedLayerCount: 2,
    visibleLayerCount: 18,
    selectableLayerCount: 16,
    renderWindowCount: 3,
    estimatedSelectionLatencyMs: 8.2,
    panZoomFrameBudgetMs: 11.4,
    hitTestHotspotCount: 0,
    hitTestPairCount: 8,
    hitTestStackDepth: 3,
    pointerReplayStepCount: 4,
    optimizationNoteCount: 2,
    blockedCount: 0,
    reviewCount: 0,
    readyCount: 1,
    replayNotes: [
      {
        id: "canvas-ready",
        status: "ready",
        label: "Canvas ready replay",
        layerIds: ["hero-card"],
        replaySteps: ["Select hero card.", "Pan the main canvas."],
        optimizationNote: "Canvas interaction costs stay under release budget.",
      },
    ],
    rows: [],
    ...overrides,
  };
}

function collaborationReport(
  overrides: Partial<MultiplayerFollowSpotlightReport>,
): MultiplayerFollowSpotlightReport {
  return {
    generatedAt,
    status: "ready",
    score: 94,
    activePeerCount: 2,
    activePresenterCount: 1,
    presenterStatus: "owned",
    presenterConflictCount: 0,
    ownerPeerId: "peer-host",
    ownerName: "Ari Reviewer",
    followedPeerId: "peer-host",
    followedPeerName: "Ari Reviewer",
    spotlightEventCount: 2,
    followEventCount: 2,
    handoffTimerSeconds: 240,
    handoffTimerStatus: "ready",
    viewportSyncStatus: "ready",
    viewportPanDelta: 8,
    viewportZoomDelta: 0.01,
    adminExportEvidenceCount: 4,
    adminExportEvidence: [
      "Export follow spotlight JSON.",
      "Export follow spotlight CSV.",
      "Export follow spotlight Markdown.",
      "Attach admin multiplayer evidence.",
    ],
    blockedCount: 0,
    reviewCount: 0,
    readyCount: 4,
    rows: [],
    ...overrides,
  };
}

function devModeReport(
  overrides: Partial<DevModeIntegrationReviewReport>,
): DevModeIntegrationReviewReport {
  return {
    generatedAt,
    status: "ready",
    score: 98,
    documentUpdatedAt: "2026-05-19T11:45:00.000Z",
    latestCodegenExportAt: "2026-05-19T11:50:00.000Z",
    codegenFreshnessStatus: "ready",
    staleCodegenCount: 0,
    visibleLayerCount: 18,
    readyForDevLayerCount: 2,
    codeConnectReadyCount: 2,
    variableCoveredLayerCount: 2,
    variableHandoffCoveragePercent: 100,
    linkHealthStatus: "ready",
    storybookLinkCount: 1,
    githubLinkCount: 1,
    jiraLinkCount: 1,
    invalidLinkCount: 0,
    missingRequiredLinkKindCount: 0,
    exportBundleReadyCount: 2,
    exportBundleCoveragePercent: 100,
    exportBundleEvidenceCount: 4,
    exportBundleEvidence: [
      "Export Dev Mode integration review JSON.",
      "Export Dev Mode integration review CSV.",
      "Export Dev Mode integration review Markdown.",
      "Export Dev Mode inspection bundle JSON.",
    ],
    blockedCount: 0,
    reviewCount: 0,
    readyCount: 6,
    rows: [],
    ...overrides,
  };
}

function releaseReadinessReport(
  overrides: Partial<ReleaseReadinessDashboard>,
): ReleaseReadinessDashboard {
  return {
    generatedAt,
    status: "ready",
    score: 93,
    readyCount: 8,
    reviewCount: 0,
    blockedCount: 0,
    sectionCount: 8,
    evidenceCount: 42,
    minimumScoreArea: "deploy-smoke",
    releaseNotes: [
      "All release readiness areas are ready.",
      "Attach deploy smoke, route, visual QA, and review evidence.",
    ],
    rows: [],
    ...overrides,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

import { readFileSync } from "node:fs";
import {
  getCommandAutomationRecordingReport,
} from "../src/features/editor/command-automation-recording";
import {
  getLargeCanvasRenderSchedulerReport,
} from "../src/features/editor/large-canvas-render-scheduler";
import {
  getMediaAssetPipelineReviewReport,
} from "../src/features/editor/media-asset-pipeline-review";
import {
  getNativeDesktopShipSynthesisCsv,
  getNativeDesktopShipSynthesisJson,
  getNativeDesktopShipSynthesisMarkdown,
  getNativeDesktopShipSynthesisReport,
} from "../src/features/editor/native-desktop-ship-synthesis";
import {
  currentTauriDesktopPackagingReadinessInput,
  getTauriDesktopPackagingReadinessReport,
} from "../src/features/editor/tauri-desktop-packaging-readiness";
import type { CommandPaletteCommand } from "../src/features/editor/components/command-palette";
import type { ProductionReadinessSynthesisPacket } from "../src/features/editor/production-readiness-synthesis";
import type {
  DesignActivityEvent,
  DesignAssetMetadata,
  DesignCommandTelemetryArea,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const generatedAt = "2026-05-19T18:00:00.000Z";
const commands = createCommands([
  ["align-left", "Align left", "Align selected layers"],
  ["group-selection", "Group selection", "Group selected layers"],
  ["export", "Export", "Open export settings"],
  ["delete-selection", "Delete selection", "Delete selected layers"],
]);
const blockedReport = getNativeDesktopShipSynthesisReport({
  commandAutomation: getCommandAutomationRecordingReport({
    commandPaletteCommands: commands,
    document: createCommandDocument([
      createEvent("event-align", {
        kind: "component",
        label: "Align left",
        targetId: "layer-risk",
        telemetry: telemetry("canvas", "align-left", 42, 80),
      }),
      createEvent("event-delete", {
        kind: "component",
        label: "Delete selection",
        targetId: "layer-risk",
        telemetry: telemetry("canvas", "delete-selection", 24, 80, "failed"),
      }),
      createEvent("event-plugin-gap", {
        kind: "extension",
        label: "Unknown command run",
        targetId: "layer-risk",
      }),
    ]),
    generatedAt,
  }),
  generatedAt,
  largeCanvasScheduler: getLargeCanvasRenderSchedulerReport({
    generatedAt,
    page: createDensePage(),
    selectedLayerIds: ["dense-0", "dense-1", "dense-2", "dense-3"],
    tileSize: 320,
  }),
  mediaAssetPipeline: getMediaAssetPipelineReviewReport({
    document: createMediaDocument([
      createImageLayer("hero-photo", "Hero photo", {
        imageAlt: "Campaign hero photo",
        imageSrc: createDataSource("image/png", 640_000),
        metadata: {
          sourceName: "hero.png",
          sourceUrl: "https://assets.example.com/originals/hero.png",
          license: "Commercial usage approved",
          hash: "asset_hero",
          mimeType: "image/png",
          importedAt: generatedAt,
        },
      }),
      createImageLayer("missing-provenance", "Missing provenance", {
        imageAlt: "",
        imageSrc: "https://cdn.example.com/unknown.bmp",
        metadata: {
          sourceName: "unknown.bmp",
          mimeType: "image/bmp",
        },
      }),
    ]),
    generatedAt,
  }),
  productionReadiness: productionPacket({
    blockerCount: 2,
    blockedCount: 2,
    score: 58,
    shipDecision: "do-not-ship",
    status: "blocked",
  }),
  tauriDesktopPackaging: getTauriDesktopPackagingReadinessReport({
    generatedAt,
    input: {
      ...currentTauriDesktopPackagingReadinessInput,
      capabilityPermissionIds: ["core:default", "fs:allow-home-recursive"],
      cargoCheckCommand: null,
      commandHandlerCount: 1,
      filesystemPermissionCount: 1,
      nextStaticExportConfigured: false,
      panicPathCount: 1,
      releasePacketEvidence: [],
      tauriConfigPresent: false,
      updaterSignatureConfigured: false,
    },
  }),
});
const readyReport = getNativeDesktopShipSynthesisReport({
  commandAutomation: getCommandAutomationRecordingReport({
    commandPaletteCommands: commands,
    document: createCommandDocument([
      createEvent("ready-align", {
        kind: "component",
        label: "Align left",
        targetId: "ready-layer",
        telemetry: telemetry("canvas", "align-left", 30, 80),
      }),
      createEvent("ready-group", {
        kind: "component",
        label: "Group selection",
        targetId: "ready-layer",
        telemetry: telemetry("canvas", "group-selection", 41, 80),
      }),
      createEvent("ready-export", {
        kind: "export",
        label: "Export",
        telemetry: telemetry("export", "export", 250, 900),
      }),
    ]),
    generatedAt,
  }),
  generatedAt,
  largeCanvasScheduler: getLargeCanvasRenderSchedulerReport({
    generatedAt,
    page: createReadyPage(),
    selectedLayerIds: ["ready-0"],
  }),
  mediaAssetPipeline: getMediaAssetPipelineReviewReport({
    document: createMediaDocument([
      createImageLayer("ready-photo", "Ready photo", {
        imageAlt: "Ready production photo",
        imageSrc: "https://cdn.example.com/photo.avif",
        metadata: {
          sourceName: "photo.avif",
          sourceUrl: "https://assets.example.com/photo.raw",
          license: "Commercial usage approved",
          hash: "asset_photo",
          mimeType: "image/avif",
          importedAt: generatedAt,
        },
      }),
    ]),
    generatedAt,
  }),
  productionReadiness: productionPacket({ score: 93, status: "ready" }),
  tauriDesktopPackaging: getTauriDesktopPackagingReadinessReport({
    generatedAt,
    input: {
      ...currentTauriDesktopPackagingReadinessInput,
      commandHandlerCount: 2,
      nextStaticExportConfigured: true,
      releasePacketEvidence: [
        "Export Tauri desktop readiness JSON.",
        "Export Tauri desktop readiness CSV.",
        "Export Tauri desktop readiness Markdown.",
        "Attach installer bundle artifact manifest.",
      ],
      updaterEndpointConfigured: true,
      updaterPluginPresent: true,
      updaterSignatureConfigured: true,
    },
  }),
});
const markdown = getNativeDesktopShipSynthesisMarkdown(blockedReport);
const csv = getNativeDesktopShipSynthesisCsv(blockedReport);
const json = JSON.parse(getNativeDesktopShipSynthesisJson(blockedReport)) as {
  releasePackets: unknown[];
  rows: unknown[];
  summary: {
    blockedCount: number;
    desktopShipDecision: string;
    releasePacketCount: number;
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

assert(blockedReport.status === "blocked", "Risky desktop evidence should block the release gate.");
assert(blockedReport.desktopShipDecision === "do-not-ship", "Blocked evidence should produce a do-not-ship decision.");
assert(blockedReport.rows.some((row) => row.category === "tauri-runtime"), "Rows should include Tauri runtime evidence.");
assert(blockedReport.rows.some((row) => row.category === "canvas-scheduler"), "Rows should include large-canvas scheduler evidence.");
assert(blockedReport.rows.some((row) => row.category === "media-pipeline"), "Rows should include media pipeline evidence.");
assert(blockedReport.rows.some((row) => row.category === "command-automation"), "Rows should include command automation evidence.");
assert(blockedReport.rows.some((row) => row.category === "production-evidence"), "Rows should include production evidence.");
assert(blockedReport.rows.some((row) => row.category === "ship-gate"), "Rows should include aggregate desktop ship gate evidence.");
assert(blockedReport.releasePacketCount >= 5, "Synthesis should retain release packets from every source system.");
assert(blockedReport.desktopParityEvidenceCount >= 3, "Synthesis should expose desktop parity evidence.");
assert(blockedReport.rollbackEvidenceCount >= 2, "Synthesis should expose rollback and no-ship evidence.");
assert(blockedReport.offlineEvidenceCount >= 1, "Synthesis should expose offline release evidence.");
assert(readyReport.status === "ready", "Ready desktop evidence should pass the release gate.");
assert(readyReport.desktopShipDecision === "ship", "Ready desktop evidence should produce a ship decision.");
assert(readyReport.score === 93, "Synthesis score should use the weakest source score.");
assert(readyReport.readyCount === readyReport.rows.length, "Ready report should mark all rows ready.");
assert(markdown.includes("Native Desktop Ship Synthesis"), "Markdown should include a clear title.");
assert(markdown.includes("Release Packets"), "Markdown should include release packet evidence.");
assert(csv.includes("tauri-runtime"), "CSV should include Tauri runtime rows.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve all rows.");
assert(json.releasePackets.length === blockedReport.releasePackets.length, "JSON should preserve release packets.");
assert(json.summary.status === blockedReport.status, "JSON summary should preserve status.");
assert(json.summary.desktopShipDecision === "do-not-ship", "JSON summary should preserve ship decision.");
assert(json.summary.releasePacketCount === blockedReport.releasePacketCount, "JSON summary should preserve packet count.");
assert(json.summary.blockedCount === blockedReport.blockedCount, "JSON summary should preserve blocked count.");
assert(
  /NativeDesktopShipSynthesisPanel/.test(extensionsSource) &&
    /getNativeDesktopShipSynthesisReport/.test(extensionsSource),
  "Extensions should wire the native desktop ship synthesis panel and report.",
);
assert(
  packageJson.scripts["editor:native-desktop-ship-synthesis-smoke"]?.includes(
    "native-desktop-ship-synthesis-smoke",
  ),
  "Targeted native desktop ship synthesis smoke command should be listed.",
);

console.log(
  `Native desktop ship synthesis smoke passed: ${blockedReport.desktopShipDecision}, ${blockedReport.releasePacketCount} release packets.`,
);

function createCommands(
  items: Array<[string, string, string, boolean?]>,
): CommandPaletteCommand[] {
  return items.map(([id, label, detail, disabled]) => ({
    id,
    label,
    detail,
    disabled,
    run: () => undefined,
  }));
}

function createCommandDocument(events: DesignActivityEvent[]): DesignDocument {
  return {
    version: 1,
    activePageId: "page-command",
    pages: [
      {
        id: "page-command",
        name: "Command automation",
        background: "#111827",
        layers: [],
      },
    ],
    variables: {},
    components: {},
    activityEvents: events,
    updatedAt: generatedAt,
  };
}

function createMediaDocument(layers: DesignLayer[]): DesignDocument {
  return {
    version: 1,
    activePageId: "page-media",
    pages: [
      {
        id: "page-media",
        name: "Media pipeline",
        background: "#111827",
        layers,
      },
    ],
    variables: {},
    components: {},
    updatedAt: generatedAt,
  };
}

function createEvent(
  id: string,
  input: Omit<DesignActivityEvent, "actorEmail" | "actorName" | "createdAt" | "detail" | "id"> &
    Partial<Pick<DesignActivityEvent, "detail">>,
): DesignActivityEvent {
  return {
    id,
    actorName: "Essence",
    actorEmail: "essencefromexistence@gmail.com",
    createdAt: generatedAt,
    detail: input.label,
    ...input,
  };
}

function createDensePage(): DesignPage {
  return {
    id: "page-dense",
    name: "Dense native canvas",
    background: "#0f172a",
    layers: Array.from({ length: 132 }, (_, index) =>
      createLayer(`dense-${index}`, index),
    ),
  };
}

function createReadyPage(): DesignPage {
  return {
    id: "page-ready",
    name: "Ready native canvas",
    background: "#0f172a",
    layers: [
      createLayer("ready-0", 0, { simple: true }),
      createLayer("ready-1", 1, { simple: true }),
      createLayer("ready-2", 2, { simple: true }),
    ],
  };
}

function createLayer(
  id: string,
  index: number,
  options: { simple?: boolean } = {},
): DesignLayer {
  const family = options.simple ? 4 : index % 5;
  const gridX = index % 12;
  const gridY = Math.floor(index / 12);
  const overlapOffset = options.simple ? index * 180 : (index % 4) * 18;

  return {
    id,
    type: family === 0 ? "path" : family === 1 ? "image" : "rectangle",
    name: `Native layer ${index + 1}`,
    x: options.simple ? 120 + index * 180 : 80 + gridX * 170 + overlapOffset,
    y: options.simple ? 160 : 80 + gridY * 130 + overlapOffset,
    width: options.simple ? 120 : family === 1 ? 520 : 460,
    height: options.simple ? 96 : family === 1 ? 360 : 300,
    rotation: 0,
    opacity: family === 4 ? 0.35 : 1,
    visible: true,
    locked: false,
    fill: family === 1 ? "transparent" : "#38bdf8",
    stroke: "#0f172a",
    strokeWidth: 1,
    cornerRadius: options.simple ? 8 : 18,
    imageSrc: family === 1 ? "data:image/png;base64,fixture" : undefined,
    imageFit: family === 1 ? "cover" : undefined,
    pathData: family === 0 ? createPathData(options.simple ? 3 : 52) : undefined,
    pathViewBox:
      family === 0
        ? {
            x: 0,
            y: 0,
            width: options.simple ? 120 : 460,
            height: options.simple ? 96 : 300,
          }
        : undefined,
  };
}

function createPathData(commands: number) {
  const parts = ["M 0 0"];
  for (let index = 0; index < commands; index += 1) {
    parts.push(`C ${index + 10} ${index + 18}, ${index + 24} ${index + 32}, ${index + 38} ${index + 40}`);
  }
  return parts.join(" ");
}

function createImageLayer(
  id: string,
  name: string,
  options: {
    imageSrc: string;
    imageAlt: string;
    metadata?: DesignAssetMetadata;
  },
): DesignLayer {
  return {
    id,
    type: "image",
    name,
    x: 120,
    y: 80,
    width: 420,
    height: 280,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    imageSrc: options.imageSrc,
    imageAlt: options.imageAlt,
    imageFit: "cover",
    assetMetadata: options.metadata,
  };
}

function createDataSource(mimeType: string, bytes: number) {
  return `data:${mimeType};base64,${"a".repeat(bytes)}`;
}

function telemetry(
  area: DesignCommandTelemetryArea,
  command: string,
  durationMs: number,
  thresholdMs: number,
  status: "failed" | "ok" = "ok",
) {
  return {
    area,
    command,
    durationMs,
    thresholdMs,
    status,
    itemCount: 1,
    detail: `${command} ${durationMs}ms`,
    capturedAt: generatedAt,
  };
}

function productionPacket(
  overrides: Partial<ProductionReadinessSynthesisPacket>,
): ProductionReadinessSynthesisPacket {
  return {
    generatedAt,
    status: "ready",
    shipDecision: "ship",
    score: 94,
    sectionCount: 5,
    readyCount: 5,
    reviewCount: 0,
    blockedCount: 0,
    blockerCount: 0,
    reviewItemCount: 0,
    evidenceCount: 8,
    minimumScoreArea: "admin-release",
    releaseEvidenceBundle: [
      "Export production readiness JSON.",
      "Export production readiness CSV.",
      "Export production readiness Markdown.",
      "Attach rollback anchor and deploy smoke evidence.",
    ],
    signoffChecklist: [
      "Confirm production readiness synthesis is attached.",
      "Confirm rollback anchor is named.",
    ],
    executiveSummary: [
      "Production readiness evidence is ready for desktop release review.",
    ],
    rows: [
      {
        id: "production-ready",
        area: "ship-gate",
        status: "ready",
        score: 94,
        label: "Production ship gate",
        detail: "Production evidence is ready.",
        blockerCount: 0,
        reviewCount: 0,
        evidenceCount: 8,
        recommendation: "Attach production readiness packet.",
      },
    ],
    ...overrides,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

import { readFileSync } from "node:fs";
import {
  getOfflineSaveQueueReport,
  type OfflineSaveMutation,
} from "../src/features/editor/offline-mutation-queue";
import {
  getWorkspaceRestoreDrillsCsv,
  getWorkspaceRestoreDrillsJson,
  getWorkspaceRestoreDrillsMarkdown,
  getWorkspaceRestoreDrillsReport,
} from "../src/features/editor/workspace-restore-drills";
import type {
  LocalDesignSnapshotMeta,
} from "../src/features/editor/offline-backups";
import type {
  DesignActivityEvent,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";
import type { DesignFileVersionSummary } from "../src/features/files/actions";

const generatedAt = "2026-05-19T19:00:00.000Z";
const fileId = "file-restore-drill";
const fileName = "Restore Drill Canvas";
const currentDocument = createDocument({
  layerCount: 8,
  updatedAt: generatedAt,
});
const staleSnapshotAt = "2026-04-10T09:00:00.000Z";
const freshSnapshotAt = "2026-05-19T18:45:00.000Z";
const blockedReport = getWorkspaceRestoreDrillsReport({
  fileId,
  fileName,
  generatedAt,
  localSnapshots: [
    snapshot("snap-stale", "Manual fallback before import", staleSnapshotAt),
  ],
  offlineQueue: getOfflineSaveQueueReport(fileId, currentDocument, [
    offlineMutation("queued-stale", {
      document: createDocument({ layerCount: 4, updatedAt: "2026-05-19T18:20:00.000Z" }),
      status: "queued",
    }),
    offlineMutation("failed-current", {
      document: currentDocument,
      lastError: "Network timeout while saving.",
      status: "failed",
    }),
  ]),
  versions: [
    version("version-risk", "Before destructive cleanup", createDocument({ layerCount: 2, updatedAt: "2026-05-19T16:00:00.000Z" })),
  ],
  workspaceDocument: {
    ...currentDocument,
    activePageId: "missing-page",
  },
});
const readyDocument = createDocument({
  layerCount: 4,
  updatedAt: generatedAt,
});
const readyReport = getWorkspaceRestoreDrillsReport({
  fileId,
  fileName,
  generatedAt,
  localSnapshots: [
    snapshot("snap-ready", "Autosave before desktop release", freshSnapshotAt),
  ],
  offlineQueue: getOfflineSaveQueueReport(fileId, readyDocument, [
    offlineMutation("synced-ready", {
      document: readyDocument,
      lastSyncedAt: generatedAt,
      status: "synced",
    }),
  ]),
  versions: [
    version("version-ready", "Desktop release checkpoint", readyDocument),
  ],
  workspaceDocument: readyDocument,
});
const markdown = getWorkspaceRestoreDrillsMarkdown(blockedReport);
const csv = getWorkspaceRestoreDrillsCsv(blockedReport);
const json = JSON.parse(getWorkspaceRestoreDrillsJson(blockedReport)) as {
  drillPackets: unknown[];
  rows: unknown[];
  summary: {
    autosaveSnapshotCount: number;
    conflictPreviewCount: number;
    corruptedArtifactCount: number;
    operatorEvidenceCount: number;
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

assert(blockedReport.status === "blocked", "Corrupt active page and stale restore evidence should block restore drills.");
assert(blockedReport.corruptedArtifactCount >= 1, "Report should detect corrupt workspace artifacts.");
assert(blockedReport.autosaveSnapshotCount === 1, "Report should count local autosave snapshots.");
assert(blockedReport.staleSnapshotCount === 1, "Report should count stale local snapshots.");
assert(blockedReport.retryableSaveCount === 2, "Report should count retryable offline saves.");
assert(blockedReport.conflictPreviewCount >= 1, "Report should produce conflict-safe restore preview evidence.");
assert(blockedReport.operatorEvidenceCount >= 4, "Report should retain operator export evidence.");
assert(blockedReport.drillPackets.length >= 4, "Report should produce restore drill packets.");
assert(blockedReport.rows.some((row) => row.category === "autosave-snapshot"), "Rows should include autosave snapshot evidence.");
assert(blockedReport.rows.some((row) => row.category === "corruption-check"), "Rows should include corruption checks.");
assert(blockedReport.rows.some((row) => row.category === "restore-preview"), "Rows should include restore preview evidence.");
assert(blockedReport.rows.some((row) => row.category === "offline-save-queue"), "Rows should include offline queue evidence.");
assert(blockedReport.rows.some((row) => row.category === "operator-evidence"), "Rows should include operator evidence.");
assert(readyReport.status === "ready", "Fresh snapshots, synced queue, and matching version should pass restore drills.");
assert(readyReport.score === 100, "Ready restore drill fixture should score 100.");
assert(readyReport.blockedCount === 0, "Ready restore drill fixture should have no blockers.");
assert(markdown.includes("Workspace Restore Drills"), "Markdown should include a clear title.");
assert(markdown.includes("Drill Packets"), "Markdown should include drill packets.");
assert(csv.includes("corruption-check"), "CSV should include corruption rows.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve all rows.");
assert(json.drillPackets.length === blockedReport.drillPackets.length, "JSON should preserve drill packets.");
assert(json.summary.status === blockedReport.status, "JSON summary should preserve status.");
assert(json.summary.corruptedArtifactCount === blockedReport.corruptedArtifactCount, "JSON should preserve corruption count.");
assert(json.summary.conflictPreviewCount === blockedReport.conflictPreviewCount, "JSON should preserve preview count.");
assert(json.summary.operatorEvidenceCount === blockedReport.operatorEvidenceCount, "JSON should preserve operator evidence count.");
assert(
  /WorkspaceRestoreDrillsPanel/.test(extensionsSource) &&
    /getWorkspaceRestoreDrillsReport/.test(extensionsSource),
  "Extensions should wire the workspace restore drills panel and report.",
);
assert(
  packageJson.scripts["editor:workspace-restore-drills-smoke"]?.includes(
    "workspace-restore-drills-smoke",
  ),
  "Targeted workspace restore drills smoke command should be listed.",
);

console.log(
  `Workspace restore drills smoke passed: ${blockedReport.status}, ${blockedReport.drillPackets.length} drill packets.`,
);

function snapshot(
  id: string,
  reason: string,
  savedAt: string,
): LocalDesignSnapshotMeta {
  return {
    id,
    fileId,
    fileName,
    reason,
    savedAt,
  };
}

function version(
  id: string,
  name: string,
  document: DesignDocument,
): DesignFileVersionSummary {
  return {
    id,
    name,
    document,
    createdAt: document.updatedAt,
  };
}

function offlineMutation(
  id: string,
  input: {
    document: DesignDocument;
    lastError?: string;
    lastSyncedAt?: string;
    status: OfflineSaveMutation["status"];
  },
): OfflineSaveMutation {
  return {
    id,
    fileId,
    fileName,
    operation: "save-design-file",
    status: input.status,
    attemptCount: input.status === "failed" ? 2 : 0,
    document: input.document,
    documentHash: `hash-${id}`,
    baseUpdatedAt: input.document.updatedAt,
    createdAt: input.document.updatedAt,
    updatedAt: generatedAt,
    lastError: input.lastError,
    lastSyncedAt: input.lastSyncedAt,
  };
}

function createDocument({
  layerCount,
  updatedAt,
}: {
  layerCount: number;
  updatedAt: string;
}): DesignDocument {
  const page: DesignPage = {
    id: "page-restore",
    name: "Restore drill",
    background: "#101820",
    layers: Array.from({ length: layerCount }, (_, index) =>
      createLayer(`layer-${index}`, index),
    ),
  };
  const events: DesignActivityEvent[] = [
    {
      id: "activity-autosave",
      actorName: "Essence",
      actorEmail: "essencefromexistence@gmail.com",
      kind: "version",
      label: "Captured autosave checkpoint",
      detail: "Autosave snapshot ready for restore drill.",
      createdAt: updatedAt,
    },
    {
      id: "activity-restore-drill",
      actorName: "Essence",
      actorEmail: "essencefromexistence@gmail.com",
      kind: "extension",
      label: "Ran restore drill",
      detail: "Operator verified local restore evidence.",
      createdAt: updatedAt,
    },
  ];

  return {
    version: 1,
    activePageId: page.id,
    pages: [page],
    variables: {},
    components: {},
    activityEvents: events,
    updatedAt,
  };
}

function createLayer(id: string, index: number): DesignLayer {
  return {
    id,
    type: "rectangle",
    name: `Restore layer ${index + 1}`,
    x: 80 + index * 12,
    y: 100 + index * 12,
    width: 180,
    height: 120,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#5eead4",
    stroke: "#0f172a",
    strokeWidth: 1,
    cornerRadius: 8,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

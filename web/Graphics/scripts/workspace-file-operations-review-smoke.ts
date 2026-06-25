import { readFileSync } from "node:fs";
import {
  getWorkspaceFileOperationsReviewCsv,
  getWorkspaceFileOperationsReviewJson,
  getWorkspaceFileOperationsReviewMarkdown,
  getWorkspaceFileOperationsReviewReport,
} from "../src/features/editor/workspace-file-operations-review";
import type {
  WorkspaceFileOperationsLocalArtifact,
} from "../src/features/editor/workspace-file-operations-review-types";
import type { DesignFileSummary } from "../src/features/files/actions";

const generatedAt = "2026-05-19T20:00:00.000Z";

const blockedFiles: DesignFileSummary[] = [
  file({
    id: "checkout-release",
    name: "Checkout release",
    accessRole: "owner",
    scope: "team",
    teamName: "Product",
    projectName: "Checkout",
    lastOpenedAt: "2026-05-19T19:30:00.000Z",
    openCommentCount: 5,
    readyForDevCount: 6,
    prototypeHotspotCount: 4,
  }),
  file({
    id: "growth-public-review",
    name: "Growth public review",
    accessRole: "editor",
    scope: "public",
    teamName: "Growth",
    projectName: "Experiments",
    lastOpenedAt: "2026-05-19T18:15:00.000Z",
    openCommentCount: 2,
    readyForDevCount: 1,
  }),
  file({
    id: "brand-view-only",
    name: "Brand view-only map",
    accessRole: "viewer",
    scope: "team",
    teamName: "Brand",
    projectName: "Campaign",
    lastOpenedAt: "2026-05-19T17:20:00.000Z",
    openCommentCount: 3,
  }),
  file({
    id: "missing-scope",
    name: "Untitled handoff",
    accessRole: "commenter",
    scope: "team",
    teamName: "",
    projectName: "",
    lastOpenedAt: "2026-05-19T16:20:00.000Z",
    readyForDevCount: 2,
  }),
];
const blockedReport = getWorkspaceFileOperationsReviewReport({
  files: blockedFiles,
  generatedAt,
  localArtifacts: [
    artifact({
      fileId: "checkout-release",
      fileName: "Checkout release",
      latestSnapshotAt: "2026-05-19T19:35:00.000Z",
      snapshotCount: 2,
    }),
    artifact({
      fileId: "growth-public-review",
      fileName: "Growth public review",
      failedSaveCount: 1,
      retryableSaveCount: 1,
    }),
  ],
});

const readyFiles: DesignFileSummary[] = [
  file({
    id: "desktop-release",
    name: "Desktop release",
    accessRole: "owner",
    scope: "team",
    teamName: "Product",
    projectName: "Desktop",
    lastOpenedAt: "2026-05-19T19:45:00.000Z",
    readyForDevCount: 6,
  }),
  file({
    id: "offline-kit",
    name: "Offline kit",
    accessRole: "owner",
    scope: "team",
    teamName: "Platform",
    projectName: "Offline",
    lastOpenedAt: "2026-05-19T18:50:00.000Z",
    prototypeHotspotCount: 3,
  }),
  file({
    id: "draft-safe",
    name: "Draft safe",
    accessRole: "owner",
    scope: "private",
    teamName: "Personal",
    projectName: "Drafts",
    lastOpenedAt: "2026-05-19T17:10:00.000Z",
  }),
];
const readyReport = getWorkspaceFileOperationsReviewReport({
  files: readyFiles,
  generatedAt,
  localArtifacts: readyFiles.map((item) =>
    artifact({
      fileId: item.id,
      fileName: item.name,
      backupSavedAt: "2026-05-19T19:55:00.000Z",
      latestSnapshotAt: "2026-05-19T19:50:00.000Z",
      snapshotCount: 2,
      syncedSaveCount: 1,
    }),
  ),
});

const markdown = getWorkspaceFileOperationsReviewMarkdown(blockedReport);
const csv = getWorkspaceFileOperationsReviewCsv(blockedReport);
const json = JSON.parse(getWorkspaceFileOperationsReviewJson(blockedReport)) as {
  operationPackets: unknown[];
  permissionDriftQueue: unknown[];
  rows: unknown[];
  summary: {
    offlineOpenReadyCount: number;
    permissionDriftCount: number;
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

assert(blockedReport.status === "blocked", "Permission drift and failed offline saves should block the review.");
assert(blockedReport.recentFileCount >= 3, "Recent files should be counted.");
assert(blockedReport.teamScopeCount >= 2, "Team scopes should be counted.");
assert(blockedReport.projectScopeCount >= 2, "Project scopes should be counted.");
assert(blockedReport.unscopedFileCount >= 1, "Missing team/project scope should be detected.");
assert(blockedReport.permissionDriftCount >= 2, "Permission drift should be queued.");
assert(blockedReport.offlineOpenReadyCount === 1, "Only files with local evidence and no failed saves should be offline-ready.");
assert(blockedReport.offlineOpenBlockedCount >= 1, "Files with failed saves should block offline-open readiness.");
assert(blockedReport.operatorEvidenceCount >= 4, "Operator evidence should include export and queue evidence.");
assert(blockedReport.operationPackets.length >= 5, "Operation packets should cover each review category.");
assert(blockedReport.rows.some((row) => row.category === "recent-files"), "Rows should include recent files.");
assert(blockedReport.rows.some((row) => row.category === "workspace-scope"), "Rows should include workspace scope.");
assert(blockedReport.rows.some((row) => row.category === "permission-drift"), "Rows should include permission drift.");
assert(blockedReport.rows.some((row) => row.category === "offline-open"), "Rows should include offline-open readiness.");
assert(blockedReport.rows.some((row) => row.category === "operator-evidence"), "Rows should include operator evidence.");
assert(readyReport.status === "ready", "Ready file operations fixture should pass.");
assert(readyReport.score === 100, "Ready file operations fixture should score 100.");
assert(readyReport.permissionDriftCount === 0, "Ready fixture should not have permission drift.");
assert(readyReport.offlineOpenBlockedCount === 0, "Ready fixture should not block offline-open.");
assert(markdown.includes("Workspace File Operations Review"), "Markdown should include a clear title.");
assert(markdown.includes("permission drift"), "Markdown should include permission drift.");
assert(markdown.includes("offline-open"), "Markdown should include offline-open readiness.");
assert(csv.includes("permission-drift"), "CSV should include permission drift rows.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve rows.");
assert(json.operationPackets.length === blockedReport.operationPackets.length, "JSON should preserve operation packets.");
assert(json.permissionDriftQueue.length === blockedReport.permissionDriftQueue.length, "JSON should preserve drift queue.");
assert(json.summary.status === blockedReport.status, "JSON summary should preserve status.");
assert(json.summary.permissionDriftCount === blockedReport.permissionDriftCount, "JSON should preserve drift count.");
assert(json.summary.offlineOpenReadyCount === blockedReport.offlineOpenReadyCount, "JSON should preserve offline-ready count.");
assert(
  /WorkspaceFileOperationsReviewPanel/.test(extensionsSource) &&
    /getWorkspaceFileOperationsReviewReport/.test(extensionsSource),
  "Extensions should wire the workspace file operations review panel and report.",
);
assert(
  packageJson.scripts["editor:workspace-file-operations-review-smoke"]?.includes(
    "workspace-file-operations-review-smoke",
  ),
  "Targeted workspace file operations review smoke command should be listed.",
);

console.log(
  `Workspace file operations review smoke passed: ${blockedReport.status}, ${blockedReport.permissionDriftCount} drift item(s).`,
);

function file(
  overrides: Partial<DesignFileSummary> & Pick<DesignFileSummary, "id" | "name">,
): DesignFileSummary {
  return {
    accessRole: "owner",
    commentCount: overrides.openCommentCount ?? 0,
    favorite: false,
    lastOpenedAt: null,
    layerCount: 18,
    openCommentCount: 0,
    pageCount: 2,
    projectName: "Drafts",
    prototypeHotspotCount: 0,
    readyForDevCount: 0,
    scope: "private",
    teamName: "Personal",
    thumbnailSvg: "",
    trashedAt: null,
    updatedAt: generatedAt,
    ...overrides,
  };
}

function artifact(
  overrides: Partial<WorkspaceFileOperationsLocalArtifact> &
    Pick<WorkspaceFileOperationsLocalArtifact, "fileId" | "fileName">,
): WorkspaceFileOperationsLocalArtifact {
  const { fileId, fileName, ...rest } = overrides;

  return {
    backupSavedAt: null,
    failedSaveCount: 0,
    fileId,
    fileName,
    latestSnapshotAt: null,
    queuedSaveCount: 0,
    retryableSaveCount: 0,
    snapshotCount: 0,
    syncedSaveCount: 0,
    ...rest,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

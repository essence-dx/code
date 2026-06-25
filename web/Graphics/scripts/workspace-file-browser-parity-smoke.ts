import { readFileSync } from "node:fs";
import {
  getWorkspaceFileBrowserParityCsv,
  getWorkspaceFileBrowserParityJson,
  getWorkspaceFileBrowserParityMarkdown,
  getWorkspaceFileBrowserParityReport,
} from "../src/features/editor/workspace-file-browser-parity";
import type { DesignFileSummary } from "../src/features/files/actions";

const now = "2026-05-18T19:00:00.000Z";

const files: DesignFileSummary[] = [
  file({
    id: "checkout-spec",
    name: "Checkout handoff spec",
    accessRole: "owner",
    scope: "team",
    teamName: "Product",
    projectName: "Checkout",
    lastOpenedAt: "2026-05-18T18:50:00.000Z",
    openCommentCount: 2,
    readyForDevCount: 5,
    prototypeHotspotCount: 3,
  }),
  file({
    id: "pricing-review",
    name: "Pricing review",
    accessRole: "commenter",
    scope: "team",
    teamName: "Product",
    projectName: "Growth",
    lastOpenedAt: "2026-05-18T18:30:00.000Z",
    openCommentCount: 6,
    readyForDevCount: 1,
  }),
  file({
    id: "site-import",
    name: "Marketing site import",
    accessRole: "editor",
    scope: "public",
    teamName: "Brand",
    projectName: "Sites",
    lastOpenedAt: "2026-05-18T17:30:00.000Z",
    prototypeHotspotCount: 4,
  }),
  file({
    id: "mobile-draft",
    name: "Mobile dashboard draft",
    accessRole: "owner",
    scope: "private",
    teamName: "Personal",
    projectName: "Drafts",
    lastOpenedAt: "2026-05-18T16:10:00.000Z",
    favorite: true,
  }),
  file({
    id: "research-view",
    name: "Research read-only map",
    accessRole: "viewer",
    scope: "team",
    teamName: "Research",
    projectName: "Insights",
    lastOpenedAt: "2026-05-18T15:45:00.000Z",
    openCommentCount: 1,
  }),
  file({
    id: "old-trash",
    name: "Archived exploration",
    accessRole: "owner",
    scope: "private",
    teamName: "Personal",
    projectName: "Archive",
    trashedAt: "2026-05-17T12:00:00.000Z",
  }),
];

const report = getWorkspaceFileBrowserParityReport({
  files,
  generatedAt: now,
  handoffCapabilities: {
    accessDialogEnabled: true,
    creationEnabled: true,
    importHandoffEnabled: true,
    inventoryExportEnabled: true,
    organizationDialogEnabled: true,
  },
});

assert(report.status === "ready", "Workspace file browser parity fixture should be ready.");
assert(report.score >= 95, "Ready workspace file browser parity should keep a high score.");
assert(report.teamScopeCount >= 2, "Team scopes should be counted.");
assert(report.projectScopeCount >= 3, "Project scopes should be counted.");
assert(report.draftQueueCount >= 1, "Draft queues should be counted.");
assert(report.permissionAwareRecentCount >= 2, "Permission-aware recents should be counted.");
assert(report.ownerTransferQueueCount >= 1, "Owner transfer queues should be counted.");
assert(report.creationImportHandoffCount >= 2, "Creation/import handoff should be counted.");
assert(report.rows.some((row) => row.category === "workspace-scope"), "Rows should include workspace scope.");
assert(report.rows.some((row) => row.category === "permission-recent"), "Rows should include permission-aware recents.");
assert(report.rows.some((row) => row.category === "owner-transfer"), "Rows should include owner transfer queues.");
assert(report.rows.some((row) => row.category === "creation-import-handoff"), "Rows should include creation/import handoff.");

const markdown = getWorkspaceFileBrowserParityMarkdown(report);
const csv = getWorkspaceFileBrowserParityCsv(report);
const json = JSON.parse(getWorkspaceFileBrowserParityJson(report)) as {
  ownerTransferQueue: unknown[];
  rows: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Workspace File Browser Parity"), "Markdown should include a clear title.");
assert(markdown.includes("teams, projects, drafts"), "Markdown should mention teams, projects, drafts.");
assert(markdown.includes("permission-aware recents"), "Markdown should mention permission-aware recents.");
assert(markdown.includes("owner transfer queues"), "Markdown should mention owner transfer queues.");
assert(markdown.includes("creation/import handoff"), "Markdown should mention creation/import handoff.");
assert(csv.includes("owner-transfer"), "CSV should include owner transfer rows.");
assert(json.rows.length === report.rows.length, "JSON should preserve review rows.");
assert(
  json.ownerTransferQueue.length === report.ownerTransferQueue.length,
  "JSON should preserve owner transfer queue rows.",
);
assert(
  packageJson.scripts["editor:workspace-file-browser-parity-smoke"]?.includes(
    "workspace-file-browser-parity-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Workspace file browser parity smoke passed: ${report.score} score, ${report.ownerTransferQueueCount} owner transfer queue item(s).`,
);

function file(
  overrides: Partial<DesignFileSummary> & Pick<DesignFileSummary, "id" | "name">,
): DesignFileSummary {
  return {
    accessRole: "owner",
    commentCount: overrides.openCommentCount ?? 0,
    favorite: false,
    lastOpenedAt: null,
    layerCount: 12,
    openCommentCount: 0,
    pageCount: 2,
    projectName: "Drafts",
    prototypeHotspotCount: 0,
    readyForDevCount: 0,
    scope: "private",
    teamName: "Personal",
    thumbnailSvg: "",
    trashedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

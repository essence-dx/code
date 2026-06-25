import { readFileSync } from "node:fs";
import {
  createPluginApprovalRecord,
  createPluginRunHistoryEntry,
  getPluginGrantsForApproval,
  type EditorPluginManifest,
} from "../src/features/editor/editor-plugin-api";
import {
  getNativePluginSandboxOperationsCsv,
  getNativePluginSandboxOperationsJson,
  getNativePluginSandboxOperationsMarkdown,
  getNativePluginSandboxOperationsReport,
} from "../src/features/editor/native-plugin-sandbox-operations";

const generatedAt = "2026-05-19T21:00:00.000Z";
const actorEmail = "essencefromexistence@gmail.com";

const blockedManifests: EditorPluginManifest[] = [
  {
    id: "unsafe-exporter",
    name: "Unsafe exporter",
    version: "2.0.0",
    description: "Exports local frames through a widget command.",
    permissions: ["inspect-document", "write-layer-state"],
    runtimeKind: "hybrid",
    entryPoint: "https://cdn.example.com/unsafe-exporter.js",
    sandbox: {
      isolated: false,
      memoryLimitMb: 512,
      networkAccess: "workspace",
      timeoutMs: 9000,
    },
    catalog: {
      category: "Export",
      commandIds: ["export.unsafe"],
      publishable: true,
      surface: "command-widget",
      widgetEntry: "widgets/unsafe-exporter.tsx",
    },
  },
  {
    id: "offline-review",
    name: "Offline review",
    version: "1.0.0",
    description: "Reviews layers offline.",
    permissions: ["inspect-document"],
    runtimeKind: "plugin",
    entryPoint: "plugins/offline-review/command.ts",
    sandbox: {
      isolated: true,
      memoryLimitMb: 64,
      networkAccess: "none",
      timeoutMs: 1400,
    },
    catalog: {
      category: "Review",
      commandIds: ["review.offline"],
      publishable: true,
      surface: "command",
    },
  },
];
const blockedApprovals = {
  "unsafe-exporter": createPluginApprovalRecord({
    actorEmail,
    approvedAt: generatedAt,
    id: "approval-unsafe-old",
    manifest: { ...blockedManifests[0], version: "1.9.0" },
  }),
};
const blockedReport = getNativePluginSandboxOperationsReport({
  approvals: blockedApprovals,
  generatedAt,
  grants: {
    "unsafe-exporter:inspect-document": true,
    "unsafe-exporter:write-layer-state": true,
  },
  manifests: blockedManifests,
  runHistory: [
    createPluginRunHistoryEntry({
      action: "run",
      actorEmail,
      createdAt: generatedAt,
      detail: "Sandbox crash: worker timeout while exporting widget frame.",
      id: "run-crash-unsafe",
      manifest: blockedManifests[0],
      pinnedManifestVersion: "1.9.0",
      status: "blocked",
    }),
    createPluginRunHistoryEntry({
      action: "replay",
      actorEmail,
      createdAt: generatedAt,
      detail: "Blocked replay because pinned approval is stale.",
      id: "run-replay-stale",
      manifest: blockedManifests[0],
      pinnedManifestVersion: "1.9.0",
      status: "version-mismatch",
    }),
  ],
});

const readyManifests: EditorPluginManifest[] = [
  {
    id: "accessibility-auditor",
    name: "Accessibility auditor",
    version: "1.0.0",
    description: "Reviews visible page layers and selects layers with issues.",
    permissions: ["inspect-document", "select-layers"],
    runtimeKind: "hybrid",
    entryPoint: "plugins/accessibility-auditor/command.ts",
    sandbox: {
      isolated: true,
      memoryLimitMb: 64,
      networkAccess: "none",
      timeoutMs: 1500,
    },
    catalog: {
      category: "Review",
      commandIds: ["review.accessibility-audit"],
      publishable: true,
      surface: "command-widget",
      widgetEntry: "widgets/accessibility-review-card.tsx",
    },
  },
  {
    id: "ready-marker",
    name: "Ready marker",
    version: "1.0.0",
    description: "Marks selected layers as ready.",
    permissions: ["write-layer-state"],
    runtimeKind: "plugin",
    entryPoint: "plugins/ready-marker/command.ts",
    sandbox: {
      isolated: true,
      memoryLimitMb: 48,
      networkAccess: "none",
      timeoutMs: 1200,
    },
    catalog: {
      category: "Dev Mode",
      commandIds: ["dev-mode.ready-marker"],
      publishable: true,
      surface: "command",
    },
  },
];
const readyApprovals = Object.fromEntries(
  readyManifests.map((manifest, index) => [
    manifest.id,
    createPluginApprovalRecord({
      actorEmail,
      approvedAt: generatedAt,
      id: `approval-ready-${index + 1}`,
      manifest,
    }),
  ]),
);
const readyGrants = Object.values(readyApprovals).reduce<Record<string, boolean>>(
  (next, approval) => ({ ...next, ...getPluginGrantsForApproval(approval) }),
  {},
);
const readyReport = getNativePluginSandboxOperationsReport({
  approvals: readyApprovals,
  generatedAt,
  grants: readyGrants,
  manifests: readyManifests,
  runHistory: readyManifests.flatMap((manifest, index) => [
    createPluginRunHistoryEntry({
      action: "approve",
      actorEmail,
      createdAt: generatedAt,
      detail: `Approved ${manifest.name} for desktop sandbox smoke.`,
      id: `approve-ready-${index + 1}`,
      manifest,
      pinnedManifestVersion: manifest.version,
      status: "completed",
    }),
    createPluginRunHistoryEntry({
      action: "replay",
      actorEmail,
      createdAt: generatedAt,
      detail: `Replayed pinned approval for ${manifest.name}.`,
      id: `replay-ready-${index + 1}`,
      manifest,
      pinnedManifestVersion: manifest.version,
      status: "completed",
    }),
    createPluginRunHistoryEntry({
      action: "run",
      actorEmail,
      createdAt: generatedAt,
      detail: `Executed ${manifest.name} offline in isolated sandbox.`,
      id: `run-ready-${index + 1}`,
      manifest,
      pinnedManifestVersion: manifest.version,
      status: "completed",
    }),
  ]),
});

const markdown = getNativePluginSandboxOperationsMarkdown(blockedReport);
const csv = getNativePluginSandboxOperationsCsv(blockedReport);
const json = JSON.parse(getNativePluginSandboxOperationsJson(blockedReport)) as {
  crashIsolation: unknown[];
  operationPackets: unknown[];
  permissionPrompts: unknown[];
  rows: unknown[];
  summary: {
    offlinePolicyBlockedCount: number;
    permissionPromptBlockedCount: number;
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

assert(blockedReport.status === "blocked", "Unsafe sandbox policy and stale prompts should block native sandbox operations.");
assert(blockedReport.permissionPromptCount === 2, "Every manifest should have a permission prompt review.");
assert(blockedReport.permissionPromptBlockedCount >= 1, "Stale or missing prompt approvals should be blocked.");
assert(blockedReport.offlinePolicyBlockedCount >= 1, "Networked or remote entry policies should block offline execution.");
assert(blockedReport.crashIsolationBlockedCount >= 1, "Crash-like run history and weak isolation should block crash isolation.");
assert(blockedReport.replayEvidenceBlockedCount >= 1, "Stale replay evidence should block release.");
assert(blockedReport.operationPackets.length >= 5, "Operation packets should cover every native sandbox category.");
assert(blockedReport.operatorEvidenceCount >= 5, "Operator evidence should include export and sandbox evidence.");
assert(blockedReport.rows.some((row) => row.category === "permission-prompts"), "Rows should include permission prompts.");
assert(blockedReport.rows.some((row) => row.category === "offline-execution"), "Rows should include offline execution policy.");
assert(blockedReport.rows.some((row) => row.category === "crash-isolation"), "Rows should include crash isolation.");
assert(blockedReport.rows.some((row) => row.category === "replay-evidence"), "Rows should include replay evidence.");
assert(blockedReport.rows.some((row) => row.category === "operator-evidence"), "Rows should include operator evidence.");
assert(readyReport.status === "ready", "Ready native sandbox fixture should pass.");
assert(readyReport.score === 100, "Ready native sandbox fixture should score 100.");
assert(readyReport.permissionPromptBlockedCount === 0, "Ready fixture should have no blocked permission prompts.");
assert(readyReport.offlinePolicyBlockedCount === 0, "Ready fixture should have no offline policy blockers.");
assert(readyReport.crashIsolationBlockedCount === 0, "Ready fixture should have no crash isolation blockers.");
assert(readyReport.replayEvidenceBlockedCount === 0, "Ready fixture should have no replay evidence blockers.");
assert(markdown.includes("Native Plugin Sandbox Operations"), "Markdown should include a clear title.");
assert(markdown.includes("permission prompts"), "Markdown should include permission prompts.");
assert(markdown.includes("offline execution"), "Markdown should include offline execution.");
assert(markdown.includes("crash isolation"), "Markdown should include crash isolation.");
assert(markdown.includes("replay evidence"), "Markdown should include replay evidence.");
assert(csv.includes("offline-execution"), "CSV should include offline execution rows.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve rows.");
assert(json.operationPackets.length === blockedReport.operationPackets.length, "JSON should preserve packets.");
assert(json.permissionPrompts.length === blockedReport.permissionPrompts.length, "JSON should preserve prompt reviews.");
assert(json.crashIsolation.length === blockedReport.crashIsolation.length, "JSON should preserve crash isolation rows.");
assert(json.summary.status === blockedReport.status, "JSON summary should preserve status.");
assert(json.summary.permissionPromptBlockedCount === blockedReport.permissionPromptBlockedCount, "JSON should preserve prompt blocker count.");
assert(json.summary.offlinePolicyBlockedCount === blockedReport.offlinePolicyBlockedCount, "JSON should preserve offline policy blocker count.");
assert(
  /NativePluginSandboxOperationsPanel/.test(extensionsSource) &&
    /getNativePluginSandboxOperationsReport/.test(extensionsSource),
  "Extensions should wire the native plugin sandbox operations panel and report.",
);
assert(
  packageJson.scripts["editor:native-plugin-sandbox-operations-smoke"]?.includes(
    "native-plugin-sandbox-operations-smoke",
  ),
  "Targeted native plugin sandbox operations smoke command should be listed.",
);

console.log(
  `Native plugin sandbox operations smoke passed: ${blockedReport.status}, ${blockedReport.operationPackets.length} packets.`,
);

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

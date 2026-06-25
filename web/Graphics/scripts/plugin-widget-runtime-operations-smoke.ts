import { readFileSync } from "node:fs";
import {
  createPluginApprovalRecord,
  createPluginRunHistoryEntry,
  getPluginGrantsForApproval,
  type EditorPluginManifest,
} from "../src/features/editor/editor-plugin-api";
import {
  getPluginWidgetRuntimeOperationsCsv,
  getPluginWidgetRuntimeOperationsJson,
  getPluginWidgetRuntimeOperationsMarkdown,
  getPluginWidgetRuntimeOperationsReport,
} from "../src/features/editor/plugin-widget-runtime-operations";

const now = "2026-05-18T12:00:00.000Z";

const manifests: EditorPluginManifest[] = [
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
      networkAccess: "none",
      timeoutMs: 1500,
      memoryLimitMb: 64,
    },
    catalog: {
      category: "Review",
      surface: "command-widget",
      publishable: true,
      commandIds: ["review.accessibility-audit"],
      widgetEntry: "widgets/accessibility-review-card.tsx",
      reviewNotes: ["Ships with read-only document inspection and selection handoff."],
    },
  },
  {
    id: "ready-for-dev-marker",
    name: "Ready marker",
    version: "1.0.0",
    description: "Marks selected layers as ready for Dev Mode handoff.",
    permissions: ["write-layer-state"],
    runtimeKind: "plugin",
    entryPoint: "plugins/ready-for-dev-marker/command.ts",
    sandbox: {
      isolated: true,
      networkAccess: "none",
      timeoutMs: 1200,
      memoryLimitMb: 48,
    },
    catalog: {
      category: "Dev Mode",
      surface: "command",
      publishable: true,
      commandIds: ["dev-mode.ready-marker"],
      reviewNotes: ["Write permission is scoped to selected layer state."],
    },
  },
];

const approvals = Object.fromEntries(
  manifests.map((manifest, index) => [
    manifest.id,
    createPluginApprovalRecord({
      actorEmail: "operator@example.com",
      approvedAt: now,
      id: `approval-${index + 1}`,
      manifest,
    }),
  ]),
);
const grants = Object.values(approvals).reduce<Record<string, boolean>>(
  (next, approval) => ({
    ...next,
    ...getPluginGrantsForApproval(approval),
  }),
  {},
);
const runHistory = manifests.flatMap((manifest, index) => [
  createPluginRunHistoryEntry({
    action: "approve",
    actorEmail: "operator@example.com",
    createdAt: now,
    detail: `Approved ${manifest.name} for runtime smoke.`,
    id: `approval-run-${index + 1}`,
    manifest,
    pinnedManifestVersion: manifest.version,
    status: "completed",
  }),
  createPluginRunHistoryEntry({
    action: "run",
    actorEmail: "operator@example.com",
    createdAt: now,
    detail: `Executed ${manifest.name} in isolated sandbox.`,
    id: `execution-run-${index + 1}`,
    manifest,
    pinnedManifestVersion: manifest.version,
    status: "completed",
  }),
]);

const report = getPluginWidgetRuntimeOperationsReport({
  approvals,
  generatedAt: now,
  grants,
  manifests,
  runHistory,
});

assert(report.status === "ready", "Fully approved runtime operations should be ready.");
assert(report.score >= 95, "Ready runtime operations should keep a high score.");
assert(report.sandboxHealthyCount === 2, "Both manifests should have healthy sandbox policies.");
assert(report.executionLogCount === 4, "Approval and run entries should become execution logs.");
assert(report.blockedExecutionCount === 0, "No execution logs should be blocked.");
assert(report.permissionReviewCount === 2, "Each manifest should have a permission review.");
assert(report.catalogPublishableCount === 2, "Both manifests should be catalog publishable.");
assert(report.widgetRuntimeCount === 1, "Hybrid command-widget manifest should count as widget-capable.");
assert(report.catalogPublishingHandoff.status === "ready", "Catalog publishing handoff should be ready.");
assert(
  report.catalogPublishingHandoff.entries.some(
    (entry) => entry.surface === "command-widget",
  ),
  "Widget-capable catalog surfaces should be preserved.",
);
assert(
  report.rows.some((row) => row.category === "sandbox-health" && row.status === "ready"),
  "Sandbox health rows should be ready.",
);
assert(
  report.rows.some((row) => row.category === "execution-logs" && row.status === "ready"),
  "Execution log rows should be ready.",
);
assert(
  report.rows.some((row) => row.category === "permission-review" && row.status === "ready"),
  "Permission review rows should be ready.",
);
assert(
  report.rows.some((row) => row.category === "catalog-publishing" && row.status === "ready"),
  "Catalog publishing rows should be ready.",
);

const markdown = getPluginWidgetRuntimeOperationsMarkdown(report);
const csv = getPluginWidgetRuntimeOperationsCsv(report);
const json = JSON.parse(getPluginWidgetRuntimeOperationsJson(report)) as {
  catalogPublishingHandoff: { entries: unknown[] };
  executionLogs: unknown[];
  permissionReviews: unknown[];
  sandboxHealth: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Plugin Widget Runtime Operations"), "Markdown should include a clear title.");
assert(markdown.includes("sandbox health"), "Markdown should include sandbox health evidence.");
assert(markdown.includes("execution logs"), "Markdown should include execution logs.");
assert(markdown.includes("permission reviews"), "Markdown should include permission reviews.");
assert(markdown.includes("catalog publishing handoff"), "Markdown should include catalog handoff.");
assert(csv.includes("catalog-publishing"), "CSV should include catalog publishing rows.");
assert(json.sandboxHealth.length === 2, "JSON should preserve sandbox health rows.");
assert(json.executionLogs.length === 4, "JSON should preserve execution logs.");
assert(json.permissionReviews.length === 2, "JSON should preserve permission reviews.");
assert(json.catalogPublishingHandoff.entries.length === 2, "JSON should preserve catalog entries.");
assert(
  packageJson.scripts["editor:plugin-widget-runtime-operations-smoke"]?.includes(
    "plugin-widget-runtime-operations-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Plugin/widget runtime operations smoke passed: ${report.sandboxHealthyCount} sandbox policies, ${report.executionLogCount} logs, score ${report.score}.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

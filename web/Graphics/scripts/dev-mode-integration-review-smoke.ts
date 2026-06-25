import { readFileSync } from "node:fs";
import {
  getDevModeIntegrationReviewCsv,
  getDevModeIntegrationReviewJson,
  getDevModeIntegrationReviewMarkdown,
  getDevModeIntegrationReviewReport,
} from "../src/features/editor/dev-mode-integration-review";
import type {
  DesignActivityEvent,
  DesignDevLink,
  DesignDocument,
  DesignLayer,
} from "../src/features/editor/types";

const generatedAt = "2026-05-19T11:00:00.000Z";
const readyDocument = createDocument({
  activityEvents: [
    activity("dev-export", "Exported Dev Mode handoff bundle", "2026-05-19T10:10:00.000Z"),
  ],
  layers: [
    layer("hero-card", "Hero Card", {
      codeConnect: true,
      devLinks: [
        link("storybook", "https://storybook.example.com/?path=/story/hero-card"),
        link("github", "https://github.com/essence/figma/blob/main/HeroCard.tsx"),
        link("jira", "https://essence.atlassian.net/browse/FIG-42"),
      ],
      readyForDev: true,
      variableBindings: {
        fill: "brand",
        cornerRadius: "radius",
      },
    }),
  ],
  updatedAt: "2026-05-19T10:00:00.000Z",
});
const blockedDocument = createDocument({
  activityEvents: [],
  layers: [
    layer("checkout-card", "Checkout Card", {
      codeConnect: false,
      devLinks: [
        link("github", "not-a-url"),
      ],
      readyForDev: true,
      variableBindings: {},
    }),
  ],
  updatedAt: "2026-05-19T10:30:00.000Z",
});

const readyReport = getDevModeIntegrationReviewReport({
  document: readyDocument,
  generatedAt,
});
const blockedReport = getDevModeIntegrationReviewReport({
  document: blockedDocument,
  generatedAt,
});
const markdown = getDevModeIntegrationReviewMarkdown(readyReport);
const csv = getDevModeIntegrationReviewCsv(readyReport);
const json = JSON.parse(getDevModeIntegrationReviewJson(readyReport)) as {
  rows: unknown[];
  summary: {
    codegenFreshnessStatus: string;
    variableHandoffCoveragePercent: number;
    linkHealthStatus: string;
    exportBundleReadyCount: number;
    exportBundleEvidenceCount: number;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(readyReport.status === "ready", "Fresh Dev Mode integration fixture should be ready.");
assert(readyReport.codegenFreshnessStatus === "ready", "Latest Dev Mode export should be fresh.");
assert(readyReport.variableHandoffCoveragePercent === 100, "Ready layer should have full variable handoff coverage.");
assert(readyReport.linkHealthStatus === "ready", "Storybook/GitHub/Jira links should be healthy.");
assert(readyReport.storybookLinkCount === 1, "Storybook link should be counted.");
assert(readyReport.githubLinkCount === 1, "GitHub link should be counted.");
assert(readyReport.jiraLinkCount === 1, "Jira link should be counted.");
assert(readyReport.exportBundleReadyCount === 1, "Ready layer should have an export bundle.");
assert(readyReport.exportBundleEvidenceCount >= 4, "Export bundle evidence should be listed.");
assert(
  readyReport.rows.some((row) => row.category === "codegen-freshness"),
  "Rows should include codegen freshness.",
);
assert(
  readyReport.rows.some((row) => row.category === "variable-handoff"),
  "Rows should include variable handoff coverage.",
);
assert(
  readyReport.rows.some((row) => row.category === "link-health"),
  "Rows should include integration link health.",
);
assert(
  readyReport.rows.some((row) => row.category === "export-bundle"),
  "Rows should include export bundle readiness.",
);
assert(blockedReport.status === "blocked", "Missing exports, tokens, links, and bundles should block integration handoff.");
assert(blockedReport.codegenFreshnessStatus === "blocked", "Missing Dev Mode export should block codegen freshness.");
assert(blockedReport.invalidLinkCount === 1, "Invalid GitHub link should be counted.");
assert(blockedReport.variableHandoffCoveragePercent === 0, "Missing tokens should produce zero variable coverage.");
assert(markdown.includes("Dev Mode Integration Review"), "Markdown should include a clear title.");
assert(markdown.includes("Storybook"), "Markdown should mention Storybook link health.");
assert(csv.includes("link-health"), "CSV should include link health rows.");
assert(json.rows.length === readyReport.rows.length, "JSON should preserve all rows.");
assert(json.summary.codegenFreshnessStatus === "ready", "JSON summary should include codegen freshness.");
assert(json.summary.variableHandoffCoveragePercent === 100, "JSON summary should include variable coverage.");
assert(json.summary.linkHealthStatus === "ready", "JSON summary should include link health.");
assert(json.summary.exportBundleReadyCount === 1, "JSON summary should include export bundles.");
assert(json.summary.exportBundleEvidenceCount === readyReport.exportBundleEvidenceCount, "JSON summary should include export evidence.");
assert(
  /DevModeIntegrationReviewPanel/.test(extensionsSource) &&
    /getDevModeIntegrationReviewReport/.test(extensionsSource),
  "Extensions should wire the Dev Mode integration panel and report.",
);
assert(
  packageJson.scripts["editor:dev-mode-integration-review-smoke"]?.includes(
    "dev-mode-integration-review-smoke",
  ),
  "Targeted Dev Mode integration smoke command should be listed.",
);

console.log(
  `Dev Mode integration review smoke passed: ${readyReport.score} score, ${readyReport.exportBundleReadyCount} bundle(s).`,
);

function createDocument({
  activityEvents,
  layers,
  updatedAt,
}: {
  activityEvents: DesignActivityEvent[];
  layers: DesignLayer[];
  updatedAt: string;
}): DesignDocument {
  return {
    version: 1,
    activePageId: "page-dev",
    pages: [
      {
        id: "page-dev",
        name: "Dev handoff",
        background: "#0f172a",
        comments: [],
        layers,
      },
    ],
    variables: {
      brand: "#14b8a6",
      radius: "12",
    },
    components: {},
    activityEvents,
    updatedAt,
  };
}

function layer(
  id: string,
  name: string,
  options: {
    codeConnect: boolean;
    devLinks: DesignDevLink[];
    readyForDev: boolean;
    variableBindings: NonNullable<DesignLayer["variableBindings"]>;
  },
): DesignLayer {
  return {
    id,
    type: "rectangle",
    name,
    x: 64,
    y: 72,
    width: 360,
    height: 180,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    readyForDev: options.readyForDev,
    variableBindings: options.variableBindings,
    devLinks: options.devLinks,
    codeConnect: options.codeConnect
      ? {
          componentName: "HeroCard",
          importPath: "@/components/hero-card",
          props: "{\"variant\":\"primary\"}",
        }
      : undefined,
    fill: "#14b8a6",
    stroke: "#0f766e",
    strokeWidth: 1,
    cornerRadius: 12,
  };
}

function link(kind: DesignDevLink["kind"], url: string): DesignDevLink {
  return {
    kind,
    url,
  };
}

function activity(
  id: string,
  label: string,
  createdAt: string,
): DesignActivityEvent {
  return {
    id,
    kind: "export",
    actorName: "Ari Reviewer",
    actorEmail: "ari@example.com",
    label,
    detail: "Dev Mode integration export bundle created.",
    createdAt,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

import { readFileSync } from "node:fs";
import { getComponentUsageAnalytics } from "../src/features/editor/component-analytics";
import { getLocalLibraryStatus } from "../src/features/editor/component-library-manifest";
import {
  getDesignSystemLibraryPublicationDepthCsv,
  getDesignSystemLibraryPublicationDepthJson,
  getDesignSystemLibraryPublicationDepthMarkdown,
  getDesignSystemLibraryPublicationDepthReport,
} from "../src/features/editor/design-system-library-publication-depth";
import type {
  DesignComponent,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T18:00:00.000Z";

const buttonLayer = layer({
  id: "button-bg",
  name: "Button background",
  fill: "#2563eb",
  stroke: "#1d4ed8",
  width: 160,
  height: 44,
});
const buttonLabelLayer = layer({
  id: "button-label",
  name: "Button label",
  fill: "transparent",
  stroke: "transparent",
  text: "Continue",
  width: 120,
  height: 24,
  x: 20,
  y: 10,
});
const cardLayer = layer({
  id: "card-bg",
  name: "Card background",
  fill: "#ffffff",
  stroke: "#e5e7eb",
  width: 260,
  height: 160,
});

const buttonComponent: DesignComponent = {
  id: "component-button",
  name: "Button / Primary",
  width: 160,
  height: 44,
  layers: [buttonLayer, buttonLabelLayer],
  propertyDefinitions: {
    label: {
      id: "label",
      name: "Label",
      type: "text",
      defaultValue: "Continue",
      createdAt: now,
      updatedAt: now,
    },
    tone: {
      id: "tone",
      name: "Tone",
      type: "variant",
      defaultValue: "Primary",
      options: ["Primary", "Secondary"],
      createdAt: now,
      updatedAt: now,
    },
  },
  variants: [
    {
      id: "button-secondary",
      name: "Secondary",
      properties: { tone: "Secondary" },
      width: 160,
      height: 44,
      layers: [
        layer({
          id: "button-secondary-bg",
          name: "Secondary background",
          fill: "#e0f2fe",
          stroke: "#38bdf8",
          width: 160,
          height: 44,
        }),
      ],
      createdAt: now,
      updatedAt: now,
    },
  ],
  createdAt: now,
  updatedAt: now,
};

const cardComponent: DesignComponent = {
  id: "component-card",
  name: "Card / Marketing",
  width: 260,
  height: 160,
  layers: [cardLayer],
  propertyDefinitions: {
    featured: {
      id: "featured",
      name: "Featured",
      type: "boolean",
      defaultValue: "false",
      createdAt: now,
      updatedAt: now,
    },
  },
  variants: [
    {
      id: "card-featured",
      name: "Featured",
      properties: { featured: "true" },
      width: 260,
      height: 160,
      layers: [
        layer({
          id: "card-featured-bg",
          name: "Featured background",
          fill: "#fef3c7",
          stroke: "#f59e0b",
          width: 260,
          height: 160,
        }),
      ],
      createdAt: now,
      updatedAt: now,
    },
  ],
  createdAt: now,
  updatedAt: now,
};

const page: DesignPage = {
  id: "page-library-depth",
  name: "Library depth",
  background: "#f8fafc",
  layers: [
    {
      ...buttonLayer,
      id: "button-instance",
      name: "Button instance",
      x: 48,
      y: 48,
      componentId: buttonComponent.id,
      componentVariantId: "button-secondary",
    },
    {
      ...cardLayer,
      id: "card-instance",
      name: "Card instance",
      x: 48,
      y: 128,
      componentId: cardComponent.id,
    },
  ],
};

const pendingCardUpdate: DesignComponent = {
  ...cardComponent,
  updatedAt: "2026-05-18T18:20:00.000Z",
  librarySource: {
    libraryId: "workspace-kit",
    libraryName: "Workspace Kit",
    teamName: "Design Systems",
    remoteComponentId: cardComponent.id,
    version: 4,
    availableVersion: 5,
    signature: "old-card-signature",
    availableSignature: "new-card-signature",
    status: "update-available",
    updatedAt: now,
  },
};

const document: DesignDocument = {
  version: 1,
  activePageId: page.id,
  pages: [page],
  variables: {},
  components: {
    [buttonComponent.id]: buttonComponent,
    [cardComponent.id]: cardComponent,
  },
  libraryMetadata: {
    id: "workspace-kit",
    name: "Workspace Kit",
    teamName: "Design Systems",
    description: "Production design-system components.",
    version: 4,
    componentCount: 2,
    componentSignatures: {
      [buttonComponent.id]: "previous-button-signature",
    },
    publishedAt: "2026-05-17T10:00:00.000Z",
    updatedAt: now,
  },
  librarySubscriptions: {
    "consumer-dashboard": {
      id: "consumer-dashboard",
      name: "Consumer Dashboard",
      teamName: "Product Apps",
      version: 3,
      componentCount: 12,
      updatedAt: now,
    },
  },
  pendingLibraryComponentUpdates: {
    [cardComponent.id]: pendingCardUpdate,
  },
  paintStyles: {
    "paint-brand": {
      id: "paint-brand",
      name: "Brand / Primary",
      value: "#2563eb",
      createdAt: now,
      updatedAt: now,
    },
  },
  textStyles: {
    "text-button": {
      id: "text-button",
      name: "Button / Label",
      fontFamily: "Inter",
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "center",
      textColor: "#ffffff",
      createdAt: now,
      updatedAt: now,
    },
  },
  effectStyles: {
    "effect-card": {
      id: "effect-card",
      name: "Card / Shadow",
      shadowEnabled: true,
      shadowColor: "#0f172a33",
      shadowX: 0,
      shadowY: 8,
      shadowBlur: 24,
      shadowSpread: 0,
      effectsVisible: true,
      createdAt: now,
      updatedAt: now,
    },
  },
  layoutGridStyles: {
    "grid-content": {
      id: "grid-content",
      name: "Content grid",
      grid: {
        name: "Content grid",
        kind: "columns",
        color: "#38bdf8",
        opacity: 0.32,
        size: 8,
        count: 12,
        gutter: 24,
        margin: 32,
        alignment: "stretch",
      },
      createdAt: now,
      updatedAt: now,
    },
  },
  activityEvents: [
    {
      id: "activity-release",
      kind: "library",
      actorName: "Design Systems",
      actorEmail: "design@example.com",
      label: "Prepared Workspace Kit v5 rollout",
      detail: "Component scopes, adoption diffs, subscriber update plan, and rollback archive captured.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const components = Object.values(document.components);
const analyticsByComponentId = getComponentUsageAnalytics(components, [page]);
const libraryStatus = getLocalLibraryStatus(document);
const report = getDesignSystemLibraryPublicationDepthReport({
  analyticsByComponentId,
  components,
  document,
  generatedAt: now,
  libraryStatus,
  pendingUpdates: document.pendingLibraryComponentUpdates ?? {},
  releaseArchive: {
    exportedAt: now,
    integrity: {
      algorithm: "fnv1a-32-stable-json",
      componentCount: 2,
      payloadHash: "abcd1234",
      payloadLength: 4096,
      reportRowCount: 12,
    },
    library: {
      currentVersion: 4,
      targetVersion: 5,
    },
  },
});

assert(report.status === "ready", "Publication depth fixture should be ready.");
assert(report.score >= 95, "Ready publication depth should keep a high score.");
assert(report.componentReleaseScopeCount >= 2, "Component release scopes should be counted.");
assert(report.propertyReleaseScopeCount >= 3, "Property release scopes should be counted.");
assert(report.styleReleaseScopeCount >= 4, "Style release scopes should be counted.");
assert(report.versionReleaseScopeCount >= 1, "Version release scope should be counted.");
assert(report.adoptionDiffCount >= 2, "Adoption diffs should be counted.");
assert(report.subscriberUpdatePlanCount >= 1, "Subscriber update plans should be counted.");
assert(report.rollbackEvidenceCount >= 1, "Rollback-safe rollout evidence should be counted.");
assert(report.rows.some((row) => row.category === "release-scope"), "Rows should include release scopes.");
assert(report.rows.some((row) => row.category === "adoption-diff"), "Rows should include adoption diffs.");
assert(report.rows.some((row) => row.category === "subscriber-update-plan"), "Rows should include subscriber update plans.");
assert(report.rows.some((row) => row.category === "rollback-rollout"), "Rows should include rollback-safe rollout evidence.");

const markdown = getDesignSystemLibraryPublicationDepthMarkdown(report);
const csv = getDesignSystemLibraryPublicationDepthCsv(report);
const json = JSON.parse(getDesignSystemLibraryPublicationDepthJson(report)) as {
  rows: unknown[];
  subscriberUpdatePlans: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Design-System Library Publication Depth"), "Markdown should include a clear title.");
assert(markdown.includes("component/property/style/version release scopes"), "Markdown should mention release scopes.");
assert(markdown.includes("adoption diffs"), "Markdown should mention adoption diffs.");
assert(markdown.includes("subscriber update plans"), "Markdown should mention subscriber update plans.");
assert(markdown.includes("rollback-safe rollout evidence"), "Markdown should mention rollback-safe rollout evidence.");
assert(csv.includes("subscriber-update-plan"), "CSV should include subscriber update plan rows.");
assert(json.rows.length === report.rows.length, "JSON should preserve review rows.");
assert(json.subscriberUpdatePlans.length === report.subscriberUpdatePlans.length, "JSON should preserve subscriber update plans.");
assert(
  packageJson.scripts["editor:library-publication-depth-smoke"]?.includes(
    "library-publication-depth-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Library publication depth smoke passed: ${report.score} score, ${report.subscriberUpdatePlanCount} subscriber plan(s).`,
);

function layer({
  fill,
  height,
  id,
  name,
  stroke,
  text,
  width,
  x = 0,
  y = 0,
}: {
  fill: string;
  height: number;
  id: string;
  name: string;
  stroke: string;
  text?: string;
  width: number;
  x?: number;
  y?: number;
}): DesignLayer {
  return {
    id,
    type: text ? "text" : "rectangle",
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill,
    stroke,
    strokeWidth: stroke === "transparent" ? 0 : 1,
    cornerRadius: text ? 0 : 10,
    text,
    fontFamily: text ? "Inter" : undefined,
    fontSize: text ? 14 : undefined,
    fontWeight: text ? 600 : undefined,
    lineHeight: text ? 1.2 : undefined,
    letterSpacing: text ? 0 : undefined,
    textAlign: text ? "center" : undefined,
    textColor: text ? "#ffffff" : undefined,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

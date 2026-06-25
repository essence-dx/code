import { readFileSync } from "node:fs";
import {
  getAdvancedPrototypeTransitionAuthoringCsv,
  getAdvancedPrototypeTransitionAuthoringJson,
  getAdvancedPrototypeTransitionAuthoringMarkdown,
  getAdvancedPrototypeTransitionAuthoringReport,
} from "../src/features/editor/advanced-prototype-transition-authoring";
import { getPrototypeInteractionInspector } from "../src/features/editor/prototype-interaction-inspector";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T21:00:00.000Z";

const startPage: DesignPage = {
  id: "page-start",
  name: "Prototype start",
  background: "#f8fafc",
  prototypeStart: true,
  layers: [
    frame("start-frame", "Start frame", 0, 0, 1440, 900),
    {
      ...button("open-modal", "Open plan modal", "start-frame", 96, 120, 260, 64),
      prototype: {
        action: "overlay",
        closeOnOutside: true,
        durationMs: 350,
        overlayPosition: "center",
        scrollBehavior: "lock",
        targetPageId: "page-modal",
        transition: "dissolve",
        trigger: "click",
      },
      variableBindings: {
        opacity: "prototype/modal-opacity",
        text: "prototype/modal-label",
      },
    },
    {
      ...button("open-detail", "Open detail", "start-frame", 96, 220, 260, 64),
      prototype: {
        action: "navigate",
        durationMs: 450,
        preserveScroll: true,
        scrollBehavior: "preserve",
        smartAnimate: true,
        targetPageId: "page-detail",
        transition: "slide-left",
        trigger: "click",
      },
      variableBindings: {
        opacity: "prototype/route-opacity",
      },
    },
  ],
};

const modalPage: DesignPage = {
  id: "page-modal",
  name: "Prototype modal",
  background: "#111827",
  layers: [
    frame("modal-frame", "Modal frame", 0, 0, 640, 460),
    button("modal-close", "Close overlay", "modal-frame", 220, 320, 200, 56),
  ],
};

const detailPage: DesignPage = {
  id: "page-detail",
  name: "Prototype detail",
  background: "#ffffff",
  layers: [
    frame("detail-frame", "Detail frame", 0, 0, 1440, 1400),
    button("back-home", "Back home", "detail-frame", 96, 1080, 220, 56),
  ],
};

const document: DesignDocument = {
  version: 1,
  activePageId: startPage.id,
  pages: [startPage, modalPage, detailPage],
  variables: {},
  variableModes: [{ id: "default", name: "Default" }],
  activeVariableModeId: "default",
  variableCollections: {
    prototype: {
      id: "prototype",
      name: "Prototype",
      scope: "prototype",
      createdAt: now,
      updatedAt: now,
    },
  },
  variableDefinitions: {
    "prototype/modal-opacity": variable("prototype/modal-opacity", "Modal opacity", "number", "1"),
    "prototype/route-opacity": variable("prototype/route-opacity", "Route opacity", "number", "0.92"),
    "prototype/modal-label": variable("prototype/modal-label", "Modal label", "text", "Open plan modal"),
  },
  components: {},
  activityEvents: [
    {
      id: "activity-prototype-playback",
      kind: "extension",
      actorName: "Prototype Lead",
      actorEmail: "prototype@example.com",
      label: "Exported advanced prototype playback packet",
      detail:
        "Overlay, scroll, smart animate, variable action, and route playback evidence captured.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const prototypeInteraction = getPrototypeInteractionInspector(document);
const report = getAdvancedPrototypeTransitionAuthoringReport({
  document,
  generatedAt: now,
  prototypeInteraction,
});

assert(report.status === "ready", "Advanced prototype transition fixture should be ready.");
assert(report.score >= 95, "Ready advanced prototype transition fixture should keep a high score.");
assert(report.overlayTransitionCount >= 1, "Overlay transition evidence should be counted.");
assert(report.scrollBehaviorCount >= 2, "Scroll behavior evidence should be counted.");
assert(report.smartAnimateReadinessCount >= 1, "Smart animate readiness should be counted.");
assert(report.variableActionCount >= 2, "Prototype variable actions should be counted.");
assert(report.routePlaybackEvidenceCount >= 3, "Route playback evidence should be counted.");
assert(report.rows.some((row) => row.category === "overlay-transition"), "Rows should include overlay transitions.");
assert(report.rows.some((row) => row.category === "scroll-behavior"), "Rows should include scroll behaviors.");
assert(report.rows.some((row) => row.category === "smart-animate"), "Rows should include smart animate readiness.");
assert(report.rows.some((row) => row.category === "variable-action"), "Rows should include variable actions.");
assert(report.rows.some((row) => row.category === "route-playback"), "Rows should include route playback evidence.");

const markdown = getAdvancedPrototypeTransitionAuthoringMarkdown(report);
const csv = getAdvancedPrototypeTransitionAuthoringCsv(report);
const json = JSON.parse(getAdvancedPrototypeTransitionAuthoringJson(report)) as {
  rows: unknown[];
  routePlayback: unknown[];
  variableActions: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Advanced Prototype Transition Authoring"), "Markdown should include a clear title.");
assert(markdown.includes("overlays"), "Markdown should mention overlays.");
assert(markdown.includes("scroll behaviors"), "Markdown should mention scroll behaviors.");
assert(markdown.includes("smart-animate readiness"), "Markdown should mention smart-animate readiness.");
assert(markdown.includes("variable actions"), "Markdown should mention variable actions.");
assert(markdown.includes("route playback evidence"), "Markdown should mention route playback evidence.");
assert(csv.includes("smart-animate"), "CSV should include smart animate rows.");
assert(json.rows.length === report.rows.length, "JSON should preserve review rows.");
assert(json.variableActions.length === report.variableActions.length, "JSON should preserve variable actions.");
assert(json.routePlayback.length === report.routePlayback.length, "JSON should preserve route playback evidence.");
assert(
  packageJson.scripts["editor:advanced-prototype-transition-authoring-smoke"]?.includes(
    "advanced-prototype-transition-authoring-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Advanced prototype transition authoring smoke passed: ${report.score} score, ${report.routePlaybackEvidenceCount} playback evidence item(s).`,
);

function variable(
  id: string,
  name: string,
  type: "number" | "text",
  value: string,
) {
  return {
    id,
    name,
    type,
    collectionId: "prototype",
    values: { default: value },
    createdAt: now,
    updatedAt: now,
  };
}

function frame(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DesignLayer {
  return {
    id,
    type: "frame",
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#ffffff",
    stroke: "#cbd5e1",
    strokeWidth: 1,
    cornerRadius: 24,
  };
}

function button(
  id: string,
  name: string,
  parentId: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DesignLayer {
  return {
    id,
    type: "text",
    name,
    parentId,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#2563eb",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 12,
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    text: name,
    textAlign: "center",
    textColor: "#ffffff",
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

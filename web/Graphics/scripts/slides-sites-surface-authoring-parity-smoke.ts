import { readFileSync } from "node:fs";
import { getProductionDeploySmokeReport } from "../src/features/editor/production-deploy-smoke";
import { getPrototypeInteractionInspector } from "../src/features/editor/prototype-interaction-inspector";
import {
  getSitesResponsivePublishingPreflightReport,
} from "../src/features/editor/sites-responsive-publishing-preflight";
import {
  getSlidesSitesSurfaceAuthoringParityCsv,
  getSlidesSitesSurfaceAuthoringParityJson,
  getSlidesSitesSurfaceAuthoringParityMarkdown,
  getSlidesSitesSurfaceAuthoringParityReport,
} from "../src/features/editor/slides-sites-surface-authoring-parity";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T20:00:00.000Z";

const coverSlide: DesignPage = {
  id: "slide-cover",
  name: "Slides deck / Cover",
  background: "#0f172a",
  layers: [
    frame("slide-cover-frame", "Slide 01 / Cover", 0, 0, 1920, 1080, "grid"),
    {
      ...child(
        "slide-cover-cta",
        "Open site prototype",
        "slide-cover-frame",
        128,
        720,
        420,
        96,
      ),
      prototype: {
        action: "navigate",
        durationMs: 0,
        targetPageId: "site-launch",
        transition: "instant",
        trigger: "click",
      },
      readyForDev: true,
    },
  ],
};

const detailSlide: DesignPage = {
  id: "slide-detail",
  name: "Slides deck / Detail",
  background: "#111827",
  layers: [
    frame("slide-detail-frame", "Slide 02 / Metrics", 0, 0, 1920, 1080, "grid"),
    child("slide-detail-chart", "Metric chart", "slide-detail-frame", 140, 220, 720, 420),
  ],
};

const siteLaunch: DesignPage = {
  id: "site-launch",
  name: "Sites launch",
  background: "#f8fafc",
  prototypeStart: true,
  layers: [
    frame("site-mobile-frame", "Mobile site landing", 0, 0, 390, 844, "columns"),
    frame("site-tablet-frame", "Tablet site landing", 430, 0, 768, 1024, "columns"),
    frame("site-desktop-frame", "Desktop site landing", 1240, 0, 1440, 900, "grid"),
    child("site-mobile-hero", "Mobile hero", "site-mobile-frame", 24, 40, 342, 220),
    child("site-tablet-hero", "Tablet hero", "site-tablet-frame", 48, 56, 672, 280),
    {
      ...child("site-desktop-hero", "Desktop hero", "site-desktop-frame", 80, 64, 900, 320),
      prototype: {
        action: "navigate",
        durationMs: 0,
        targetPageId: "slide-detail",
        transition: "instant",
        trigger: "click",
      },
      readyForDev: true,
    },
  ],
};

const document: DesignDocument = {
  version: 1,
  activePageId: siteLaunch.id,
  pages: [coverSlide, detailSlide, siteLaunch],
  variables: {},
  components: {},
  activityEvents: [
    {
      id: "activity-slides-sites-publish",
      kind: "extension",
      actorName: "Surface Lead",
      actorEmail: "surfaces@example.com",
      label: "Exported Slides/Sites launch packet",
      detail:
        "Deck pages, site breakpoints, embedded prototype routes, and public publish evidence are ready.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const productionDeploySmoke = getProductionDeploySmokeReport({
  activePage: siteLaunch,
  baseUrl: "https://figma.example.com",
  document,
  generatedAt: now,
  shareToken: "slides-sites-token",
});
const prototypeInteraction = getPrototypeInteractionInspector(document);
const sitesPreflight = getSitesResponsivePublishingPreflightReport({
  activePage: siteLaunch,
  document,
  generatedAt: now,
  productionDeploySmoke,
});
const report = getSlidesSitesSurfaceAuthoringParityReport({
  activePage: siteLaunch,
  document,
  generatedAt: now,
  productionDeploySmoke,
  prototypeInteraction,
  sitesPreflight,
});

assert(report.status === "ready", "Complete Slides/Sites surface fixture should be ready.");
assert(report.score >= 95, "Ready Slides/Sites surface fixture should keep a high score.");
assert(report.deckDocumentModeCount >= 1, "Deck document mode evidence should be counted.");
assert(report.siteDocumentModeCount >= 1, "Site document mode evidence should be counted.");
assert(report.presentationReadinessPacketCount >= 2, "Presentation readiness packets should be counted.");
assert(report.siteReadinessPacketCount >= 2, "Site readiness packets should be counted.");
assert(report.embeddedPrototypeHandoffCount >= 2, "Embedded prototype handoffs should be counted.");
assert(report.publicPublishingEvidenceCount >= 4, "Public publishing evidence should be counted.");
assert(report.rows.some((row) => row.category === "document-mode"), "Rows should include document modes.");
assert(report.rows.some((row) => row.category === "readiness-packet"), "Rows should include readiness packets.");
assert(report.rows.some((row) => row.category === "embedded-prototype"), "Rows should include embedded prototype handoffs.");
assert(report.rows.some((row) => row.category === "public-publishing"), "Rows should include public publishing evidence.");

const markdown = getSlidesSitesSurfaceAuthoringParityMarkdown(report);
const csv = getSlidesSitesSurfaceAuthoringParityCsv(report);
const json = JSON.parse(getSlidesSitesSurfaceAuthoringParityJson(report)) as {
  deckModes: unknown[];
  siteModes: unknown[];
  rows: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Slides/Sites Surface Authoring Parity"), "Markdown should include a clear title.");
assert(markdown.includes("deck/site document modes"), "Markdown should mention deck/site document modes.");
assert(markdown.includes("presentation/site readiness packets"), "Markdown should mention presentation/site readiness packets.");
assert(markdown.includes("embedded prototype handoffs"), "Markdown should mention embedded prototype handoffs.");
assert(markdown.includes("public publishing evidence"), "Markdown should mention public publishing evidence.");
assert(csv.includes("embedded-prototype"), "CSV should include embedded prototype rows.");
assert(json.deckModes.length === report.deckModes.length, "JSON should preserve deck modes.");
assert(json.siteModes.length === report.siteModes.length, "JSON should preserve site modes.");
assert(json.rows.length === report.rows.length, "JSON should preserve review rows.");
assert(
  packageJson.scripts["editor:slides-sites-surface-authoring-parity-smoke"]?.includes(
    "slides-sites-surface-authoring-parity-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Slides/Sites surface authoring parity smoke passed: ${report.score} score, ${report.publicPublishingEvidenceCount} publish evidence item(s).`,
);

function frame(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  gridKind: NonNullable<DesignLayer["layoutGrids"]>[number]["kind"],
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
    autoLayout: {
      mode: "vertical",
      gap: 24,
      paddingX: 24,
      paddingY: 32,
      align: "stretch",
      wrap: "nowrap",
    },
    constraints: {
      horizontal: "left-right",
      vertical: "top",
    },
    layoutGrids: [
      {
        id: `${id}-grid`,
        name: `${name} grid`,
        kind: gridKind,
        visible: true,
        color: "#2563eb",
        opacity: 0.14,
        size: 8,
        count: gridKind === "grid" ? 12 : 4,
        gutter: 24,
        margin: 24,
        alignment: "stretch",
      },
    ],
    layoutSizing: {
      horizontal: "fixed",
      vertical: "hug",
    },
  };
}

function child(
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
    type: "rectangle",
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
    fill: "#dbeafe",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 16,
    constraints: {
      horizontal: "left-right",
      vertical: "top",
    },
    layoutSizing: {
      horizontal: "fill",
      vertical: "fixed",
    },
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

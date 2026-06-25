import { readFileSync } from "node:fs";
import { getProductionDeploySmokeReport } from "../src/features/editor/production-deploy-smoke";
import {
  getSitesResponsivePublishingPreflightCsv,
  getSitesResponsivePublishingPreflightJson,
  getSitesResponsivePublishingPreflightMarkdown,
  getSitesResponsivePublishingPreflightReport,
} from "../src/features/editor/sites-responsive-publishing-preflight";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T11:00:00.000Z";

const page: DesignPage = {
  id: "page-sites",
  name: "Sites launch",
  background: "#f8fafc",
  prototypeStart: true,
  layers: [
    frame("mobile-frame", "Mobile landing", 0, 0, 390, 844, "columns"),
    frame("tablet-frame", "Tablet landing", 430, 0, 768, 1024, "columns"),
    frame("desktop-frame", "Desktop landing", 1240, 0, 1440, 900, "grid"),
    child("mobile-hero", "Mobile hero", "mobile-frame", 24, 40, 342, 220),
    child("tablet-hero", "Tablet hero", "tablet-frame", 48, 56, 672, 280),
    {
      ...child("desktop-hero", "Desktop hero", "desktop-frame", 80, 64, 900, 320),
      prototype: {
        trigger: "click",
        action: "navigate",
        targetPageId: "page-sites",
        transition: "instant",
        durationMs: 0,
      },
    },
  ],
};

const document: DesignDocument = {
  version: 1,
  activePageId: page.id,
  pages: [page],
  variables: {},
  components: {},
  activityEvents: [
    {
      id: "activity-release-export",
      kind: "extension",
      actorName: "Release Lead",
      actorEmail: "release@example.com",
      label: "Exported production release packet",
      detail: "Ready for public Sites launch review.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const productionDeploySmoke = getProductionDeploySmokeReport({
  activePage: page,
  baseUrl: "https://figma.example.com",
  document,
  generatedAt: now,
  shareToken: "site-launch-token",
});

const report = getSitesResponsivePublishingPreflightReport({
  activePage: page,
  document,
  generatedAt: now,
  productionDeploySmoke,
});

assert(report.status === "ready", "Complete breakpoint and route evidence should be ready.");
assert(report.score >= 95, "Ready Sites preflight should keep a high launch score.");
assert(report.breakpointCount === 3, "Mobile, tablet, and desktop breakpoints should be required.");
assert(report.coveredBreakpointCount === 3, "All required breakpoints should be covered.");
assert(report.publicRouteSmokePacketCount === 4, "Share, prototype, embed, and handoff routes should be packetized.");
assert(report.rollbackNoteCount >= 3, "Rollback handoff should include multiple notes.");
assert(
  report.rows.some(
    (row) => row.category === "breakpoint-coverage" && row.status === "ready",
  ),
  "Breakpoint coverage rows should be marked ready.",
);
assert(
  report.rows.some(
    (row) => row.category === "public-route-smoke" && row.status === "ready",
  ),
  "Public route smoke rows should be marked ready.",
);
assert(
  report.rollbackNotes.some((note) => note.id === "restore-public-route"),
  "Rollback notes should include public route restore guidance.",
);
assert(
  report.commands.some((command) => command.includes("visual:routes")),
  "Report should preserve production route smoke commands.",
);

const markdown = getSitesResponsivePublishingPreflightMarkdown(report);
const csv = getSitesResponsivePublishingPreflightCsv(report);
const json = JSON.parse(getSitesResponsivePublishingPreflightJson(report)) as {
  breakpoints: unknown[];
  publicRouteSmokePackets: unknown[];
  rollbackNotes: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Sites Responsive Publishing Preflight"), "Markdown should include a clear title.");
assert(markdown.includes("breakpoint coverage"), "Markdown should include breakpoint coverage evidence.");
assert(markdown.includes("public route smoke"), "Markdown should include public route smoke evidence.");
assert(markdown.includes("rollback notes"), "Markdown should include rollback notes.");
assert(csv.includes("breakpoint-coverage"), "CSV should include breakpoint coverage rows.");
assert(json.breakpoints.length === 3, "JSON should preserve breakpoint details.");
assert(json.publicRouteSmokePackets.length === 4, "JSON should preserve public route packets.");
assert(json.rollbackNotes.length >= 3, "JSON should preserve rollback notes.");
assert(
  packageJson.scripts["editor:sites-responsive-publishing-preflight-smoke"]?.includes(
    "sites-responsive-publishing-preflight-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Sites responsive publishing preflight smoke passed: ${report.coveredBreakpointCount}/${report.breakpointCount} breakpoints, ${report.publicRouteSmokePacketCount} routes, score ${report.score}.`,
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
    layoutSizing: {
      horizontal: "fixed",
      vertical: "hug",
    },
    layoutGrids: [
      {
        id: `${id}-grid`,
        name: `${name} responsive grid`,
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

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

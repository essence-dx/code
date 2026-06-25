import { readFileSync } from "node:fs";
import { getProductionDeploySmokeReport } from "../src/features/editor/production-deploy-smoke";
import {
  getSitesContentMapPublishQueueCsv,
  getSitesContentMapPublishQueueJson,
  getSitesContentMapPublishQueueMarkdown,
  getSitesContentMapPublishQueueReport,
} from "../src/features/editor/sites-content-map-publish-queue";
import { getSitesResponsivePublishingPreflightReport } from "../src/features/editor/sites-responsive-publishing-preflight";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T23:15:00.000Z";

const homePage: DesignPage = {
  id: "site-home",
  name: "Sites / Home",
  background: "#f8fafc",
  prototypeStart: true,
  layers: [
    frame("site-home-mobile", "Home mobile route", 0, 0, 390, 844),
    frame("site-home-tablet", "Home tablet route", 440, 0, 768, 1024),
    frame("site-home-desktop", "Home desktop route", 1260, 0, 1440, 900),
    textLayer(
      "site-home-title",
      "SEO title / Home",
      "Essence Figma - collaborative design workspace",
      "site-home-desktop",
      96,
      96,
      760,
      56,
    ),
    textLayer(
      "site-home-description",
      "Meta description / Home",
      "Design, prototype, publish, and hand off production-ready experiences.",
      "site-home-desktop",
      96,
      168,
      760,
      72,
    ),
    imageLayer(
      "site-home-hero-asset",
      "Hero image asset / Home",
      "site-home-desktop",
      860,
      96,
      420,
      280,
    ),
    {
      ...button("site-home-pricing-cta", "Open pricing route", "site-home-desktop", 96, 296, 240, 64),
      prototype: {
        action: "navigate",
        durationMs: 220,
        targetPageId: "site-pricing",
        transition: "slide-left",
        trigger: "click",
      },
    },
  ],
};

const pricingPage: DesignPage = {
  id: "site-pricing",
  name: "Sites / Pricing",
  background: "#f8fafc",
  layers: [
    frame("site-pricing-desktop", "Pricing desktop route", 0, 0, 1440, 900),
    textLayer(
      "site-pricing-title",
      "SEO title / Pricing",
      "Essence Figma pricing for production design teams",
      "site-pricing-desktop",
      96,
      96,
      780,
      56,
    ),
    textLayer(
      "site-pricing-description",
      "Meta description / Pricing",
      "Compare team plans for collaborative design, publishing, prototypes, and developer handoff.",
      "site-pricing-desktop",
      96,
      168,
      820,
      72,
    ),
    imageLayer(
      "site-pricing-asset",
      "Pricing media asset",
      "site-pricing-desktop",
      920,
      120,
      320,
      260,
    ),
  ],
};

const document: DesignDocument = {
  version: 1,
  activePageId: homePage.id,
  pages: [homePage, pricingPage],
  variables: {},
  components: {},
  activityEvents: [
    {
      id: "activity-sites-publish-queue",
      kind: "extension",
      actorName: "Sites Producer",
      actorEmail: "sites@example.com",
      label: "Queued Sites publish",
      detail: "Home and Pricing routes queued for production launch.",
      createdAt: now,
    },
    {
      id: "activity-sites-rollback-channel",
      kind: "extension",
      actorName: "Release Lead",
      actorEmail: "release@example.com",
      label: "Rollback channel ready",
      detail:
        "Rollback channel keeps previous public route bundle and content snapshot.",
      createdAt: now,
    },
    {
      id: "activity-public-route-evidence",
      kind: "export",
      actorName: "Release Lead",
      actorEmail: "release@example.com",
      label: "Exported public route evidence",
      detail:
        "Share, prototype, embed, and release handoff route evidence attached.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const productionDeploySmoke = getProductionDeploySmokeReport({
  activePage: homePage,
  baseUrl: "https://figma.example.com",
  document,
  generatedAt: now,
  shareToken: "sites-token",
});

const sitesPreflight = getSitesResponsivePublishingPreflightReport({
  activePage: homePage,
  document,
  generatedAt: now,
  productionDeploySmoke,
});

const report = getSitesContentMapPublishQueueReport({
  activePage: homePage,
  document,
  generatedAt: now,
  productionDeploySmoke,
  shareToken: "sites-token",
  sitesPreflight,
});

assert(report.status === "ready", "Complete Sites content map fixture should be ready.");
assert(report.score >= 95, "Ready Sites content map should keep a high launch score.");
assert(report.routeSitemapCount >= 2, "Route sitemap should include Home and Pricing.");
assert(report.seoMetaCheckCount >= 2, "SEO/meta checks should cover site routes.");
assert(report.assetBudgetCount >= 2, "Asset budgets should cover site routes.");
assert(report.publishQueueCount >= 2, "Publish queue should include all site routes.");
assert(report.rollbackChannelCount >= 1, "Rollback channel evidence should be counted.");
assert(report.publicRouteEvidenceCount >= 4, "Public route evidence should include share, prototype, embed, and handoff.");

for (const category of [
  "route-sitemap",
  "seo-meta",
  "asset-budget",
  "publish-queue",
  "rollback-channel",
  "public-route-evidence",
] as const) {
  assert(
    report.rows.some((row) => row.category === category),
    `Rows should include ${category}.`,
  );
}

assert(
  report.publishQueue.some(
    (item) => item.route === "/sites/home" && item.status === "ready",
  ),
  "Home route should be ready in the publish queue.",
);
assert(
  report.publicRouteEvidence.some((item) => item.kind === "embed"),
  "Public route evidence should preserve embed coverage.",
);

const markdown = getSitesContentMapPublishQueueMarkdown(report);
const csv = getSitesContentMapPublishQueueCsv(report);
const json = JSON.parse(getSitesContentMapPublishQueueJson(report)) as {
  routeSitemap: unknown[];
  seoMetaChecks: unknown[];
  assetBudgets: unknown[];
  publishQueue: unknown[];
  rollbackChannels: unknown[];
  publicRouteEvidence: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Sites Content Map And Publish Queue"), "Markdown should include a clear title.");
assert(markdown.includes("route sitemap"), "Markdown should include route sitemap evidence.");
assert(markdown.includes("SEO/meta checks"), "Markdown should include SEO/meta checks.");
assert(markdown.includes("asset budgets"), "Markdown should include asset budgets.");
assert(markdown.includes("publish queue"), "Markdown should include publish queue.");
assert(markdown.includes("rollback channel"), "Markdown should include rollback channel.");
assert(markdown.includes("public route evidence"), "Markdown should include public route evidence.");
assert(csv.includes("route-sitemap"), "CSV should include route sitemap rows.");
assert(json.routeSitemap.length === report.routeSitemap.length, "JSON should preserve route sitemap rows.");
assert(json.seoMetaChecks.length === report.seoMetaChecks.length, "JSON should preserve SEO/meta checks.");
assert(json.assetBudgets.length === report.assetBudgets.length, "JSON should preserve asset budgets.");
assert(json.publishQueue.length === report.publishQueue.length, "JSON should preserve publish queue.");
assert(json.rollbackChannels.length === report.rollbackChannels.length, "JSON should preserve rollback channels.");
assert(
  json.publicRouteEvidence.length === report.publicRouteEvidence.length,
  "JSON should preserve public route evidence.",
);
assert(
  packageJson.scripts["editor:sites-content-map-publish-queue-smoke"]?.includes(
    "sites-content-map-publish-queue-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Sites content map publish queue smoke passed: ${report.routeSitemapCount} routes, ${report.publishQueueCount} queued, score ${report.score}.`,
);

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
        kind: width >= 1024 ? "grid" : "columns",
        visible: true,
        color: "#2563eb",
        opacity: 0.14,
        size: 8,
        count: width >= 1024 ? 12 : 4,
        gutter: 24,
        margin: 24,
        alignment: "stretch",
      },
    ],
  };
}

function textLayer(
  id: string,
  name: string,
  text: string,
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
    text,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#0f172a",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    fontFamily: "Inter",
    fontSize: 24,
    constraints: {
      horizontal: "left-right",
      vertical: "top",
    },
  };
}

function imageLayer(
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
    type: "image",
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
    cornerRadius: 20,
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
    fill: "#2563eb",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 18,
    constraints: {
      horizontal: "left",
      vertical: "top",
    },
  };
}

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

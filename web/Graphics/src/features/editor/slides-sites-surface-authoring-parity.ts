import type {
  ProductionDeploySmokeKind,
  ProductionDeploySmokeReport,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";
import type { PrototypeInteractionInspectorReport } from "@/features/editor/prototype-interaction-inspector-types";
import type { SitesResponsivePublishingPreflightReport } from "@/features/editor/sites-responsive-publishing-preflight";
import type { DesignDocument, DesignLayer, DesignPage } from "@/features/editor/types";

export type SlidesSitesSurfaceAuthoringParityStatus =
  ProductionDeploySmokeStatus;

export type SlidesSitesSurfaceAuthoringParityRowCategory =
  | "document-mode"
  | "embedded-prototype"
  | "public-publishing"
  | "readiness-packet";

export type SlidesSitesSurfaceAuthoringModeKind = "deck" | "site";

export type SlidesSitesSurfaceAuthoringMode = {
  id: string;
  status: SlidesSitesSurfaceAuthoringParityStatus;
  kind: SlidesSitesSurfaceAuthoringModeKind;
  label: string;
  pageIds: string[];
  pageNames: string[];
  frameIds: string[];
  frameNames: string[];
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SlidesSitesSurfaceAuthoringReadinessPacket = {
  id: string;
  status: SlidesSitesSurfaceAuthoringParityStatus;
  kind: "presentation" | "site";
  label: string;
  metric: number;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SlidesSitesSurfaceAuthoringEmbeddedPrototypeHandoff = {
  id: string;
  status: SlidesSitesSurfaceAuthoringParityStatus;
  label: string;
  route: string;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SlidesSitesSurfaceAuthoringPublicPublishingEvidence = {
  id: string;
  status: SlidesSitesSurfaceAuthoringParityStatus;
  kind: ProductionDeploySmokeKind;
  label: string;
  route: string;
  method: "GET" | "POST" | "UI";
  command: string;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SlidesSitesSurfaceAuthoringParityRow = {
  id: string;
  status: SlidesSitesSurfaceAuthoringParityStatus;
  category: SlidesSitesSurfaceAuthoringParityRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  layerIds: string[];
  metric: number;
};

export type SlidesSitesSurfaceAuthoringParityReport = {
  generatedAt: string;
  status: SlidesSitesSurfaceAuthoringParityStatus;
  score: number;
  activePageId: string;
  activePageName: string;
  deckDocumentModeCount: number;
  siteDocumentModeCount: number;
  presentationReadinessPacketCount: number;
  siteReadinessPacketCount: number;
  embeddedPrototypeHandoffCount: number;
  publicPublishingEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  deckModes: SlidesSitesSurfaceAuthoringMode[];
  siteModes: SlidesSitesSurfaceAuthoringMode[];
  readinessPackets: SlidesSitesSurfaceAuthoringReadinessPacket[];
  embeddedPrototypeHandoffs: SlidesSitesSurfaceAuthoringEmbeddedPrototypeHandoff[];
  publicPublishingEvidence: SlidesSitesSurfaceAuthoringPublicPublishingEvidence[];
  rows: SlidesSitesSurfaceAuthoringParityRow[];
};

const publicPublishingKinds = new Set<ProductionDeploySmokeKind>([
  "embed",
  "prototype",
  "release-handoff",
  "share",
]);

const statusRank: Record<SlidesSitesSurfaceAuthoringParityStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getSlidesSitesSurfaceAuthoringParityReport({
  activePage,
  document,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  prototypeInteraction,
  sitesPreflight,
}: {
  activePage: DesignPage;
  document: DesignDocument;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  prototypeInteraction: PrototypeInteractionInspectorReport;
  sitesPreflight: SitesResponsivePublishingPreflightReport;
}): SlidesSitesSurfaceAuthoringParityReport {
  const deckModes = [getDeckModeEvidence(document)];
  const siteModes = [getSiteModeEvidence(document, sitesPreflight)];
  const readinessPackets = getReadinessPackets({
    productionDeploySmoke,
    prototypeInteraction,
    sitesPreflight,
  });
  const embeddedPrototypeHandoffs = getEmbeddedPrototypeHandoffs({
    productionDeploySmoke,
    prototypeInteraction,
  });
  const publicPublishingEvidence =
    getPublicPublishingEvidence(productionDeploySmoke);
  const rows = [
    ...deckModes.map(getModeRow),
    ...siteModes.map(getModeRow),
    ...readinessPackets.map(getReadinessPacketRow),
    ...embeddedPrototypeHandoffs.map(getEmbeddedPrototypeRow),
    ...publicPublishingEvidence.map(getPublicPublishingRow),
  ].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    activePageId: activePage.id,
    activePageName: activePage.name,
    deckDocumentModeCount: deckModes.filter((mode) => mode.status !== "blocked")
      .length,
    siteDocumentModeCount: siteModes.filter((mode) => mode.status !== "blocked")
      .length,
    presentationReadinessPacketCount: readinessPackets.filter(
      (packet) => packet.kind === "presentation",
    ).length,
    siteReadinessPacketCount: readinessPackets.filter(
      (packet) => packet.kind === "site",
    ).length,
    embeddedPrototypeHandoffCount: embeddedPrototypeHandoffs.length,
    publicPublishingEvidenceCount: publicPublishingEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    deckModes,
    siteModes,
    readinessPackets,
    embeddedPrototypeHandoffs,
    publicPublishingEvidence,
    rows,
  };
}

export function getSlidesSitesSurfaceAuthoringParityJson(
  report: SlidesSitesSurfaceAuthoringParityReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getSlidesSitesSurfaceAuthoringParityCsv(
  report: SlidesSitesSurfaceAuthoringParityReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "metric",
      "layer_ids",
      "evidence",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.category,
        row.label,
        row.metric,
        row.layerIds.join(" "),
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getSlidesSitesSurfaceAuthoringParityMarkdown(
  report: SlidesSitesSurfaceAuthoringParityReport,
) {
  return [
    "# Slides/Sites Surface Authoring Parity",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active page: ${report.activePageName}`,
    `Deck modes: ${report.deckDocumentModeCount}`,
    `Site modes: ${report.siteDocumentModeCount}`,
    `Presentation packets: ${report.presentationReadinessPacketCount}`,
    `Site packets: ${report.siteReadinessPacketCount}`,
    `Embedded prototype handoffs: ${report.embeddedPrototypeHandoffCount}`,
    `Public publishing evidence: ${report.publicPublishingEvidenceCount}`,
    "",
    "This packet covers deck/site document modes, presentation/site readiness packets, embedded prototype handoffs, and public publishing evidence.",
    "",
    "## deck/site document modes",
    "",
    ...[...report.deckModes, ...report.siteModes].map(
      (mode) =>
        `- [${mode.status}] ${mode.label}: ${mode.detail} Evidence: ${mode.evidence}. ${mode.recommendation}`,
    ),
    "",
    "## presentation/site readiness packets",
    "",
    ...report.readinessPackets.map(
      (packet) =>
        `- [${packet.status}] ${packet.label}: ${packet.detail} Evidence: ${packet.evidence}. ${packet.recommendation}`,
    ),
    "",
    "## embedded prototype handoffs",
    "",
    ...report.embeddedPrototypeHandoffs.map(
      (handoff) =>
        `- [${handoff.status}] ${handoff.label} (${handoff.route}): ${handoff.detail} Evidence: ${handoff.evidence}. ${handoff.recommendation}`,
    ),
    "",
    "## public publishing evidence",
    "",
    ...report.publicPublishingEvidence.map(
      (evidence) =>
        `- [${evidence.status}] ${evidence.label} (${evidence.method} ${evidence.route}): ${evidence.detail} Evidence: ${evidence.evidence}. Command: ${evidence.command}`,
    ),
  ].join("\n");
}

function getDeckModeEvidence(
  document: DesignDocument,
): SlidesSitesSurfaceAuthoringMode {
  const deckPages = document.pages.filter(isDeckPage);
  const deckFrames = document.pages.flatMap((page) =>
    page.layers.filter((layer) => layer.type === "frame" && isDeckFrame(layer)),
  );
  const status =
    deckPages.length > 0 && deckFrames.length > 0
      ? "ready"
      : deckPages.length > 0 || deckFrames.length > 0
        ? "review"
        : "blocked";

  return {
    id: "document-mode:deck",
    status,
    kind: "deck",
    label: "Deck document mode",
    pageIds: deckPages.map((page) => page.id),
    pageNames: deckPages.map((page) => page.name),
    frameIds: deckFrames.map((frame) => frame.id),
    frameNames: deckFrames.map((frame) => frame.name),
    detail: `${deckPages.length} deck-like page${deckPages.length === 1 ? "" : "s"} and ${deckFrames.length} slide frame${deckFrames.length === 1 ? "" : "s"} are available for presentation authoring.`,
    evidence:
      [...deckPages.map((page) => page.name), ...deckFrames.map((frame) => frame.name)]
        .slice(0, 6)
        .join(" | ") || "No deck pages or slide frames",
    recommendation:
      status === "ready"
        ? "Keep deck pages and slide-sized frames linked to presentation export evidence."
        : "Name deck pages clearly and add 16:9 or 4:3 slide frames before presentation handoff.",
  };
}

function getSiteModeEvidence(
  document: DesignDocument,
  sitesPreflight: SitesResponsivePublishingPreflightReport,
): SlidesSitesSurfaceAuthoringMode {
  const sitePages = document.pages.filter(isSitePage);
  const siteFrameIds = sitesPreflight.breakpoints.flatMap(
    (breakpoint) => breakpoint.matchingFrameIds,
  );
  const siteFrameNames = sitesPreflight.breakpoints.flatMap(
    (breakpoint) => breakpoint.matchingFrameNames,
  );
  const status =
    sitePages.length > 0 &&
    sitesPreflight.coveredBreakpointCount === sitesPreflight.breakpointCount
      ? "ready"
      : sitePages.length > 0 || sitesPreflight.coveredBreakpointCount > 0
        ? "review"
        : "blocked";

  return {
    id: "document-mode:site",
    status,
    kind: "site",
    label: "Site document mode",
    pageIds: sitePages.map((page) => page.id),
    pageNames: sitePages.map((page) => page.name),
    frameIds: Array.from(new Set(siteFrameIds)),
    frameNames: Array.from(new Set(siteFrameNames)),
    detail: `${sitePages.length} site-like page${sitePages.length === 1 ? "" : "s"} and ${sitesPreflight.coveredBreakpointCount}/${sitesPreflight.breakpointCount} publishing breakpoint${sitesPreflight.breakpointCount === 1 ? "" : "s"} are covered.`,
    evidence:
      [
        ...sitePages.map((page) => page.name),
        ...Array.from(new Set(siteFrameNames)),
      ]
        .slice(0, 6)
        .join(" | ") || "No site pages or responsive frames",
    recommendation:
      status === "ready"
        ? "Keep responsive frames attached to the Sites publishing preflight."
        : "Add mobile, tablet, and desktop site frames before public publishing.",
  };
}

function getReadinessPackets({
  productionDeploySmoke,
  prototypeInteraction,
  sitesPreflight,
}: {
  productionDeploySmoke: ProductionDeploySmokeReport;
  prototypeInteraction: PrototypeInteractionInspectorReport;
  sitesPreflight: SitesResponsivePublishingPreflightReport;
}): SlidesSitesSurfaceAuthoringReadinessPacket[] {
  const prototypeRow = productionDeploySmoke.rows.find(
    (row) => row.kind === "prototype",
  );
  const publicSiteStatus = getAggregateStatus(
    sitesPreflight.publicRouteSmokePackets.map((packet) => packet.status),
  );

  return [
    {
      id: "readiness:presentation-route",
      status:
        prototypeInteraction.startPageCount > 0 &&
        prototypeInteraction.hotspotCount > 0 &&
        prototypeInteraction.presentationRouteIssueCount === 0
          ? "ready"
          : prototypeInteraction.hotspotCount > 0
            ? "review"
            : "blocked",
      kind: "presentation",
      label: "Presentation route readiness",
      metric: prototypeInteraction.hotspotCount,
      detail: `${prototypeInteraction.startPageCount} start page${prototypeInteraction.startPageCount === 1 ? "" : "s"}, ${prototypeInteraction.hotspotCount} hotspot${prototypeInteraction.hotspotCount === 1 ? "" : "s"}, and ${prototypeInteraction.presentationRouteIssueCount} presentation route issue${prototypeInteraction.presentationRouteIssueCount === 1 ? "" : "s"} are recorded.`,
      evidence: `${prototypeInteraction.routePageCount} route page${prototypeInteraction.routePageCount === 1 ? "" : "s"} in prototype preview`,
      recommendation:
        "Clear presentation route issues before using the deck as a public presentation handoff.",
    },
    {
      id: "readiness:presentation-public-smoke",
      status: prototypeRow?.status ?? "blocked",
      kind: "presentation",
      label: "Presentation public route packet",
      metric: prototypeRow ? 1 : 0,
      detail:
        prototypeRow?.detail ??
        "No public prototype route packet is present in deploy smoke evidence.",
      evidence: prototypeRow?.evidence ?? "Missing prototype route evidence",
      recommendation:
        prototypeRow?.recommendation ??
        "Add a public prototype route smoke packet before publishing the presentation.",
    },
    {
      id: "readiness:site-breakpoints",
      status: sitesPreflight.status,
      kind: "site",
      label: "Site publishing preflight packet",
      metric: sitesPreflight.coveredBreakpointCount,
      detail: `${sitesPreflight.coveredBreakpointCount}/${sitesPreflight.breakpointCount} breakpoints, ${sitesPreflight.publicRouteSmokePacketCount} route packets, and ${sitesPreflight.rollbackNoteCount} rollback notes are available.`,
      evidence: sitesPreflight.breakpoints
        .map(
          (breakpoint) =>
            `${breakpoint.label}:${breakpoint.matchingFrameNames.join(";") || "missing"}`,
        )
        .join(" | "),
      recommendation:
        "Keep site breakpoint and rollback exports attached to the public publish review.",
    },
    {
      id: "readiness:site-public-routes",
      status: publicSiteStatus,
      kind: "site",
      label: "Site public route packet",
      metric: sitesPreflight.publicRouteSmokePacketCount,
      detail: `${sitesPreflight.publicRouteSmokePacketCount} share, prototype, embed, or handoff route packet${sitesPreflight.publicRouteSmokePacketCount === 1 ? "" : "s"} are packaged for public publishing.`,
      evidence: sitesPreflight.publicRouteSmokePackets
        .map((packet) => `${packet.kind}:${packet.route}`)
        .join(" | "),
      recommendation:
        "Run route smoke against the deployed URL before marking the site launch complete.",
    },
  ];
}

function getEmbeddedPrototypeHandoffs({
  productionDeploySmoke,
  prototypeInteraction,
}: {
  productionDeploySmoke: ProductionDeploySmokeReport;
  prototypeInteraction: PrototypeInteractionInspectorReport;
}): SlidesSitesSurfaceAuthoringEmbeddedPrototypeHandoff[] {
  return productionDeploySmoke.rows
    .filter((row) => row.kind === "prototype" || row.kind === "embed")
    .map((row) => ({
      id: `embedded-prototype:${row.id}`,
      status:
        row.status === "ready" &&
        prototypeInteraction.hotspotCount > 0 &&
        prototypeInteraction.presentationRouteIssueCount === 0
          ? "ready"
          : row.status === "blocked"
            ? "blocked"
            : "review",
      label: row.label,
      route: row.route,
      detail: `${row.detail} Prototype inspector has ${prototypeInteraction.hotspotCount} hotspot${prototypeInteraction.hotspotCount === 1 ? "" : "s"} and ${prototypeInteraction.presentationRouteIssueCount} route issue${prototypeInteraction.presentationRouteIssueCount === 1 ? "" : "s"}.`,
      evidence: row.evidence,
      recommendation:
        "Keep public prototype and embed links paired with the inspected interaction route.",
    }));
}

function getPublicPublishingEvidence(
  productionDeploySmoke: ProductionDeploySmokeReport,
): SlidesSitesSurfaceAuthoringPublicPublishingEvidence[] {
  return productionDeploySmoke.rows
    .filter((row) => publicPublishingKinds.has(row.kind))
    .map((row) => ({
      id: `public-publishing:${row.id}`,
      status: row.status,
      kind: row.kind,
      label: row.label,
      route: row.route,
      method: row.method,
      command: row.command,
      detail: row.detail,
      evidence: row.evidence,
      recommendation: row.recommendation,
    }));
}

function getModeRow(
  mode: SlidesSitesSurfaceAuthoringMode,
): SlidesSitesSurfaceAuthoringParityRow {
  return {
    id: mode.id,
    status: mode.status,
    category: "document-mode",
    label: mode.label,
    detail: mode.detail,
    evidence: mode.evidence,
    recommendation: mode.recommendation,
    layerIds: mode.frameIds,
    metric: mode.pageIds.length + mode.frameIds.length,
  };
}

function getReadinessPacketRow(
  packet: SlidesSitesSurfaceAuthoringReadinessPacket,
): SlidesSitesSurfaceAuthoringParityRow {
  return {
    id: packet.id,
    status: packet.status,
    category: "readiness-packet",
    label: packet.label,
    detail: packet.detail,
    evidence: packet.evidence,
    recommendation: packet.recommendation,
    layerIds: [],
    metric: packet.metric,
  };
}

function getEmbeddedPrototypeRow(
  handoff: SlidesSitesSurfaceAuthoringEmbeddedPrototypeHandoff,
): SlidesSitesSurfaceAuthoringParityRow {
  return {
    id: handoff.id,
    status: handoff.status,
    category: "embedded-prototype",
    label: handoff.label,
    detail: handoff.detail,
    evidence: handoff.evidence,
    recommendation: handoff.recommendation,
    layerIds: [],
    metric: handoff.status === "ready" ? 1 : 0,
  };
}

function getPublicPublishingRow(
  evidence: SlidesSitesSurfaceAuthoringPublicPublishingEvidence,
): SlidesSitesSurfaceAuthoringParityRow {
  return {
    id: evidence.id,
    status: evidence.status,
    category: "public-publishing",
    label: evidence.label,
    detail: evidence.detail,
    evidence: evidence.evidence,
    recommendation: evidence.recommendation,
    layerIds: [],
    metric: evidence.status === "ready" ? 1 : 0,
  };
}

function isDeckPage(page: DesignPage) {
  return /\b(deck|presentation|slide|slides)\b/i.test(page.name);
}

function isSitePage(page: DesignPage) {
  return /\b(site|sites|landing|web|website|page)\b/i.test(page.name);
}

function isDeckFrame(layer: DesignLayer) {
  if (!layer.visible || layer.height <= 0) {
    return false;
  }

  const ratio = layer.width / layer.height;

  return Math.abs(ratio - 16 / 9) <= 0.08 || Math.abs(ratio - 4 / 3) <= 0.08;
}

function getAggregateStatus(
  statuses: SlidesSitesSurfaceAuthoringParityStatus[],
) {
  if (statuses.length === 0 || statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function sortRows(
  first: SlidesSitesSurfaceAuthoringParityRow,
  second: SlidesSitesSurfaceAuthoringParityRow,
) {
  if (first.status !== second.status) {
    return statusRank[first.status] - statusRank[second.status];
  }

  if (first.category !== second.category) {
    return first.category.localeCompare(second.category);
  }

  return first.label.localeCompare(second.label);
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

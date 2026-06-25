import type {
  ProductionDeploySmokeKind,
  ProductionDeploySmokeReport,
  ProductionDeploySmokeRow,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";
import type {
  DesignActivityEvent,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type SitesResponsivePublishingStatus = ProductionDeploySmokeStatus;

export type SitesResponsivePublishingRowCategory =
  | "breakpoint-coverage"
  | "public-route-smoke"
  | "rollback-notes";

export type SitesResponsivePublishingBreakpoint = {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number | null;
  required: boolean;
  status: SitesResponsivePublishingStatus;
  matchingFrameIds: string[];
  matchingFrameNames: string[];
  responsiveSignalCount: number;
  detail: string;
  recommendation: string;
};

export type SitesResponsivePublishingRouteSmokePacket = {
  id: string;
  status: SitesResponsivePublishingStatus;
  kind: ProductionDeploySmokeKind;
  label: string;
  route: string;
  method: ProductionDeploySmokeRow["method"];
  required: boolean;
  waitFor: string;
  evidence: string;
  command: string;
  recommendation: string;
};

export type SitesResponsivePublishingRollbackNote = {
  id: string;
  status: SitesResponsivePublishingStatus;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type SitesResponsivePublishingPreflightRow = {
  id: string;
  status: SitesResponsivePublishingStatus;
  category: SitesResponsivePublishingRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  layerIds: string[];
  metric: number;
};

export type SitesResponsivePublishingPreflightReport = {
  generatedAt: string;
  status: SitesResponsivePublishingStatus;
  score: number;
  activePageId: string;
  activePageName: string;
  breakpointCount: number;
  coveredBreakpointCount: number;
  publicRouteSmokePacketCount: number;
  rollbackNoteCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  commands: string[];
  breakpoints: SitesResponsivePublishingBreakpoint[];
  publicRouteSmokePackets: SitesResponsivePublishingRouteSmokePacket[];
  rollbackNotes: SitesResponsivePublishingRollbackNote[];
  rows: SitesResponsivePublishingPreflightRow[];
};

type BreakpointDefinition = {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number | null;
  required: boolean;
};

const defaultBreakpoints: BreakpointDefinition[] = [
  {
    id: "mobile",
    label: "Mobile",
    width: 390,
    minWidth: 320,
    maxWidth: 480,
    required: true,
  },
  {
    id: "tablet",
    label: "Tablet",
    width: 768,
    minWidth: 600,
    maxWidth: 900,
    required: true,
  },
  {
    id: "desktop",
    label: "Desktop",
    width: 1440,
    minWidth: 1024,
    maxWidth: null,
    required: true,
  },
];

const publicRouteKinds = new Set<ProductionDeploySmokeKind>([
  "share",
  "prototype",
  "embed",
  "release-handoff",
]);

const statusRank: Record<SitesResponsivePublishingStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getSitesResponsivePublishingPreflightReport({
  activePage,
  document,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
}: {
  activePage: DesignPage;
  document: DesignDocument;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
}): SitesResponsivePublishingPreflightReport {
  const breakpoints = getBreakpointCoverage(activePage);
  const publicRouteSmokePackets = getPublicRouteSmokePackets(
    productionDeploySmoke,
  );
  const rollbackNotes = getRollbackNotes({
    breakpoints,
    document,
    productionDeploySmoke,
    publicRouteSmokePackets,
  });
  const rows = [
    ...breakpoints.map(getBreakpointRow),
    ...publicRouteSmokePackets.map(getRouteSmokeRow),
    ...rollbackNotes.map(getRollbackNoteRow),
  ].sort((left, right) => {
    if (left.status !== right.status) {
      return statusRank[left.status] - statusRank[right.status];
    }

    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }

    return left.label.localeCompare(right.label);
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    activePageId: activePage.id,
    activePageName: activePage.name,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 6),
    breakpointCount: breakpoints.length,
    coveredBreakpointCount: breakpoints.filter(
      (breakpoint) => breakpoint.matchingFrameIds.length > 0,
    ).length,
    publicRouteSmokePacketCount: publicRouteSmokePackets.length,
    rollbackNoteCount: rollbackNotes.length,
    readyCount,
    reviewCount,
    blockedCount,
    commands: getPreflightCommands(productionDeploySmoke),
    breakpoints,
    publicRouteSmokePackets,
    rollbackNotes,
    rows,
  };
}

export function getSitesResponsivePublishingPreflightJson(
  report: SitesResponsivePublishingPreflightReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getSitesResponsivePublishingPreflightCsv(
  report: SitesResponsivePublishingPreflightReport,
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

export function getSitesResponsivePublishingPreflightMarkdown(
  report: SitesResponsivePublishingPreflightReport,
) {
  return [
    "# Sites Responsive Publishing Preflight",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active page: ${report.activePageName}`,
    `Breakpoints: ${report.coveredBreakpointCount}/${report.breakpointCount}`,
    `Public route packets: ${report.publicRouteSmokePacketCount}`,
    `Rollback notes: ${report.rollbackNoteCount}`,
    "",
    "This packet combines breakpoint coverage, public route smoke, and rollback notes for Sites-style publishing review.",
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## breakpoint coverage",
    "",
    ...report.breakpoints.map(
      (breakpoint) =>
        `- [${breakpoint.status}] ${breakpoint.label} ${breakpoint.width}px - ${breakpoint.detail} ${breakpoint.recommendation}`,
    ),
    "",
    "## public route smoke",
    "",
    ...report.publicRouteSmokePackets.map(
      (packet) =>
        `- [${packet.status}] ${packet.label} (${packet.method} ${packet.route}) - wait for "${packet.waitFor}". Evidence: ${packet.evidence}. ${packet.recommendation}`,
    ),
    "",
    "## rollback notes",
    "",
    ...report.rollbackNotes.map(
      (note) =>
        `- [${note.status}] ${note.label} - ${note.detail} Evidence: ${note.evidence}. ${note.recommendation}`,
    ),
  ].join("\n");
}

function getBreakpointCoverage(activePage: DesignPage) {
  const frames = activePage.layers.filter(
    (layer) => layer.type === "frame" && layer.visible,
  );

  return defaultBreakpoints.map((breakpoint) => {
    const matchingFrames = frames.filter((frame) =>
      isFrameInBreakpointRange(frame, breakpoint),
    );
    const matchingFrameIds = matchingFrames.map((frame) => frame.id);
    const matchingFrameNames = matchingFrames.map((frame) => frame.name);
    const responsiveSignalCount = Math.max(
      0,
      ...matchingFrames.map((frame) =>
        getResponsiveSignalCount(activePage, frame),
      ),
    );
    const status = getBreakpointStatus({
      frameCount: matchingFrames.length,
      responsiveSignalCount,
    });

    return {
      ...breakpoint,
      status,
      matchingFrameIds,
      matchingFrameNames,
      responsiveSignalCount,
      detail: getBreakpointDetail({
        breakpoint,
        matchingFrames,
        responsiveSignalCount,
      }),
      recommendation: getBreakpointRecommendation(status, breakpoint),
    } satisfies SitesResponsivePublishingBreakpoint;
  });
}

function getPublicRouteSmokePackets(
  productionDeploySmoke: ProductionDeploySmokeReport,
): SitesResponsivePublishingRouteSmokePacket[] {
  return productionDeploySmoke.rows
    .filter((row) => publicRouteKinds.has(row.kind))
    .map((row) => ({
      id: row.id,
      status: row.status,
      kind: row.kind,
      label: row.label,
      route: row.route,
      method: row.method,
      required: row.required,
      waitFor: row.waitFor,
      evidence: row.evidence,
      command: row.command,
      recommendation: row.recommendation,
    }));
}

function getRollbackNotes({
  breakpoints,
  document,
  productionDeploySmoke,
  publicRouteSmokePackets,
}: {
  breakpoints: SitesResponsivePublishingBreakpoint[];
  document: DesignDocument;
  productionDeploySmoke: ProductionDeploySmokeReport;
  publicRouteSmokePackets: SitesResponsivePublishingRouteSmokePacket[];
}): SitesResponsivePublishingRollbackNote[] {
  const latestActivity = getLatestActivity(document.activityEvents ?? []);
  const breakpointStatus = getAggregateStatus(
    breakpoints.map((breakpoint) => breakpoint.status),
  );
  const publicRouteStatus =
    publicRouteSmokePackets.length > 0
      ? getAggregateStatus(publicRouteSmokePackets.map((packet) => packet.status))
      : "blocked";

  return [
    {
      id: "capture-content-snapshot",
      status: latestActivity ? "ready" : "review",
      label: "Content snapshot anchor",
      detail: latestActivity
        ? `Latest release activity is "${latestActivity.label}" from ${latestActivity.actorName}.`
        : "No activity event is available to anchor the publishing snapshot.",
      evidence: latestActivity?.detail ?? "Activity timeline needs a release export event.",
      recommendation:
        "Export the current page JSON and handoff Markdown before replacing a public route.",
    },
    {
      id: "restore-public-route",
      status: publicRouteStatus,
      label: "Public route restore path",
      detail: `${publicRouteSmokePackets.length} public route smoke packet${publicRouteSmokePackets.length === 1 ? "" : "s"} target ${productionDeploySmoke.baseUrl}.`,
      evidence: `Share token ${productionDeploySmoke.shareToken} is included in the route smoke handoff.`,
      recommendation:
        "Keep the last approved route packet attached to release notes so a failed publish can roll back to the previous share, prototype, embed, or handoff path.",
    },
    {
      id: "replay-responsive-breakpoints",
      status: breakpointStatus,
      label: "Responsive replay checklist",
      detail: `${breakpoints.filter((breakpoint) => breakpoint.matchingFrameIds.length > 0).length}/${breakpoints.length} required breakpoints have source frames.`,
      evidence: breakpoints
        .map(
          (breakpoint) =>
            `${breakpoint.label}: ${breakpoint.matchingFrameNames.join("; ") || "missing"}`,
        )
        .join(" | "),
      recommendation:
        "Retest mobile, tablet, and desktop frames before restoring traffic to the public Sites route.",
    },
  ];
}

function getBreakpointRow(
  breakpoint: SitesResponsivePublishingBreakpoint,
): SitesResponsivePublishingPreflightRow {
  return {
    id: `breakpoint-${breakpoint.id}`,
    status: breakpoint.status,
    category: "breakpoint-coverage",
    label: `${breakpoint.label} breakpoint coverage`,
    detail: breakpoint.detail,
    evidence: breakpoint.matchingFrameNames.join(", ") || "No matching frame",
    recommendation: breakpoint.recommendation,
    layerIds: breakpoint.matchingFrameIds,
    metric: breakpoint.matchingFrameIds.length,
  };
}

function getRouteSmokeRow(
  packet: SitesResponsivePublishingRouteSmokePacket,
): SitesResponsivePublishingPreflightRow {
  return {
    id: `route-${packet.id}`,
    status: packet.status,
    category: "public-route-smoke",
    label: `${packet.label} public route smoke`,
    detail: `${packet.method} ${packet.route} waits for ${packet.waitFor}.`,
    evidence: packet.evidence,
    recommendation: packet.recommendation,
    layerIds: [],
    metric: packet.required ? 1 : 0,
  };
}

function getRollbackNoteRow(
  note: SitesResponsivePublishingRollbackNote,
): SitesResponsivePublishingPreflightRow {
  return {
    id: `rollback-${note.id}`,
    status: note.status,
    category: "rollback-notes",
    label: `${note.label} rollback notes`,
    detail: note.detail,
    evidence: note.evidence,
    recommendation: note.recommendation,
    layerIds: [],
    metric: note.status === "ready" ? 1 : 0,
  };
}

function isFrameInBreakpointRange(
  frame: DesignLayer,
  breakpoint: BreakpointDefinition,
) {
  return (
    frame.width >= breakpoint.minWidth &&
    (breakpoint.maxWidth === null || frame.width <= breakpoint.maxWidth)
  );
}

function getResponsiveSignalCount(activePage: DesignPage, frame: DesignLayer) {
  const children = activePage.layers.filter((layer) => layer.parentId === frame.id);
  const constrainedChildCount = children.filter(
    (child) => child.constraints || child.layoutSizing,
  ).length;

  return [
    Boolean(frame.autoLayout),
    Boolean(frame.layoutSizing),
    Boolean(frame.constraints),
    Boolean(frame.layoutGrids?.some((grid) => grid.visible && grid.count > 0)),
    constrainedChildCount > 0,
  ].filter(Boolean).length;
}

function getBreakpointStatus({
  frameCount,
  responsiveSignalCount,
}: {
  frameCount: number;
  responsiveSignalCount: number;
}): SitesResponsivePublishingStatus {
  if (frameCount === 0) {
    return "blocked";
  }

  return responsiveSignalCount >= 3 ? "ready" : "review";
}

function getBreakpointDetail({
  breakpoint,
  matchingFrames,
  responsiveSignalCount,
}: {
  breakpoint: BreakpointDefinition;
  matchingFrames: DesignLayer[];
  responsiveSignalCount: number;
}) {
  if (matchingFrames.length === 0) {
    return `No visible frame covers the ${breakpoint.minWidth}px-${breakpoint.maxWidth ?? "wide"} ${breakpoint.label.toLowerCase()} breakpoint range.`;
  }

  return `${matchingFrames.length} frame${matchingFrames.length === 1 ? "" : "s"} cover ${breakpoint.label.toLowerCase()} at ${breakpoint.width}px with ${responsiveSignalCount} strongest responsive signal${responsiveSignalCount === 1 ? "" : "s"}.`;
}

function getBreakpointRecommendation(
  status: SitesResponsivePublishingStatus,
  breakpoint: BreakpointDefinition,
) {
  if (status === "blocked") {
    return `Add a ${breakpoint.width}px frame before approving Sites publish.`;
  }

  if (status === "review") {
    return "Add auto layout, layout grid, constraints, or child sizing evidence before release.";
  }

  return "Attach this breakpoint source frame to the publishing handoff.";
}

function getAggregateStatus(statuses: SitesResponsivePublishingStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function getLatestActivity(activityEvents: DesignActivityEvent[]) {
  return [...activityEvents].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0];
}

function getPreflightCommands(
  productionDeploySmoke: ProductionDeploySmokeReport,
) {
  return Array.from(
    new Set([
      ...productionDeploySmoke.commands,
      "Export Sites responsive publishing preflight JSON, CSV, and Markdown from Extensions.",
    ]),
  );
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

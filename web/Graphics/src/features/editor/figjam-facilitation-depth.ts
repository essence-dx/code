import { getCanvasAnnotationSummary } from "@/features/editor/canvas-annotation-summary";
import { getFacilitationReview } from "@/features/editor/facilitation-review";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
  DesignStampKind,
} from "@/features/editor/types";

export type FigJamFacilitationDepthStatus = "ready" | "review" | "blocked";

export type FigJamFacilitationDepthCategory =
  | "facilitator-handoff"
  | "stamps"
  | "sticky-clustering"
  | "timer"
  | "voting";

export type FigJamFacilitationDepthRow = {
  id: string;
  category: FigJamFacilitationDepthCategory;
  status: FigJamFacilitationDepthStatus;
  label: string;
  detail: string;
  recommendation: string;
  count: number;
  layerIds: string[];
};

export type FigJamStickyCluster = {
  id: string;
  pageId: string;
  pageName: string;
  status: FigJamFacilitationDepthStatus;
  label: string;
  stickyCount: number;
  layerIds: string[];
  dominantFill: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sampleTexts: string[];
  detail: string;
  recommendation: string;
};

export type FigJamFacilitatorHandoffExport = {
  id: string;
  label: string;
  filename: string;
  detail: string;
};

export type FigJamFacilitatorHandoff = {
  status: FigJamFacilitationDepthStatus;
  title: string;
  summary: string;
  checklist: string[];
  exports: FigJamFacilitatorHandoffExport[];
};

export type FigJamFacilitationDepthReport = {
  generatedAt: string;
  pageId: string;
  pageName: string;
  status: FigJamFacilitationDepthStatus;
  score: number;
  votingSessionStatus: FigJamFacilitationDepthStatus;
  timerStatus: FigJamFacilitationDepthStatus;
  stampStatus: FigJamFacilitationDepthStatus;
  stickyClusteringStatus: FigJamFacilitationDepthStatus;
  handoffStatus: FigJamFacilitationDepthStatus;
  voteCount: number;
  openCommentCount: number;
  blockerCount: number;
  stampCount: number;
  decisionStampCount: number;
  riskStampCount: number;
  stickyNoteCount: number;
  stickyClusterCount: number;
  unclusteredStickyCount: number;
  rows: FigJamFacilitationDepthRow[];
  clusters: FigJamStickyCluster[];
  facilitatorHandoff: FigJamFacilitatorHandoff;
};

export type FigJamFacilitationDepthInput = {
  activePageId?: string;
  document: DesignDocument;
  generatedAt?: string;
};

const clusterGap = 96;

export function getFigJamFacilitationDepthReport({
  activePageId,
  document,
  generatedAt = new Date().toISOString(),
}: FigJamFacilitationDepthInput): FigJamFacilitationDepthReport {
  const page =
    document.pages.find((candidate) => candidate.id === activePageId) ??
    document.pages.find((candidate) => candidate.id === document.activePageId) ??
    document.pages[0];

  if (!page) {
    return getEmptyReport(generatedAt);
  }

  const facilitation = getFacilitationReview(page);
  const canvasSummary = getCanvasAnnotationSummary(page);
  const stickyNotes = getStickyNotes(page);
  const clusterReview = getStickyClusterReview(page, stickyNotes);
  const stamps = page.layers.filter((layer) => layer.stamp);
  const decisionStampCount = countStamps(stamps, "decision");
  const riskStampCount = countStamps(stamps, "risk");
  const votingSessionStatus = getVotingStatus(page, facilitation.blockerCount);
  const timerStatus = getTimerStatus(page, facilitation.openCount);
  const stampStatus = getStampStatus({
    decisionStampCount,
    riskStampCount,
    stampCount: stamps.length,
  });
  const stickyClusteringStatus = getStickyClusteringStatus(clusterReview);
  const rows = getRows({
    canvasSummaryStampCount: canvasSummary.stampCount,
    clusterReview,
    decisionStampCount,
    facilitation,
    page,
    riskStampCount,
    stampStatus,
    stickyClusteringStatus,
    stickyNotes,
    timerStatus,
    votingSessionStatus,
  });
  const handoffStatus = getWorstStatus([
    votingSessionStatus,
    timerStatus,
    stampStatus,
    stickyClusteringStatus,
    facilitation.blockerCount > 0 ? "blocked" : "ready",
  ]);
  const facilitatorHandoff = getFacilitatorHandoff({
    handoffStatus,
    page,
    rows,
  });
  const status = getWorstStatus([...rows.map((row) => row.status), handoffStatus]);
  const blockerRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;

  return {
    generatedAt,
    pageId: page.id,
    pageName: page.name,
    status,
    score: Math.max(
      0,
      100 -
        blockerRows * 16 -
        reviewRows * 6 -
        facilitation.blockerCount * 7 -
        clusterReview.unclusteredStickyCount * 3 -
        riskStampCount * 4,
    ),
    votingSessionStatus,
    timerStatus,
    stampStatus,
    stickyClusteringStatus,
    handoffStatus,
    voteCount: facilitation.voteCount,
    openCommentCount: facilitation.openCount,
    blockerCount: facilitation.blockerCount,
    stampCount: stamps.length,
    decisionStampCount,
    riskStampCount,
    stickyNoteCount: stickyNotes.length,
    stickyClusterCount: clusterReview.clusters.length,
    unclusteredStickyCount: clusterReview.unclusteredStickyCount,
    rows: [
      ...rows,
      {
        id: "figjam-facilitator-handoff",
        category: "facilitator-handoff",
        status: handoffStatus,
        label: "Facilitator handoff",
        detail: facilitatorHandoff.summary,
        recommendation:
          handoffStatus === "ready"
            ? "Export the facilitator packet for the next operator."
            : "Resolve blocked facilitation rows before relying on the handoff.",
        count: facilitatorHandoff.exports.length,
        layerIds: [],
      },
    ],
    clusters: clusterReview.clusters,
    facilitatorHandoff,
  };
}

export function getFigJamFacilitationDepthCsv(
  report: FigJamFacilitationDepthReport,
) {
  return [
    [
      "category",
      "status",
      "label",
      "count",
      "layerIds",
      "detail",
      "recommendation",
    ],
    ...report.rows.map((row) => [
      row.category,
      row.status,
      row.label,
      row.count,
      row.layerIds.join(" "),
      row.detail,
      row.recommendation,
    ]),
    ...report.clusters.map((cluster) => [
      "sticky-clustering",
      cluster.status,
      cluster.label,
      cluster.stickyCount,
      cluster.layerIds.join(" "),
      cluster.detail,
      cluster.recommendation,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getFigJamFacilitationDepthJson(
  report: FigJamFacilitationDepthReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getFigJamFacilitationDepthMarkdown(
  report: FigJamFacilitationDepthReport,
) {
  return [
    `# ${report.pageName} FigJam Facilitation Depth`,
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Votes: ${report.voteCount}`,
    `Open comments: ${report.openCommentCount}`,
    `Stamps: ${report.stampCount}`,
    `Sticky notes: ${report.stickyNoteCount}`,
    `Sticky clusters: ${report.stickyClusterCount}`,
    "",
    "## voting",
    getRowMarkdown(report, "voting"),
    "",
    "## timer",
    getRowMarkdown(report, "timer"),
    "",
    "## stamps",
    getRowMarkdown(report, "stamps"),
    "",
    "## sticky clustering",
    ...getClusterMarkdown(report),
    "",
    "## facilitator handoff",
    `- ${report.facilitatorHandoff.status}: ${report.facilitatorHandoff.summary}`,
    ...report.facilitatorHandoff.checklist.map((item) => `- ${item}`),
    "",
    "## exports",
    ...report.facilitatorHandoff.exports.map(
      (item) => `- ${item.label}: ${item.filename} - ${item.detail}`,
    ),
  ].join("\n");
}

function getRows({
  canvasSummaryStampCount,
  clusterReview,
  decisionStampCount,
  facilitation,
  page,
  riskStampCount,
  stampStatus,
  stickyClusteringStatus,
  stickyNotes,
  timerStatus,
  votingSessionStatus,
}: {
  canvasSummaryStampCount: number;
  clusterReview: StickyClusterReview;
  decisionStampCount: number;
  facilitation: ReturnType<typeof getFacilitationReview>;
  page: DesignPage;
  riskStampCount: number;
  stampStatus: FigJamFacilitationDepthStatus;
  stickyClusteringStatus: FigJamFacilitationDepthStatus;
  stickyNotes: DesignLayer[];
  timerStatus: FigJamFacilitationDepthStatus;
  votingSessionStatus: FigJamFacilitationDepthStatus;
}): FigJamFacilitationDepthRow[] {
  const votingSession = page.facilitation?.votingSession;
  const reviewTimer = page.facilitation?.reviewTimer;

  return [
    {
      id: "figjam-voting",
      category: "voting",
      status: votingSessionStatus,
      label: votingSession?.name ?? "Voting session",
      detail: votingSession
        ? `${votingSession.status} session with ${votingSession.voteBudget} votes per participant and ${facilitation.voteCount} recorded reactions.`
        : "No voting session is configured for this board.",
      recommendation:
        votingSessionStatus === "ready"
          ? "Keep the vote open through the decision pass, then close it before handoff."
          : "Start or reopen a voting session before asking the team to prioritize notes.",
      count: facilitation.voteCount,
      layerIds: [],
    },
    {
      id: "figjam-timer",
      category: "timer",
      status: timerStatus,
      label: reviewTimer?.name ?? "Review timer",
      detail: reviewTimer
        ? `${reviewTimer.status} timer for ${reviewTimer.durationMinutes} minutes.`
        : "No timer is configured for the active facilitation round.",
      recommendation:
        timerStatus === "ready"
          ? "Use the running or finished timer as timing evidence in the handoff."
          : "Start or finish a timer so the session has clear facilitation boundaries.",
      count: reviewTimer?.durationMinutes ?? 0,
      layerIds: [],
    },
    {
      id: "figjam-stamps",
      category: "stamps",
      status: stampStatus,
      label: "Stamp coverage",
      detail: `${canvasSummaryStampCount} stamps, ${decisionStampCount} decision stamps, ${riskStampCount} risk stamps.`,
      recommendation:
        stampStatus === "ready"
          ? "Decision and approval stamps are ready for facilitator handoff."
          : "Add decision or approval stamps for outcomes, and resolve risk stamps before handoff.",
      count: canvasSummaryStampCount,
      layerIds: page.layers
        .filter((layer) => layer.stamp)
        .map((layer) => layer.id),
    },
    {
      id: "figjam-sticky-clustering",
      category: "sticky-clustering",
      status: stickyClusteringStatus,
      label: "Sticky clustering",
      detail: `${clusterReview.clusters.length} clusters from ${stickyNotes.length} sticky notes with ${clusterReview.unclusteredStickyCount} unclustered notes.`,
      recommendation:
        stickyClusteringStatus === "ready"
          ? "Clusters are ready to summarize by theme."
          : "Group isolated notes or name themes before exporting the facilitator packet.",
      count: clusterReview.clusters.length,
      layerIds: clusterReview.clusters.flatMap((cluster) => cluster.layerIds),
    },
  ];
}

function getVotingStatus(
  page: DesignPage,
  blockerCount: number,
): FigJamFacilitationDepthStatus {
  const session = page.facilitation?.votingSession;

  if (!session) {
    return blockerCount > 0 ? "blocked" : "review";
  }

  if (session.status === "open" && session.voteBudget > 0) {
    return "ready";
  }

  return "review";
}

function getTimerStatus(
  page: DesignPage,
  openCommentCount: number,
): FigJamFacilitationDepthStatus {
  const timer = page.facilitation?.reviewTimer;

  if (!timer) {
    return openCommentCount > 0 ? "blocked" : "review";
  }

  if (timer.status === "running" || timer.status === "finished") {
    return "ready";
  }

  return "review";
}

function getStampStatus({
  decisionStampCount,
  riskStampCount,
  stampCount,
}: {
  decisionStampCount: number;
  riskStampCount: number;
  stampCount: number;
}): FigJamFacilitationDepthStatus {
  if (stampCount === 0) {
    return "review";
  }

  if (riskStampCount > 0 && decisionStampCount === 0) {
    return "blocked";
  }

  if (decisionStampCount > 0) {
    return riskStampCount > 0 ? "review" : "ready";
  }

  return "review";
}

function getStickyClusteringStatus({
  clusters,
  unclusteredStickyCount,
}: StickyClusterReview): FigJamFacilitationDepthStatus {
  if (clusters.length === 0 && unclusteredStickyCount > 0) {
    return "blocked";
  }

  return unclusteredStickyCount > 0 ? "review" : "ready";
}

function getFacilitatorHandoff({
  handoffStatus,
  page,
  rows,
}: {
  handoffStatus: FigJamFacilitationDepthStatus;
  page: DesignPage;
  rows: FigJamFacilitationDepthRow[];
}): FigJamFacilitatorHandoff {
  const blockedRows = rows.filter((row) => row.status === "blocked");
  const reviewRows = rows.filter((row) => row.status === "review");

  return {
    status: handoffStatus,
    title: `${page.name} facilitator handoff`,
    summary:
      handoffStatus === "ready"
        ? "Voting, timer, stamps, and sticky clusters are ready for the next facilitator."
        : `${blockedRows.length} blocked and ${reviewRows.length} review facilitation rows need attention before handoff.`,
    checklist: [
      "Close or confirm the voting session outcome.",
      "Attach timer status and duration to the critique notes.",
      "Summarize decision, approval, risk, and question stamps.",
      "Name sticky clusters and assign any isolated notes.",
    ],
    exports: [
      {
        id: "figjam-facilitation-depth-json",
        label: "JSON evidence",
        filename: "figjam-facilitation-depth.json",
        detail: "Structured report for operators and automated checks.",
      },
      {
        id: "figjam-facilitation-depth-csv",
        label: "CSV rows",
        filename: "figjam-facilitation-depth.csv",
        detail: "Reviewable rows for spreadsheet handoff.",
      },
      {
        id: "figjam-facilitation-depth-markdown",
        label: "Markdown facilitator handoff",
        filename: "figjam-facilitation-depth.md",
        detail: "Human-readable facilitator summary.",
      },
    ],
  };
}

type StickyClusterReview = {
  clusters: FigJamStickyCluster[];
  unclusteredStickyCount: number;
};

type StickyClusterAccumulator = {
  layers: DesignLayer[];
  bounds: FigJamStickyCluster["bounds"];
};

function getStickyClusterReview(
  page: DesignPage,
  stickyNotes: DesignLayer[],
): StickyClusterReview {
  const accumulators: StickyClusterAccumulator[] = [];

  for (const layer of [...stickyNotes].sort(sortLayersByPosition)) {
    const target = accumulators.find((cluster) => isNearCluster(cluster, layer));

    if (target) {
      target.layers.push(layer);
      target.bounds = getLayerBounds(target.layers);
    } else {
      accumulators.push({
        layers: [layer],
        bounds: getLayerBounds([layer]),
      });
    }
  }

  const groupedClusters = accumulators.filter((cluster) => cluster.layers.length >= 2);

  return {
    clusters: groupedClusters.map((cluster, index) =>
      createStickyCluster(page, cluster.layers, index),
    ),
    unclusteredStickyCount: accumulators.filter(
      (cluster) => cluster.layers.length === 1,
    ).length,
  };
}

function createStickyCluster(
  page: DesignPage,
  layers: DesignLayer[],
  index: number,
): FigJamStickyCluster {
  const bounds = getLayerBounds(layers);
  const dominantFill = getDominantFill(layers);
  const sampleTexts = layers
    .map((layer) => layer.text?.trim() || layer.name)
    .filter(Boolean)
    .slice(0, 4);

  return {
    id: `figjam-sticky-cluster-${page.id}-${index + 1}`,
    pageId: page.id,
    pageName: page.name,
    status: layers.length >= 3 ? "ready" : "review",
    label: `Sticky cluster ${index + 1}`,
    stickyCount: layers.length,
    layerIds: layers.map((layer) => layer.id),
    dominantFill,
    bounds,
    sampleTexts,
    detail: `${layers.length} sticky notes grouped around ${Math.round(bounds.x)}, ${Math.round(bounds.y)}.`,
    recommendation:
      layers.length >= 3
        ? "Summarize this cluster as a named workshop theme."
        : "Confirm this pair belongs together or merge it into a stronger theme.",
  };
}

function getStickyNotes(page: DesignPage) {
  return page.layers.filter(
    (layer) => layer.type === "sticky" && !layer.stamp && layer.visible,
  );
}

function countStamps(layers: DesignLayer[], kind: DesignStampKind) {
  return layers.filter((layer) => layer.stamp?.kind === kind).length;
}

function isNearCluster(cluster: StickyClusterAccumulator, layer: DesignLayer) {
  const expanded = {
    x: cluster.bounds.x - clusterGap,
    y: cluster.bounds.y - clusterGap,
    width: cluster.bounds.width + clusterGap * 2,
    height: cluster.bounds.height + clusterGap * 2,
  };

  return (
    layer.x <= expanded.x + expanded.width &&
    layer.x + layer.width >= expanded.x &&
    layer.y <= expanded.y + expanded.height &&
    layer.y + layer.height >= expanded.y
  );
}

function getLayerBounds(layers: DesignLayer[]): FigJamStickyCluster["bounds"] {
  const minX = Math.min(...layers.map((layer) => layer.x));
  const minY = Math.min(...layers.map((layer) => layer.y));
  const maxX = Math.max(...layers.map((layer) => layer.x + layer.width));
  const maxY = Math.max(...layers.map((layer) => layer.y + layer.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getDominantFill(layers: DesignLayer[]) {
  const fills = new Map<string, number>();

  for (const layer of layers) {
    fills.set(layer.fill, (fills.get(layer.fill) ?? 0) + 1);
  }

  return (
    Array.from(fills.entries()).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0] ?? "#ffffff"
  );
}

function getWorstStatus(statuses: FigJamFacilitationDepthStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getRowMarkdown(
  report: FigJamFacilitationDepthReport,
  category: FigJamFacilitationDepthCategory,
) {
  const row = report.rows.find((item) => item.category === category);

  return row
    ? `- ${row.status}: ${row.detail} ${row.recommendation}`
    : "- No evidence available.";
}

function getClusterMarkdown(report: FigJamFacilitationDepthReport) {
  if (report.clusters.length === 0) {
    return ["- No sticky clusters detected."];
  }

  return report.clusters.map(
    (cluster) =>
      `- ${cluster.status}: ${cluster.label} (${cluster.stickyCount} notes) - ${cluster.sampleTexts.join("; ")}`,
  );
}

function getEmptyReport(generatedAt: string): FigJamFacilitationDepthReport {
  const facilitatorHandoff = getFacilitatorHandoff({
    handoffStatus: "blocked",
    page: {
      id: "missing-page",
      name: "Missing page",
      background: "#ffffff",
      layers: [],
    },
    rows: [],
  });

  return {
    generatedAt,
    pageId: "missing-page",
    pageName: "Missing page",
    status: "blocked",
    score: 0,
    votingSessionStatus: "blocked",
    timerStatus: "blocked",
    stampStatus: "blocked",
    stickyClusteringStatus: "blocked",
    handoffStatus: "blocked",
    voteCount: 0,
    openCommentCount: 0,
    blockerCount: 1,
    stampCount: 0,
    decisionStampCount: 0,
    riskStampCount: 0,
    stickyNoteCount: 0,
    stickyClusterCount: 0,
    unclusteredStickyCount: 0,
    rows: [],
    clusters: [],
    facilitatorHandoff,
  };
}

function sortLayersByPosition(left: DesignLayer, right: DesignLayer) {
  return left.x - right.x || left.y - right.y || left.id.localeCompare(right.id);
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

import { readFileSync } from "node:fs";
import {
  getFigJamFacilitationDepthCsv,
  getFigJamFacilitationDepthJson,
  getFigJamFacilitationDepthMarkdown,
  getFigJamFacilitationDepthReport,
} from "../src/features/editor/figjam-facilitation-depth";
import type {
  DesignCommentReactionKind,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T10:00:00.000Z";

const page: DesignPage = {
  id: "page-workshop",
  name: "Workshop board",
  background: "#f8fafc",
  facilitation: {
    votingSession: {
      id: "vote-1",
      name: "Prioritization vote",
      voteBudget: 3,
      status: "open",
      startedAt: now,
    },
    reviewTimer: {
      id: "timer-1",
      name: "Decision round",
      durationMinutes: 12,
      status: "running",
      startedAt: now,
    },
  },
  layers: [
    sticky("sticky-a", "Checkout friction", 100, 120, "#fef3c7"),
    sticky("sticky-b", "Guest checkout", 260, 130, "#fef3c7"),
    sticky("sticky-c", "Payment copy", 130, 300, "#fef3c7"),
    sticky("sticky-d", "Navigation labels", 560, 140, "#dbeafe"),
    sticky("sticky-e", "IA cleanup", 730, 165, "#dbeafe"),
    sticky("sticky-f", "Parking lot", 1120, 430, "#ffffff"),
    stamp("stamp-decision", "decision", 360, 360),
    stamp("stamp-risk", "risk", 760, 360),
    stamp("stamp-approved", "approved", 920, 360),
  ],
  comments: [
    {
      id: "comment-high-vote",
      x: 120,
      y: 96,
      text: "Prioritize checkout friction before the handoff.",
      assigneeName: "Mina",
      assigneeEmail: "mina@example.com",
      reactions: [
        reaction("r1", "thumbs-up"),
        reaction("r2", "thumbs-up"),
        reaction("r3", "heart"),
      ],
      replies: [],
      resolved: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "comment-needs-owner",
      x: 720,
      y: 96,
      text: "Who owns navigation label decisions?",
      reactions: [reaction("r4", "eyes")],
      replies: [
        {
          id: "reply-1",
          text: "Need facilitator assignment.",
          authorName: "Sam",
          createdAt: now,
          updatedAt: now,
        },
      ],
      resolved: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "comment-resolved",
      x: 360,
      y: 420,
      text: "Decision stamp is accepted.",
      assigneeName: "Ira",
      assigneeEmail: "ira@example.com",
      reactions: [reaction("r5", "check")],
      replies: [],
      resolved: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
};

const document: DesignDocument = {
  version: 1,
  activePageId: page.id,
  pages: [page],
  variables: {},
  components: {},
  updatedAt: now,
};

const report = getFigJamFacilitationDepthReport({
  activePageId: page.id,
  document,
  generatedAt: now,
});

assert(report.status === "blocked", "Missing facilitator owner should block the report.");
assert(report.score < 100, "Blocked workshop evidence should lower the readiness score.");
assert(report.votingSessionStatus === "ready", "Open voting session should be ready.");
assert(report.timerStatus === "ready", "Running timer should be ready.");
assert(report.stampCount === 3, "All stamp layers should be counted.");
assert(report.decisionStampCount === 1, "Decision stamps should be counted separately.");
assert(report.riskStampCount === 1, "Risk stamps should be counted separately.");
assert(report.stickyNoteCount === 6, "Only non-stamp sticky notes should count as notes.");
assert(report.stickyClusterCount === 2, "Nearby sticky notes should be clustered.");
assert(report.unclusteredStickyCount === 1, "Distant sticky notes should remain unclustered.");
assert(report.facilitatorHandoff.status === "blocked", "Handoff should inherit blockers.");
assert(report.facilitatorHandoff.exports.length === 3, "JSON, CSV, and Markdown exports should be listed.");
assert(
  report.rows.some((row) => row.category === "sticky-clustering" && row.status === "review"),
  "Sticky clustering row should surface unclustered notes for review.",
);
assert(
  report.clusters.some(
    (cluster) =>
      cluster.stickyCount === 3 &&
      cluster.layerIds.includes("sticky-a") &&
      cluster.layerIds.includes("sticky-c"),
  ),
  "Cluster output should preserve sticky layer ids for selection.",
);

const markdown = getFigJamFacilitationDepthMarkdown(report);
const csv = getFigJamFacilitationDepthCsv(report);
const json = JSON.parse(getFigJamFacilitationDepthJson(report)) as {
  clusters: unknown[];
  facilitatorHandoff: { exports: unknown[] };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("FigJam Facilitation Depth"), "Markdown should include a clear title.");
assert(markdown.includes("voting"), "Markdown should include voting evidence.");
assert(markdown.includes("timer"), "Markdown should include timer evidence.");
assert(markdown.includes("stamps"), "Markdown should include stamp evidence.");
assert(markdown.includes("sticky clustering"), "Markdown should include clustering evidence.");
assert(markdown.includes("facilitator handoff"), "Markdown should include facilitator handoff.");
assert(csv.includes("sticky-clustering"), "CSV should include sticky clustering rows.");
assert(json.clusters.length === report.stickyClusterCount, "JSON should include cluster details.");
assert(
  json.facilitatorHandoff.exports.length === 3,
  "JSON handoff should preserve export manifest.",
);
assert(
  packageJson.scripts["editor:figjam-facilitation-depth-smoke"]?.includes(
    "figjam-facilitation-depth-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `FigJam facilitation depth smoke passed: ${report.stickyClusterCount} clusters, score ${report.score}.`,
);

function sticky(
  id: string,
  text: string,
  x: number,
  y: number,
  fill: string,
): DesignLayer {
  return {
    id,
    type: "sticky",
    name: text,
    x,
    y,
    width: 180,
    height: 120,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill,
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 8,
    text,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1.25,
    letterSpacing: 0,
    textAlign: "left",
    textColor: "#111827",
  };
}

function stamp(
  id: string,
  kind: NonNullable<DesignLayer["stamp"]>["kind"],
  x: number,
  y: number,
): DesignLayer {
  return {
    ...sticky(id, `${kind} stamp`, x, y, "#ffffff"),
    stamp: { kind },
  };
}

function reaction(
  id: string,
  kind: DesignCommentReactionKind,
) {
  return {
    id,
    kind,
    actorName: "Reviewer",
    actorEmail: "reviewer@example.com",
    createdAt: now,
  };
}

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

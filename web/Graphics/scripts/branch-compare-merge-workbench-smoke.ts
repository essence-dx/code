import { readFileSync } from "node:fs";
import {
  getBranchCompareMergeWorkbenchCsv,
  getBranchCompareMergeWorkbenchJson,
  getBranchCompareMergeWorkbenchMarkdown,
  getBranchCompareMergeWorkbenchReport,
} from "../src/features/editor/branch-compare-merge-workbench";
import type {
  DesignDocument,
  DesignLayer,
  DesignMergeReviewRecord,
} from "../src/features/editor/types";
import type { DesignFileVersionSummary } from "../src/features/files/actions";

const generatedAt = "2026-05-19T10:00:00.000Z";
const sourceVersionId = "version-rollback-anchor";
const sourceDocument = createDocument({
  name: "Main source",
  updatedAt: "2026-05-19T08:00:00.000Z",
  layers: [
    layer("hero", "Hero frame", { x: 48, y: 48, width: 640, height: 360 }),
    layer("cta", "CTA", { x: 96, y: 300, width: 140, height: 44 }),
  ],
});
const currentDocument = {
  ...createDocument({
    name: "Branch candidate",
    updatedAt: "2026-05-19T09:30:00.000Z",
    layers: [
      layer("hero", "Hero frame", { x: 64, y: 60, width: 720, height: 420 }),
      layer("cta", "CTA primary", { x: 128, y: 330, width: 168, height: 48 }),
      layer("trust", "Trust badge", { x: 420, y: 330, width: 120, height: 36 }),
    ],
    variables: {
      brand: "#14b8a6",
      accent: "#f59e0b",
    },
  }),
  branchMetadata: {
    id: "branch-checkout",
    branchFileId: "file-branch-checkout",
    branchName: "Checkout release polish",
    status: "active",
    mergeIntent: "release-candidate",
    sourceFileId: "file-main",
    sourceFileName: "Checkout main",
    sourceVersionId,
    sourceVersionName: "Main checkpoint",
    restorePointVersionId: sourceVersionId,
    restorePointName: "Rollback before checkout branch",
    createdByName: "Priya Designer",
    createdByEmail: "priya@example.com",
    createdAt: "2026-05-19T08:05:00.000Z",
    updatedAt: "2026-05-19T09:30:00.000Z",
    targetFileId: "file-main",
    targetFileName: "Checkout main",
  },
  mergeReviews: [
    mergeReview({
      sourceVersionId,
      sourceVersionName: "Main checkpoint",
      reviewerName: "Ari Reviewer",
      reviewerEmail: "ari@example.com",
    }),
  ],
} satisfies DesignDocument;
const unsignedDocument = {
  ...currentDocument,
  mergeReviews: [],
  branchMetadata: {
    ...currentDocument.branchMetadata,
    restorePointVersionId: null,
  },
} satisfies DesignDocument;
const versions: DesignFileVersionSummary[] = [
  {
    id: sourceVersionId,
    name: "Main checkpoint",
    document: sourceDocument,
    createdAt: "2026-05-19T08:00:00.000Z",
  },
];

const readyReport = getBranchCompareMergeWorkbenchReport({
  currentDocument,
  generatedAt,
  selectedVersionId: sourceVersionId,
  versions,
});
const blockedReport = getBranchCompareMergeWorkbenchReport({
  currentDocument: unsignedDocument,
  generatedAt,
  selectedVersionId: sourceVersionId,
  versions,
});
const markdown = getBranchCompareMergeWorkbenchMarkdown(readyReport);
const csv = getBranchCompareMergeWorkbenchCsv(readyReport);
const json = JSON.parse(getBranchCompareMergeWorkbenchJson(readyReport)) as {
  rows: unknown[];
  summary: {
    visualDiffCount: number;
    conflictSectionCount: number;
    reviewerSignoffCount: number;
    rollbackAnchorCount: number;
    auditExportEvidenceCount: number;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);
const workspaceSidebarSource = readFileSync(
  "src/features/editor/components/workspace-sidebar.tsx",
  "utf8",
);

assert(readyReport.status === "review", "Signed branch should still require review for risky visual diffs.");
assert(readyReport.visualDiffCount > 0, "Workbench should count visual diff rows.");
assert(readyReport.conflictSectionCount > 0, "Workbench should count changed merge sections.");
assert(readyReport.unresolvedConflictCount === 0, "Signed review should resolve changed merge sections.");
assert(readyReport.reviewerSignoffCount === 1, "Reviewer signoff should be detected.");
assert(readyReport.rollbackAnchorCount === 1, "Rollback anchor should be detected.");
assert(readyReport.auditExportEvidenceCount >= 3, "Audit export evidence should be listed.");
assert(
  readyReport.rows.some((row) => row.category === "visual-diff"),
  "Rows should include visual diff evidence.",
);
assert(
  readyReport.rows.some((row) => row.category === "merge-conflict"),
  "Rows should include merge conflict section evidence.",
);
assert(
  readyReport.rows.some((row) => row.category === "reviewer-signoff"),
  "Rows should include reviewer signoff evidence.",
);
assert(
  readyReport.rows.some((row) => row.category === "rollback-anchor"),
  "Rows should include rollback anchor evidence.",
);
assert(blockedReport.status === "blocked", "Unsigned branch compare should block release.");
assert(blockedReport.unresolvedConflictCount > 0, "Unsigned branch should count unresolved conflicts.");
assert(blockedReport.rollbackAnchorCount === 0, "Missing rollback anchor should be counted.");
assert(markdown.includes("Branch Compare Merge Workbench"), "Markdown should include a clear title.");
assert(markdown.includes("Reviewer Signoff"), "Markdown should include reviewer signoff.");
assert(csv.includes("merge-conflict"), "CSV should include merge conflict rows.");
assert(json.rows.length === readyReport.rows.length, "JSON should preserve all rows.");
assert(json.summary.visualDiffCount === readyReport.visualDiffCount, "JSON summary should include visual diff count.");
assert(json.summary.conflictSectionCount === readyReport.conflictSectionCount, "JSON summary should include conflict sections.");
assert(json.summary.reviewerSignoffCount === 1, "JSON summary should include reviewer signoff count.");
assert(json.summary.rollbackAnchorCount === 1, "JSON summary should include rollback anchors.");
assert(json.summary.auditExportEvidenceCount === readyReport.auditExportEvidenceCount, "JSON summary should include audit exports.");
assert(
  /BranchCompareMergeWorkbenchPanel/.test(extensionsSource) &&
    /getBranchCompareMergeWorkbenchReport/.test(extensionsSource),
  "Extensions should wire the branch compare workbench panel and report.",
);
assert(
  /versions/.test(workspaceSidebarSource) &&
    /BranchCompareMergeWorkbenchPanel/.test(extensionsSource),
  "Version summaries should flow into the Extensions workbench.",
);
assert(
  packageJson.scripts["editor:branch-compare-merge-workbench-smoke"]?.includes(
    "branch-compare-merge-workbench-smoke",
  ),
  "Targeted branch compare workbench smoke command should be listed.",
);

console.log(
  `Branch compare merge workbench smoke passed: ${readyReport.score} score, ${readyReport.visualDiffCount} visual diffs.`,
);

function createDocument({
  name,
  updatedAt,
  layers,
  variables = {
    brand: "#14b8a6",
  },
}: {
  name: string;
  updatedAt: string;
  layers: DesignLayer[];
  variables?: Record<string, string>;
}): DesignDocument {
  return {
    version: 1,
    activePageId: "page-main",
    pages: [
      {
        id: "page-main",
        name,
        background: "#0f172a",
        layers,
        comments: [],
      },
    ],
    variables,
    components: {},
    updatedAt,
  };
}

function layer(
  id: string,
  name: string,
  bounds: Pick<DesignLayer, "height" | "width" | "x" | "y">,
): DesignLayer {
  return {
    id,
    type: "rectangle",
    name,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    fill: "#14b8a6",
    stroke: "#0f766e",
    strokeWidth: 1,
    cornerRadius: 8,
  };
}

function mergeReview({
  sourceVersionId,
  sourceVersionName,
  reviewerName,
  reviewerEmail,
}: {
  sourceVersionId: string;
  sourceVersionName: string;
  reviewerName: string;
  reviewerEmail: string;
}): DesignMergeReviewRecord {
  return {
    id: "merge-review-checkout",
    sourceVersionId,
    sourceVersionName,
    reviewerName,
    reviewerEmail,
    notes: "Visual diffs reviewed with rollback checkpoint ready.",
    decisions: [
      {
        sectionId: "pages",
        label: "Pages",
        decision: "accept-incoming",
        changed: true,
        currentCount: 1,
        incomingCount: 1,
      },
      {
        sectionId: "variables",
        label: "Variables",
        decision: "accept-incoming",
        changed: true,
        currentCount: 2,
        incomingCount: 1,
      },
    ],
    acceptedSectionIds: ["pages", "variables"],
    keptSectionIds: ["components", "styles", "libraries"],
    conflictFamilies: ["layout", "design-system"],
    rollbackVersionId: sourceVersionId,
    createdAt: "2026-05-19T09:45:00.000Z",
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

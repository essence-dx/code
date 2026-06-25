import type {
  DesignBranchMergeIntent,
  DesignBranchMetadata,
  DesignBranchStatus,
  DesignDocument,
} from "@/features/editor/types";

export type AdminDesignBranchStatus = "ready" | "review" | "blocked";

export type AdminDesignBranchRowKind =
  | "coverage"
  | "restore-point"
  | "merge-intent"
  | "activity"
  | "staleness";

export type AdminDesignBranchFileInput = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  createdAt: string;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminDesignBranchVersionInput = {
  id: string;
  fileId: string;
  versionName: string;
  createdAt: string;
};

export type AdminDesignBranchRecord = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  branchName: string;
  branchStatus: DesignBranchStatus;
  mergeIntent: DesignBranchMergeIntent;
  sourceFileId: string;
  sourceFileName: string;
  sourceVersionId: string;
  sourceVersionName: string;
  restorePointVersionId: string | null;
  restorePointName: string;
  hasRestorePoint: boolean;
  activityCount: number;
  ageDays: number;
  updatedAgeDays: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminDesignBranchRow = {
  id: string;
  status: AdminDesignBranchStatus;
  kind: AdminDesignBranchRowKind;
  branchName: string;
  fileName: string;
  ownerEmail: string;
  summary: string;
  detail: string;
  recommendation: string;
};

export type AdminDesignBranchReport = {
  generatedAt: string;
  status: AdminDesignBranchStatus;
  score: number;
  branchCount: number;
  activeBranchCount: number;
  reviewIntentCount: number;
  missingRestorePointCount: number;
  staleBranchCount: number;
  records: AdminDesignBranchRecord[];
  rows: AdminDesignBranchRow[];
  commands: string[];
};

export function getAdminDesignBranchReport({
  files,
  versions,
}: {
  files: AdminDesignBranchFileInput[];
  versions: AdminDesignBranchVersionInput[];
}): AdminDesignBranchReport {
  const generatedAt = new Date().toISOString();
  const versionsByFile = groupVersionsByFile(versions);
  const records = files
    .filter((file) => !file.trashedAt && file.document.branchMetadata)
    .map((file) =>
      toBranchRecord(file, versionsByFile.get(file.fileId) ?? []),
    )
    .sort((left, right) => right.ageDays - left.ageDays);
  const rows = records.flatMap(toBranchRows);

  if (records.length === 0) {
    rows.push({
      id: "branch-coverage-empty",
      status: "review",
      kind: "coverage",
      branchName: "No active branches",
      fileName: "Workspace",
      ownerEmail: "workspace",
      summary: "No first-class branch metadata has been recorded yet.",
      detail:
        "Create a branch from a named version to capture source version, merge intent, restore point, and admin visibility.",
      recommendation:
        "Use Versions > Branch from on a named version before large design changes.",
    });
  }

  const missingRestorePointCount = records.filter(
    (record) => !record.hasRestorePoint,
  ).length;
  const staleBranchCount = records.filter(isStaleBranch).length;
  const reviewIntentCount = records.filter(
    (record) =>
      record.mergeIntent === "review" ||
      record.mergeIntent === "release-candidate",
  ).length;
  const activeBranchCount = records.filter(
    (record) => record.branchStatus === "active",
  ).length;
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;
  const score = Math.max(0, 100 - blockedRows * 25 - reviewRows * 8);
  const status: AdminDesignBranchStatus =
    blockedRows > 0 ? "blocked" : reviewRows > 0 ? "review" : "ready";

  return {
    generatedAt,
    status,
    score,
    branchCount: records.length,
    activeBranchCount,
    reviewIntentCount,
    missingRestorePointCount,
    staleBranchCount,
    records,
    rows,
    commands: [
      "Create branches from Versions > Branch from before risky file changes.",
      "Use merge intent to route review, hotfix, and release-candidate branches.",
      "Export Admin > Governance > Design branches before release reviews.",
    ],
  };
}

export function getAdminDesignBranchJson(report: AdminDesignBranchReport) {
  return JSON.stringify(report, null, 2);
}

export function getAdminDesignBranchCsv(report: AdminDesignBranchReport) {
  const header: Array<keyof AdminDesignBranchRow> = [
    "id",
    "status",
    "kind",
    "branchName",
    "fileName",
    "ownerEmail",
    "summary",
    "detail",
    "recommendation",
  ];

  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getAdminDesignBranchMarkdown(report: AdminDesignBranchReport) {
  return [
    "# Design Branch Governance",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Branches: ${report.branchCount}`,
    `Active branches: ${report.activeBranchCount}`,
    `Review intent branches: ${report.reviewIntentCount}`,
    `Missing restore points: ${report.missingRestorePointCount}`,
    `Stale branches: ${report.staleBranchCount}`,
    "",
    "## Review Rows",
    ...report.rows.map(
      (row) =>
        `- ${row.status.toUpperCase()} ${row.branchName}: ${row.summary} ${row.recommendation}`,
    ),
    "",
    "## Operator Commands",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function toBranchRecord(
  file: AdminDesignBranchFileInput,
  versions: AdminDesignBranchVersionInput[],
): AdminDesignBranchRecord {
  const metadata = file.document.branchMetadata as DesignBranchMetadata;
  const restorePoint = versions.find(
    (version) =>
      version.id === metadata.restorePointVersionId ||
      version.versionName === metadata.restorePointName,
  );
  const activityCount = (file.document.activityEvents ?? []).filter(
    (event) => event.kind === "branch",
  ).length;

  return {
    id: metadata.id,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    branchName: metadata.branchName,
    branchStatus: metadata.status,
    mergeIntent: metadata.mergeIntent,
    sourceFileId: metadata.sourceFileId,
    sourceFileName: metadata.sourceFileName,
    sourceVersionId: metadata.sourceVersionId,
    sourceVersionName: metadata.sourceVersionName,
    restorePointVersionId: metadata.restorePointVersionId,
    restorePointName: metadata.restorePointName,
    hasRestorePoint: Boolean(restorePoint),
    activityCount,
    ageDays: getAgeDays(metadata.createdAt),
    updatedAgeDays: getAgeDays(metadata.updatedAt),
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  };
}

function toBranchRows(record: AdminDesignBranchRecord) {
  const rows: AdminDesignBranchRow[] = [
    {
      id: `${record.id}-coverage`,
      status: "ready",
      kind: "coverage",
      branchName: record.branchName,
      fileName: record.fileName,
      ownerEmail: record.ownerEmail,
      summary: `${record.mergeIntent} branch from ${record.sourceFileName}.`,
      detail: `Source version: ${record.sourceVersionName}. Branch status: ${record.branchStatus}.`,
      recommendation:
        "Keep source version and merge intent intact until merge review is complete.",
    },
    {
      id: `${record.id}-restore`,
      status: record.hasRestorePoint ? "ready" : "blocked",
      kind: "restore-point",
      branchName: record.branchName,
      fileName: record.fileName,
      ownerEmail: record.ownerEmail,
      summary: record.hasRestorePoint
        ? `Restore point ${record.restorePointName} is available.`
        : `Restore point ${record.restorePointName} is missing.`,
      detail: record.restorePointVersionId
        ? `Expected version id: ${record.restorePointVersionId}.`
        : "Branch metadata has no restore point version id.",
      recommendation: record.hasRestorePoint
        ? "Use this checkpoint if branch work needs to be reset."
        : "Create a named version for this branch before merge or release work.",
    },
    {
      id: `${record.id}-merge-intent`,
      status: isReviewIntent(record.mergeIntent) ? "review" : "ready",
      kind: "merge-intent",
      branchName: record.branchName,
      fileName: record.fileName,
      ownerEmail: record.ownerEmail,
      summary: `Merge intent is ${record.mergeIntent}.`,
      detail: "Admin review can prioritize branches by intent before release.",
      recommendation: isReviewIntent(record.mergeIntent)
        ? "Route this branch through compare and reviewer decision before merge."
        : "Promote to review intent when the exploration is ready to land.",
    },
    {
      id: `${record.id}-activity`,
      status: record.activityCount > 0 ? "ready" : "review",
      kind: "activity",
      branchName: record.branchName,
      fileName: record.fileName,
      ownerEmail: record.ownerEmail,
      summary: `${record.activityCount} branch activity events captured.`,
      detail: `Created ${record.ageDays} days ago and updated ${record.updatedAgeDays} days ago.`,
      recommendation:
        "Keep branch activity events so admin exports explain where the branch came from.",
    },
  ];

  if (isStaleBranch(record)) {
    rows.push({
      id: `${record.id}-stale`,
      status: "review",
      kind: "staleness",
      branchName: record.branchName,
      fileName: record.fileName,
      ownerEmail: record.ownerEmail,
      summary: `Active branch is ${record.ageDays} days old.`,
      detail: "Long-running branches are more likely to drift from source files.",
      recommendation:
        "Refresh from the source file or complete merge review before release handoff.",
    });
  }

  return rows;
}

function isReviewIntent(intent: DesignBranchMergeIntent) {
  return intent === "review" || intent === "release-candidate";
}

function isStaleBranch(record: AdminDesignBranchRecord) {
  return record.branchStatus === "active" && record.ageDays >= 30;
}

function groupVersionsByFile(versions: AdminDesignBranchVersionInput[]) {
  return versions.reduce<Map<string, AdminDesignBranchVersionInput[]>>(
    (groups, version) => {
      const existing = groups.get(version.fileId) ?? [];
      existing.push(version);
      groups.set(version.fileId, existing);
      return groups;
    },
    new Map(),
  );
}

function getAgeDays(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

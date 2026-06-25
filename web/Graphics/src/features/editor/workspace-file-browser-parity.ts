import type { DesignFileSummary } from "@/features/files/actions";

export type WorkspaceFileBrowserParityStatus =
  | "blocked"
  | "ready"
  | "review";

export type WorkspaceFileBrowserParityRowCategory =
  | "creation-import-handoff"
  | "owner-transfer"
  | "permission-recent"
  | "workspace-scope";

export type WorkspaceFileBrowserParityRow = {
  id: string;
  status: WorkspaceFileBrowserParityStatus;
  category: WorkspaceFileBrowserParityRowCategory;
  label: string;
  detail: string;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type WorkspaceFileBrowserParityOwnerTransferQueueItem = {
  id: string;
  status: WorkspaceFileBrowserParityStatus;
  fileId: string;
  fileName: string;
  currentRole: DesignFileSummary["accessRole"];
  teamName: string;
  projectName: string;
  scope: string;
  reason: string;
  candidateRole: string;
  detail: string;
};

export type WorkspaceFileBrowserParityHandoffCapabilities = {
  accessDialogEnabled?: boolean;
  creationEnabled?: boolean;
  importHandoffEnabled?: boolean;
  inventoryExportEnabled?: boolean;
  organizationDialogEnabled?: boolean;
};

export type WorkspaceFileBrowserParityReport = {
  generatedAt: string;
  status: WorkspaceFileBrowserParityStatus;
  score: number;
  fileCount: number;
  teamScopeCount: number;
  projectScopeCount: number;
  draftQueueCount: number;
  permissionAwareRecentCount: number;
  ownerTransferQueueCount: number;
  creationImportHandoffCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  ownerTransferQueue: WorkspaceFileBrowserParityOwnerTransferQueueItem[];
  rows: WorkspaceFileBrowserParityRow[];
};

const statusRank: Record<WorkspaceFileBrowserParityStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getWorkspaceFileBrowserParityReport({
  files,
  generatedAt = new Date().toISOString(),
  handoffCapabilities = {},
}: {
  files: DesignFileSummary[];
  generatedAt?: string;
  handoffCapabilities?: WorkspaceFileBrowserParityHandoffCapabilities;
}): WorkspaceFileBrowserParityReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const teamScopeCount = countUnique(
    activeFiles.map((file) => normalizedLabel(file.teamName, "Personal")),
  );
  const projectScopeCount = countUnique(
    activeFiles.map(
      (file) =>
        `${normalizedLabel(file.teamName, "Personal")}::${normalizedLabel(
          file.projectName,
          "Drafts",
        )}`,
    ),
  );
  const draftQueueCount = activeFiles.filter(isDraftLike).length;
  const permissionAwareRecentCount = activeFiles.filter(
    isPermissionAwareRecent,
  ).length;
  const ownerTransferQueue = getOwnerTransferQueue(activeFiles);
  const creationImportHandoffEvidence = getCreationImportHandoffEvidence({
    activeFiles,
    handoffCapabilities,
  });
  const rows = getRows({
    activeFileCount: activeFiles.length,
    creationImportHandoffEvidence,
    draftQueueCount,
    ownerTransferQueue,
    permissionAwareRecentCount,
    projectScopeCount,
    teamScopeCount,
  }).sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    fileCount: activeFiles.length,
    teamScopeCount,
    projectScopeCount,
    draftQueueCount,
    permissionAwareRecentCount,
    ownerTransferQueueCount: ownerTransferQueue.length,
    creationImportHandoffCount: creationImportHandoffEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    ownerTransferQueue,
    rows,
  };
}

export function getWorkspaceFileBrowserParityJson(
  report: WorkspaceFileBrowserParityReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getWorkspaceFileBrowserParityCsv(
  report: WorkspaceFileBrowserParityReport,
) {
  return [
    [
      "id",
      "status",
      "category",
      "label",
      "metric",
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
        row.evidence,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "section,ownerTransferQueue",
    ["fileId", "status", "fileName", "currentRole", "teamName", "projectName", "reason"].join(
      ",",
    ),
    ...report.ownerTransferQueue.map((item) =>
      [
        item.fileId,
        item.status,
        item.fileName,
        item.currentRole,
        item.teamName,
        item.projectName,
        item.reason,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getWorkspaceFileBrowserParityMarkdown(
  report: WorkspaceFileBrowserParityReport,
) {
  return [
    "# Workspace File Browser Parity",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Files: ${report.fileCount}`,
    `Teams: ${report.teamScopeCount}`,
    `Projects: ${report.projectScopeCount}`,
    `Draft queue: ${report.draftQueueCount}`,
    `Permission-aware recents: ${report.permissionAwareRecentCount}`,
    `Owner transfer queues: ${report.ownerTransferQueueCount}`,
    `Creation/import handoff: ${report.creationImportHandoffCount}`,
    "",
    "This packet covers teams, projects, drafts, permission-aware recents, owner transfer queues, and creation/import handoff.",
    "",
    "## review rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Evidence: ${row.evidence}. ${row.recommendation}`,
    ),
    "",
    "## owner transfer queue",
    "",
    ...(report.ownerTransferQueue.length > 0
      ? report.ownerTransferQueue.map(
          (item) =>
            `- [${item.status}] ${item.fileName}: ${item.detail}`,
        )
      : ["- No owner transfer queue candidates in the current workspace."]),
  ].join("\n");
}

function getRows({
  activeFileCount,
  creationImportHandoffEvidence,
  draftQueueCount,
  ownerTransferQueue,
  permissionAwareRecentCount,
  projectScopeCount,
  teamScopeCount,
}: {
  activeFileCount: number;
  creationImportHandoffEvidence: string[];
  draftQueueCount: number;
  ownerTransferQueue: WorkspaceFileBrowserParityOwnerTransferQueueItem[];
  permissionAwareRecentCount: number;
  projectScopeCount: number;
  teamScopeCount: number;
}): WorkspaceFileBrowserParityRow[] {
  return [
    {
      id: "workspace-scope:teams-projects-drafts",
      status:
        activeFileCount === 0
          ? "blocked"
          : teamScopeCount > 0 && projectScopeCount > 0 && draftQueueCount > 0
            ? "ready"
            : "review",
      category: "workspace-scope",
      label: "Teams, projects, and drafts",
      detail: `${teamScopeCount} team scope${teamScopeCount === 1 ? "" : "s"}, ${projectScopeCount} project scope${projectScopeCount === 1 ? "" : "s"}, and ${draftQueueCount} draft queue file${draftQueueCount === 1 ? "" : "s"} are represented.`,
      evidence: `${teamScopeCount} teams | ${projectScopeCount} projects | ${draftQueueCount} drafts`,
      recommendation:
        "Keep team/project grouping and the draft queue visible before scaling file counts.",
      metric: teamScopeCount + projectScopeCount + draftQueueCount,
    },
    {
      id: "permission-recent:coverage",
      status:
        permissionAwareRecentCount > 1
          ? "ready"
          : permissionAwareRecentCount === 1
            ? "review"
            : "blocked",
      category: "permission-recent",
      label: "Permission-aware recents",
      detail: `${permissionAwareRecentCount} recently opened file${permissionAwareRecentCount === 1 ? "" : "s"} preserve access-role context in the browser surface.`,
      evidence: `${permissionAwareRecentCount} recent files with role metadata`,
      recommendation:
        "Sort recent work with role badges intact so owners, editors, commenters, and viewers can act safely.",
      metric: permissionAwareRecentCount,
    },
    {
      id: "owner-transfer:queue",
      status: ownerTransferQueue.length > 0 ? "ready" : "review",
      category: "owner-transfer",
      label: "Owner transfer queues",
      detail: `${ownerTransferQueue.length} shared file${ownerTransferQueue.length === 1 ? "" : "s"} are queued with role and scope context for owner-transfer review.`,
      evidence:
        ownerTransferQueue
          .slice(0, 4)
          .map((item) => `${item.fileName}:${item.currentRole}`)
          .join(" | ") || "No current transfer candidates",
      recommendation:
        "Review non-owner shared files before organization moves or ownership changes.",
      metric: ownerTransferQueue.length,
    },
    {
      id: "creation-import-handoff:coverage",
      status:
        creationImportHandoffEvidence.length >= 2
          ? "ready"
          : creationImportHandoffEvidence.length === 1
            ? "review"
            : "blocked",
      category: "creation-import-handoff",
      label: "Creation/import handoff",
      detail: `${creationImportHandoffEvidence.length} creation, import, organization, access, inventory, or handoff signal${creationImportHandoffEvidence.length === 1 ? "" : "s"} are wired into the file browser path.`,
      evidence:
        creationImportHandoffEvidence.join(" | ") ||
        "No creation/import handoff evidence",
      recommendation:
        "Keep creation, imported handoff context, inventory export, organization, and access controls reachable from the file browser workflow.",
      metric: creationImportHandoffEvidence.length,
    },
  ];
}

function getOwnerTransferQueue(
  files: DesignFileSummary[],
): WorkspaceFileBrowserParityOwnerTransferQueueItem[] {
  return files
    .filter(isOwnerTransferCandidate)
    .map((file) => {
      const handoffSignals =
        file.readyForDevCount + file.prototypeHotspotCount + file.openCommentCount;
      const reason =
        file.accessRole === "editor"
          ? "editor-steward"
          : file.accessRole === "commenter"
            ? "review-steward"
            : "viewer-dependent";

      return {
        id: `owner-transfer:${file.id}`,
        status: file.accessRole === "editor" ? "ready" : "review",
        fileId: file.id,
        fileName: file.name,
        currentRole: file.accessRole,
        teamName: normalizedLabel(file.teamName, "Personal"),
        projectName: normalizedLabel(file.projectName, "Drafts"),
        scope: file.scope,
        reason,
        candidateRole:
          file.accessRole === "editor"
            ? "ownership candidate"
            : "handoff reviewer",
        detail: `${file.accessRole} access on ${file.scope} scope with ${handoffSignals} handoff/review signal${handoffSignals === 1 ? "" : "s"}.`,
      };
    });
}

function getCreationImportHandoffEvidence({
  activeFiles,
  handoffCapabilities,
}: {
  activeFiles: DesignFileSummary[];
  handoffCapabilities: WorkspaceFileBrowserParityHandoffCapabilities;
}) {
  const evidence: string[] = [];
  const handoffFileCount = activeFiles.filter(isHandoffLike).length;

  if (handoffCapabilities.creationEnabled) {
    evidence.push("new file command");
  }

  if (handoffCapabilities.importHandoffEnabled) {
    evidence.push("imported handoff context");
  }

  if (handoffCapabilities.inventoryExportEnabled) {
    evidence.push("workspace inventory export");
  }

  if (handoffCapabilities.organizationDialogEnabled) {
    evidence.push("team/project organization dialog");
  }

  if (handoffCapabilities.accessDialogEnabled) {
    evidence.push("permission management dialog");
  }

  if (handoffFileCount > 0) {
    evidence.push(`${handoffFileCount} handoff-ready file${handoffFileCount === 1 ? "" : "s"}`);
  }

  return evidence;
}

function isDraftLike(file: DesignFileSummary) {
  return (
    file.scope === "private" ||
    normalizedLabel(file.projectName, "Drafts").toLowerCase().includes("draft")
  );
}

function isPermissionAwareRecent(file: DesignFileSummary) {
  return file.lastOpenedAt !== null && Boolean(file.accessRole);
}

function isHandoffLike(file: DesignFileSummary) {
  return file.readyForDevCount > 0 || file.prototypeHotspotCount > 0;
}

function isOwnerTransferCandidate(file: DesignFileSummary) {
  return (
    file.accessRole !== "owner" &&
    (file.scope !== "private" ||
      isHandoffLike(file) ||
      file.openCommentCount > 0)
  );
}

function countUnique(values: string[]) {
  return new Set(values).size;
}

function normalizedLabel(value: string, fallback: string) {
  return value.trim() || fallback;
}

function sortRows(
  first: WorkspaceFileBrowserParityRow,
  second: WorkspaceFileBrowserParityRow,
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

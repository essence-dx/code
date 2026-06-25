import type { DesignFileSummary } from "@/features/files/actions";

export type FileGovernanceReviewStatus = "ready" | "review" | "blocked";

export type FileGovernanceReviewKind =
  | "comments"
  | "duplicate"
  | "handoff"
  | "organization"
  | "scope"
  | "stale"
  | "trash";

export type FileGovernanceReviewRow = {
  id: string;
  status: FileGovernanceReviewStatus;
  kind: FileGovernanceReviewKind;
  fileId?: string;
  fileName?: string;
  label: string;
  detail: string;
  count: number;
  teamName?: string;
  projectName?: string;
  updatedAt?: string;
};

export type FileGovernanceReviewReport = {
  score: number;
  fileCount: number;
  activeFileCount: number;
  sharedFileCount: number;
  publicFileCount: number;
  exposedDraftCount: number;
  staleFileCount: number;
  duplicateNameCount: number;
  openCommentFileCount: number;
  handoffWithOpenCommentsCount: number;
  trashedReviewFileCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: FileGovernanceReviewRow[];
};

const staleFileWindowMs = 45 * 24 * 60 * 60 * 1000;
const largeProjectFileCount = 16;

export function getFileGovernanceReview({
  files,
  now = Date.now(),
}: {
  files: DesignFileSummary[];
  now?: number;
}): FileGovernanceReviewReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const rows: FileGovernanceReviewRow[] = [];
  const publicFiles = activeFiles.filter((file) => file.scope === "public");
  const sharedFiles = activeFiles.filter(isSharedFile);
  const exposedDrafts = activeFiles.filter(
    (file) => isDraftLike(file) && file.scope !== "private",
  );
  const staleFiles = activeFiles.filter(
    (file) =>
      !file.favorite &&
      now - getFileTime(file.updatedAt) >= staleFileWindowMs,
  );
  const openCommentFiles = activeFiles.filter(
    (file) => file.openCommentCount > 0,
  );
  const handoffWithOpenComments = activeFiles.filter(
    (file) => isHandoffFile(file) && file.openCommentCount > 0,
  );
  const trashedReviewFiles = files.filter(
    (file) =>
      Boolean(file.trashedAt) &&
      (file.openCommentCount > 0 || isHandoffFile(file)),
  );
  const duplicateGroups = getDuplicateFileGroups(activeFiles);
  const largeProjects = getProjectGroups(activeFiles).filter(
    (group) => group.files.length >= largeProjectFileCount,
  );

  for (const file of publicFiles) {
    rows.push({
      id: `public-${file.id}`,
      status: isHandoffFile(file) ? "blocked" : "review",
      kind: "scope",
      fileId: file.id,
      fileName: file.name,
      label: "Public workspace scope",
      detail: isHandoffFile(file)
        ? "Public file includes Dev Mode or prototype handoff signals."
        : "Public files should be reviewed before handoff.",
      count: file.readyForDevCount + file.prototypeHotspotCount,
      teamName: file.teamName,
      projectName: file.projectName,
      updatedAt: file.updatedAt,
    });
  }

  for (const file of exposedDrafts) {
    rows.push({
      id: `draft-exposure-${file.id}`,
      status: "blocked",
      kind: "scope",
      fileId: file.id,
      fileName: file.name,
      label: "Draft is exposed",
      detail: "Draft-like files should stay private until review is complete.",
      count: 1,
      teamName: file.teamName,
      projectName: file.projectName,
      updatedAt: file.updatedAt,
    });
  }

  for (const file of handoffWithOpenComments) {
    rows.push({
      id: `handoff-open-comments-${file.id}`,
      status: "review",
      kind: "handoff",
      fileId: file.id,
      fileName: file.name,
      label: "Handoff has open comments",
      detail: `${file.openCommentCount} open comment${file.openCommentCount === 1 ? "" : "s"} remain on a handoff-ready file.`,
      count: file.openCommentCount,
      teamName: file.teamName,
      projectName: file.projectName,
      updatedAt: file.updatedAt,
    });
  }

  for (const file of trashedReviewFiles) {
    rows.push({
      id: `trash-review-${file.id}`,
      status: "review",
      kind: "trash",
      fileId: file.id,
      fileName: file.name,
      label: "Trashed file has review signals",
      detail: "Trash contains comments, Dev Mode readiness, or prototype hotspots.",
      count:
        file.openCommentCount +
        file.readyForDevCount +
        file.prototypeHotspotCount,
      teamName: file.teamName,
      projectName: file.projectName,
      updatedAt: file.trashedAt ?? file.updatedAt,
    });
  }

  for (const group of duplicateGroups) {
    rows.push({
      id: `duplicate-${group.key}`,
      status: "review",
      kind: "duplicate",
      label: "Duplicate file names",
      detail: `${group.name} appears ${group.files.length} times in ${group.teamName} / ${group.projectName}.`,
      count: group.files.length,
      teamName: group.teamName,
      projectName: group.projectName,
      updatedAt: getLatestUpdatedAt(group.files),
    });
  }

  for (const file of staleFiles.slice(0, 8)) {
    rows.push({
      id: `stale-${file.id}`,
      status: "review",
      kind: "stale",
      fileId: file.id,
      fileName: file.name,
      label: "Stale active file",
      detail: `${file.name} has not been updated for ${formatAge(now - getFileTime(file.updatedAt))}.`,
      count: 1,
      teamName: file.teamName,
      projectName: file.projectName,
      updatedAt: file.updatedAt,
    });
  }

  for (const project of largeProjects) {
    rows.push({
      id: `large-project-${project.key}`,
      status: "review",
      kind: "organization",
      label: "Large project group",
      detail: `${project.projectName} contains ${project.files.length} active files.`,
      count: project.files.length,
      teamName: project.teamName,
      projectName: project.projectName,
      updatedAt: getLatestUpdatedAt(project.files),
    });
  }

  if (openCommentFiles.length > 0) {
    rows.push({
      id: "open-comment-queue",
      status: "ready",
      kind: "comments",
      label: "Open comment queue",
      detail: `${openCommentFiles.length} file${openCommentFiles.length === 1 ? "" : "s"} contain open comments.`,
      count: openCommentFiles.reduce(
        (total, file) => total + file.openCommentCount,
        0,
      ),
      updatedAt: getLatestUpdatedAt(openCommentFiles),
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: "file-governance-ready",
      status: "ready",
      kind: "scope",
      label: activeFiles.length > 0 ? "Workspace governance is ready" : "No files yet",
      detail:
        activeFiles.length > 0
          ? "No exposed drafts, stale active files, duplicate names, or handoff review blockers detected."
          : "Create a file to begin workspace governance review.",
      count: activeFiles.length,
    });
  }

  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    fileCount: files.length,
    activeFileCount: activeFiles.length,
    sharedFileCount: sharedFiles.length,
    publicFileCount: publicFiles.length,
    exposedDraftCount: exposedDrafts.length,
    staleFileCount: staleFiles.length,
    duplicateNameCount: duplicateGroups.reduce(
      (count, group) => count + group.files.length,
      0,
    ),
    openCommentFileCount: openCommentFiles.length,
    handoffWithOpenCommentsCount: handoffWithOpenComments.length,
    trashedReviewFileCount: trashedReviewFiles.length,
    blockedCount,
    reviewCount,
    readyCount,
    rows,
  };
}

export function getFileGovernanceReviewCsv(
  report: FileGovernanceReviewReport,
  rows: FileGovernanceReviewRow[] = report.rows,
) {
  const header: Array<keyof FileGovernanceReviewRow> = [
    "id",
    "status",
    "kind",
    "fileId",
    "fileName",
    "label",
    "detail",
    "count",
    "teamName",
    "projectName",
    "updatedAt",
  ];

  return [
    [
      "score",
      "files",
      "active_files",
      "shared_files",
      "public_files",
      "exposed_drafts",
      "stale_files",
      "duplicates",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.fileCount,
      report.activeFileCount,
      report.sharedFileCount,
      report.publicFileCount,
      report.exposedDraftCount,
      report.staleFileCount,
      report.duplicateNameCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) => header.map((key) => escapeCsvCell(row[key])).join(",")),
  ].join("\n");
}

export function getFileGovernanceReviewMarkdown(
  report: FileGovernanceReviewReport,
  rows: FileGovernanceReviewRow[] = report.rows,
) {
  return [
    "# File Governance Review",
    "",
    `Score: ${report.score}`,
    `Files: ${report.fileCount}`,
    `Active files: ${report.activeFileCount}`,
    `Shared files: ${report.sharedFileCount}`,
    `Public files: ${report.publicFileCount}`,
    `Exposed drafts: ${report.exposedDraftCount}`,
    `Stale files: ${report.staleFileCount}`,
    `Duplicate names: ${report.duplicateNameCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail}${row.fileName ? ` (${row.fileName})` : ""}`,
        )
      : ["- No file governance review rows."]),
  ].join("\n");
}

function isDraftLike(file: DesignFileSummary) {
  return (
    file.scope === "private" ||
    file.projectName.toLowerCase().includes("draft") ||
    file.name.toLowerCase().includes("draft")
  );
}

function isHandoffFile(file: DesignFileSummary) {
  return file.readyForDevCount > 0 || file.prototypeHotspotCount > 0;
}

function isSharedFile(file: DesignFileSummary) {
  return file.accessRole !== "owner" || file.scope !== "private";
}

function getDuplicateFileGroups(files: DesignFileSummary[]) {
  const groups = new Map<string, DesignFileSummary[]>();

  for (const file of files) {
    const key = [
      file.teamName.trim().toLowerCase(),
      file.projectName.trim().toLowerCase(),
      file.name.trim().toLowerCase(),
    ].join("::");
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  return Array.from(groups.entries())
    .map(([key, groupFiles]) => ({
      key,
      name: groupFiles[0]?.name ?? key,
      teamName: groupFiles[0]?.teamName ?? "Personal",
      projectName: groupFiles[0]?.projectName ?? "Drafts",
      files: groupFiles,
    }))
    .filter((group) => group.files.length > 1);
}

function getProjectGroups(files: DesignFileSummary[]) {
  const groups = new Map<string, DesignFileSummary[]>();

  for (const file of files) {
    const key = `${file.teamName.trim().toLowerCase()}::${file.projectName.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  return Array.from(groups.entries()).map(([key, groupFiles]) => ({
    key,
    teamName: groupFiles[0]?.teamName ?? "Personal",
    projectName: groupFiles[0]?.projectName ?? "Drafts",
    files: groupFiles,
  }));
}

function getLatestUpdatedAt(files: DesignFileSummary[]) {
  return files
    .map((file) => file.updatedAt)
    .sort((first, second) => getFileTime(second) - getFileTime(first))[0];
}

function getFileTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function formatAge(value: number) {
  const days = Math.max(1, Math.round(value / (24 * 60 * 60 * 1000)));

  return `${days} day${days === 1 ? "" : "s"}`;
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

import type { FileAccessMember } from "@/features/files/permissions";

export type FileAccessReviewStatus = "ready" | "review" | "blocked";

export type FileAccessReviewKind =
  | "commenter"
  | "domain"
  | "editor"
  | "owner"
  | "stale"
  | "viewer";

export type FileAccessReviewRow = {
  id: string;
  status: FileAccessReviewStatus;
  kind: FileAccessReviewKind;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  label: string;
  detail: string;
  count: number;
  createdAt?: string;
};

export type FileAccessReviewReport = {
  score: number;
  memberCount: number;
  collaboratorCount: number;
  ownerCount: number;
  editorCount: number;
  commenterCount: number;
  viewerCount: number;
  externalCollaboratorCount: number;
  externalEditorCount: number;
  staleCollaboratorCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: FileAccessReviewRow[];
};

const staleCollaboratorWindowMs = 60 * 24 * 60 * 60 * 1000;
const editorReviewCount = 4;

export function getFileAccessReview({
  members,
  now = Date.now(),
}: {
  members: FileAccessMember[];
  now?: number;
}): FileAccessReviewReport {
  const rows: FileAccessReviewRow[] = [];
  const owners = members.filter((member) => member.role === "owner");
  const collaborators = members.filter((member) => member.role !== "owner");
  const editors = members.filter((member) => member.role === "editor");
  const commenters = members.filter((member) => member.role === "commenter");
  const viewers = members.filter((member) => member.role === "viewer");
  const ownerDomain = getEmailDomain(owners[0]?.email);
  const externalCollaborators = ownerDomain
    ? collaborators.filter((member) => getEmailDomain(member.email) !== ownerDomain)
    : [];
  const externalEditors = externalCollaborators.filter(
    (member) => member.role === "editor",
  );
  const staleCollaborators = collaborators.filter(
    (member) =>
      now - getMemberTime(member.createdAt) >= staleCollaboratorWindowMs,
  );

  if (owners.length === 0) {
    rows.push({
      id: "owner-missing",
      status: "blocked",
      kind: "owner",
      label: "Owner access missing",
      detail: "This access list does not include a file owner.",
      count: 0,
    });
  }

  if (owners.length > 1) {
    rows.push({
      id: "multiple-owners",
      status: "blocked",
      kind: "owner",
      label: "Multiple owners detected",
      detail: `${owners.length} owner rows are present.`,
      count: owners.length,
    });
  }

  for (const member of externalEditors) {
    rows.push({
      id: `external-editor-${member.userId}`,
      status: "blocked",
      kind: "domain",
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      label: "External editor",
      detail: `${member.email} can edit from outside ${ownerDomain}.`,
      count: 1,
      createdAt: member.createdAt,
    });
  }

  if (editors.length >= editorReviewCount) {
    rows.push({
      id: "many-editors",
      status: "review",
      kind: "editor",
      label: "Editor-heavy file",
      detail: `${editors.length} collaborators can edit this file.`,
      count: editors.length,
      createdAt: getLatestCreatedAt(editors),
    });
  }

  for (const member of staleCollaborators.slice(0, 8)) {
    rows.push({
      id: `stale-${member.userId}`,
      status: "review",
      kind: "stale",
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      label: "Stale collaborator",
      detail: `${member.email} has had ${member.roleLabel.toLowerCase()} access for ${formatAge(now - getMemberTime(member.createdAt))}.`,
      count: 1,
      createdAt: member.createdAt,
    });
  }

  for (const member of externalCollaborators.filter(
    (item) => item.role !== "editor",
  )) {
    rows.push({
      id: `external-${member.userId}`,
      status: "review",
      kind: "domain",
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      label: "External collaborator",
      detail: `${member.email} is outside ${ownerDomain}.`,
      count: 1,
      createdAt: member.createdAt,
    });
  }

  if (commenters.length > 0) {
    rows.push({
      id: "commenter-access",
      status: "ready",
      kind: "commenter",
      label: "Comment review access",
      detail: `${commenters.length} collaborator${commenters.length === 1 ? "" : "s"} can comment without editing.`,
      count: commenters.length,
      createdAt: getLatestCreatedAt(commenters),
    });
  }

  if (viewers.length > 0) {
    rows.push({
      id: "viewer-access",
      status: "ready",
      kind: "viewer",
      label: "View-only access",
      detail: `${viewers.length} collaborator${viewers.length === 1 ? "" : "s"} can view without editing.`,
      count: viewers.length,
      createdAt: getLatestCreatedAt(viewers),
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: "access-ready",
      status: "ready",
      kind: "owner",
      label: members.length > 0 ? "Access is ready" : "Access list empty",
      detail:
        members.length > 0
          ? "No external editors, stale collaborators, or owner issues detected."
          : "Load access rows to review file permissions.",
      count: members.length,
      createdAt: getLatestCreatedAt(members),
    });
  }

  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 6),
    memberCount: members.length,
    collaboratorCount: collaborators.length,
    ownerCount: owners.length,
    editorCount: editors.length,
    commenterCount: commenters.length,
    viewerCount: viewers.length,
    externalCollaboratorCount: externalCollaborators.length,
    externalEditorCount: externalEditors.length,
    staleCollaboratorCount: staleCollaborators.length,
    blockedCount,
    reviewCount,
    readyCount,
    rows,
  };
}

export function getFileAccessReviewCsv(
  report: FileAccessReviewReport,
  rows: FileAccessReviewRow[] = report.rows,
) {
  const header: Array<keyof FileAccessReviewRow> = [
    "id",
    "status",
    "kind",
    "userId",
    "name",
    "email",
    "role",
    "label",
    "detail",
    "count",
    "createdAt",
  ];

  return [
    [
      "score",
      "members",
      "collaborators",
      "owners",
      "editors",
      "commenters",
      "viewers",
      "external_collaborators",
      "external_editors",
      "stale_collaborators",
    ].join(","),
    [
      report.score,
      report.memberCount,
      report.collaboratorCount,
      report.ownerCount,
      report.editorCount,
      report.commenterCount,
      report.viewerCount,
      report.externalCollaboratorCount,
      report.externalEditorCount,
      report.staleCollaboratorCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) => header.map((key) => escapeCsvCell(row[key])).join(",")),
  ].join("\n");
}

export function getFileAccessReviewMarkdown(
  report: FileAccessReviewReport,
  rows: FileAccessReviewRow[] = report.rows,
) {
  return [
    "# File Access Review",
    "",
    `Score: ${report.score}`,
    `Members: ${report.memberCount}`,
    `Collaborators: ${report.collaboratorCount}`,
    `Owners: ${report.ownerCount}`,
    `Editors: ${report.editorCount}`,
    `Commenters: ${report.commenterCount}`,
    `Viewers: ${report.viewerCount}`,
    `External collaborators: ${report.externalCollaboratorCount}`,
    `Stale collaborators: ${report.staleCollaboratorCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail}${row.email ? ` (${row.email})` : ""}`,
        )
      : ["- No file access review rows."]),
  ].join("\n");
}

function getEmailDomain(email?: string | null) {
  const domain = email?.split("@")[1]?.trim().toLowerCase();

  return domain || null;
}

function getLatestCreatedAt(members: FileAccessMember[]) {
  return members
    .map((member) => member.createdAt)
    .sort((first, second) => getMemberTime(second) - getMemberTime(first))[0];
}

function getMemberTime(value: string) {
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

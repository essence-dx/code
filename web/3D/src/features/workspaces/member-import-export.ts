import type { WorkspaceDashboard, WorkspaceInviteRole, WorkspaceRole } from "@/features/workspaces/types";

export type WorkspaceMemberImportStatus =
  | "blocked-role"
  | "duplicate-import"
  | "duplicate-member"
  | "duplicate-pending-invite"
  | "invalid-email"
  | "invite-ready"
  | "needs-admin-approval";

export interface WorkspaceMemberImportDraft {
  email: string;
  name?: string;
  role: string;
  sourceLine: number;
}

export interface WorkspaceMemberImportPlanRow {
  email: string;
  name: string;
  normalizedRole: WorkspaceInviteRole | "owner" | null;
  reason: string;
  role: string;
  sourceLine: number;
  status: WorkspaceMemberImportStatus;
}

export interface WorkspaceMemberImportPlan {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  invitesToCreate: Array<{
    email: string;
    name: string;
    role: WorkspaceInviteRole;
    sourceLine: number;
  }>;
  rows: WorkspaceMemberImportPlanRow[];
  summary: {
    duplicateMemberCount: number;
    importDuplicateCount: number;
    invalidCount: number;
    inviteReadyCount: number;
    pendingInviteDuplicateCount: number;
    roleSafetyBlockedCount: number;
    totalRows: number;
  };
  workspace: {
    id: string;
    name: string;
  };
}

export interface WorkspaceMemberDirectoryExport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    memberCount: number;
    pendingInviteCount: number;
  };
}

const inviteRoles = new Set<WorkspaceInviteRole>(["admin", "editor", "viewer"]);
const validRoles = new Set<WorkspaceInviteRole | "owner">(["admin", "editor", "owner", "viewer"]);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(value: string): WorkspaceInviteRole | "owner" | null {
  const role = value.trim().toLowerCase();

  return validRoles.has(role as WorkspaceInviteRole | "owner") ? (role as WorkspaceInviteRole | "owner") : null;
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeCsvValue(value: string | number) {
  const text = String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function parseCsvRecord(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

function resolveHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.includes(header.trim().toLowerCase()));
}

export function parseWorkspaceMemberImportCsv(content: string): WorkspaceMemberImportDraft[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line, index) => ({ index: index + 1, line }))
    .filter((entry) => entry.line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvRecord(lines[0]!.line);
  const emailIndex = resolveHeaderIndex(headers, ["email", "member_email", "invite_email"]);
  const nameIndex = resolveHeaderIndex(headers, ["name", "member_name", "display_name"]);
  const roleIndex = resolveHeaderIndex(headers, ["role", "workspace_role", "invite_role"]);
  const hasHeader = emailIndex >= 0 || roleIndex >= 0;

  return lines.slice(hasHeader ? 1 : 0).map((entry) => {
    const values = parseCsvRecord(entry.line);

    return {
      email: values[hasHeader && emailIndex >= 0 ? emailIndex : 0] ?? "",
      name: values[hasHeader && nameIndex >= 0 ? nameIndex : 1],
      role: values[hasHeader && roleIndex >= 0 ? roleIndex : 2] ?? "viewer",
      sourceLine: entry.index,
    };
  });
}

function rowReason(status: WorkspaceMemberImportStatus, role: string) {
  switch (status) {
    case "blocked-role":
      return role.trim().toLowerCase() === "owner" ? "Owner access cannot be imported; owners must be assigned through workspace ownership." : "Role is not allowed for workspace invites.";
    case "duplicate-import":
      return "This email appears more than once in the import file.";
    case "duplicate-member":
      return "This email already belongs to a workspace member.";
    case "duplicate-pending-invite":
      return "This email already has an active workspace invite.";
    case "invalid-email":
      return "Email must be a valid address before an invite can be created.";
    case "needs-admin-approval":
      return "Admin invites require explicit confirmation before bulk creation.";
    case "invite-ready":
      return "Ready to create a workspace invite.";
  }
}

function classifyImportRow(input: {
  allowAdminInvites: boolean;
  draft: WorkspaceMemberImportDraft;
  importEmails: Set<string>;
  memberEmails: Set<string>;
  pendingInviteEmails: Set<string>;
}): WorkspaceMemberImportPlanRow {
  const email = normalizeEmail(input.draft.email);
  const role = input.draft.role.trim() || "viewer";
  const normalizedRole = normalizeRole(role);
  let status: WorkspaceMemberImportStatus = "invite-ready";

  if (!email || !isEmailLike(email)) {
    status = "invalid-email";
  } else if (input.importEmails.has(email)) {
    status = "duplicate-import";
  } else if (!normalizedRole || normalizedRole === "owner") {
    status = "blocked-role";
  } else if (input.memberEmails.has(email)) {
    status = "duplicate-member";
  } else if (input.pendingInviteEmails.has(email)) {
    status = "duplicate-pending-invite";
  } else if (normalizedRole === "admin" && !input.allowAdminInvites) {
    status = "needs-admin-approval";
  }

  if (status !== "invalid-email") {
    input.importEmails.add(email);
  }

  return {
    email,
    name: input.draft.name?.trim() || "Pending invite",
    normalizedRole,
    reason: rowReason(status, role),
    role,
    sourceLine: input.draft.sourceLine,
    status,
  };
}

function createWorkspaceMemberImportCsv(plan: Pick<WorkspaceMemberImportPlan, "rows">) {
  const header = ["email", "role", "status", "name", "source_line", "reason"];
  const lines = plan.rows.map((row) =>
    [row.email, row.normalizedRole ?? row.role, row.status, row.name, row.sourceLine, row.reason]
      .map(escapeCsvValue)
      .join(","),
  );

  return `${[header.join(","), ...lines].join("\n")}\n`;
}

export function createWorkspaceMemberImportPlan(input: {
  allowAdminInvites?: boolean;
  rows: WorkspaceMemberImportDraft[];
  workspace: WorkspaceDashboard;
}): WorkspaceMemberImportPlan {
  const memberEmails = new Set(input.workspace.members.map((member) => normalizeEmail(member.email)));
  const pendingInviteEmails = new Set(input.workspace.invites.map((invite) => normalizeEmail(invite.email)));
  const importEmails = new Set<string>();
  const rows = input.rows
    .map((draft) =>
      classifyImportRow({
        allowAdminInvites: Boolean(input.allowAdminInvites),
        draft,
        importEmails,
        memberEmails,
        pendingInviteEmails,
      }),
    )
    .sort((first, second) => first.sourceLine - second.sourceLine);
  const invitesToCreate = rows
    .filter((row): row is WorkspaceMemberImportPlanRow & { normalizedRole: WorkspaceInviteRole } => row.status === "invite-ready" && Boolean(row.normalizedRole) && inviteRoles.has(row.normalizedRole as WorkspaceInviteRole))
    .map((row) => ({
      email: row.email,
      name: row.name,
      role: row.normalizedRole,
      sourceLine: row.sourceLine,
    }));
  const reportWithoutCsv = {
    csvContent: "",
    csvDataUri: "",
    csvFileName: `${input.workspace.id}-member-import-plan.csv`,
    invitesToCreate,
    rows,
    summary: {
      duplicateMemberCount: rows.filter((row) => row.status === "duplicate-member").length,
      importDuplicateCount: rows.filter((row) => row.status === "duplicate-import").length,
      invalidCount: rows.filter((row) => row.status === "invalid-email").length,
      inviteReadyCount: invitesToCreate.length,
      pendingInviteDuplicateCount: rows.filter((row) => row.status === "duplicate-pending-invite").length,
      roleSafetyBlockedCount: rows.filter((row) => row.status === "blocked-role" || row.status === "needs-admin-approval").length,
      totalRows: rows.length,
    },
    workspace: {
      id: input.workspace.id,
      name: input.workspace.name,
    },
  } satisfies WorkspaceMemberImportPlan;
  const csvContent = createWorkspaceMemberImportCsv(reportWithoutCsv);

  return {
    ...reportWithoutCsv,
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
  };
}

export function createWorkspaceMemberDirectoryExport(workspace: WorkspaceDashboard): WorkspaceMemberDirectoryExport {
  const rows = [
    ...workspace.members.map((member) => ({
      createdAt: member.joinedAt,
      email: member.email,
      name: member.name,
      role: member.role,
      status: "active",
      type: "member",
    })),
    ...workspace.invites.map((invite) => ({
      createdAt: invite.createdAt,
      email: invite.email,
      name: "Pending invite",
      role: invite.role as WorkspaceRole,
      status: `expires ${invite.expiresAt}`,
      type: "pending_invite",
    })),
  ];
  const csvContent = `${[
    "type,email,name,role,status,created_at",
    ...rows.map((row) => [row.type, row.email, row.name, row.role, row.status, row.createdAt].map(escapeCsvValue).join(",")),
  ].join("\n")}\n`;
  const jsonContent = `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      invites: workspace.invites,
      members: workspace.members,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    },
    null,
    2,
  )}\n`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${workspace.id}-member-directory.csv`,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${workspace.id}-member-directory.json`,
    summary: {
      memberCount: workspace.members.length,
      pendingInviteCount: workspace.invites.length,
    },
  };
}

import type { ProjectAccessRole } from "@/features/projects/access-types";
import type { WorkspaceMemberRow, WorkspaceRole } from "@/features/workspaces/types";

type DateLike = Date | string | null | undefined;

export type RoleAccessReviewAttestationStatus = "approved" | "needs-review" | "reminder-due";
export type RoleAccessReviewCampaignStatus = "blocked" | "ready" | "watch";

export interface RoleAccessReviewProjectSource {
  archivedAt: DateLike;
  folderId: string | null;
  id: string;
  name: string;
  updatedAt: DateLike;
  userId: string;
}

export interface RoleAccessReviewProjectGrantSource {
  projectId: string;
  role: ProjectAccessRole;
  userId: string;
}

export interface RoleAccessReviewFolderGrantSource {
  folderId: string;
  role: ProjectAccessRole;
  userId: string;
}

export interface RoleAccessReviewCampaignRow {
  activeSessionCount: number;
  attestationStatus: RoleAccessReviewAttestationStatus;
  directProjectGrantCount: number;
  folderGrantCount: number;
  grantEvidence: string;
  memberEmail: string;
  memberId: string;
  memberName: string;
  nextAction: string;
  ownedProjectCount: number;
  privilegedGrantCount: number;
  reminderLabel: string;
  reviewScopeCount: number;
  userId: string;
  workspaceRole: WorkspaceRole;
}

export interface RoleAccessReviewCampaignReport {
  campaignId: string;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  reminders: RoleAccessReviewCampaignRow[];
  rows: RoleAccessReviewCampaignRow[];
  scopeHash: string;
  summary: {
    attestationRequiredCount: number;
    campaignScore: number;
    directProjectGrantCount: number;
    folderGrantCount: number;
    memberCount: number;
    privilegedGrantCount: number;
    reminderDueCount: number;
    reviewedCount: number;
    totalGrantCount: number;
    worstStatus: RoleAccessReviewCampaignStatus;
  };
  workspace: {
    id: string;
    name: string;
  };
}

export interface CreateRoleAccessReviewCampaignReportInput {
  activeSessionsByUserId?: Record<string, number>;
  folderAccessGrants: RoleAccessReviewFolderGrantSource[];
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  projectAccessGrants: RoleAccessReviewProjectGrantSource[];
  projects: RoleAccessReviewProjectSource[];
  workspace: {
    id: string;
    name: string;
  };
}

const attestationRank: Record<RoleAccessReviewAttestationStatus, number> = {
  "reminder-due": 0,
  "needs-review": 1,
  approved: 2,
};

function isArchived(value: DateLike) {
  return Boolean(value);
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isWorkspacePrivileged(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}

function isGrantPrivileged(role: ProjectAccessRole) {
  return role === "admin";
}

function escapeCsvValue(value: string | number) {
  const text = String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function stableHash(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function createCampaignScopeHash(input: { rows: RoleAccessReviewCampaignRow[]; workspaceId: string }) {
  return stableHash({
    rows: input.rows
      .map((row) => ({
        activeSessionCount: row.activeSessionCount,
        attestationStatus: row.attestationStatus,
        directProjectGrantCount: row.directProjectGrantCount,
        folderGrantCount: row.folderGrantCount,
        memberId: row.memberId,
        ownedProjectCount: row.ownedProjectCount,
        privilegedGrantCount: row.privilegedGrantCount,
        reviewScopeCount: row.reviewScopeCount,
        userId: row.userId,
        workspaceRole: row.workspaceRole,
      }))
      .sort((first, second) => first.memberId.localeCompare(second.memberId)),
    workspaceId: input.workspaceId,
  });
}

function rowAttestationStatus(input: {
  activeSessionCount: number;
  ownedProjectCount: number;
  privilegedGrantCount: number;
  totalGrantCount: number;
  workspaceRole: WorkspaceRole;
}): RoleAccessReviewAttestationStatus {
  const requiresReview = isWorkspacePrivileged(input.workspaceRole) || input.ownedProjectCount > 0 || input.privilegedGrantCount > 0;

  if (!requiresReview) {
    return "approved";
  }

  return input.activeSessionCount === 0 ? "reminder-due" : "needs-review";
}

function createGrantEvidence(input: {
  directProjectGrantCount: number;
  folderGrantCount: number;
  ownedProjectCount: number;
  privilegedGrantCount: number;
}) {
  return [
    countLabel(input.directProjectGrantCount, "direct project grant"),
    countLabel(input.folderGrantCount, "folder grant"),
    countLabel(input.ownedProjectCount, "owned active project"),
    countLabel(input.privilegedGrantCount, "admin grant"),
  ].join(", ");
}

function createReminderLabel(status: RoleAccessReviewAttestationStatus) {
  if (status === "approved") {
    return "No reminder";
  }

  return status === "reminder-due" ? "Reminder due now" : "Awaiting owner attestation";
}

function createNextAction(status: RoleAccessReviewAttestationStatus) {
  if (status === "approved") {
    return "No access review action is required for this member.";
  }

  return status === "reminder-due"
    ? "Send a role-access review reminder and require attestation before the next release gate."
    : "Collect role-access attestation from the workspace owner or admin before closing the campaign.";
}

function createRows(input: CreateRoleAccessReviewCampaignReportInput): RoleAccessReviewCampaignRow[] {
  const activeProjects = input.projects.filter((project) => !isArchived(project.archivedAt));

  return input.members
    .map<RoleAccessReviewCampaignRow>((member) => {
      const ownedProjectCount = activeProjects.filter((project) => project.userId === member.userId).length;
      const directProjectGrants = input.projectAccessGrants.filter((grant) => grant.userId === member.userId);
      const folderGrants = input.folderAccessGrants.filter((grant) => grant.userId === member.userId);
      const privilegedGrantCount = directProjectGrants.filter((grant) => isGrantPrivileged(grant.role)).length + folderGrants.filter((grant) => isGrantPrivileged(grant.role)).length;
      const activeSessionCount = input.activeSessionsByUserId?.[member.userId] ?? 0;
      const attestationStatus = rowAttestationStatus({
        activeSessionCount,
        ownedProjectCount,
        privilegedGrantCount,
        totalGrantCount: directProjectGrants.length + folderGrants.length,
        workspaceRole: member.role,
      });
      const reviewScopeCount = ownedProjectCount + directProjectGrants.length + folderGrants.length + (isWorkspacePrivileged(member.role) ? 1 : 0);

      return {
        activeSessionCount,
        attestationStatus,
        directProjectGrantCount: directProjectGrants.length,
        folderGrantCount: folderGrants.length,
        grantEvidence: createGrantEvidence({
          directProjectGrantCount: directProjectGrants.length,
          folderGrantCount: folderGrants.length,
          ownedProjectCount,
          privilegedGrantCount,
        }),
        memberEmail: member.email,
        memberId: member.id,
        memberName: member.name,
        nextAction: createNextAction(attestationStatus),
        ownedProjectCount,
        privilegedGrantCount,
        reminderLabel: createReminderLabel(attestationStatus),
        reviewScopeCount,
        userId: member.userId,
        workspaceRole: member.role,
      };
    })
    .sort(
      (first, second) =>
        attestationRank[first.attestationStatus] - attestationRank[second.attestationStatus] ||
        second.reviewScopeCount - first.reviewScopeCount ||
        first.memberEmail.localeCompare(second.memberEmail),
    );
}

function campaignScore(rows: RoleAccessReviewCampaignRow[]) {
  const reminderPenalty = rows.filter((row) => row.attestationStatus === "reminder-due").length * 18;
  const reviewPenalty = rows.filter((row) => row.attestationStatus === "needs-review").length * 8;
  const privilegedGrantPenalty = rows.reduce((sum, row) => sum + row.privilegedGrantCount * 6, 0);

  return Math.max(0, Math.min(100, Math.round(100 - reminderPenalty - reviewPenalty - privilegedGrantPenalty)));
}

function worstStatus(rows: RoleAccessReviewCampaignRow[]): RoleAccessReviewCampaignStatus {
  if (rows.some((row) => row.attestationStatus === "reminder-due")) {
    return "blocked";
  }

  return rows.some((row) => row.attestationStatus === "needs-review") ? "watch" : "ready";
}

export function createRoleAccessReviewCampaignCsv(report: Pick<RoleAccessReviewCampaignReport, "rows">) {
  const header = [
    "member_email",
    "workspace_role",
    "attestation_status",
    "active_sessions",
    "owned_projects",
    "direct_project_grants",
    "folder_grants",
    "privileged_grants",
    "reminder",
    "next_action",
  ];
  const lines = report.rows.map((row) =>
    [
      row.memberEmail,
      row.workspaceRole,
      row.attestationStatus,
      row.activeSessionCount,
      row.ownedProjectCount,
      row.directProjectGrantCount,
      row.folderGrantCount,
      row.privilegedGrantCount,
      row.reminderLabel,
      row.nextAction,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return `${[header.join(","), ...lines].join("\n")}\n`;
}

export function createRoleAccessReviewCampaignReport(input: CreateRoleAccessReviewCampaignReportInput): RoleAccessReviewCampaignReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = createRows(input);
  const reminders = rows.filter((row) => row.attestationStatus === "reminder-due");
  const directProjectGrantCount = input.projectAccessGrants.length;
  const folderGrantCount = input.folderAccessGrants.length;
  const scopeHash = createCampaignScopeHash({
    rows,
    workspaceId: input.workspace.id,
  });
  const campaignId = `rar_${scopeHash}`;
  const csvFileName = `${input.workspace.id}-role-access-review.csv`;
  const reportWithoutCsv = {
    campaignId,
    csvContent: "",
    csvDataUri: "",
    csvFileName,
    generatedAt,
    reminders,
    rows,
    scopeHash,
    summary: {
      attestationRequiredCount: rows.filter((row) => row.attestationStatus !== "approved").length,
      campaignScore: campaignScore(rows),
      directProjectGrantCount,
      folderGrantCount,
      memberCount: input.members.length,
      privilegedGrantCount: rows.reduce((sum, row) => sum + row.privilegedGrantCount, 0),
      reminderDueCount: reminders.length,
      reviewedCount: rows.filter((row) => row.attestationStatus === "approved").length,
      totalGrantCount: directProjectGrantCount + folderGrantCount,
      worstStatus: worstStatus(rows),
    },
    workspace: input.workspace,
  } satisfies RoleAccessReviewCampaignReport;
  const csvContent = createRoleAccessReviewCampaignCsv(reportWithoutCsv);

  return {
    ...reportWithoutCsv,
    csvContent,
    csvDataUri: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
  };
}

export function isRoleAccessReviewCampaignReport(value: unknown): value is RoleAccessReviewCampaignReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<RoleAccessReviewCampaignReport>;

  return (
    typeof report.campaignId === "string" &&
    typeof report.scopeHash === "string" &&
    typeof report.generatedAt === "string" &&
    Boolean(report.workspace?.id) &&
    Array.isArray(report.rows) &&
    Array.isArray(report.reminders) &&
    Boolean(report.summary)
  );
}

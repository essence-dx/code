import type {
  RoleAccessReviewAttestationStatus,
  RoleAccessReviewCampaignReport,
  RoleAccessReviewCampaignRow,
} from "@/features/projects/role-access-review-campaigns";
import type { WorkspaceRole } from "@/features/workspaces/types";

export type RoleAccessReviewPersistedAttestationStatus = "approved" | "rejected";
export type RoleAccessReviewReminderDeliveryChannel = "email" | "in-app";
export type RoleAccessReviewReminderDeliveryStatus = "queued" | "sent" | "failed" | "skipped";
export type RoleAccessReviewHistoryStatus = "blocked" | "ready" | "watch";
export type RoleAccessReviewHistoryRowAttestationStatus = RoleAccessReviewPersistedAttestationStatus | "pending";
export type RoleAccessReviewHistoryRowReminderStatus = RoleAccessReviewReminderDeliveryStatus | "not-needed" | "not-sent";

export interface RoleAccessReviewActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface RoleAccessReviewAttestationRecord {
  actor: RoleAccessReviewActor;
  attestedAt: string;
  campaignId: string;
  grantEvidence: string;
  id: string;
  memberEmail: string;
  memberId: string;
  memberName: string;
  memberUserId: string;
  note: string | null;
  reviewScopeCount: number;
  scopeHash: string;
  status: RoleAccessReviewPersistedAttestationStatus;
  workspaceId: string;
  workspaceRole: WorkspaceRole;
}

export interface RoleAccessReviewReminderDeliveryRecord {
  actor: RoleAccessReviewActor;
  campaignId: string;
  channel: RoleAccessReviewReminderDeliveryChannel;
  createdAt: string;
  dedupeKey: string;
  error: string | null;
  id: string;
  memberId: string;
  memberName: string;
  memberUserId: string;
  previewText: string;
  providerMessageId: string | null;
  recipientEmail: string;
  recipientName: string;
  scopeHash: string;
  sentAt: string | null;
  status: RoleAccessReviewReminderDeliveryStatus;
  subject: string;
  workspaceId: string;
}

export interface RoleAccessReviewHistoryRow {
  activeSessionCount: number;
  currentAttestationStatus: RoleAccessReviewAttestationStatus;
  grantEvidence: string;
  latestAttestationAt: string | null;
  latestAttestationStatus: RoleAccessReviewHistoryRowAttestationStatus;
  latestReminderAt: string | null;
  latestReminderStatus: RoleAccessReviewHistoryRowReminderStatus;
  memberEmail: string;
  memberId: string;
  memberName: string;
  nextAction: string;
  reviewScopeCount: number;
  workspaceRole: WorkspaceRole;
}

export interface RoleAccessReviewHistoryReport {
  campaign: {
    campaignId: string;
    generatedAt: string;
    scopeHash: string;
  };
  csvContent: string;
  rows: RoleAccessReviewHistoryRow[];
  summary: {
    approvedAttestationCount: number;
    failedReminderCount: number;
    historyScore: number;
    latestReminderAt: string | null;
    lastAttestationAt: string | null;
    pendingAttestationCount: number;
    persistedAttestationCount: number;
    queuedReminderCount: number;
    rejectedAttestationCount: number;
    reminderDeliveryCount: number;
    sentReminderCount: number;
    status: RoleAccessReviewHistoryStatus;
  };
}

export interface CreateRoleAccessReviewHistoryReportInput {
  attestations: RoleAccessReviewAttestationRecord[];
  campaign: RoleAccessReviewCampaignReport;
  reminders: RoleAccessReviewReminderDeliveryRecord[];
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

function escapeCsvValue(value: string | number | null) {
  const text = String(value ?? "");

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function latestByMemberId<T extends { memberId: string }>(records: T[], getTime: (record: T) => string | null) {
  const latest = new Map<string, T>();

  for (const record of records) {
    const current = latest.get(record.memberId);

    if (!current || (getTime(record) ?? "") >= (getTime(current) ?? "")) {
      latest.set(record.memberId, record);
    }
  }

  return latest;
}

function latestTimestamp(values: Array<string | null | undefined>) {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();

  return sorted.at(-1) ?? null;
}

function requiredRows(campaign: RoleAccessReviewCampaignReport) {
  return campaign.rows.filter((row) => row.attestationStatus !== "approved");
}

function memberRowId(prefix: string, campaign: RoleAccessReviewCampaignReport, row: RoleAccessReviewCampaignRow) {
  return `${prefix}_${stableHash({
    campaignId: campaign.campaignId,
    memberId: row.memberId,
    scopeHash: campaign.scopeHash,
  })}`;
}

export function createRoleAccessReviewAttestationRows(input: {
  actor: RoleAccessReviewActor;
  campaign: RoleAccessReviewCampaignReport;
  note?: string | null;
  now?: string;
  statusesByMemberId: Partial<Record<string, RoleAccessReviewPersistedAttestationStatus>>;
}): RoleAccessReviewAttestationRecord[] {
  const now = input.now ?? new Date().toISOString();

  return input.campaign.rows
    .filter((row) => input.statusesByMemberId[row.memberId])
    .map((row) => ({
      actor: input.actor,
      attestedAt: now,
      campaignId: input.campaign.campaignId,
      grantEvidence: row.grantEvidence,
      id: memberRowId("rar_att", input.campaign, row),
      memberEmail: row.memberEmail,
      memberId: row.memberId,
      memberName: row.memberName,
      memberUserId: row.userId,
      note: input.note ?? null,
      reviewScopeCount: row.reviewScopeCount,
      scopeHash: input.campaign.scopeHash,
      status: input.statusesByMemberId[row.memberId]!,
      workspaceId: input.campaign.workspace.id,
      workspaceRole: row.workspaceRole,
    }));
}

export function createRoleAccessReviewReminderDeliveryRows(input: {
  actor: RoleAccessReviewActor;
  campaign: RoleAccessReviewCampaignReport;
  now?: string;
}): RoleAccessReviewReminderDeliveryRecord[] {
  const now = input.now ?? new Date().toISOString();

  return input.campaign.reminders.map((row) => ({
    actor: input.actor,
    campaignId: input.campaign.campaignId,
    channel: "email",
    createdAt: now,
    dedupeKey: `role-access-review:${input.campaign.workspace.id}:${input.campaign.campaignId}:${row.memberId}`,
    error: null,
    id: memberRowId("rar_rem", input.campaign, row),
    memberId: row.memberId,
    memberName: row.memberName,
    memberUserId: row.userId,
    previewText: `${row.memberName} needs a role-access review attestation before the next release gate.`,
    providerMessageId: null,
    recipientEmail: row.memberEmail,
    recipientName: row.memberName,
    scopeHash: input.campaign.scopeHash,
    sentAt: null,
    status: "queued",
    subject: "Role-access review reminder",
    workspaceId: input.campaign.workspace.id,
  }));
}

export function createRoleAccessReviewHistoryCsv(report: Pick<RoleAccessReviewHistoryReport, "rows">) {
  const header = ["member_email", "workspace_role", "current_status", "persisted_attestation", "latest_reminder", "review_scope", "next_action"];
  const lines = report.rows.map((row) =>
    [
      row.memberEmail,
      row.workspaceRole,
      row.currentAttestationStatus,
      row.latestAttestationStatus,
      row.latestReminderStatus,
      row.reviewScopeCount,
      row.nextAction,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return `${[header.join(","), ...lines].join("\n")}\n`;
}

export function createRoleAccessReviewHistoryReport(input: CreateRoleAccessReviewHistoryReportInput): RoleAccessReviewHistoryReport {
  const scopedAttestations = input.attestations.filter((row) => row.campaignId === input.campaign.campaignId && row.scopeHash === input.campaign.scopeHash);
  const scopedReminders = input.reminders.filter((row) => row.campaignId === input.campaign.campaignId && row.scopeHash === input.campaign.scopeHash);
  const attestationByMemberId = latestByMemberId(scopedAttestations, (row) => row.attestedAt);
  const reminderByMemberId = latestByMemberId(scopedReminders, (row) => row.sentAt ?? row.createdAt);
  const requiredMemberIds = new Set(requiredRows(input.campaign).map((row) => row.memberId));
  const rows = input.campaign.rows.map<RoleAccessReviewHistoryRow>((row) => {
    const attestation = attestationByMemberId.get(row.memberId);
    const reminder = reminderByMemberId.get(row.memberId);
    const latestAttestationStatus = attestation?.status ?? (requiredMemberIds.has(row.memberId) ? "pending" : "approved");
    const latestReminderStatus = reminder?.status ?? (row.attestationStatus === "reminder-due" ? "not-sent" : "not-needed");

    return {
      activeSessionCount: row.activeSessionCount,
      currentAttestationStatus: row.attestationStatus,
      grantEvidence: row.grantEvidence,
      latestAttestationAt: attestation?.attestedAt ?? null,
      latestAttestationStatus,
      latestReminderAt: reminder?.sentAt ?? reminder?.createdAt ?? null,
      latestReminderStatus,
      memberEmail: row.memberEmail,
      memberId: row.memberId,
      memberName: row.memberName,
      nextAction:
        latestAttestationStatus === "approved"
          ? "Keep the saved attestation with this campaign evidence."
          : latestReminderStatus === "failed"
            ? "Retry reminder delivery and keep the failed provider response in history."
            : row.nextAction,
      reviewScopeCount: row.reviewScopeCount,
      workspaceRole: row.workspaceRole,
    };
  });
  const approvedAttestationCount = scopedAttestations.filter((row) => row.status === "approved").length;
  const rejectedAttestationCount = scopedAttestations.filter((row) => row.status === "rejected").length;
  const pendingAttestationCount = Math.max(0, requiredMemberIds.size - approvedAttestationCount);
  const failedReminderCount = scopedReminders.filter((row) => row.status === "failed").length;
  const queuedReminderCount = scopedReminders.filter((row) => row.status === "queued").length;
  const sentReminderCount = scopedReminders.filter((row) => row.status === "sent").length;
  const historyScore = Math.max(0, Math.min(100, Math.round(100 - pendingAttestationCount * 18 - failedReminderCount * 12 - queuedReminderCount * 4 - rejectedAttestationCount * 20)));
  const reportWithoutCsv = {
    campaign: {
      campaignId: input.campaign.campaignId,
      generatedAt: input.campaign.generatedAt,
      scopeHash: input.campaign.scopeHash,
    },
    csvContent: "",
    rows,
    summary: {
      approvedAttestationCount,
      failedReminderCount,
      historyScore,
      latestReminderAt: latestTimestamp(scopedReminders.map((row) => row.sentAt ?? row.createdAt)),
      lastAttestationAt: latestTimestamp(scopedAttestations.map((row) => row.attestedAt)),
      pendingAttestationCount,
      persistedAttestationCount: scopedAttestations.length,
      queuedReminderCount,
      rejectedAttestationCount,
      reminderDeliveryCount: scopedReminders.length,
      sentReminderCount,
      status: failedReminderCount > 0 || rejectedAttestationCount > 0 ? "blocked" : pendingAttestationCount > 0 || queuedReminderCount > 0 ? "watch" : "ready",
    },
  } satisfies RoleAccessReviewHistoryReport;

  return {
    ...reportWithoutCsv,
    csvContent: createRoleAccessReviewHistoryCsv(reportWithoutCsv),
  };
}

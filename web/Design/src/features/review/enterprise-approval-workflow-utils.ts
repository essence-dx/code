import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ApprovalStatus } from "@/features/editor/types";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";
import type {
  EnterpriseApprovalEscalationRule,
  EnterpriseApprovalReviewerSla,
  EnterpriseApprovalStageOwner,
  EnterpriseApprovalWorkflowStatus,
  EnterpriseApprovalWorkflowSubject,
} from "@/features/review/enterprise-approval-workflows-types";

export const reviewerSlaHours = 48;

export function createAuditLogIds(input: {
  auditLogs: WorkspaceAuditLogSummary[];
  targetIds: Set<string>;
  targetTypes: Set<string>;
}) {
  return input.auditLogs
    .filter((log) => {
      if (!isApprovalAuditLog(log)) return false;
      if (!log.targetId) return false;

      return (
        input.targetIds.has(log.targetId) &&
        input.targetTypes.has(log.targetType)
      );
    })
    .map((log) => log.id);
}

export function isApprovalAuditLog(log: WorkspaceAuditLogSummary) {
  return (
    log.action === "approval.updated" ||
    log.action === "template.marketplace.updated"
  );
}

export function scoreWorkflow(input: {
  subjects: EnterpriseApprovalWorkflowSubject[];
  reviewerSla: EnterpriseApprovalReviewerSla;
  stageOwners: EnterpriseApprovalStageOwner[];
  auditLogCount: number;
}) {
  const changesRequested = input.subjects.filter(
    (subject) => subject.approvalStatus === "changes-requested",
  ).length;
  const missingOwners = input.stageOwners.filter(
    (owner) => owner.coverage === "missing",
  ).length;
  const auditPenalty = input.subjects.length && !input.auditLogCount ? 7 : 0;
  const penalty =
    input.subjects.length * 6 +
    changesRequested * 18 +
    input.reviewerSla.overdueCount * 25 +
    input.reviewerSla.dueSoonCount * 8 +
    input.reviewerSla.unassignedCount * 12 +
    missingOwners * 16 +
    auditPenalty;

  return Math.max(0, Math.min(100, 100 - penalty));
}

export function createWorkflowDetail(input: {
  subjects: EnterpriseApprovalWorkflowSubject[];
  reviewerSla: EnterpriseApprovalReviewerSla;
  escalationRules: EnterpriseApprovalEscalationRule[];
}) {
  if (!input.subjects.length) return "No pending approval subjects.";
  if (input.escalationRules.length) {
    return `${input.escalationRules.length} escalation rule${
      input.escalationRules.length === 1 ? "" : "s"
    } active for ${input.subjects.length} pending subjects.`;
  }

  return `${input.subjects.length} pending subjects with ${input.reviewerSla.detail}.`;
}

export function formatSubjectNames(
  subjects: EnterpriseApprovalWorkflowSubject[],
) {
  if (!subjects.length) return "the approval queue";

  return subjects
    .slice(0, 3)
    .map((subject) => subject.name)
    .join(", ");
}

export function mostCommon(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0] ?? null;
}

export function isReviewTaskDueSoon(task: ReviewTaskSummary, now: Date) {
  if (task.taskStatus === "done" || task.resolved) return false;
  if (!task.taskDueAt) return false;
  if (
    isReviewTaskOverdue({
      taskStatus: task.taskStatus,
      taskDueAt: task.taskDueAt,
      now,
    })
  ) {
    return false;
  }

  const dueAt = new Date(task.taskDueAt);
  if (Number.isNaN(dueAt.getTime())) return false;

  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / 3_600_000;

  return hoursUntilDue >= 0 && hoursUntilDue <= reviewerSlaHours;
}

export function compareSubjects(
  left: EnterpriseApprovalWorkflowSubject,
  right: EnterpriseApprovalWorkflowSubject,
) {
  return (
    approvalWeight(left.approvalStatus) - approvalWeight(right.approvalStatus) ||
    right.overdueTaskCount - left.overdueTaskCount ||
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
    left.name.localeCompare(right.name)
  );
}

function approvalWeight(status: ApprovalStatus) {
  if (status === "changes-requested") return 0;
  if (status === "in-review") return 1;
  if (status === "draft") return 2;

  return 3;
}

export function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

export function scoreToStatus(
  score: number,
): EnterpriseApprovalWorkflowStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "review";

  return "blocked";
}

export function statusWeight(status: EnterpriseApprovalWorkflowStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

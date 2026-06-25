import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  EnterpriseApprovalAnalyticsStatus,
  EnterpriseApprovalTrendBaseline,
} from "@/features/review/enterprise-approval-analytics-types";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";

export type ApprovalAnalyticsWorkspaceScope = {
  id: string;
  name: string;
  role: TeamWorkspaceManagementSummary["role"] | "personal";
};

export type ApprovalAnalyticsWorkspaceTask = ReviewTaskSummary & {
  workspaceId: string;
  workspaceName: string;
};

export const fallbackWorkspaceId = "current-workspace";
export const fallbackWorkspaceName = "Current workspace";

export function createWorkspaceScopes(
  workspaces: TeamWorkspaceManagementSummary[],
): ApprovalAnalyticsWorkspaceScope[] {
  if (!workspaces.length) {
    return [
      {
        id: fallbackWorkspaceId,
        name: fallbackWorkspaceName,
        role: "personal",
      },
    ];
  }

  return workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    role: workspace.role,
  }));
}

export function createTargetWorkspaceMap(input: {
  auditLogs: WorkspaceAuditLogSummary[];
  knownWorkspaceIds: Set<string>;
}) {
  const targetWorkspaceIds = new Map<string, string>();

  for (const log of input.auditLogs) {
    const workspaceId = readWorkspaceId(log.metadata);
    if (!workspaceId || !input.knownWorkspaceIds.has(workspaceId)) continue;

    if (log.targetId) {
      targetWorkspaceIds.set(`${log.targetType}:${log.targetId}`, workspaceId);
    }

    for (const [key, value] of Object.entries(log.metadata)) {
      if (!key.endsWith("Id") || typeof value !== "string") continue;
      if (key === "workspaceId") continue;

      targetWorkspaceIds.set(`${key.replace(/Id$/, "")}:${value}`, workspaceId);
    }
  }

  return targetWorkspaceIds;
}

export function findWorkspaceId(input: {
  keys: string[];
  targetWorkspaceIds: Map<string, string>;
  fallbackWorkspaceId: string;
}) {
  for (const key of input.keys) {
    if (!key) continue;

    const workspaceId = input.targetWorkspaceIds.get(key);
    if (workspaceId) return workspaceId;
  }

  return input.fallbackWorkspaceId;
}

export function findTrend(
  workspaceId: string,
  trends: EnterpriseApprovalTrendBaseline[],
) {
  return (
    trends.find((trend) => trend.workspaceId === workspaceId) ?? {
      id: `trend-${workspaceId}`,
      workspaceId,
      workspaceName: fallbackWorkspaceName,
      currentApprovalEvents: 0,
      previousApprovalEvents: 0,
      delta: 0,
      direction: "flat" as const,
      baselineDays: 7,
      status: "review" as const,
      detail: "No approval trend baseline is available.",
    }
  );
}

export function isTaskOverdue(task: ReviewTaskSummary, now: Date) {
  return isReviewTaskOverdue({
    taskStatus: task.taskStatus,
    taskDueAt: task.taskDueAt,
    now,
  });
}

export function mostCommonAssignee(tasks: ReviewTaskSummary[]) {
  const counts = new Map<string, number>();

  for (const task of tasks) {
    const name = task.taskAssigneeName?.trim() || "Unassigned";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return (
    Array.from(counts.entries()).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0] ?? "Unassigned"
  );
}

export function readWorkspaceId(metadata: Record<string, unknown>) {
  const workspaceId = metadata.workspaceId;

  return typeof workspaceId === "string" && workspaceId.trim()
    ? workspaceId.trim()
    : null;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function scoreWorkspace(input: {
  pendingSubjects: number;
  changesRequestedSubjects: number;
  overdueReviewTasks: number;
  dueSoonReviewTasks: number;
  auditGap: boolean;
}) {
  const penalty =
    input.pendingSubjects * 7 +
    input.changesRequestedSubjects * 18 +
    input.overdueReviewTasks * 30 +
    input.dueSoonReviewTasks * 8 +
    (input.auditGap ? 12 : 0);

  return Math.max(0, Math.min(100, 100 - penalty));
}

export function statusToRisk(status: EnterpriseApprovalAnalyticsStatus) {
  if (status === "blocked") return "high";
  if (status === "review") return "medium";

  return "low";
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

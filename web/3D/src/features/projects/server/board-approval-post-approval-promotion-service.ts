import type { BoardApprovalPostApprovalPromotionReport } from "@/features/projects/board-approval-post-approval-promotion";
import { createBoardApprovalPostApprovalPromotionReport } from "@/features/projects/board-approval-post-approval-promotion";
import type { BoardApprovalPostApprovalTrackerReport } from "@/features/projects/board-approval-post-approval-tracker";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";
import { upsertWorkspaceReleaseCalendarMilestones } from "@/features/workspaces/server/workspace-release-calendar-service";
import { recordWorkspaceReleaseRunbookReport } from "@/features/workspaces/server/workspace-release-runbook-service";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceRole } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

const managerRoles = new Set<WorkspaceRole>(["owner", "admin"]);

async function requireBoardAutomationManager(workspaceId: string, currentUserId: string): Promise<{ role: WorkspaceRole } | { error: string; status: 403 | 404 }> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found.", status: 404 };
  }

  if (!managerRoles.has(access.role)) {
    return { error: "Only workspace owners and admins can promote board automation actions.", status: 403 };
  }

  return { role: access.role };
}

export async function promoteWorkspaceBoardPostApprovalActions(input: {
  currentUserId: string;
  promotedAt?: string;
  tracker: BoardApprovalPostApprovalTrackerReport;
  workspaceId: string;
}): Promise<
  ServiceResult<{
    promotion: BoardApprovalPostApprovalPromotionReport;
    releaseCalendar: WorkspaceReleaseCalendarReport;
    releaseRunbook: WorkspaceReleaseRunbookReport;
  }>
> {
  const access = await requireBoardAutomationManager(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const promotion = createBoardApprovalPostApprovalPromotionReport({
    promotedAt: input.promotedAt,
    tracker: input.tracker,
    workspaceId: input.workspaceId,
  });
  const runbookResult = await recordWorkspaceReleaseRunbookReport({
    batchId: promotion.runbookRecords[0]?.batchId,
    currentUserId: input.currentUserId,
    report: promotion.runbookReport,
    workspaceId: input.workspaceId,
  });

  if ("error" in runbookResult) {
    return runbookResult;
  }

  const calendarResult = await upsertWorkspaceReleaseCalendarMilestones({
    currentUserId: input.currentUserId,
    milestones: promotion.calendarMilestones,
    now: new Date(promotion.generatedAt),
    workspaceId: input.workspaceId,
  });

  if ("error" in calendarResult) {
    return calendarResult;
  }

  return {
    promotion,
    releaseCalendar: calendarResult.report,
    releaseRunbook: runbookResult.report,
  };
}

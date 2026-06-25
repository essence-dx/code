import { getUserAssetLibraryAudit } from "@/db/assets";
import { listCampaignBoards } from "@/db/campaigns";
import { listContentScheduleItems } from "@/db/content-planner";
import { listDesignTemplates } from "@/db/design-templates";
import { listProjectAuditSummaries } from "@/db/project-audit-center";
import { listProjectCommentTasks } from "@/db/project-comments";
import { listWorkspaceProjectVersions } from "@/db/project-versions";
import { listProjects } from "@/db/projects";
import { listServerExportJobs } from "@/db/server-export-jobs";
import { listTeamWorkspaceManagement } from "@/db/team-workspace-management";
import {
  listWebsiteFormSubmissions,
  listWebsitePublishes,
} from "@/db/website-publishing";
import {
  createWorkspaceAuditLog,
  listWorkspaceAuditLogs,
} from "@/db/workspace-audit-logs";
import { createAdvancedAdminAutomationCenter } from "@/features/automation/advanced-admin-automation-recipes";
import { createAutomationRecipeSummaries } from "@/features/automation/automation-recipes";
import { createAutomationRunHistoryCenter } from "@/features/automation/automation-run-history";
import { createPolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import { createProductionCommandRunnerCenter } from "@/features/operations/production-command-runner";
import { createPublishExportReleaseGateCenter } from "@/features/operations/publish-export-release-gates";
import {
  createReleaseOperationEnforcementDecision,
  formatReleaseOperationBlockedMessage,
  type ReleaseOperation,
  type ReleaseOperationEnforcementDecision,
} from "@/features/operations/release-operation-enforcement";
import { createWorkspaceBackupRestoreCenter } from "@/features/operations/workspace-backup-restore";
import { createProjectRetentionCenter } from "@/features/projects/project-retention-center";
import { createEnterpriseApprovalAnalyticsCenter } from "@/features/review/enterprise-approval-analytics";
import { createMarketplaceCreatorOperationsCenter } from "@/features/templates/marketplace-creator-operations";

export async function createWorkspaceReleaseOperationEnforcementDecision(input: {
  userId: string;
  operation: ReleaseOperation;
  now?: string | Date;
}) {
  const now = normalizeNow(input.now);
  const [
    projects,
    templates,
    campaignBoards,
    contentScheduleItems,
    assetAudit,
    serverExportJobs,
    reviewTasks,
    websitePublishes,
    websiteFormSubmissions,
    auditLogs,
    projectAudits,
    projectVersions,
    teamManagement,
  ] = await Promise.all([
    listProjects(input.userId),
    listDesignTemplates(input.userId),
    listCampaignBoards(input.userId),
    listContentScheduleItems(input.userId),
    getUserAssetLibraryAudit(input.userId),
    listServerExportJobs(input.userId),
    listProjectCommentTasks(input.userId),
    listWebsitePublishes(input.userId),
    listWebsiteFormSubmissions(input.userId),
    listWorkspaceAuditLogs(input.userId),
    listProjectAuditSummaries(input.userId),
    listWorkspaceProjectVersions(input.userId),
    listTeamWorkspaceManagement(input.userId),
  ]);
  const automationRecipes = createAutomationRecipeSummaries({
    projects,
    campaigns: campaignBoards,
    reviewTasks,
    contentScheduleItems,
    serverExportJobs,
    now,
  });
  const policyAsCode = createPolicyAsCodeGovernanceCenter({
    projects,
    templates,
    contentScheduleItems,
    assetAudit,
    reviewTasks,
    auditLogs,
    now,
  });
  const publishExportReleaseGates = createPublishExportReleaseGateCenter({
    projects,
    templates,
    contentScheduleItems,
    serverExportJobs,
    websitePublishes,
    policyAsCode,
    auditLogs,
    now,
  });
  const automationRunHistory = createAutomationRunHistoryCenter({
    automationRecipes,
    auditLogs,
    serverExportJobs,
    contentScheduleItems,
    now: now.toISOString(),
  });
  const enterpriseApprovalAnalytics = createEnterpriseApprovalAnalyticsCenter({
    projects,
    templates,
    campaigns: campaignBoards,
    reviewTasks,
    auditLogs,
    teamManagement,
    now,
  });
  const projectRetention = createProjectRetentionCenter({
    projects,
    projectVersions,
    serverExportJobs,
    websitePublishes,
    reviewTasks,
    auditLogs,
    now,
  });
  const advancedAdminAutomation = createAdvancedAdminAutomationCenter({
    policyAsCode,
    approvalAnalytics: enterpriseApprovalAnalytics,
    projectRetention,
    automationRunHistory,
    auditLogs,
    now,
  });
  const workspaceBackupRestore = createWorkspaceBackupRestoreCenter({
    projects,
    templates,
    projectVersions,
    serverExportJobs,
    websitePublishes,
    websiteFormSubmissions,
    campaigns: campaignBoards,
    assetAudit,
    auditLogs,
  });
  const marketplaceCreatorOperations = createMarketplaceCreatorOperationsCenter(
    {
      templates,
      projects,
      projectVersions,
      projectAudits,
      reviewTasks,
      auditLogs,
      now,
    },
  );
  const productionCommandRunner = createProductionCommandRunnerCenter({
    policyAsCode,
    publishExportReleaseGates,
    automationRunHistory,
    advancedAdminAutomation,
    workspaceBackupRestore,
    marketplaceCreatorOperations,
    auditLogs,
    now,
  });

  return createReleaseOperationEnforcementDecision({
    operation: input.operation,
    policyAsCode,
    publishExportReleaseGates,
    productionCommandRunner,
    now,
  });
}

export async function recordBlockedReleaseOperation(input: {
  userId: string;
  decision: ReleaseOperationEnforcementDecision;
}) {
  const activeFindings = [
    ...input.decision.blockingFindings,
    ...input.decision.reviewFindings,
  ];

  await createWorkspaceAuditLog({
    userId: input.userId,
    action: "release.operation.blocked",
    targetType: input.decision.operation.targetType,
    targetId: input.decision.operation.targetId,
    summary: formatReleaseOperationBlockedMessage(input.decision),
    metadata: {
      operationId: input.decision.operation.id,
      operationKind: input.decision.operation.kind,
      status: input.decision.status,
      canMutate: input.decision.canMutate,
      evidencePacket: input.decision.evidencePacket.fileName,
      blockingFindingIds: input.decision.blockingFindings.map(
        (finding) => finding.id,
      ),
      reviewFindingIds: input.decision.reviewFindings.map(
        (finding) => finding.id,
      ),
      sourceChecks: input.decision.sourceChecks,
      evidenceIds: Array.from(
        new Set(activeFindings.flatMap((finding) => finding.evidenceIds)),
      ),
    },
  });
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

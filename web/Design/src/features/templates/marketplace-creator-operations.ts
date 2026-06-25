import { approvalStatusLabels } from "@/features/review/approval-status";
import {
  templateMarketplaceStatusLabels,
  type TemplateMarketplaceStatus,
} from "@/features/templates/template-marketplace";
import { createTemplatePackageRegistry } from "@/features/templates/template-package-registry";
import {
  createLicenseEvidence,
  createRollbackPlan,
  createTrustScore,
  createVersionTimeline,
} from "@/features/templates/marketplace-creator-operations-evidence";
import { createOperationPacket } from "@/features/templates/marketplace-creator-operations-packets";
import {
  createCenterNextActions,
  createModerationRoute,
} from "@/features/templates/marketplace-creator-operations-routing";
import type {
  MarketplaceCreatorOperationsCenter,
  MarketplaceCreatorOperationsInput,
  MarketplaceCreatorSubmission,
  MarketplaceCreatorSubmissionBuildInput,
} from "@/features/templates/marketplace-creator-operations-types";
import {
  auditLogMatchesTemplate,
  average,
  compareSubmissions,
  conversionRate,
  createCreatorDetail,
  createFallbackVersion,
  createSubmissionStage,
  findRelatedProjects,
  getMarketplaceCreatorMarketplaceLabel,
  getMarketplaceCreatorStatusLabel,
  namesMatch,
  normalizeDate,
  scoreToStatus,
  stageScore,
  slugify,
} from "@/features/templates/marketplace-creator-operations-utils";

export type {
  MarketplaceCreatorLicenseEvidence,
  MarketplaceCreatorModerationPriority,
  MarketplaceCreatorModerationQueue,
  MarketplaceCreatorModerationRoute,
  MarketplaceCreatorOperationPacket,
  MarketplaceCreatorOperationsCenter,
  MarketplaceCreatorOperationsInput,
  MarketplaceCreatorOperationStatus,
  MarketplaceCreatorRollbackPlan,
  MarketplaceCreatorSubmission,
  MarketplaceCreatorSubmissionStage,
  MarketplaceCreatorTrustScore,
  MarketplaceCreatorVersionEvent,
} from "@/features/templates/marketplace-creator-operations-types";

export {
  getMarketplaceCreatorMarketplaceLabel,
  getMarketplaceCreatorStatusLabel,
};

export function createMarketplaceCreatorOperationsCenter(
  input: MarketplaceCreatorOperationsInput,
): MarketplaceCreatorOperationsCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const activeTemplates = input.templates.filter(
    (template) => template.marketplaceStatus !== "archived",
  );
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const packageRegistry = createTemplatePackageRegistry({
    templates: activeTemplates,
    projects: activeProjects,
    projectVersions: input.projectVersions,
    auditLogs: input.auditLogs,
  });
  const packageByTemplateId = new Map(
    packageRegistry.packages.map((item) => [item.templateId, item]),
  );
  const submissions = activeTemplates
    .map((template) =>
      createCreatorSubmission({
        template,
        packageEntry: packageByTemplateId.get(template.id) ?? null,
        projects: activeProjects,
        projectVersions: input.projectVersions,
        projectAudits: input.projectAudits,
        reviewTasks: input.reviewTasks,
        auditLogs: input.auditLogs,
        generatedAt,
        now,
      }),
    )
    .sort(compareSubmissions);
  const moderationRoutes = submissions
    .map((submission) => submission.moderationRoute)
    .filter((route) => route.queue !== "release-ready");
  const score = average(
    submissions.map((submission) => submission.score),
    0,
  );
  const hasBlocked = submissions.some(
    (submission) => submission.status === "blocked",
  );

  return {
    generatedAt,
    status: submissions.length ? scoreToStatus(score, hasBlocked) : "blocked",
    score: submissions.length ? score : 0,
    submissions,
    moderationRoutes,
    licenseEvidenceQueue: submissions.filter(
      (submission) => submission.licenseEvidence.status !== "ready",
    ),
    rollbackPlans: submissions.map((submission) => submission.rollbackPlan),
    nextActions: createCenterNextActions(submissions),
    totals: {
      versionedSubmissions: submissions.length,
      readySubmissions: submissions.filter(
        (submission) => submission.status === "ready",
      ).length,
      reviewSubmissions: submissions.filter(
        (submission) => submission.status === "review",
      ).length,
      blockedSubmissions: submissions.filter(
        (submission) => submission.status === "blocked",
      ).length,
      trustedCreators: submissions.filter(
        (submission) => submission.trustScore.status === "ready",
      ).length,
      licenseReady: submissions.filter(
        (submission) => submission.licenseEvidence.status === "ready",
      ).length,
      rollbackReady: submissions.filter(
        (submission) => submission.rollbackPlan.status === "ready",
      ).length,
      moderationRoutes: moderationRoutes.length,
      operationPackets: submissions.length,
    },
  };
}

function createCreatorSubmission(
  input: MarketplaceCreatorSubmissionBuildInput,
): MarketplaceCreatorSubmission {
  const relatedProjects = findRelatedProjects(input.template, input.projects);
  const relatedProjectIds = new Set(
    relatedProjects.map((project) => project.id),
  );
  const relatedAudits = input.projectAudits.filter(
    (audit) =>
      relatedProjectIds.has(audit.projectId) ||
      namesMatch(input.template.name, audit.projectName),
  );
  const openTasks = input.reviewTasks.filter(
    (task) =>
      !task.resolved &&
      task.taskStatus !== "done" &&
      (relatedProjectIds.has(task.projectId) ||
        namesMatch(input.template.name, task.projectName) ||
        namesMatch(input.template.name, task.body)),
  );
  const relatedAuditLogs = input.auditLogs.filter((log) =>
    auditLogMatchesTemplate(log, input.template),
  );
  const version = input.packageEntry?.version ?? createFallbackVersion(input);
  const versionTimeline = createVersionTimeline({
    template: input.template,
    packageEntry: input.packageEntry,
    auditLogs: relatedAuditLogs,
  });
  const trustScore = createTrustScore({
    template: input.template,
    relatedAudits,
    openTasks,
  });
  const licenseEvidence = createLicenseEvidence({
    template: input.template,
    auditLogs: relatedAuditLogs,
  });
  const rollbackPlan = createRollbackPlan({
    template: input.template,
    packageEntry: input.packageEntry,
    projectVersions: input.projectVersions,
    relatedProjects,
  });
  const score = average([
    trustScore.score,
    licenseEvidence.score,
    rollbackPlan.score,
    stageScore(input.template),
  ]);
  const status = scoreToStatus(
    score,
    [trustScore.status, licenseEvidence.status, rollbackPlan.status].includes(
      "blocked",
    ),
  );
  const moderationRoute = createModerationRoute({
    template: input.template,
    status,
    trustScore,
    licenseEvidence,
    rollbackPlan,
    openTasks,
  });
  const submission = {
    id: `marketplace-creator-${input.template.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    creatorDetail: createCreatorDetail(input.template),
    href: `/templates/${input.template.id}`,
    version,
    submissionStage: createSubmissionStage(input.template),
    marketplaceLabel:
      templateMarketplaceStatusLabels[input.template.marketplaceStatus],
    approvalLabel: approvalStatusLabels[input.template.approvalStatus],
    status,
    score,
    trustScore,
    licenseEvidence,
    rollbackPlan,
    moderationRoute,
    versionTimeline,
    operationPacket: {
      fileName: `${slugify(input.template.name)}-creator-operations.json`,
      dataUrl: "",
      downloadJson: "",
    },
    stats: {
      views: input.template.marketplaceViewCount,
      uses: input.template.marketplaceUseCount,
      conversionRate: conversionRate(input.template),
      relatedProjects: relatedProjects.length,
      relatedAudits: relatedAudits.length,
      openTasks: openTasks.length,
    },
  } satisfies MarketplaceCreatorSubmission;

  return {
    ...submission,
    operationPacket: createOperationPacket({
      submission,
      generatedAt: input.generatedAt,
    }),
  };
}

export function getMarketplaceCreatorMarketplaceStatusLabel(
  status: TemplateMarketplaceStatus,
) {
  return getMarketplaceCreatorMarketplaceLabel(status);
}

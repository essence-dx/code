import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AutomationRunHistoryCenter } from "@/features/automation/automation-run-history";
import type {
  AdvancedAdminAutomationAuditPacket,
  AdvancedAdminAutomationCenter,
  AdvancedAdminAutomationRecipePlan,
  AdvancedAdminAutomationRecipeTarget,
  AdvancedAdminAutomationStatus,
} from "@/features/automation/advanced-admin-automation-recipes-types";
import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type { ProjectRetentionCenter } from "@/features/projects/project-retention-center";
import type { EnterpriseApprovalAnalyticsCenter } from "@/features/review/enterprise-approval-analytics";

export type {
  AdvancedAdminAutomationAuditPacket,
  AdvancedAdminAutomationCenter,
  AdvancedAdminAutomationRecipeId,
  AdvancedAdminAutomationRecipePlan,
  AdvancedAdminAutomationRecipeTarget,
  AdvancedAdminAutomationStatus,
  AdvancedAdminAutomationTargetSource,
} from "@/features/automation/advanced-admin-automation-recipes-types";

export type AdvancedAdminAutomationCenterInput = {
  policyAsCode: PolicyAsCodeGovernanceCenter;
  approvalAnalytics: EnterpriseApprovalAnalyticsCenter;
  projectRetention: ProjectRetentionCenter;
  automationRunHistory: AutomationRunHistoryCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export function createAdvancedAdminAutomationCenter(
  input: AdvancedAdminAutomationCenterInput,
): AdvancedAdminAutomationCenter {
  const generatedAt = normalizeNow(input.now).toISOString();
  const recipes = [
    createBulkRemediationRecipe(input),
    createApprovalFollowUpsRecipe(input),
    createRetentionSweepRecipe(input),
    createAuditPacketRecipe(input),
  ];
  const blockedRecipes = recipes.filter(
    (recipe) => recipe.status === "blocked",
  ).length;
  const reviewRecipes = recipes.filter(
    (recipe) => recipe.status === "review",
  ).length;
  const status = createStatus({
    blocked: blockedRecipes,
    review: reviewRecipes,
  });
  const auditPacket = createAuditPacket({
    input,
    recipes,
    status,
    generatedAt,
  });
  const auditLogIds = unique([
    ...input.auditLogs.map((log) => log.id),
    ...recipes.flatMap((recipe) => recipe.auditLogIds),
  ]);
  const packetIds = unique(recipes.flatMap((recipe) => recipe.packetIds));

  return {
    status,
    score: scoreRecipes(recipes),
    generatedAt,
    recipes,
    auditPacket,
    nextActions: recipes
      .filter((recipe) => recipe.status !== "ready")
      .flatMap((recipe) => recipe.plannedActions)
      .slice(0, 6),
    totals: {
      recipes: recipes.length,
      readyRecipes: recipes.filter((recipe) => recipe.status === "ready")
        .length,
      reviewRecipes,
      blockedRecipes,
      targets: recipes.reduce(
        (total, recipe) => total + recipe.targets.length,
        0,
      ),
      plannedActions: recipes.reduce(
        (total, recipe) => total + recipe.plannedActions.length,
        0,
      ),
      auditEvents: auditLogIds.length,
      sourcePackets: packetIds.length,
      recoveryPackets: input.automationRunHistory.recoveryPackets.length,
    },
  };
}

function createBulkRemediationRecipe(
  input: AdvancedAdminAutomationCenterInput,
): AdvancedAdminAutomationRecipePlan {
  const reports = input.policyAsCode.dryRunReports.filter(
    (report) => report.status !== "ready" || report.affectedItems.length,
  );
  const targets = reports.flatMap((report) =>
    report.affectedItems.map((item) =>
      createTarget({
        id: `policy-${report.id}-${item.id}`,
        source: "policy",
        label: item.name,
        detail: `${report.title}: ${item.detail}`,
        status: item.severity,
        sourceIds: unique([...item.sourceIds, ...report.auditLogIds]),
      }),
    ),
  );
  const plannedActions = unique(
    reports.flatMap((report) => report.plannedActions),
  );

  return createRecipe({
    id: "bulk-remediation",
    title: "Bulk remediation",
    description:
      "Batch policy exceptions into safe remediation work before enforcement affects live designs.",
    targetLabel: "Policy exceptions",
    actionLabel: "Prepare remediation",
    targets,
    plannedActions,
    evidence: reports.map(
      (report) =>
        `${report.title}: ${report.affectedItems.length} exceptions, ${report.plannedActions.length} planned actions.`,
    ),
    auditLogIds: unique(reports.flatMap((report) => report.auditLogIds)),
    packetIds: [input.policyAsCode.enforcementPacket.id],
    emptyReason: "No policy exceptions need bulk remediation.",
  });
}

function createApprovalFollowUpsRecipe(
  input: AdvancedAdminAutomationCenterInput,
): AdvancedAdminAutomationRecipePlan {
  const bottleneckTargets = input.approvalAnalytics.bottlenecks.map(
    (bottleneck) =>
      createTarget({
        id: `approval-bottleneck-${bottleneck.id}`,
        source: "approval",
        label: `${bottleneck.workspaceName}: ${bottleneck.stage}`,
        detail: bottleneck.detail,
        status: normalizeStatus(bottleneck.status),
        sourceIds: [bottleneck.id, bottleneck.workspaceId],
        ownerLabel: bottleneck.ownerLabel,
        workspaceName: bottleneck.workspaceName,
      }),
  );
  const forecastTargets = input.approvalAnalytics.reviewerForecasts
    .filter(
      (forecast) =>
        forecast.status !== "ready" ||
        forecast.capacityRisk !== "low" ||
        forecast.overdueTasks > 0,
    )
    .map((forecast) =>
      createTarget({
        id: `approval-forecast-${forecast.id}`,
        source: "approval",
        label: `${forecast.reviewerName}: ${forecast.workspaceName}`,
        detail: `${forecast.openTasks} open tasks, ${forecast.overdueTasks} overdue, ${forecast.forecastNext7Days} forecast in the next 7 days.`,
        status:
          forecast.status === "blocked" || forecast.capacityRisk === "high"
            ? "blocked"
            : "review",
        sourceIds: [forecast.id, forecast.workspaceId],
        ownerLabel: forecast.reviewerName,
        workspaceName: forecast.workspaceName,
      }),
    );
  const plannedActions = unique([
    ...input.approvalAnalytics.nextActions,
    ...input.approvalAnalytics.bottlenecks.map(
      (bottleneck) =>
        `Send approval follow-up to ${bottleneck.ownerLabel} for ${bottleneck.workspaceName} ${bottleneck.stage.toLowerCase()}.`,
    ),
    ...input.approvalAnalytics.reviewerForecasts
      .filter((forecast) => forecast.capacityRisk !== "low")
      .map(
        (forecast) =>
          `Rebalance ${forecast.reviewerName}'s ${forecast.workspaceName} approval queue before the next review cycle.`,
      ),
  ]);

  return createRecipe({
    id: "approval-follow-ups",
    title: "Approval follow-ups",
    description:
      "Turn approval bottlenecks and reviewer load forecasts into owner-specific follow-up work.",
    targetLabel: "Approval queues",
    actionLabel: "Queue follow-ups",
    targets: [...bottleneckTargets, ...forecastTargets],
    plannedActions,
    evidence: [
      `${input.approvalAnalytics.totals.bottlenecks} bottlenecks`,
      `${input.approvalAnalytics.totals.reviewerForecasts} reviewer forecasts`,
      `${input.approvalAnalytics.totals.overdueReviewTasks} overdue tasks`,
    ],
    auditLogIds: [],
    packetIds: [input.approvalAnalytics.executivePacket.id],
    emptyReason: "Approval queues do not need automation follow-ups.",
  });
}

function createRetentionSweepRecipe(
  input: AdvancedAdminAutomationCenterInput,
): AdvancedAdminAutomationRecipePlan {
  const archiveTargets = input.projectRetention.archiveCandidates.map(
    (candidate) =>
      createTarget({
        id: `retention-archive-${candidate.id}`,
        source: "retention",
        label: candidate.projectName,
        detail: candidate.reason,
        status: "review",
        sourceIds: [
          candidate.id,
          candidate.projectId,
          candidate.latestVersionId,
        ],
      }),
  );
  const holdTargets = input.projectRetention.legalHolds.map((hold) =>
    createTarget({
      id: `retention-hold-${hold.id}`,
      source: "retention",
      label: `${hold.projectName} legal hold`,
      detail: hold.reason,
      status: "blocked",
      sourceIds: [hold.id, hold.projectId, hold.auditLogId, hold.caseId],
      ownerLabel: hold.ownerEmail,
    }),
  );
  const deletionTargets = input.projectRetention.deletionPackets.map((packet) =>
    createTarget({
      id: `retention-delete-${packet.id}`,
      source: "retention",
      label: `${packet.projectName} deletion packet`,
      detail: packet.reasons.join(" ") || "Deletion packet is eligible.",
      status: packet.status,
      sourceIds: [packet.id, packet.projectId, ...packet.auditLogIds],
    }),
  );
  const plannedActions = unique([
    ...input.projectRetention.nextActions,
    ...input.projectRetention.archiveCandidates.map(
      (candidate) =>
        `${candidate.recommendedAction} Project: ${candidate.projectName}.`,
    ),
    ...input.projectRetention.legalHolds.map(
      (hold) =>
        `Confirm legal hold owner ${hold.ownerEmail ?? "workspace admin"} for ${hold.projectName} before any retention sweep.`,
    ),
  ]);

  return createRecipe({
    id: "retention-sweep",
    title: "Retention sweep",
    description:
      "Collect archive candidates, legal holds, restore previews, and deletion packets into one reviewable sweep.",
    targetLabel: "Retention records",
    actionLabel: "Prepare sweep",
    targets: [...archiveTargets, ...holdTargets, ...deletionTargets],
    plannedActions,
    evidence: [
      `${input.projectRetention.totals.archiveCandidates} archive candidates`,
      `${input.projectRetention.totals.legalHolds} legal holds`,
      `${input.projectRetention.totals.deletionPackets} deletion packets`,
    ],
    auditLogIds: unique(
      input.projectRetention.deletionPackets.flatMap(
        (packet) => packet.auditLogIds,
      ),
    ),
    packetIds: input.projectRetention.deletionPackets.map(
      (packet) => packet.id,
    ),
    emptyReason:
      "No archive, legal hold, restore, or deletion sweep is pending.",
  });
}

function createAuditPacketRecipe(
  input: AdvancedAdminAutomationCenterInput,
): AdvancedAdminAutomationRecipePlan {
  const recoveryTargets = input.automationRunHistory.recoveryPackets.map(
    (packet) =>
      createTarget({
        id: `automation-recovery-${packet.id}`,
        source: "automation",
        label: packet.summary,
        detail: `${packet.diagnostics.length} diagnostics, retry ${packet.retry.available ? "available" : "unavailable"}.`,
        status: "ready",
        sourceIds: [packet.id, packet.runId, ...packet.auditLogIds],
      }),
  );
  const auditTargets = input.auditLogs.slice(0, 8).map((log) =>
    createTarget({
      id: `audit-log-${log.id}`,
      source: "audit",
      label: log.summary,
      detail: `${log.action} / ${log.targetType}`,
      status: "ready",
      sourceIds: [log.id, log.targetId],
      ownerLabel: log.actorEmail,
    }),
  );
  const sourcePacketIds = [
    input.policyAsCode.enforcementPacket.id,
    input.approvalAnalytics.executivePacket.id,
    ...input.projectRetention.deletionPackets.map((packet) => packet.id),
    ...input.automationRunHistory.recoveryPackets.map((packet) => packet.id),
  ];

  return createRecipe({
    id: "audit-packet-generation",
    title: "Audit packet generation",
    description:
      "Bundle policy, approval, retention, automation recovery, and workspace audit evidence for admin review.",
    targetLabel: "Evidence sources",
    actionLabel: "Generate packet",
    targets: [...recoveryTargets, ...auditTargets],
    plannedActions:
      recoveryTargets.length || auditTargets.length
        ? [
            "Download the advanced admin automation audit packet before applying remediation.",
          ]
        : [],
    evidence: [
      `${input.auditLogs.length} workspace audit events`,
      `${input.automationRunHistory.recoveryPackets.length} automation recovery packets`,
      `${sourcePacketIds.length} source packets`,
    ],
    auditLogIds: unique([
      ...input.auditLogs.map((log) => log.id),
      ...input.automationRunHistory.recoveryPackets.flatMap(
        (packet) => packet.auditLogIds,
      ),
    ]),
    packetIds: unique(sourcePacketIds),
    emptyReason: "No admin audit packet inputs are pending.",
  });
}

function createRecipe(input: {
  id: AdvancedAdminAutomationRecipePlan["id"];
  title: string;
  description: string;
  targetLabel: string;
  actionLabel: string;
  targets: AdvancedAdminAutomationRecipeTarget[];
  plannedActions: string[];
  evidence: string[];
  auditLogIds: string[];
  packetIds: string[];
  emptyReason: string;
}): AdvancedAdminAutomationRecipePlan {
  const status = createStatus({
    blocked: input.targets.filter((target) => target.status === "blocked")
      .length,
    review: input.targets.filter((target) => target.status === "review").length,
  });

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    status,
    score: scoreRecipe({
      status,
      targets: input.targets.length,
      plannedActions: input.plannedActions.length,
    }),
    targetLabel: input.targetLabel,
    actionLabel: input.actionLabel,
    targets: input.targets,
    plannedActions: input.plannedActions,
    evidence: input.evidence.filter(Boolean),
    auditLogIds: unique(input.auditLogIds),
    packetIds: unique(input.packetIds),
    disabledReason:
      input.targets.length || input.plannedActions.length
        ? null
        : input.emptyReason,
  };
}

function createTarget(
  input: Omit<
    AdvancedAdminAutomationRecipeTarget,
    "ownerLabel" | "sourceIds" | "workspaceName"
  > & {
    ownerLabel?: string | null;
    sourceIds: Array<string | null | undefined>;
    workspaceName?: string | null;
  },
): AdvancedAdminAutomationRecipeTarget {
  return {
    id: input.id,
    source: input.source,
    label: input.label,
    detail: input.detail,
    status: input.status,
    sourceIds: unique(input.sourceIds.filter(isString)),
    ownerLabel: input.ownerLabel ?? null,
    workspaceName: input.workspaceName ?? null,
  };
}

function createAuditPacket(input: {
  input: AdvancedAdminAutomationCenterInput;
  recipes: AdvancedAdminAutomationRecipePlan[];
  status: AdvancedAdminAutomationStatus;
  generatedAt: string;
}): AdvancedAdminAutomationAuditPacket {
  const auditLogIds = unique([
    ...input.input.auditLogs.map((log) => log.id),
    ...input.recipes.flatMap((recipe) => recipe.auditLogIds),
  ]);
  const packetIds = unique(input.recipes.flatMap((recipe) => recipe.packetIds));
  const payload = {
    kind: "essence-studio.advanced-admin-automation-audit-packet",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    totals: {
      recipes: input.recipes.length,
      targets: input.recipes.reduce(
        (total, recipe) => total + recipe.targets.length,
        0,
      ),
      plannedActions: input.recipes.reduce(
        (total, recipe) => total + recipe.plannedActions.length,
        0,
      ),
      auditEvents: auditLogIds.length,
      sourcePackets: packetIds.length,
    },
    recipes: input.recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      status: recipe.status,
      score: recipe.score,
      targets: recipe.targets.map((target) => ({
        id: target.id,
        source: target.source,
        label: target.label,
        status: target.status,
        sourceIds: target.sourceIds,
      })),
      plannedActions: recipe.plannedActions,
      auditLogIds: recipe.auditLogIds,
      packetIds: recipe.packetIds,
    })),
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "advanced-admin-automation-audit-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    recipeIds: input.recipes.map((recipe) => recipe.id),
    auditLogIds,
    packetIds,
    download: {
      fileName: "advanced-admin-automation-audit-packet.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createStatus(input: {
  blocked: number;
  review: number;
}): AdvancedAdminAutomationStatus {
  if (input.blocked > 0) return "blocked";
  if (input.review > 0) return "review";

  return "ready";
}

function normalizeStatus(status: string): AdvancedAdminAutomationStatus {
  if (status === "blocked" || status === "failed") return "blocked";
  if (status === "review") return "review";

  return "ready";
}

function scoreRecipes(recipes: AdvancedAdminAutomationRecipePlan[]) {
  if (!recipes.length) return 100;

  return Math.round(
    recipes.reduce((total, recipe) => total + recipe.score, 0) / recipes.length,
  );
}

function scoreRecipe(input: {
  status: AdvancedAdminAutomationStatus;
  targets: number;
  plannedActions: number;
}) {
  if (input.status === "ready") return 100;

  const statusPenalty = input.status === "blocked" ? 28 : 14;
  const targetPenalty = Math.min(30, input.targets * 5);
  const actionPenalty = Math.min(16, input.plannedActions * 2);

  return Math.max(0, 100 - statusPenalty - targetPenalty - actionPenalty);
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function isString(value: string | null | undefined): value is string {
  return Boolean(value);
}

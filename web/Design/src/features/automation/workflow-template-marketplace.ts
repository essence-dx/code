import {
  getWorkflowTemplateDefinition,
  workflowTemplateDefinitions,
} from "@/features/automation/workflow-template-marketplace-catalog";
import type {
  WorkflowTemplateAdoptionAnalytics,
  WorkflowTemplateDependencyCheck,
  WorkflowTemplateDefinition,
  WorkflowTemplateMarketplaceCenter,
  WorkflowTemplateMarketplaceInput,
  WorkflowTemplateMarketplacePacket,
  WorkflowTemplateMarketplaceReport,
  WorkflowTemplateMarketplaceStatus,
  WorkflowTemplateRequiredRole,
  WorkflowTemplateRollbackPlan,
  WorkflowTemplateVersion,
} from "@/features/automation/workflow-template-marketplace-types";

export {
  getWorkflowTemplateDefinition,
  workflowTemplateDefinitions,
} from "@/features/automation/workflow-template-marketplace-catalog";

export type {
  WorkflowTemplateAdoptionAnalytics,
  WorkflowTemplateCategory,
  WorkflowTemplateDefinition,
  WorkflowTemplateDependencyCheck,
  WorkflowTemplateDependencyKind,
  WorkflowTemplateMarketplaceCenter,
  WorkflowTemplateMarketplaceInput,
  WorkflowTemplateMarketplacePacket,
  WorkflowTemplateMarketplaceReport,
  WorkflowTemplateMarketplaceStatus,
  WorkflowTemplateRecipeStep,
  WorkflowTemplateRequiredRole,
  WorkflowTemplateRollbackPlan,
  WorkflowTemplateVersion,
} from "@/features/automation/workflow-template-marketplace-types";

export function createWorkflowTemplateMarketplace(
  input: WorkflowTemplateMarketplaceInput,
): WorkflowTemplateMarketplaceCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const reports = workflowTemplateDefinitions
    .map((definition) =>
      createTemplateReport({
        definition,
        input,
      }),
    )
    .sort(compareReports);
  const status = aggregateStatus(reports.map((report) => report.status));
  const score = average(
    reports.map((report) => report.score),
    100,
  );
  const nextActions = createNextActions(reports);

  return {
    generatedAt,
    status,
    score,
    templates: reports,
    marketplacePacket: createMarketplacePacket({
      generatedAt,
      status,
      score,
      templates: reports,
      nextActions,
    }),
    nextActions,
    totals: {
      templates: reports.length,
      readyTemplates: reports.filter((report) => report.status === "ready")
        .length,
      reviewTemplates: reports.filter((report) => report.status === "review")
        .length,
      blockedTemplates: reports.filter((report) => report.status === "blocked")
        .length,
      versions: reports.reduce(
        (total, report) =>
          total + getWorkflowTemplateDefinition(report.id)!.versions.length,
        0,
      ),
      dependencyChecks: reports.reduce(
        (total, report) => total + report.dependencyChecks.length,
        0,
      ),
      rollbackNotes: reports.reduce(
        (total, report) => total + report.rollbackPlan.notes.length,
        0,
      ),
      installs: reports.reduce(
        (total, report) => total + report.adoption.installs,
        0,
      ),
      recipeRuns: reports.reduce(
        (total, report) => total + report.adoption.recipeRuns,
        0,
      ),
      marketplacePackets: 1,
    },
  };
}

function createTemplateReport(input: {
  definition: WorkflowTemplateDefinition;
  input: WorkflowTemplateMarketplaceInput;
}): WorkflowTemplateMarketplaceReport {
  const currentVersion = getCurrentVersion(input.definition);
  const dependencyChecks = createDependencyChecks({
    definition: input.definition,
    version: currentVersion,
    input: input.input,
  });
  const adoption = createAdoptionAnalytics({
    templateId: input.definition.id,
    auditLogs: input.input.auditLogs,
    workspaceCount: input.input.teamManagement.length,
  });
  const status = aggregateStatus([
    ...dependencyChecks.map((dependency) => dependency.status),
    adoption.installs ? "ready" : "review",
  ]);
  const rollbackPlan = createRollbackPlan({
    definition: input.definition,
    version: currentVersion,
  });
  const installableWorkspaces = input.input.teamManagement.filter((workspace) =>
    hasRequiredRole(workspace.role, input.definition.requiredRole),
  );

  return {
    id: input.definition.id,
    name: input.definition.name,
    description: input.definition.description,
    category: input.definition.category,
    requiredRole: input.definition.requiredRole,
    currentVersion,
    status,
    score: scoreTemplate({
      status,
      dependencyChecks,
      adoption,
    }),
    dependencyChecks,
    rollbackPlan,
    adoption,
    installed: adoption.installs > 0,
    installableWorkspaceIds: installableWorkspaces.map(
      (workspace) => workspace.id,
    ),
    installableWorkspaces,
    nextAction: createTemplateNextAction({
      definition: input.definition,
      status,
      dependencyChecks,
      adoption,
    }),
  };
}

function createDependencyChecks(input: {
  definition: WorkflowTemplateDefinition;
  version: WorkflowTemplateVersion;
  input: WorkflowTemplateMarketplaceInput;
}): WorkflowTemplateDependencyCheck[] {
  const recipeById = new Map(
    input.input.automationRecipes.map((recipe) => [recipe.id, recipe]),
  );
  const eligibleWorkspaces = input.input.teamManagement.filter((workspace) =>
    hasRequiredRole(workspace.role, input.definition.requiredRole),
  );
  const checks: WorkflowTemplateDependencyCheck[] = [
    {
      id: `${input.definition.id}-version-${input.version.version}`,
      templateId: input.definition.id,
      kind: "version",
      status: isSemver(input.version.version) ? "ready" : "blocked",
      label: `Version ${input.version.version}`,
      detail: isSemver(input.version.version)
        ? `${input.definition.name} is versioned and can be installed with rollback notes.`
        : "Template version must use semver before marketplace install.",
    },
    {
      id: `${input.definition.id}-workspace`,
      templateId: input.definition.id,
      kind: "workspace",
      status: input.input.teamManagement.length ? "ready" : "blocked",
      label: "Internal workspace",
      detail: input.input.teamManagement.length
        ? `${input.input.teamManagement.length} internal workspaces can evaluate this template.`
        : "Create a team workspace before installing workflow templates.",
    },
    {
      id: `${input.definition.id}-role-${input.definition.requiredRole}`,
      templateId: input.definition.id,
      kind: "team-role",
      status: eligibleWorkspaces.length ? "ready" : "blocked",
      label: `${input.definition.requiredRole} access`,
      detail: eligibleWorkspaces.length
        ? `${eligibleWorkspaces.length} workspaces satisfy the required role.`
        : `No workspace membership satisfies the ${input.definition.requiredRole} install requirement.`,
    },
  ];

  for (const step of input.version.recipeSteps) {
    const recipe = recipeById.get(step.recipeId);
    const disabledReason = recipe?.disabledReason ?? null;
    const hasTargets = Boolean(recipe?.targets.length);
    const status: WorkflowTemplateMarketplaceStatus =
      recipe && !disabledReason && hasTargets ? "ready" : "blocked";

    checks.push({
      id: `${input.definition.id}-recipe-${step.recipeId}`,
      templateId: input.definition.id,
      kind: "recipe",
      status,
      label: step.title,
      detail: recipe
        ? disabledReason
          ? `${recipe.title}: ${disabledReason}`
          : hasTargets
            ? step.dependencyDetail
            : `${recipe.title} has no eligible targets.`
        : `${step.recipeId} is not available in the automation catalog.`,
      recipeId: step.recipeId,
    });
  }

  return checks;
}

function createAdoptionAnalytics(input: {
  templateId: string;
  auditLogs: WorkflowTemplateMarketplaceInput["auditLogs"];
  workspaceCount: number;
}): WorkflowTemplateAdoptionAnalytics {
  const installLogs = input.auditLogs.filter(
    (log) =>
      log.action === "workflow_template.installed" &&
      getTemplateIdFromLog(log) === input.templateId,
  );
  const runLogs = input.auditLogs.filter(
    (log) =>
      log.action === "automation.recipe.applied" &&
      getTemplateIdFromLog(log) === input.templateId,
  );
  const installedWorkspaceIds = unique(
    installLogs
      .map((log) => stringOrNull(log.metadata.workspaceId))
      .filter((value): value is string => Boolean(value)),
  );
  const workspaceCount = Math.max(1, input.workspaceCount);

  return {
    installs: installLogs.length,
    recipeRuns: runLogs.length,
    adoptionRate: Math.round(
      (installedWorkspaceIds.length / workspaceCount) * 100,
    ),
    installedWorkspaceIds,
    latestInstalledAt: newestDate(installLogs.map((log) => log.createdAt)),
    latestRunAt: newestDate(runLogs.map((log) => log.createdAt)),
  };
}

function createRollbackPlan(input: {
  definition: WorkflowTemplateDefinition;
  version: WorkflowTemplateVersion;
}): WorkflowTemplateRollbackPlan {
  const notes = unique([
    `Reinstall ${input.definition.name} at the previous approved version before replaying recipes.`,
    ...input.version.recipeSteps.map((step) => step.rollbackNote),
  ]);
  const payload = {
    kind: "essence-studio.workflow-template-rollback",
    version: 1,
    templateId: input.definition.id,
    templateName: input.definition.name,
    templateVersion: input.version.version,
    notes,
    affectedRecipeIds: unique(
      input.version.recipeSteps.map((step) => step.recipeId),
    ),
  };

  return {
    id: `${input.definition.id}-rollback-${input.version.version}`,
    templateId: input.definition.id,
    fileName: `${input.definition.id}-rollback-${input.version.version}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
    notes,
    affectedRecipeIds: payload.affectedRecipeIds,
  };
}

function createMarketplacePacket(input: {
  generatedAt: string;
  status: WorkflowTemplateMarketplaceStatus;
  score: number;
  templates: WorkflowTemplateMarketplaceReport[];
  nextActions: string[];
}): WorkflowTemplateMarketplacePacket {
  const payload = {
    kind: "essence-studio.workflow-template-marketplace",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    templates: input.templates.map((template) => ({
      id: template.id,
      name: template.name,
      version: template.currentVersion.version,
      status: template.status,
      score: template.score,
      category: template.category,
      dependencyChecks: template.dependencyChecks,
      rollbackNotes: template.rollbackPlan.notes,
      adoption: template.adoption,
    })),
    nextActions: input.nextActions,
  };

  return {
    id: "workflow-template-marketplace-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    fileName: "workflow-template-marketplace.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

function createNextActions(reports: WorkflowTemplateMarketplaceReport[]) {
  return reports
    .filter((report) => report.status !== "ready")
    .concat(reports.filter((report) => report.status === "ready"))
    .slice(0, 6)
    .map((report) => report.nextAction);
}

function createTemplateNextAction(input: {
  definition: WorkflowTemplateDefinition;
  status: WorkflowTemplateMarketplaceStatus;
  dependencyChecks: WorkflowTemplateDependencyCheck[];
  adoption: WorkflowTemplateAdoptionAnalytics;
}) {
  const blocker = input.dependencyChecks.find(
    (dependency) => dependency.status === "blocked",
  );

  if (blocker) return `${input.definition.name}: ${blocker.detail}`;
  if (!input.adoption.installs) {
    return `${input.definition.name}: install this workflow template in an internal workspace.`;
  }
  if (input.status === "review") {
    return `${input.definition.name}: review dependency warnings before wider adoption.`;
  }

  return `${input.definition.name}: adoption is ready for team rollout.`;
}

function getCurrentVersion(definition: WorkflowTemplateDefinition) {
  return definition.versions
    .slice()
    .sort((left, right) => compareSemver(right.version, left.version))[0];
}

function scoreTemplate(input: {
  status: WorkflowTemplateMarketplaceStatus;
  dependencyChecks: WorkflowTemplateDependencyCheck[];
  adoption: WorkflowTemplateAdoptionAnalytics;
}) {
  if (input.status === "blocked") return 32;

  const dependencyScore = average(
    input.dependencyChecks.map((dependency) => statusScore(dependency.status)),
  );
  const adoptionScore = input.adoption.installs
    ? Math.min(100, 70 + input.adoption.recipeRuns * 8)
    : 64;

  return average([dependencyScore, adoptionScore]);
}

function compareReports(
  left: WorkflowTemplateMarketplaceReport,
  right: WorkflowTemplateMarketplaceReport,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.name.localeCompare(right.name)
  );
}

function aggregateStatus(statuses: WorkflowTemplateMarketplaceStatus[]) {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

function hasRequiredRole(
  actualRole: WorkflowTemplateRequiredRole,
  requiredRole: WorkflowTemplateRequiredRole,
) {
  return roleWeight(actualRole) >= roleWeight(requiredRole);
}

function roleWeight(role: WorkflowTemplateRequiredRole) {
  if (role === "owner") return 3;
  if (role === "admin") return 2;

  return 1;
}

function statusWeight(status: WorkflowTemplateMarketplaceStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function statusScore(status: WorkflowTemplateMarketplaceStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 70;

  return 24;
}

function getTemplateIdFromLog(log: {
  targetId: string | null;
  metadata: Record<string, unknown>;
}) {
  return stringOrNull(log.metadata.workflowTemplateId) ?? log.targetId ?? "";
}

function newestDate(values: string[]) {
  const sorted = values
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());

  return sorted[0]?.toISOString() ?? null;
}

function isSemver(value: string) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function compareSemver(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);

    if (difference) return difference;
  }

  return 0;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function stringOrNull(value: unknown) {
  const stringValue = String(value ?? "").trim();

  return stringValue || null;
}

function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}

import type {
  AutomationRecipeId,
  AutomationRecipeSummary,
} from "@/features/automation/automation-recipes";
import type { WorkflowTemplateMarketplaceReport } from "@/features/automation/workflow-template-marketplace";
import type {
  NoCodeAutomationAction,
  NoCodeAutomationActionKind,
  NoCodeAutomationBuilderCenter,
  NoCodeAutomationBuilderFlow,
  NoCodeAutomationBuilderInput,
  NoCodeAutomationBuilderStatus,
  NoCodeAutomationCondition,
  NoCodeAutomationDryRunSimulation,
  NoCodeAutomationExecutionPlan,
  NoCodeAutomationTrigger,
  NoCodeAutomationTriggerKind,
} from "@/features/automation/no-code-automation-builder-types";

export type {
  NoCodeAutomationAction,
  NoCodeAutomationActionKind,
  NoCodeAutomationBuilderCenter,
  NoCodeAutomationBuilderFlow,
  NoCodeAutomationBuilderInput,
  NoCodeAutomationBuilderStatus,
  NoCodeAutomationCondition,
  NoCodeAutomationConditionKind,
  NoCodeAutomationDryRunSimulation,
  NoCodeAutomationExecutionPlan,
  NoCodeAutomationTrigger,
  NoCodeAutomationTriggerKind,
} from "@/features/automation/no-code-automation-builder-types";

export function createNoCodeAutomationBuilderCenter(
  input: NoCodeAutomationBuilderInput,
): NoCodeAutomationBuilderCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const recipeFlows = input.automationRecipes.map((recipe) =>
    createRecipeFlow({ recipe, input, generatedAt }),
  );
  const templateFlows = input.workflowMarketplace.templates
    .filter((template) => template.installed || template.status !== "blocked")
    .map((template) => createTemplateFlow({ template, input, generatedAt }));
  const flows = [...recipeFlows, ...templateFlows].sort(compareFlows);
  const status = aggregateStatus(flows.map((flow) => flow.status));
  const score = average(
    flows.map((flow) => flow.score),
    100,
  );

  return {
    generatedAt,
    status,
    score,
    flows,
    nextActions: flows
      .filter((flow) => flow.status !== "ready")
      .slice(0, 6)
      .map((flow) => flow.nextAction),
    totals: {
      flows: flows.length,
      recipeFlows: recipeFlows.length,
      templateFlows: templateFlows.length,
      typedTriggers: flows.length,
      typedConditions: flows.reduce(
        (total, flow) => total + flow.conditions.length,
        0,
      ),
      typedActions: flows.reduce(
        (total, flow) => total + flow.actions.length,
        0,
      ),
      dryRuns: flows.length,
      rollbackNotes: flows.reduce(
        (total, flow) => total + flow.rollbackNotes.length,
        0,
      ),
      executionPlans: flows.length,
      blockedFlows: flows.filter((flow) => flow.status === "blocked").length,
      reviewFlows: flows.filter((flow) => flow.status === "review").length,
      auditEvidence: unique(flows.flatMap((flow) => flow.auditEvidenceIds))
        .length,
    },
  };
}

function createRecipeFlow(input: {
  recipe: AutomationRecipeSummary;
  input: NoCodeAutomationBuilderInput;
  generatedAt: string;
}): NoCodeAutomationBuilderFlow {
  const trigger = createRecipeTrigger(input.recipe);
  const auditEvidenceIds = getAuditEvidenceIds({
    sourceId: input.recipe.id,
    input: input.input,
  });
  const recentRuns = input.input.runHistory.runs.filter(
    (run) => run.recipeId === input.recipe.id,
  );
  const conditions = createRecipeConditions({
    recipe: input.recipe,
    recentRuns,
    auditEvidenceIds,
  });
  const actions = [createRecipeAction(input.recipe)];
  const rollbackNotes = createRecipeRollbackNotes({
    recipe: input.recipe,
    input: input.input,
  });
  const dryRun = createDryRun({
    id: `dry-run-recipe-${input.recipe.id}`,
    conditions,
    actions,
    targetCount: input.recipe.targets.length,
    fallbackBlockedReason: input.recipe.disabledReason,
  });
  const status = aggregateStatus([
    ...conditions.map((condition) => condition.status),
    dryRun.status,
  ]);
  const score = scoreFlow({ status, conditions, dryRun, actions });
  const executionPlan = createExecutionPlan({
    generatedAt: input.generatedAt,
    flow: {
      id: `builder-recipe-${input.recipe.id}`,
      sourceKind: "recipe",
      sourceId: input.recipe.id,
      title: input.recipe.title,
      trigger,
      conditions,
      actions,
      dryRun,
      rollbackNotes,
      auditEvidenceIds,
    },
  });

  return {
    id: `builder-recipe-${input.recipe.id}`,
    sourceId: input.recipe.id,
    sourceKind: "recipe",
    title: input.recipe.title,
    description: input.recipe.description,
    status,
    score,
    trigger,
    conditions,
    actions,
    dryRun,
    rollbackNotes,
    auditEvidenceIds,
    executionPlan,
    nextAction: createFlowNextAction({
      title: input.recipe.title,
      status,
      dryRun,
      fallback: input.recipe.disabledReason,
    }),
  };
}

function createTemplateFlow(input: {
  template: WorkflowTemplateMarketplaceReport;
  input: NoCodeAutomationBuilderInput;
  generatedAt: string;
}): NoCodeAutomationBuilderFlow {
  const trigger = createTemplateTrigger(input.template);
  const auditEvidenceIds = getAuditEvidenceIds({
    sourceId: input.template.id,
    input: input.input,
  });
  const conditions = createTemplateConditions({
    template: input.template,
    auditEvidenceIds,
  });
  const actions = input.template.currentVersion.recipeSteps.map(
    (step): NoCodeAutomationAction => ({
      id: `action-template-${input.template.id}-${step.id}`,
      kind: "run-template-step",
      recipeId: step.recipeId,
      label: step.title,
      detail: step.dependencyDetail,
      targetCount: Math.max(1, input.template.installableWorkspaceIds.length),
    }),
  );
  const rollbackNotes = unique([
    ...input.template.rollbackPlan.notes,
    ...input.template.currentVersion.recipeSteps.map(
      (step) => step.rollbackNote,
    ),
  ]);
  const dryRun = createDryRun({
    id: `dry-run-template-${input.template.id}`,
    conditions,
    actions,
    targetCount: Math.max(1, input.template.installableWorkspaceIds.length),
    fallbackBlockedReason:
      input.template.status === "blocked" ? input.template.nextAction : null,
  });
  const status = aggregateStatus([
    normalizeMarketplaceStatus(input.template.status),
    ...conditions.map((condition) => condition.status),
    dryRun.status,
  ]);
  const score = scoreFlow({ status, conditions, dryRun, actions });
  const executionPlan = createExecutionPlan({
    generatedAt: input.generatedAt,
    flow: {
      id: `builder-template-${input.template.id}`,
      sourceKind: "template",
      sourceId: input.template.id,
      title: input.template.name,
      trigger,
      conditions,
      actions,
      dryRun,
      rollbackNotes,
      auditEvidenceIds,
    },
  });

  return {
    id: `builder-template-${input.template.id}`,
    sourceId: input.template.id,
    sourceKind: "template",
    title: input.template.name,
    description: input.template.description,
    status,
    score,
    trigger,
    conditions,
    actions,
    dryRun,
    rollbackNotes,
    auditEvidenceIds,
    executionPlan,
    nextAction: createFlowNextAction({
      title: input.template.name,
      status,
      dryRun,
      fallback: input.template.nextAction,
    }),
  };
}

function createRecipeTrigger(
  recipe: AutomationRecipeSummary,
): NoCodeAutomationTrigger {
  const kind = recipeTriggerKinds[recipe.id] ?? "manual";

  return {
    id: `trigger-${recipe.id}`,
    kind,
    label: recipe.cadenceDays
      ? `${recipe.title} every ${recipe.cadenceDays} days`
      : recipe.title,
    scheduleAt: recipe.defaultStartAt,
    cadenceDays: recipe.cadenceDays,
    detail: `${recipe.title} starts from ${recipe.defaultStartAt}.`,
  };
}

function createTemplateTrigger(
  template: WorkflowTemplateMarketplaceReport,
): NoCodeAutomationTrigger {
  return {
    id: `trigger-template-${template.id}`,
    kind: "manual",
    label: `${template.name} install run`,
    scheduleAt: null,
    cadenceDays: null,
    detail: `${template.name} is started manually from the internal workflow marketplace.`,
  };
}

function createRecipeConditions(input: {
  recipe: AutomationRecipeSummary;
  recentRuns: NoCodeAutomationBuilderInput["runHistory"]["runs"];
  auditEvidenceIds: string[];
}): NoCodeAutomationCondition[] {
  const failedRuns = input.recentRuns.filter((run) => run.status === "failed");

  return [
    {
      id: `condition-${input.recipe.id}-target`,
      kind: "target-available",
      status: input.recipe.targets.length ? "ready" : "blocked",
      label: "Targets available",
      detail: input.recipe.targets.length
        ? `${input.recipe.targets.length} ${input.recipe.targetLabel.toLowerCase()} target${input.recipe.targets.length === 1 ? "" : "s"} can run.`
        : `No ${input.recipe.targetLabel.toLowerCase()} targets are available.`,
    },
    {
      id: `condition-${input.recipe.id}-enabled`,
      kind: "recipe-enabled",
      status: input.recipe.disabledReason ? "blocked" : "ready",
      label: "Recipe enabled",
      detail:
        input.recipe.disabledReason ?? `${input.recipe.title} is enabled.`,
    },
    {
      id: `condition-${input.recipe.id}-run-health`,
      kind: "recent-run-health",
      status: failedRuns.length ? "review" : "ready",
      label: "Recent run health",
      detail: failedRuns.length
        ? `${failedRuns.length} failed run${failedRuns.length === 1 ? "" : "s"} should be reviewed before rollout.`
        : "No failed recent runs are attached to this recipe.",
    },
  ];
}

function createTemplateConditions(input: {
  template: WorkflowTemplateMarketplaceReport;
  auditEvidenceIds: string[];
}): NoCodeAutomationCondition[] {
  const dependencyConditions = input.template.dependencyChecks.map(
    (check): NoCodeAutomationCondition => ({
      id: `condition-template-${check.id}`,
      kind: "template-dependency",
      status: normalizeMarketplaceStatus(check.status),
      label: check.label,
      detail: check.detail,
    }),
  );

  return [
    ...dependencyConditions,
    {
      id: `condition-template-${input.template.id}-audit`,
      kind: "audit-evidence",
      status: input.auditEvidenceIds.length ? "ready" : "review",
      label: "Audit evidence",
      detail: input.auditEvidenceIds.length
        ? `${input.auditEvidenceIds.length} audit event${input.auditEvidenceIds.length === 1 ? "" : "s"} support this template.`
        : "Install or run audit evidence has not been recorded yet.",
    },
  ];
}

function createRecipeAction(
  recipe: AutomationRecipeSummary,
): NoCodeAutomationAction {
  return {
    id: `action-${recipe.id}`,
    kind: recipeActionKinds[recipe.id],
    recipeId: recipe.id,
    label: recipe.actionLabel,
    detail: recipe.description,
    targetCount: recipe.targets.length,
  };
}

function createRecipeRollbackNotes(input: {
  recipe: AutomationRecipeSummary;
  input: NoCodeAutomationBuilderInput;
}): string[] {
  const recoveryNotes = input.input.runHistory.recoveryPackets
    .filter((packet) => packet.recipeId === input.recipe.id)
    .flatMap((packet) =>
      packet.diagnostics.map(
        (diagnostic) => `${packet.summary}: ${diagnostic.detail}`,
      ),
    );

  return unique([
    `Undo ${input.recipe.title} by removing artifacts for selected ${input.recipe.targetLabel.toLowerCase()} targets.`,
    ...recoveryNotes,
  ]);
}

function createDryRun(input: {
  id: string;
  conditions: NoCodeAutomationCondition[];
  actions: NoCodeAutomationAction[];
  targetCount: number;
  fallbackBlockedReason: string | null;
}): NoCodeAutomationDryRunSimulation {
  const blockedReasons = [
    ...input.conditions
      .filter((condition) => condition.status === "blocked")
      .map((condition) => condition.detail),
    ...(input.fallbackBlockedReason ? [input.fallbackBlockedReason] : []),
  ];
  const warnings = input.conditions
    .filter((condition) => condition.status === "review")
    .map((condition) => condition.detail);
  const status: NoCodeAutomationBuilderStatus = blockedReasons.length
    ? "blocked"
    : warnings.length
      ? "review"
      : "ready";
  const estimatedArtifacts =
    status === "blocked"
      ? 0
      : Math.max(1, input.targetCount) * Math.max(1, input.actions.length);

  return {
    id: input.id,
    status,
    estimatedArtifacts,
    blockedReasons: unique(blockedReasons),
    warnings: unique(warnings),
    detail:
      status === "blocked"
        ? "Dry-run is blocked until conditions are cleared."
        : `Dry-run would create ${estimatedArtifacts} downstream artifact${estimatedArtifacts === 1 ? "" : "s"}.`,
  };
}

function createExecutionPlan(input: {
  generatedAt: string;
  flow: {
    id: string;
    sourceKind: "recipe" | "template";
    sourceId: string;
    title: string;
    trigger: NoCodeAutomationTrigger;
    conditions: NoCodeAutomationCondition[];
    actions: NoCodeAutomationAction[];
    dryRun: NoCodeAutomationDryRunSimulation;
    rollbackNotes: string[];
    auditEvidenceIds: string[];
  };
}): NoCodeAutomationExecutionPlan {
  const status = aggregateStatus([
    ...input.flow.conditions.map((condition) => condition.status),
    input.flow.dryRun.status,
  ]);
  const payload = {
    kind: "essence-studio.no-code-automation-builder",
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    flow: input.flow,
    status,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `execution-plan-${input.flow.id}`,
    status,
    generatedAt: input.generatedAt,
    fileName: `${input.flow.id}-execution-plan.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
  };
}

function getAuditEvidenceIds(input: {
  sourceId: string;
  input: NoCodeAutomationBuilderInput;
}): string[] {
  return input.input.auditLogs
    .filter(
      (log) =>
        log.targetId === input.sourceId ||
        stringOrNull(log.metadata.recipeId) === input.sourceId ||
        stringOrNull(log.metadata.templateId) === input.sourceId,
    )
    .map((log) => log.id);
}

function createFlowNextAction(input: {
  title: string;
  status: NoCodeAutomationBuilderStatus;
  dryRun: NoCodeAutomationDryRunSimulation;
  fallback: string | null;
}): string {
  if (input.status === "ready") {
    return `${input.title}: dry-run is ready for execution plan review.`;
  }

  if (input.dryRun.blockedReasons.length) {
    return `${input.title}: ${input.dryRun.blockedReasons[0]}`;
  }

  return `${input.title}: ${input.fallback ?? input.dryRun.warnings[0] ?? "review builder warnings before execution."}`;
}

function scoreFlow(input: {
  status: NoCodeAutomationBuilderStatus;
  conditions: NoCodeAutomationCondition[];
  dryRun: NoCodeAutomationDryRunSimulation;
  actions: NoCodeAutomationAction[];
}): number {
  const blocked = input.conditions.filter(
    (condition) => condition.status === "blocked",
  ).length;
  const review = input.conditions.filter(
    (condition) => condition.status === "review",
  ).length;
  const emptyActionPenalty = input.actions.length ? 0 : 24;

  return Math.max(
    0,
    100 -
      blocked * 28 -
      review * 12 -
      emptyActionPenalty -
      (input.dryRun.status === "blocked"
        ? 20
        : input.dryRun.status === "review"
          ? 8
          : 0),
  );
}

function aggregateStatus(
  statuses: NoCodeAutomationBuilderStatus[],
): NoCodeAutomationBuilderStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function normalizeMarketplaceStatus(
  status: NoCodeAutomationBuilderStatus,
): NoCodeAutomationBuilderStatus {
  return status;
}

function compareFlows(
  left: NoCodeAutomationBuilderFlow,
  right: NoCodeAutomationBuilderFlow,
): number {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    left.title.localeCompare(right.title)
  );
}

function statusWeight(status: NoCodeAutomationBuilderStatus): number {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function average(values: number[], fallback: number): number {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeDate(value: string | Date | undefined): Date {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

const recipeTriggerKinds: Record<
  AutomationRecipeId,
  NoCodeAutomationTriggerKind
> = {
  "scheduled-export": "scheduled",
  "publishing-reminder": "scheduled",
  "review-nudge": "event",
  "campaign-cadence": "campaign-launch",
};

const recipeActionKinds: Record<
  AutomationRecipeId,
  NoCodeAutomationActionKind
> = {
  "scheduled-export": "queue-export",
  "publishing-reminder": "schedule-content",
  "review-nudge": "notify-reviewers",
  "campaign-cadence": "schedule-content",
};

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  AutomationRecipeId,
  AutomationRecipeSummary,
} from "@/features/automation/automation-recipes";
import type { AutomationRunHistoryCenter } from "@/features/automation/automation-run-history";
import type {
  WorkflowTemplateMarketplaceCenter,
  WorkflowTemplateMarketplaceReport,
} from "@/features/automation/workflow-template-marketplace";

export type NoCodeAutomationBuilderStatus = "ready" | "review" | "blocked";

export type NoCodeAutomationTriggerKind =
  | "manual"
  | "scheduled"
  | "event"
  | "campaign-launch";

export type NoCodeAutomationConditionKind =
  | "target-available"
  | "recipe-enabled"
  | "recent-run-health"
  | "template-dependency"
  | "audit-evidence";

export type NoCodeAutomationActionKind =
  | "queue-export"
  | "schedule-content"
  | "notify-reviewers"
  | "install-template"
  | "run-template-step";

export type NoCodeAutomationBuilderInput = {
  automationRecipes: AutomationRecipeSummary[];
  runHistory: AutomationRunHistoryCenter;
  workflowMarketplace: WorkflowTemplateMarketplaceCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type NoCodeAutomationTrigger = {
  id: string;
  kind: NoCodeAutomationTriggerKind;
  label: string;
  scheduleAt: string | null;
  cadenceDays: number | null;
  detail: string;
};

export type NoCodeAutomationCondition = {
  id: string;
  kind: NoCodeAutomationConditionKind;
  status: NoCodeAutomationBuilderStatus;
  label: string;
  detail: string;
};

export type NoCodeAutomationAction = {
  id: string;
  kind: NoCodeAutomationActionKind;
  recipeId: AutomationRecipeId | null;
  label: string;
  detail: string;
  targetCount: number;
};

export type NoCodeAutomationDryRunSimulation = {
  id: string;
  status: NoCodeAutomationBuilderStatus;
  estimatedArtifacts: number;
  blockedReasons: string[];
  warnings: string[];
  detail: string;
};

export type NoCodeAutomationExecutionPlan = {
  id: string;
  status: NoCodeAutomationBuilderStatus;
  generatedAt: string;
  fileName: string;
  dataUrl: string;
  json: string;
};

export type NoCodeAutomationBuilderFlow = {
  id: string;
  sourceId: string;
  sourceKind: "recipe" | "template";
  title: string;
  description: string;
  status: NoCodeAutomationBuilderStatus;
  score: number;
  trigger: NoCodeAutomationTrigger;
  conditions: NoCodeAutomationCondition[];
  actions: NoCodeAutomationAction[];
  dryRun: NoCodeAutomationDryRunSimulation;
  rollbackNotes: string[];
  auditEvidenceIds: string[];
  executionPlan: NoCodeAutomationExecutionPlan;
  nextAction: string;
};

export type NoCodeAutomationBuilderCenter = {
  generatedAt: string;
  status: NoCodeAutomationBuilderStatus;
  score: number;
  flows: NoCodeAutomationBuilderFlow[];
  nextActions: string[];
  totals: {
    flows: number;
    recipeFlows: number;
    templateFlows: number;
    typedTriggers: number;
    typedConditions: number;
    typedActions: number;
    dryRuns: number;
    rollbackNotes: number;
    executionPlans: number;
    blockedFlows: number;
    reviewFlows: number;
    auditEvidence: number;
  };
};

export type NoCodeAutomationTemplateSource = WorkflowTemplateMarketplaceReport;

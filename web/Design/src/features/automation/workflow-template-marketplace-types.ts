import type {
  AutomationRecipeId,
  AutomationRecipeSummary,
} from "@/features/automation/automation-recipes";

export type WorkflowTemplateMarketplaceStatus = "ready" | "review" | "blocked";

export type WorkflowTemplateCategory =
  | "campaign-ops"
  | "export-ops"
  | "governance"
  | "review";

export type WorkflowTemplateRequiredRole = "member" | "admin" | "owner";

export type WorkflowTemplateRecipeStep = {
  id: string;
  recipeId: AutomationRecipeId;
  title: string;
  dependencyDetail: string;
  rollbackNote: string;
};

export type WorkflowTemplateVersion = {
  version: string;
  releasedAt: string;
  summary: string;
  recipeSteps: WorkflowTemplateRecipeStep[];
};

export type WorkflowTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  category: WorkflowTemplateCategory;
  requiredRole: WorkflowTemplateRequiredRole;
  versions: WorkflowTemplateVersion[];
};

export type WorkflowTemplateDependencyKind =
  | "recipe"
  | "team-role"
  | "version"
  | "workspace";

export type WorkflowTemplateDependencyCheck = {
  id: string;
  templateId: string;
  kind: WorkflowTemplateDependencyKind;
  status: WorkflowTemplateMarketplaceStatus;
  label: string;
  detail: string;
  recipeId?: AutomationRecipeId;
};

export type WorkflowTemplateRollbackPlan = {
  id: string;
  templateId: string;
  fileName: string;
  dataUrl: string;
  notes: string[];
  affectedRecipeIds: AutomationRecipeId[];
};

export type WorkflowTemplateAdoptionAnalytics = {
  installs: number;
  recipeRuns: number;
  adoptionRate: number;
  installedWorkspaceIds: string[];
  latestInstalledAt: string | null;
  latestRunAt: string | null;
};

export type WorkflowTemplateMarketplaceReport = {
  id: string;
  name: string;
  description: string;
  category: WorkflowTemplateCategory;
  requiredRole: WorkflowTemplateRequiredRole;
  currentVersion: WorkflowTemplateVersion;
  status: WorkflowTemplateMarketplaceStatus;
  score: number;
  dependencyChecks: WorkflowTemplateDependencyCheck[];
  rollbackPlan: WorkflowTemplateRollbackPlan;
  adoption: WorkflowTemplateAdoptionAnalytics;
  installed: boolean;
  installableWorkspaceIds: string[];
  installableWorkspaces: Array<{
    id: string;
    name: string;
    role: WorkflowTemplateRequiredRole;
  }>;
  nextAction: string;
};

export type WorkflowTemplateMarketplacePacket = {
  id: string;
  status: WorkflowTemplateMarketplaceStatus;
  generatedAt: string;
  fileName: string;
  dataUrl: string;
};

export type WorkflowTemplateMarketplaceCenter = {
  generatedAt: string;
  status: WorkflowTemplateMarketplaceStatus;
  score: number;
  templates: WorkflowTemplateMarketplaceReport[];
  marketplacePacket: WorkflowTemplateMarketplacePacket;
  nextActions: string[];
  totals: {
    templates: number;
    readyTemplates: number;
    reviewTemplates: number;
    blockedTemplates: number;
    versions: number;
    dependencyChecks: number;
    rollbackNotes: number;
    installs: number;
    recipeRuns: number;
    marketplacePackets: number;
  };
};

export type WorkflowTemplateMarketplaceInput = {
  automationRecipes: AutomationRecipeSummary[];
  teamManagement: Array<{
    id: string;
    name: string;
    role: WorkflowTemplateRequiredRole;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetId: string | null;
    summary: string;
    actorEmail: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  now?: Date | string;
};

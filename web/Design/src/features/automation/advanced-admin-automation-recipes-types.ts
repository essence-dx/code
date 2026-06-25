export type AdvancedAdminAutomationStatus = "ready" | "review" | "blocked";

export type AdvancedAdminAutomationRecipeId =
  | "bulk-remediation"
  | "approval-follow-ups"
  | "retention-sweep"
  | "audit-packet-generation";

export type AdvancedAdminAutomationTargetSource =
  | "policy"
  | "approval"
  | "retention"
  | "automation"
  | "audit";

export type AdvancedAdminAutomationRecipeTarget = {
  id: string;
  source: AdvancedAdminAutomationTargetSource;
  label: string;
  detail: string;
  status: AdvancedAdminAutomationStatus;
  sourceIds: string[];
  ownerLabel: string | null;
  workspaceName: string | null;
};

export type AdvancedAdminAutomationRecipePlan = {
  id: AdvancedAdminAutomationRecipeId;
  title: string;
  description: string;
  status: AdvancedAdminAutomationStatus;
  score: number;
  targetLabel: string;
  actionLabel: string;
  targets: AdvancedAdminAutomationRecipeTarget[];
  plannedActions: string[];
  evidence: string[];
  auditLogIds: string[];
  packetIds: string[];
  disabledReason: string | null;
};

export type AdvancedAdminAutomationAuditPacket = {
  id: string;
  status: AdvancedAdminAutomationStatus;
  generatedAt: string;
  recipeIds: AdvancedAdminAutomationRecipeId[];
  auditLogIds: string[];
  packetIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type AdvancedAdminAutomationCenter = {
  status: AdvancedAdminAutomationStatus;
  score: number;
  generatedAt: string;
  recipes: AdvancedAdminAutomationRecipePlan[];
  auditPacket: AdvancedAdminAutomationAuditPacket;
  nextActions: string[];
  totals: {
    recipes: number;
    readyRecipes: number;
    reviewRecipes: number;
    blockedRecipes: number;
    targets: number;
    plannedActions: number;
    auditEvents: number;
    sourcePackets: number;
    recoveryPackets: number;
  };
};

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AutomationRunHistoryCenter } from "@/features/automation/automation-run-history";
import type { AdvancedAdminAutomationCenter } from "@/features/automation/advanced-admin-automation-recipes";
import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type { PublishExportReleaseGateCenter } from "@/features/operations/publish-export-release-gates";
import type { WorkspaceBackupRestoreCenter } from "@/features/operations/workspace-backup-restore";
import type { MarketplaceCreatorOperationsCenter } from "@/features/templates/marketplace-creator-operations";

export type ProductionCommandRunnerStatus = "ready" | "review" | "blocked";

export type ProductionCommandArea =
  | "policy"
  | "release"
  | "automation"
  | "admin"
  | "backup"
  | "marketplace";

export type ProductionCommandMode = "dry-run" | "apply";
export type ProductionCommandBatchMode = ProductionCommandMode | "mixed";

export type ProductionCommandPhase =
  | "validate"
  | "dry-run"
  | "approval"
  | "apply"
  | "rollback"
  | "report";

export type ProductionCommandRisk = "low" | "medium" | "high";

export type ProductionCommandSourceKind =
  | "policy-dry-run"
  | "release-gate"
  | "release-override"
  | "automation-recovery"
  | "admin-recipe"
  | "backup-integrity"
  | "backup-restore-dry-run"
  | "backup-rollback"
  | "marketplace-moderation";

export type ProductionCommandAuditEvidence = {
  auditLogIds: string[];
  packetIds: string[];
  sourceIds: string[];
};

export type ProductionCommand = {
  id: string;
  area: ProductionCommandArea;
  sourceKind: ProductionCommandSourceKind;
  sourceId: string;
  title: string;
  detail: string;
  status: ProductionCommandRunnerStatus;
  mode: ProductionCommandMode;
  phase: ProductionCommandPhase;
  risk: ProductionCommandRisk;
  sequence: number;
  dryRunPlan: string[];
  applyPlan: string[];
  rollbackNote: string;
  auditEvidence: ProductionCommandAuditEvidence;
  reportSummary: string;
};

export type ProductionCommandBatch = {
  id: string;
  area: ProductionCommandArea;
  title: string;
  status: ProductionCommandRunnerStatus;
  mode: ProductionCommandBatchMode;
  commands: ProductionCommand[];
  dryRunPlan: string[];
  applyPlan: string[];
  rollbackNotes: string[];
  auditEvidence: ProductionCommandAuditEvidence;
};

export type ProductionCommandExecutionReport = {
  id: string;
  batchId: string;
  status: ProductionCommandRunnerStatus;
  generatedAt: string;
  commandIds: string[];
  dryRunSteps: string[];
  applySteps: string[];
  rollbackNotes: string[];
  auditEvidence: ProductionCommandAuditEvidence;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type ProductionCommandRunnerCenter = {
  generatedAt: string;
  status: ProductionCommandRunnerStatus;
  score: number;
  commands: ProductionCommand[];
  batches: ProductionCommandBatch[];
  executionReports: ProductionCommandExecutionReport[];
  nextActions: string[];
  totals: {
    batches: number;
    commands: number;
    readyCommands: number;
    reviewCommands: number;
    blockedCommands: number;
    dryRunCommands: number;
    applyReadyCommands: number;
    rollbackNotes: number;
    auditEvidenceLinks: number;
    executionReports: number;
  };
};

export type ProductionCommandRunnerInput = {
  policyAsCode: PolicyAsCodeGovernanceCenter;
  publishExportReleaseGates: PublishExportReleaseGateCenter;
  automationRunHistory: AutomationRunHistoryCenter;
  advancedAdminAutomation: AdvancedAdminAutomationCenter;
  workspaceBackupRestore: WorkspaceBackupRestoreCenter;
  marketplaceCreatorOperations: MarketplaceCreatorOperationsCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

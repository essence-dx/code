import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type {
  DesignSystemComponentDefinition,
  DesignSystemIntelligenceCenter,
  DesignSystemIntelligenceStatus,
  DesignSystemTokenKind,
} from "@/features/design-system/design-system-intelligence";

export type DesignSystemReleaseGovernanceStatus =
  DesignSystemIntelligenceStatus;

export type DesignSystemReleaseGateKind =
  | "token"
  | "approval"
  | "usage"
  | "rollback"
  | "audit"
  | "public-surface";

export type DesignSystemBreakingChangeKind =
  | "token-migration"
  | "approval"
  | "rollback"
  | "public-surface"
  | "adoption";

export type DesignSystemReleaseGovernanceInput = {
  designSystem: DesignSystemIntelligenceCenter;
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type DesignSystemTokenMigrationPlan = {
  id: string;
  tokenKind: DesignSystemTokenKind;
  label: string;
  status: DesignSystemReleaseGovernanceStatus;
  affectedProjectIds: string[];
  readinessScore: number;
  blockerCount: number;
  steps: string[];
};

export type DesignSystemReleaseGateResult = {
  id: string;
  kind: DesignSystemReleaseGateKind;
  status: DesignSystemReleaseGovernanceStatus;
  label: string;
  detail: string;
};

export type DesignSystemComponentAdoptionGate = {
  id: string;
  componentId: string;
  templateId: string;
  componentName: string;
  status: DesignSystemReleaseGovernanceStatus;
  score: number;
  affectedProjectIds: string[];
  publicSurfaces: number;
  gateResults: DesignSystemReleaseGateResult[];
  nextAction: string;
};

export type DesignSystemBreakingChange = {
  id: string;
  kind: DesignSystemBreakingChangeKind;
  status: DesignSystemReleaseGovernanceStatus;
  label: string;
  detail: string;
};

export type DesignSystemBreakingChangePreview = {
  id: string;
  componentId: string;
  templateId: string;
  componentName: string;
  status: DesignSystemReleaseGovernanceStatus;
  affectedProjectIds: string[];
  changes: DesignSystemBreakingChange[];
  detail: string;
};

export type DesignSystemDownstreamImpactPacket = {
  id: string;
  componentId: string;
  templateId: string;
  componentName: string;
  status: DesignSystemReleaseGovernanceStatus;
  affectedProjectIds: string[];
  publicSurfaces: number;
  restorePoints: number;
  fileName: string;
  dataUrl: string;
  json: string;
};

export type DesignSystemReleaseGovernanceCenter = {
  generatedAt: string;
  status: DesignSystemReleaseGovernanceStatus;
  score: number;
  tokenMigrationPlans: DesignSystemTokenMigrationPlan[];
  componentAdoptionGates: DesignSystemComponentAdoptionGate[];
  breakingChangePreviews: DesignSystemBreakingChangePreview[];
  downstreamImpactPackets: DesignSystemDownstreamImpactPacket[];
  nextActions: string[];
  totals: {
    tokenMigrationPlans: number;
    componentAdoptionGates: number;
    breakingChangePreviews: number;
    downstreamImpactPackets: number;
    affectedProjects: number;
    publicSurfaces: number;
    blockedGates: number;
    reviewGates: number;
    readyGates: number;
  };
};

export type DesignSystemReleaseGovernanceComponentContext = {
  component: DesignSystemComponentDefinition;
  template: DesignTemplateSummary | null;
  projects: ProjectSummary[];
  restorePointCount: number;
  auditEvents: WorkspaceAuditLogSummary[];
};

export type TemplateInstancePropagationStatus = "ready" | "review" | "blocked";

export type TemplateInstancePropagationDecision = "accept" | "hold" | "reject";

export type TemplateInstanceChangeKind =
  | "template-update"
  | "dimension"
  | "approval"
  | "campaign"
  | "rollback";

export type TemplateInstanceBreakingChangeKind =
  | "dimension-mismatch"
  | "source-disconnected"
  | "project-changes-requested"
  | "campaign-not-ready"
  | "missing-rollback-snapshot";

export type TemplateInstanceChange = {
  id: string;
  kind: TemplateInstanceChangeKind;
  label: string;
  detail: string;
  before: string;
  after: string;
  status: TemplateInstancePropagationStatus;
};

export type TemplateInstanceBreakingChange = {
  id: string;
  templateId: string;
  templateName: string;
  projectId: string;
  projectName: string;
  kind: TemplateInstanceBreakingChangeKind;
  severity: TemplateInstancePropagationStatus;
  detail: string;
  remediation: string;
};

export type TemplateInstanceUpdatePreview = {
  id: string;
  templateId: string;
  templateName: string;
  projectId: string;
  projectName: string;
  projectHref: string;
  status: TemplateInstancePropagationStatus;
  score: number;
  decision: TemplateInstancePropagationDecision;
  decisionLabel: string;
  changes: TemplateInstanceChange[];
  breakingChanges: TemplateInstanceBreakingChange[];
  rollbackPacketId: string | null;
  latestVersionId: string | null;
  latestVersionAt: string | null;
  campaignIds: string[];
  campaignNames: string[];
  nextAction: string;
};

export type TemplateInstanceRollbackPacket = {
  id: string;
  templateId: string;
  templateName: string;
  status: TemplateInstancePropagationStatus;
  fileName: string;
  dataUrl: string;
  projectIds: string[];
  campaignIds: string[];
  createdAt: string;
  steps: string[];
};

export type TemplateInstanceGroup = {
  id: string;
  templateId: string;
  templateName: string;
  href: string;
  dimensions: string;
  status: TemplateInstancePropagationStatus;
  score: number;
  instanceCount: number;
  campaignCount: number;
  acceptableCount: number;
  heldCount: number;
  rejectedCount: number;
  latestTemplateAuditAt: string | null;
  updatePreviews: TemplateInstanceUpdatePreview[];
  rollbackPacket: TemplateInstanceRollbackPacket | null;
  nextAction: string;
};

export type TemplateInstancePropagationCenter = {
  generatedAt: string;
  status: TemplateInstancePropagationStatus;
  score: number;
  templateGroups: TemplateInstanceGroup[];
  updatePreviews: TemplateInstanceUpdatePreview[];
  breakingChanges: TemplateInstanceBreakingChange[];
  rollbackPackets: TemplateInstanceRollbackPacket[];
  nextActions: string[];
  totals: {
    templates: number;
    instances: number;
    campaigns: number;
    acceptableUpdates: number;
    heldUpdates: number;
    rejectedUpdates: number;
    breakingChanges: number;
    rollbackPackets: number;
  };
};

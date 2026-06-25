import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignGovernanceReport } from "@/features/governance/design-governance";
import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type { EnterpriseApprovalWorkflowCenter } from "@/features/review/enterprise-approval-workflows";

export type BrandComplianceApprovalStatus = "ready" | "review" | "blocked";

export type BrandComplianceRuleCategory =
  | "brand-identity"
  | "template-locks"
  | "approval-gates"
  | "policy-as-code"
  | "legal-review"
  | "campaign-enforcement";

export type BrandComplianceRule = {
  id: string;
  category: BrandComplianceRuleCategory;
  title: string;
  description: string;
  status: BrandComplianceApprovalStatus;
  score: number;
  evidence: string[];
  sourceIds: string[];
};

export type BrandComplianceExceptionSourceKind =
  | "policy"
  | "approval"
  | "campaign";

export type BrandComplianceExceptionRequest = {
  id: string;
  sourceKind: BrandComplianceExceptionSourceKind;
  sourceId: string;
  title: string;
  status: BrandComplianceApprovalStatus;
  requestReason: string;
  requesterRole: string;
  approverRole: string;
  legalReviewRequired: boolean;
  sourceIds: string[];
  auditEvidenceIds: string[];
};

export type BrandComplianceLegalReviewPacket = {
  id: string;
  status: BrandComplianceApprovalStatus;
  generatedAt: string;
  exceptionRequestIds: string[];
  auditEvidenceIds: string[];
  notes: string[];
  fileName: string;
  dataUrl: string;
  json: string;
};

export type BrandComplianceCampaignEnforcement = {
  id: string;
  campaignId: string;
  campaignName: string;
  status: BrandComplianceApprovalStatus;
  score: number;
  enforcedRuleIds: string[];
  blockedDeliverableIds: string[];
  reviewDeliverableIds: string[];
  missingBrandEvidence: string[];
  enforcementSummary: string;
  nextAction: string;
};

export type BrandComplianceApprovalCenter = {
  generatedAt: string;
  status: BrandComplianceApprovalStatus;
  score: number;
  ruleLibrary: BrandComplianceRule[];
  exceptionRequests: BrandComplianceExceptionRequest[];
  legalReviewPackets: BrandComplianceLegalReviewPacket[];
  campaignEnforcement: BrandComplianceCampaignEnforcement[];
  nextActions: string[];
  totals: {
    reusableRules: number;
    exceptionRequests: number;
    blockedExceptions: number;
    reviewExceptions: number;
    legalReviewPackets: number;
    campaignEnforcements: number;
    blockedCampaigns: number;
    reviewCampaigns: number;
    auditEvidence: number;
  };
};

export type BrandComplianceApprovalCenterInput = {
  designGovernance: DesignGovernanceReport;
  policyAsCode: PolicyAsCodeGovernanceCenter;
  approvalWorkflows: EnterpriseApprovalWorkflowCenter;
  campaigns: CampaignBoardSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

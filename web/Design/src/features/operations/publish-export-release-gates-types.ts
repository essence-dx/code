import type { PolicyAsCodeDomain } from "@/features/governance/policy-as-code-governance";

export type PublishExportReleaseStatus = "ready" | "review" | "blocked";

export type PublishExportReleaseGateId =
  | "policy-decisions"
  | "export-readiness"
  | "publish-readiness"
  | "override-requests"
  | "approval-evidence";

export type PublishExportReleaseGateItem = {
  id: string;
  title: string;
  detail: string;
  status: PublishExportReleaseStatus;
  badge: string;
  sourceId: string | null;
  sourceKind: string;
  href: string | null;
  meta: string[];
};

export type PublishExportReleaseGate = {
  id: PublishExportReleaseGateId;
  title: string;
  description: string;
  status: PublishExportReleaseStatus;
  score: number;
  metricLabel: string;
  metricValue: number;
  items: PublishExportReleaseGateItem[];
};

export type PublishExportOverrideStatus = "needed" | "requested" | "approved";

export type PublishExportOverrideRequest = {
  id: string;
  status: PublishExportOverrideStatus;
  severity: PublishExportReleaseStatus;
  sourcePolicyDomain: PolicyAsCodeDomain;
  affectedItemId: string;
  affectedItemKind: string;
  title: string;
  detail: string;
  sourceIds: string[];
  auditLogIds: string[];
  requestedAt: string | null;
  requesterEmail: string | null;
  approvalRequired: boolean;
  form: {
    targetType: string;
    targetId: string;
    gateId: PublishExportReleaseGateId;
    policyDomain: PolicyAsCodeDomain;
    summary: string;
  };
};

export type PublishExportApprovalEvidence = {
  id: string;
  subjectType: "project";
  subjectId: string;
  title: string;
  status: PublishExportReleaseStatus;
  summary: string;
  auditLogId: string | null;
  approvedAt: string | null;
  actorEmail: string | null;
  href: string | null;
  meta: string[];
};

export type PublishExportReleasePacket = {
  fileName: string;
  dataUrl: string;
  payload: {
    kind: "essence-studio.publish-export-release-gates";
    version: 1;
    generatedAt: string;
    status: PublishExportReleaseStatus;
    score: number;
    gates: Array<{
      id: PublishExportReleaseGateId;
      title: string;
      status: PublishExportReleaseStatus;
      score: number;
      metric: string;
      items: PublishExportReleaseGateItem[];
    }>;
    overrideRequests: Array<{
      id: string;
      status: PublishExportOverrideStatus;
      sourcePolicyDomain: PolicyAsCodeDomain;
      affectedItemId: string;
      severity: PublishExportReleaseStatus;
      auditLogIds: string[];
    }>;
    approvalEvidence: Array<{
      id: string;
      subjectId: string;
      status: PublishExportReleaseStatus;
      auditLogId: string | null;
    }>;
    nextActions: string[];
  };
};

export type PublishExportReleaseGateCenter = {
  status: PublishExportReleaseStatus;
  score: number;
  checkedAt: string;
  gates: PublishExportReleaseGate[];
  overrideRequests: PublishExportOverrideRequest[];
  approvalEvidence: PublishExportApprovalEvidence[];
  releasePacket: PublishExportReleasePacket;
  nextActions: string[];
  totals: {
    gates: number;
    blockedGates: number;
    reviewGates: number;
    policyExceptions: number;
    exportJobs: number;
    completedExports: number;
    failedExports: number;
    publishedSurfaces: number;
    overrideRequests: number;
    requestedOverrides: number;
    approvalEvidence: number;
    auditableApprovals: number;
  };
};

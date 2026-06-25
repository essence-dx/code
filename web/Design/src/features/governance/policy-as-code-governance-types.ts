export type PolicyAsCodeStatus = "ready" | "review" | "blocked";

export type PolicyAsCodeDomain =
  | "sharing"
  | "publishing"
  | "assets"
  | "approvals"
  | "retention";

export type PolicyAsCodeAffectedItemKind =
  | "project"
  | "template"
  | "schedule"
  | "asset"
  | "review-task"
  | "audit";

export type PolicyAsCodeAffectedItem = {
  id: string;
  kind: PolicyAsCodeAffectedItemKind;
  name: string;
  severity: PolicyAsCodeStatus;
  detail: string;
  sourceIds: string[];
};

export type PolicyAsCodeRule = {
  id: string;
  domain: PolicyAsCodeDomain;
  title: string;
  description: string;
  policyExpression: string;
  status: PolicyAsCodeStatus;
  score: number;
  evidence: string[];
  violationCount: number;
};

export type PolicyAsCodeDryRunReport = {
  id: string;
  domain: PolicyAsCodeDomain;
  title: string;
  status: PolicyAsCodeStatus;
  score: number;
  summary: string;
  affectedItems: PolicyAsCodeAffectedItem[];
  plannedActions: string[];
  auditLogIds: string[];
};

export type PolicyAsCodeEnforcementPacket = {
  id: string;
  status: PolicyAsCodeStatus;
  generatedAt: string;
  ruleIds: string[];
  violationCount: number;
  plannedActionCount: number;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type PolicyAsCodeGovernanceCenter = {
  status: PolicyAsCodeStatus;
  score: number;
  checkedAt: string;
  rules: PolicyAsCodeRule[];
  dryRunReports: PolicyAsCodeDryRunReport[];
  enforcementPacket: PolicyAsCodeEnforcementPacket;
  nextActions: string[];
  totals: {
    policyDomains: number;
    rules: number;
    dryRunReports: number;
    violations: number;
    blockedRules: number;
    reviewRules: number;
    plannedActions: number;
    auditEvents: number;
  };
};

export const policyDefinitions: Record<
  PolicyAsCodeDomain,
  {
    title: string;
    description: string;
    policyExpression: string;
  }
> = {
  sharing: {
    title: "Sharing policy",
    description:
      "Public and editable share links should not expose draft or unapproved work.",
    policyExpression:
      "project.share.edit.permission != edit unless project.approval == approved",
  },
  publishing: {
    title: "Publishing policy",
    description:
      "Scheduled content, website surfaces, and marketplace templates need release-ready copy and approval evidence.",
    policyExpression:
      "publishable.approval == approved && scheduled.caption.length > 0",
  },
  assets: {
    title: "Asset policy",
    description:
      "Reusable assets should carry source, license, and manifest evidence before export or publication.",
    policyExpression:
      "asset.source != null && asset.license != null && manifest.skipped == 0",
  },
  approvals: {
    title: "Approval policy",
    description:
      "Open review work must have owners and due dates before release gates move forward.",
    policyExpression:
      "review.status == done || review.due_at >= now && review.assignee != null",
  },
  retention: {
    title: "Retention policy",
    description:
      "Deleted or stale projects need retention handling, and legal holds must block destructive cleanup.",
    policyExpression:
      "delete.allowed only when legal_hold == false && retention_window.elapsed",
  },
};

export const staleProjectReviewDays = 120;
export const retentionWindowDays = 30;

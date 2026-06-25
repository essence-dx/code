import type { GovernanceTimelineReport, GovernanceTimelineSeverity } from "@/features/projects/governance-timeline";
import type { PolicyAsCodeReport, PolicyAsCodeStatus } from "@/features/projects/policy-as-code-checks";

export type GovernanceExceptionReviewerSignoff = "approved" | "changes-requested" | "pending";
export type GovernanceExceptionStatus = "approved" | "expired" | "pending" | "rejected" | "review-needed";
export type GovernanceExceptionScopeKind = "policy" | "timeline";

export interface GovernanceExceptionRequest {
  expiresAt: string;
  id: string;
  ownerNote: string;
  requestedAt: string;
  requestedBy: string;
  reviewerNote: string | null;
  reviewerSignoff: GovernanceExceptionReviewerSignoff;
  scopeId: string;
  scopeLabel: string;
  signedOffAt: string | null;
  signedOffBy: string | null;
}

export interface GovernanceExceptionWorkflowRow {
  evidence: string;
  expiresAt: string | null;
  expiresInDays: number | null;
  id: string;
  nextAction: string;
  ownerHint: string;
  ownerNote: string;
  requestedAt: string | null;
  requestedBy: string | null;
  reviewerNote: string | null;
  reviewerSignoff: GovernanceExceptionReviewerSignoff | null;
  riskLabel: string;
  scopeId: string;
  scopeKind: GovernanceExceptionScopeKind;
  scopeLabel: string;
  signedOffAt: string | null;
  signedOffBy: string | null;
  status: GovernanceExceptionStatus;
}

export interface GovernanceExceptionWorkflowReport {
  generatedAt: string;
  rows: GovernanceExceptionWorkflowRow[];
  summary: {
    approvedCount: number;
    expiredCount: number;
    expiringSoonCount: number;
    pendingCount: number;
    rejectedCount: number;
    reviewNeededCount: number;
    totalCount: number;
    workflowScore: number;
  };
}

export interface CreateGovernanceExceptionWorkflowInput {
  exceptionRequests: GovernanceExceptionRequest[];
  generatedAt?: string;
  governanceTimelineReport: GovernanceTimelineReport;
  policyAsCodeReport: PolicyAsCodeReport;
}

const statusRank: Record<GovernanceExceptionStatus, number> = {
  expired: 0,
  rejected: 1,
  "review-needed": 2,
  pending: 3,
  approved: 4,
};

const statusScore: Record<GovernanceExceptionStatus, number> = {
  approved: 100,
  expired: 0,
  pending: 50,
  rejected: 0,
  "review-needed": 50,
};

function toTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function daysUntil(value: string | null, generatedAt: string) {
  const targetTime = toTime(value);
  const generatedTime = toTime(generatedAt);

  if (!targetTime || !generatedTime) {
    return null;
  }

  return Math.ceil((targetTime - generatedTime) / (24 * 60 * 60 * 1000));
}

function scopeKind(scopeId: string): GovernanceExceptionScopeKind {
  return scopeId.startsWith("timeline:") ? "timeline" : "policy";
}

function statusFromRequest(request: GovernanceExceptionRequest, generatedAt: string): GovernanceExceptionStatus {
  const expiresAtTime = toTime(request.expiresAt);
  const generatedAtTime = toTime(generatedAt);

  if (expiresAtTime > 0 && generatedAtTime > 0 && expiresAtTime < generatedAtTime) {
    return "expired";
  }

  if (request.reviewerSignoff === "changes-requested") {
    return "rejected";
  }

  if (request.reviewerSignoff === "approved" && request.signedOffBy && request.signedOffAt) {
    return "approved";
  }

  return "pending";
}

function riskLabelForPolicy(status: PolicyAsCodeStatus) {
  if (status === "blocked") {
    return "Policy blocker";
  }

  return status === "watch" ? "Policy warning" : "Policy ready";
}

function riskLabelForTimeline(severity: GovernanceTimelineSeverity) {
  if (severity === "critical") {
    return "Critical timeline event";
  }

  if (severity === "warning") {
    return "Timeline warning";
  }

  return severity === "healthy" ? "Healthy signal" : "Informational signal";
}

function nextActionForStatus(status: GovernanceExceptionStatus) {
  if (status === "approved") {
    return "Keep the approval note, reviewer sign-off, and expiry date with the release packet.";
  }

  if (status === "expired") {
    return "Close or renew this expired exception before depending on it for release approval.";
  }

  if (status === "rejected") {
    return "Resolve reviewer feedback before requesting another scoped exception.";
  }

  if (status === "pending") {
    return "Collect reviewer sign-off or request changes before the exception window starts.";
  }

  return "Create a scoped exception request with an owner note, expiry date, and reviewer.";
}

function requestRow(request: GovernanceExceptionRequest, generatedAt: string): GovernanceExceptionWorkflowRow {
  const status = statusFromRequest(request, generatedAt);

  return {
    evidence: request.reviewerNote ?? request.ownerNote,
    expiresAt: request.expiresAt,
    expiresInDays: daysUntil(request.expiresAt, generatedAt),
    id: `exception:${request.scopeId}`,
    nextAction: nextActionForStatus(status),
    ownerHint: request.requestedBy,
    ownerNote: request.ownerNote,
    requestedAt: request.requestedAt,
    requestedBy: request.requestedBy,
    reviewerNote: request.reviewerNote,
    reviewerSignoff: request.reviewerSignoff,
    riskLabel: status === "expired" ? "Expired approval window" : status === "rejected" ? "Reviewer changes requested" : "Scoped exception request",
    scopeId: request.scopeId,
    scopeKind: scopeKind(request.scopeId),
    scopeLabel: request.scopeLabel,
    signedOffAt: request.signedOffAt,
    signedOffBy: request.signedOffBy,
    status,
  };
}

function suggestedPolicyRows(report: PolicyAsCodeReport, requestedScopeIds: Set<string>): GovernanceExceptionWorkflowRow[] {
  return report.rows
    .filter((row) => row.status !== "ready")
    .filter((row) => !requestedScopeIds.has(`policy:${row.id}`))
    .map((row) => ({
      evidence: row.evidence,
      expiresAt: null,
      expiresInDays: null,
      id: `suggested:policy:${row.id}`,
      nextAction: nextActionForStatus("review-needed"),
      ownerHint: row.ownerHint,
      ownerNote: row.nextAction,
      requestedAt: null,
      requestedBy: null,
      reviewerNote: null,
      reviewerSignoff: null,
      riskLabel: riskLabelForPolicy(row.status),
      scopeId: `policy:${row.id}`,
      scopeKind: "policy",
      scopeLabel: row.label,
      signedOffAt: null,
      signedOffBy: null,
      status: "review-needed",
    }));
}

function suggestedTimelineRows(report: GovernanceTimelineReport, requestedScopeIds: Set<string>): GovernanceExceptionWorkflowRow[] {
  return report.events
    .filter((event) => event.severity === "critical" || event.severity === "warning")
    .filter((event) => !requestedScopeIds.has(`timeline:${event.id}`))
    .slice(0, 10)
    .map((event) => ({
      evidence: event.evidence,
      expiresAt: null,
      expiresInDays: null,
      id: `suggested:timeline:${event.id}`,
      nextAction: nextActionForStatus("review-needed"),
      ownerHint: event.ownerHint,
      ownerNote: event.detail,
      requestedAt: null,
      requestedBy: null,
      reviewerNote: null,
      reviewerSignoff: null,
      riskLabel: riskLabelForTimeline(event.severity),
      scopeId: `timeline:${event.id}`,
      scopeKind: "timeline",
      scopeLabel: event.title,
      signedOffAt: null,
      signedOffBy: null,
      status: "review-needed",
    }));
}

function summarizeRows(rows: GovernanceExceptionWorkflowRow[]): GovernanceExceptionWorkflowReport["summary"] {
  return {
    approvedCount: rows.filter((row) => row.status === "approved").length,
    expiredCount: rows.filter((row) => row.status === "expired").length,
    expiringSoonCount: rows.filter((row) => row.status === "approved" && row.expiresInDays !== null && row.expiresInDays <= 7).length,
    pendingCount: rows.filter((row) => row.status === "pending").length,
    rejectedCount: rows.filter((row) => row.status === "rejected").length,
    reviewNeededCount: rows.filter((row) => row.status === "review-needed").length,
    totalCount: rows.length,
    workflowScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / rows.length) : 100,
  };
}

function sortRows(rows: GovernanceExceptionWorkflowRow[]) {
  return [...rows].sort((first, second) => {
    const firstDays = first.expiresInDays ?? Number.POSITIVE_INFINITY;
    const secondDays = second.expiresInDays ?? Number.POSITIVE_INFINITY;

    return statusRank[first.status] - statusRank[second.status] || firstDays - secondDays || first.scopeLabel.localeCompare(second.scopeLabel);
  });
}

export function createGovernanceExceptionWorkflow(input: CreateGovernanceExceptionWorkflowInput): GovernanceExceptionWorkflowReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const requestedScopeIds = new Set(input.exceptionRequests.map((request) => request.scopeId));
  const rows = sortRows([
    ...input.exceptionRequests.map((request) => requestRow(request, generatedAt)),
    ...suggestedPolicyRows(input.policyAsCodeReport, requestedScopeIds),
    ...suggestedTimelineRows(input.governanceTimelineReport, requestedScopeIds),
  ]);

  return {
    generatedAt,
    rows,
    summary: summarizeRows(rows),
  };
}

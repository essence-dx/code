import type {
  AdminBranchReviewInboxReport,
  AdminBranchReviewRequest,
} from "@/features/admin/admin-branch-review-inbox";
import type {
  AdminCommentReactionWorkflowComment,
  AdminCommentReactionWorkflowsReport,
} from "@/features/admin/admin-comment-reaction-workflows";
import type {
  AdminPublicLinkObservabilityReport,
  AdminPublicLinkSurface,
} from "@/features/admin/admin-public-link-observability";
import type {
  ScopedPublicationApprovalReport,
  ScopedPublicationApprovalScope,
} from "@/features/admin/admin-scoped-publication-approvals";

export type AdminLiveReviewSessionStatus = "ready" | "review" | "blocked";

export type AdminLiveReviewSessionRowCategory =
  | "action-items"
  | "agenda"
  | "approvals"
  | "branches"
  | "comments"
  | "minutes"
  | "owners"
  | "public-shares";

export type AdminLiveReviewAgendaCategory =
  | "action-item"
  | "approval"
  | "branch"
  | "comment"
  | "public-share";

export type AdminLiveReviewMinuteCategory =
  | "approval"
  | "branch-evidence"
  | "comment"
  | "public-share";

export type AdminLiveReviewActionItemSource =
  | "approval"
  | "branch"
  | "comment"
  | "public-share";

export type AdminLiveReviewSessionsInput = {
  generatedAt?: string;
  branchReviewInbox: Pick<
    AdminBranchReviewInboxReport,
    | "blockerCount"
    | "commands"
    | "evidenceCount"
    | "generatedAt"
    | "requestCount"
    | "reviewerCount"
    | "score"
    | "status"
  > & {
    requests: AdminBranchReviewRequest[];
  };
  commentReactionWorkflows: Pick<
    AdminCommentReactionWorkflowsReport,
    | "acknowledgementCount"
    | "commentCount"
    | "commands"
    | "generatedAt"
    | "openCommentCount"
    | "score"
    | "status"
    | "unacknowledgedOpenCommentCount"
  > & {
    comments: AdminCommentReactionWorkflowComment[];
  };
  scopedPublicationApprovals: Pick<
    ScopedPublicationApprovalReport,
    | "approvedScopeCount"
    | "commands"
    | "generatedAt"
    | "missingApprovalCount"
    | "scopeCount"
    | "score"
    | "status"
    | "staleApprovalCount"
  > & {
    scopes: ScopedPublicationApprovalScope[];
  };
  publicLinkObservability: Pick<
    AdminPublicLinkObservabilityReport,
    | "activeShareCount"
    | "commands"
    | "downloadExposureCount"
    | "generatedAt"
    | "releaseSafeCount"
    | "score"
    | "status"
    | "surfaceCount"
  > & {
    surfaces: AdminPublicLinkSurface[];
  };
};

export type AdminLiveReviewSession = {
  id: string;
  status: AdminLiveReviewSessionStatus;
  fileId: string;
  fileName: string;
  branchName: string;
  branchId: string;
  ownerRef: string;
  reviewerCount: number;
  openCommentCount: number;
  acknowledgementCount: number;
  approvalScopeCount: number;
  approvedScopeCount: number;
  publicShareCount: number;
  releaseSafeShareCount: number;
  agendaItemCount: number;
  minutesItemCount: number;
  actionItemCount: number;
  blockerCount: number;
  latestAt: string | null;
  recommendation: string;
};

export type AdminLiveReviewAgendaItem = {
  id: string;
  sessionId: string;
  category: AdminLiveReviewAgendaCategory;
  status: AdminLiveReviewSessionStatus;
  label: string;
  detail: string;
  ownerRef: string;
  dueAt: string | null;
  linkedId: string;
};

export type AdminLiveReviewMinuteItem = {
  id: string;
  sessionId: string;
  category: AdminLiveReviewMinuteCategory;
  status: AdminLiveReviewSessionStatus;
  label: string;
  detail: string;
  ownerRef: string;
  createdAt: string | null;
  linkedId: string;
};

export type AdminLiveReviewActionItem = {
  id: string;
  sessionId: string;
  source: AdminLiveReviewActionItemSource;
  status: AdminLiveReviewSessionStatus;
  label: string;
  detail: string;
  ownerRef: string;
  dueAt: string | null;
  linkedId: string;
};

export type AdminLiveReviewSessionRow = {
  id: string;
  category: AdminLiveReviewSessionRowCategory;
  status: AdminLiveReviewSessionStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminLiveReviewSessionsReport = {
  generatedAt: string;
  status: AdminLiveReviewSessionStatus;
  score: number;
  sessionCount: number;
  readySessionCount: number;
  reviewSessionCount: number;
  blockedSessionCount: number;
  agendaItemCount: number;
  minutesItemCount: number;
  actionItemCount: number;
  blockedActionItemCount: number;
  missingOwnerCount: number;
  linkedBranchCount: number;
  linkedCommentCount: number;
  linkedApprovalCount: number;
  linkedPublicShareCount: number;
  rows: AdminLiveReviewSessionRow[];
  sessions: AdminLiveReviewSession[];
  agendaItems: AdminLiveReviewAgendaItem[];
  minutes: AdminLiveReviewMinuteItem[];
  actionItems: AdminLiveReviewActionItem[];
  commands: string[];
};

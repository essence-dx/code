import type {
  AdminDesignBranchRecord,
  AdminDesignBranchReport,
} from "@/features/admin/admin-design-branches";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { DesignDocument } from "@/features/editor/types";

export type AdminBranchReviewInboxStatus = "ready" | "review" | "blocked";
export type AdminBranchReviewSlaStatus =
  | "clear"
  | "due-soon"
  | "overdue"
  | "unassigned"
  | "unscheduled";

export type AdminBranchReviewRequest = {
  id: string;
  status: AdminBranchReviewInboxStatus;
  branchId: string;
  branchName: string;
  branchFileId: string;
  branchFileName: string;
  ownerEmail: string;
  mergeIntent: AdminDesignBranchRecord["mergeIntent"];
  reviewers: string[];
  reviewerEmails: string[];
  reviewerSummary: string;
  slaStatus: AdminBranchReviewSlaStatus;
  dueDate: string | null;
  mergeReadiness: AdminBranchReviewInboxStatus;
  openCommentCount: number;
  mergeReviewCount: number;
  latestMergeReviewAt: string | null;
  releaseEvidenceCount: number;
  blockerCount: number;
  blockers: string[];
  evidence: string[];
  recommendation: string;
  updatedAt: string;
};

export type AdminBranchReviewInboxRow = {
  id: string;
  status: AdminBranchReviewInboxStatus;
  category:
    | "blockers"
    | "merge-readiness"
    | "release-evidence"
    | "reviewers"
    | "sla";
  branchName: string;
  reviewerSummary: string;
  label: string;
  detail: string;
  recommendation: string;
  dueDate: string | null;
  latestAt: string | null;
  blockerCount: number;
};

export type AdminBranchReviewInboxReport = {
  generatedAt: string;
  status: AdminBranchReviewInboxStatus;
  score: number;
  requestCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  reviewerCount: number;
  overdueCount: number;
  dueSoonCount: number;
  mergeReadyCount: number;
  blockerCount: number;
  evidenceCount: number;
  requests: AdminBranchReviewRequest[];
  rows: AdminBranchReviewInboxRow[];
  commands: string[];
};

export type AdminBranchReviewInboxFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminBranchReviewInboxInput = {
  branches: AdminDesignBranchReport;
  files: AdminBranchReviewInboxFile[];
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  rollbackReadiness: AdminRollbackReadinessReport;
  generatedAt?: string;
  now?: number;
};

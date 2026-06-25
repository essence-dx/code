export type DesignReviewApprovalStatus = "ready" | "review" | "blocked";

export type DesignReviewApprovalCategory =
  | "assignment"
  | "due-date"
  | "blocking-criteria"
  | "comments"
  | "evidence"
  | "release-gate"
  | "ready";

export type DesignReviewGateInput = {
  id: string;
  label: string;
  status: DesignReviewApprovalStatus;
  score: number;
  blockedCount: number;
  reviewCount: number;
  evidenceCount: number;
};

export type DesignReviewApprover = {
  id: string;
  name: string;
  email?: string | null;
  openCommentCount: number;
  overdueCommentCount: number;
  dueSoonCommentCount: number;
  pageNames: string[];
};

export type DesignReviewApprovalRow = {
  id: string;
  status: DesignReviewApprovalStatus;
  category: DesignReviewApprovalCategory;
  label: string;
  detail: string;
  recommendation: string;
  metric: number;
  pageName?: string;
  layerIds: string[];
  commentIds: string[];
  gateId?: string;
  reviewerName?: string;
  dueDate?: string | null;
};

export type DesignReviewApprovalReport = {
  score: number;
  status: DesignReviewApprovalStatus;
  pageCount: number;
  layerCount: number;
  readyForDevLayerCount: number;
  openCommentCount: number;
  assignedCommentCount: number;
  unassignedCommentCount: number;
  missingDueDateCount: number;
  overdueCommentCount: number;
  dueSoonCommentCount: number;
  approverCount: number;
  blockedGateCount: number;
  reviewGateCount: number;
  evidenceCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  approvers: DesignReviewApprover[];
  gates: DesignReviewGateInput[];
  rows: DesignReviewApprovalRow[];
};

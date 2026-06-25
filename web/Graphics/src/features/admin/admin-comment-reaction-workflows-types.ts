import type {
  DesignComment,
  DesignCommentNotificationDelivery,
  DesignCommentReaction,
  DesignDocument,
} from "@/features/editor/types";

export type AdminCommentReactionWorkflowStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminCommentReactionWorkflowCategory =
  | "acknowledgement"
  | "moderation-review"
  | "notification-routing"
  | "persistent-state";

export type AdminCommentReactionWorkflowFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminCommentReactionWorkflowDelivery =
  Omit<DesignCommentNotificationDelivery, "reason"> & {
    fileId?: string;
    ownerEmail?: string;
    reason?: string | null;
  };

export type AdminCommentReactionWorkflowInput = {
  generatedAt?: string;
  files: AdminCommentReactionWorkflowFile[];
  notificationDeliveries: AdminCommentReactionWorkflowDelivery[];
};

export type AdminCommentReactionWorkflowComment = {
  id: string;
  status: AdminCommentReactionWorkflowStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  pageName: string;
  commentId: string;
  textPreview: string;
  resolved: boolean;
  assigneeEmail: string | null;
  reactionCount: number;
  acknowledgementCount: number;
  reactionNotificationCount: number;
  failedNotificationCount: number;
  moderationReviewCount: number;
  latestAt: string | null;
  recommendation: string;
};

export type AdminCommentReactionModerationItem = {
  id: string;
  status: AdminCommentReactionWorkflowStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  pageName: string;
  commentId: string;
  reactionId: string;
  reactionKind: DesignCommentReaction["kind"];
  actorName: string;
  actorEmail: string | null;
  reason: string;
  latestAt: string;
};

export type AdminCommentReactionWorkflowRow = {
  id: string;
  category: AdminCommentReactionWorkflowCategory;
  status: AdminCommentReactionWorkflowStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminCommentReactionWorkflowsReport = {
  generatedAt: string;
  status: AdminCommentReactionWorkflowStatus;
  score: number;
  fileCount: number;
  commentCount: number;
  openCommentCount: number;
  reactionCount: number;
  acknowledgementCount: number;
  unacknowledgedOpenCommentCount: number;
  reactionNotificationRouteCount: number;
  failedReactionNotificationCount: number;
  unroutedReactionNotificationCount: number;
  moderationReviewCount: number;
  rows: AdminCommentReactionWorkflowRow[];
  comments: AdminCommentReactionWorkflowComment[];
  moderationQueue: AdminCommentReactionModerationItem[];
  commands: string[];
};

export type AdminCommentReactionSource = {
  file: AdminCommentReactionWorkflowFile;
  pageName: string;
  comment: DesignComment;
};

import type { AdminNotificationDigestSubscriptionsReport } from "@/features/admin/admin-notification-digest-subscriptions";
import type {
  DesignCommentNotificationDelivery,
  DesignCommentNotificationKind,
  DesignDocument,
} from "@/features/editor/types";

export type AdminExternalCommentNotificationWorkflowStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminExternalCommentNotificationWorkflowCategory =
  | "delivery-retry"
  | "digest-preview"
  | "mention-routing"
  | "suppression";

export type AdminExternalCommentNotificationWorkflowFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  updatedAt: string;
  trashedAt: string | null;
  document: Pick<
    DesignDocument,
    "commentNotificationPreferences" | "notificationDeliveries" | "pages" | "updatedAt"
  >;
};

export type AdminExternalCommentNotificationWorkflowDelivery = Pick<
  DesignCommentNotificationDelivery,
  | "actorName"
  | "commentId"
  | "createdAt"
  | "deliveredAt"
  | "eventId"
  | "id"
  | "kind"
  | "pageName"
  | "recipientEmail"
  | "replyId"
  | "status"
> & {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  reason?: string | null;
};

export type AdminExternalCommentNotificationWorkflowsInput = {
  generatedAt?: string;
  files: AdminExternalCommentNotificationWorkflowFile[];
  notificationDeliveries: AdminExternalCommentNotificationWorkflowDelivery[];
  notificationDigestSubscriptions: AdminNotificationDigestSubscriptionsReport;
};

export type AdminCommentNotificationRetryQueueItem = {
  id: string;
  status: AdminExternalCommentNotificationWorkflowStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  eventId: string;
  kind: DesignCommentNotificationKind;
  recipientEmail: string;
  attemptCount: number;
  lastReason: string;
  lastAttemptAt: string;
  command: string;
};

export type AdminCommentNotificationDigestPreview = {
  id: string;
  status: AdminExternalCommentNotificationWorkflowStatus;
  recipientEmail: string;
  subject: string;
  signalCount: number;
  blockedSignalCount: number;
  reviewSignalCount: number;
  lines: string[];
};

export type AdminCommentNotificationMentionRoute = {
  id: string;
  status: AdminExternalCommentNotificationWorkflowStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  pageName: string;
  commentId: string;
  replyId: string | null;
  mentionedEmail: string;
  deliveryStatus: DesignCommentNotificationDelivery["status"] | "missing";
  deliveryId: string | null;
  suppressed: boolean;
  suppressionReason: string | null;
  latestAt: string | null;
  recommendation: string;
};

export type AdminCommentNotificationSuppressionControl = {
  id: string;
  status: AdminExternalCommentNotificationWorkflowStatus;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  mutedEmail: string | null;
  enabled: boolean;
  mentionsEnabled: boolean;
  reason: string;
  command: string;
  latestAt: string | null;
};

export type AdminExternalCommentNotificationWorkflowRow = {
  id: string;
  category: AdminExternalCommentNotificationWorkflowCategory;
  status: AdminExternalCommentNotificationWorkflowStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminExternalCommentNotificationWorkflowsReport = {
  generatedAt: string;
  status: AdminExternalCommentNotificationWorkflowStatus;
  score: number;
  fileCount: number;
  deliveryCount: number;
  failedDeliveryCount: number;
  retryQueueCount: number;
  digestPreviewCount: number;
  mentionRouteCount: number;
  unroutedMentionCount: number;
  suppressedRecipientCount: number;
  disabledFileCount: number;
  rows: AdminExternalCommentNotificationWorkflowRow[];
  retryQueue: AdminCommentNotificationRetryQueueItem[];
  digestPreviews: AdminCommentNotificationDigestPreview[];
  mentionRoutes: AdminCommentNotificationMentionRoute[];
  suppressionControls: AdminCommentNotificationSuppressionControl[];
  commands: string[];
};

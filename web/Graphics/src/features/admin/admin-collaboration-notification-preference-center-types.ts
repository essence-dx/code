import type {
  AdminCollaborationRecoveryPacket,
  AdminCollaborationRecoveryPacketsReport,
} from "@/features/admin/admin-collaboration-recovery-packets";
import type {
  AdminCommentReactionWorkflowComment,
  AdminCommentReactionWorkflowsReport,
} from "@/features/admin/admin-comment-reaction-workflows";
import type {
  AdminCursorChatRoomMessageRoom,
  AdminCursorChatRoomMessagesReport,
} from "@/features/admin/admin-cursor-chat-room-messages";
import type {
  AdminCommentNotificationDigestPreview,
  AdminCommentNotificationMentionRoute,
  AdminCommentNotificationSuppressionControl,
  AdminExternalCommentNotificationWorkflowsReport,
} from "@/features/admin/admin-external-comment-notification-workflows";
import type {
  AdminLiveReviewActionItem,
  AdminLiveReviewSession,
  AdminLiveReviewSessionsReport,
} from "@/features/admin/admin-live-review-sessions";
import type {
  AdminNotificationDigestSubscriptionRow,
  AdminNotificationDigestSubscriptionsReport,
} from "@/features/admin/admin-notification-digest-subscriptions";
import type {
  DesignComment,
  DesignCommentNotificationPreferences,
} from "@/features/editor/types";

export type AdminCollaborationNotificationPreferenceStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminCollaborationNotificationPreferenceCategory =
  | "cursor-chat"
  | "digests"
  | "mentions"
  | "reactions"
  | "recovery-packets"
  | "review-sessions";

export type AdminCollaborationNotificationPreferenceState =
  | "digest-only"
  | "disabled"
  | "enabled"
  | "muted"
  | "needs-routing";

export type AdminCollaborationNotificationPreferenceFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  updatedAt: string;
  trashedAt: string | null;
  document: {
    commentNotificationPreferences?: DesignCommentNotificationPreferences;
    pages: Array<{
      id: string;
      name: string;
      comments?: DesignComment[];
    }>;
    updatedAt: string;
  };
};

export type AdminCollaborationNotificationPreferenceCenterInput = {
  generatedAt?: string;
  files: AdminCollaborationNotificationPreferenceFile[];
  commentReactionWorkflows: Pick<
    AdminCommentReactionWorkflowsReport,
    | "acknowledgementCount"
    | "commands"
    | "failedReactionNotificationCount"
    | "generatedAt"
    | "reactionCount"
    | "score"
    | "status"
    | "unacknowledgedOpenCommentCount"
  > & {
    comments: AdminCommentReactionWorkflowComment[];
  };
  cursorChatRoomMessages: Pick<
    AdminCursorChatRoomMessagesReport,
    | "commands"
    | "expiredMessageCount"
    | "generatedAt"
    | "mentionCount"
    | "messageCount"
    | "roomCount"
    | "score"
    | "status"
  > & {
    rooms: AdminCursorChatRoomMessageRoom[];
  };
  externalCommentNotificationWorkflows: Pick<
    AdminExternalCommentNotificationWorkflowsReport,
    | "commands"
    | "disabledFileCount"
    | "generatedAt"
    | "mentionRouteCount"
    | "score"
    | "status"
    | "suppressedRecipientCount"
    | "unroutedMentionCount"
  > & {
    digestPreviews: AdminCommentNotificationDigestPreview[];
    mentionRoutes: AdminCommentNotificationMentionRoute[];
    suppressionControls: AdminCommentNotificationSuppressionControl[];
  };
  liveReviewSessions: Pick<
    AdminLiveReviewSessionsReport,
    | "actionItemCount"
    | "blockedActionItemCount"
    | "commands"
    | "generatedAt"
    | "score"
    | "sessionCount"
    | "status"
  > & {
    actionItems: AdminLiveReviewActionItem[];
    sessions: AdminLiveReviewSession[];
  };
  notificationDigestSubscriptions: Pick<
    AdminNotificationDigestSubscriptionsReport,
    | "activeSignalCount"
    | "generatedAt"
    | "recipientCount"
    | "score"
    | "settings"
    | "status"
    | "subscribedTopicCount"
    | "unroutedActiveSignalCount"
  > & {
    rows: AdminNotificationDigestSubscriptionRow[];
  };
  collaborationRecoveryPackets: Pick<
    AdminCollaborationRecoveryPacketsReport,
    | "blockedPacketCount"
    | "commands"
    | "conflictSummaryCount"
    | "exportReadyPacketCount"
    | "generatedAt"
    | "missingOwnershipCount"
    | "packetCount"
    | "reviewPacketCount"
    | "score"
    | "status"
  > & {
    packets: AdminCollaborationRecoveryPacket[];
  };
};

export type AdminCollaborationNotificationPreferenceScope = {
  id: string;
  category: AdminCollaborationNotificationPreferenceCategory;
  status: AdminCollaborationNotificationPreferenceStatus;
  state: AdminCollaborationNotificationPreferenceState;
  label: string;
  target: string;
  fileId: string | null;
  fileName: string | null;
  ownerRef: string;
  signalCount: number;
  blockedSignalCount: number;
  suppressed: boolean;
  exportReady: boolean;
  latestAt: string | null;
  recommendation: string;
};

export type AdminCollaborationNotificationPreferenceGap = {
  id: string;
  category: AdminCollaborationNotificationPreferenceCategory;
  status: AdminCollaborationNotificationPreferenceStatus;
  label: string;
  target: string;
  detail: string;
  command: string;
  latestAt: string | null;
};

export type AdminCollaborationNotificationPreferenceRow = {
  id: string;
  category: AdminCollaborationNotificationPreferenceCategory;
  status: AdminCollaborationNotificationPreferenceStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminCollaborationNotificationPreferenceCenterReport = {
  generatedAt: string;
  status: AdminCollaborationNotificationPreferenceStatus;
  score: number;
  categoryCount: number;
  preferenceScopeCount: number;
  readyPreferenceCount: number;
  reviewPreferenceCount: number;
  blockedPreferenceCount: number;
  suppressedPreferenceCount: number;
  missingPreferenceCount: number;
  alertSignalCount: number;
  unroutedAlertCount: number;
  digestRecipientCount: number;
  digestTopicCount: number;
  recoveryPacketAlertCount: number;
  exportReadyPreferenceCount: number;
  alertGapCount: number;
  rows: AdminCollaborationNotificationPreferenceRow[];
  preferences: AdminCollaborationNotificationPreferenceScope[];
  alertGaps: AdminCollaborationNotificationPreferenceGap[];
  commands: string[];
};

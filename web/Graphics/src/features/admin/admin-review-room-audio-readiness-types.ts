import type {
  AdminCursorChatRoomMessageRoom,
  AdminCursorChatRoomMessagesReport,
} from "@/features/admin/admin-cursor-chat-room-messages";
import type {
  AdminLiveReviewActionItem,
  AdminLiveReviewMinuteItem,
  AdminLiveReviewSession,
  AdminLiveReviewSessionsReport,
} from "@/features/admin/admin-live-review-sessions";

export type AdminReviewRoomAudioStatus = "ready" | "review" | "blocked";

export type AdminReviewRoomAudioConsentState =
  | "captured"
  | "missing"
  | "partial";

export type AdminReviewRoomAudioCategory =
  | "consent"
  | "evidence-export"
  | "fallback-handoff"
  | "participant-checks"
  | "room-readiness";

export type AdminReviewRoomAudioReadinessInput = {
  generatedAt?: string;
  liveReviewSessions: Pick<
    AdminLiveReviewSessionsReport,
    | "actionItemCount"
    | "blockedActionItemCount"
    | "commands"
    | "generatedAt"
    | "missingOwnerCount"
    | "score"
    | "sessionCount"
    | "status"
  > & {
    actionItems: AdminLiveReviewActionItem[];
    minutes: AdminLiveReviewMinuteItem[];
    sessions: AdminLiveReviewSession[];
  };
  cursorChatRoomMessages: Pick<
    AdminCursorChatRoomMessagesReport,
    | "commands"
    | "expiredMessageCount"
    | "externalParticipantCount"
    | "generatedAt"
    | "messageCount"
    | "participantCount"
    | "presenceEventCount"
    | "score"
    | "status"
  > & {
    rooms: AdminCursorChatRoomMessageRoom[];
  };
};

export type AdminReviewRoomAudioRoom = {
  id: string;
  status: AdminReviewRoomAudioStatus;
  sessionId: string;
  fileId: string;
  fileName: string;
  ownerRef: string;
  consentState: AdminReviewRoomAudioConsentState;
  participantCheckStatus: AdminReviewRoomAudioStatus;
  participantCount: number;
  reviewerCount: number;
  externalParticipantCount: number;
  activePresenceCount: number;
  expiredMessageCount: number;
  fallbackHandoffNoteCount: number;
  adminSafeEvidenceCount: number;
  audioRiskCount: number;
  exportReady: boolean;
  latestAt: string | null;
  recommendation: string;
};

export type AdminReviewRoomAudioEvidence = {
  id: string;
  roomId: string;
  fileId: string;
  fileName: string;
  status: AdminReviewRoomAudioStatus;
  kind: AdminReviewRoomAudioCategory;
  privacy: "redacted";
  detail: string;
  latestAt: string | null;
};

export type AdminReviewRoomFallbackNote = {
  id: string;
  roomId: string;
  fileId: string;
  fileName: string;
  status: AdminReviewRoomAudioStatus;
  source: "action-item" | "cursor-chat" | "minutes";
  ownerRef: string;
  note: string;
  latestAt: string | null;
};

export type AdminReviewRoomAudioRow = {
  id: string;
  category: AdminReviewRoomAudioCategory;
  status: AdminReviewRoomAudioStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminReviewRoomAudioReadinessReport = {
  generatedAt: string;
  status: AdminReviewRoomAudioStatus;
  score: number;
  roomCount: number;
  readyRoomCount: number;
  reviewRoomCount: number;
  blockedRoomCount: number;
  consentCapturedCount: number;
  missingConsentCount: number;
  partialConsentCount: number;
  participantCheckCount: number;
  failedParticipantCheckCount: number;
  fallbackHandoffNoteCount: number;
  adminSafeEvidenceCount: number;
  exportReadyRoomCount: number;
  rows: AdminReviewRoomAudioRow[];
  rooms: AdminReviewRoomAudioRoom[];
  fallbackNotes: AdminReviewRoomFallbackNote[];
  evidence: AdminReviewRoomAudioEvidence[];
  commands: string[];
};

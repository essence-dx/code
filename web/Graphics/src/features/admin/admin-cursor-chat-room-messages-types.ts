import type {
  AdminCollaborationEventIngestionReport,
  AdminCollaborationEventRecord,
  AdminCollaborationReplayWindow,
} from "@/features/admin/admin-collaboration-event-ingestion";
import type {
  AdminCollaborationRecoveryPacket,
  AdminCollaborationRecoveryPacketsReport,
} from "@/features/admin/admin-collaboration-recovery-packets";
import type { DesignDocument } from "@/features/editor/types";

export type AdminCursorChatRoomMessageStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminCursorChatRoomMessageCategory =
  | "export-readiness"
  | "privacy-replay"
  | "recovery-packet"
  | "retention-control"
  | "room-messages";

export type AdminCursorChatRoomMessageFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminCursorChatRoomMessagesInput = {
  generatedAt?: string;
  now?: number;
  retentionDays?: number;
  replayWindowDays?: number;
  files: AdminCursorChatRoomMessageFile[];
  collaborationEventIngestion: Pick<
    AdminCollaborationEventIngestionReport,
    | "chatEventCount"
    | "durableEventCount"
    | "generatedAt"
    | "presenceEventCount"
    | "redactedEventCount"
    | "replayWindowDays"
    | "retentionDays"
    | "score"
    | "status"
  > & {
    recentEvents: AdminCollaborationEventRecord[];
    replayWindows: AdminCollaborationReplayWindow[];
  };
  collaborationRecoveryPackets: Pick<
    AdminCollaborationRecoveryPacketsReport,
    | "exportReadyPacketCount"
    | "generatedAt"
    | "packetCount"
    | "replayEvidenceCount"
    | "score"
    | "status"
  > & {
    packets: AdminCollaborationRecoveryPacket[];
  };
};

export type AdminCursorChatRoomMessageRoom = {
  id: string;
  status: AdminCursorChatRoomMessageStatus;
  fileId: string;
  fileName: string;
  ownerRef: string;
  roomCaptured: boolean;
  roomUpdatedAt: string | null;
  roomAgeMinutes: number | null;
  messageCount: number;
  retainedMessageCount: number;
  expiredMessageCount: number;
  mentionCount: number;
  participantCount: number;
  externalParticipantCount: number;
  presenceEventCount: number;
  privacyReplayEvidenceCount: number;
  replayWindowStatus: AdminCursorChatRoomMessageStatus;
  replayWindowEventCount: number;
  replayWindowPurgeCandidate: boolean;
  recoveryPacketStatus: AdminCursorChatRoomMessageStatus | "missing";
  recoveryPacketExportReady: boolean;
  recoveryPacketEvidenceCount: number;
  exportReady: boolean;
  latestAt: string | null;
  recommendation: string;
};

export type AdminCursorChatRoomReplayEvidence = {
  id: string;
  status: AdminCursorChatRoomMessageStatus;
  fileId: string;
  fileName: string;
  messageId: string;
  actorRef: string;
  privacy: "redacted";
  detail: string;
  createdAt: string;
  retentionExpiresAt: string;
  expired: boolean;
  recoveryPacketStatus: AdminCursorChatRoomMessageStatus | "missing";
};

export type AdminCursorChatRoomMessageRow = {
  id: string;
  category: AdminCursorChatRoomMessageCategory;
  status: AdminCursorChatRoomMessageStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  count: number;
  target: string | null;
  latestAt: string | null;
};

export type AdminCursorChatRoomMessagesReport = {
  generatedAt: string;
  status: AdminCursorChatRoomMessageStatus;
  score: number;
  fileCount: number;
  roomCount: number;
  activeRoomCount: number;
  messageCount: number;
  retainedMessageCount: number;
  expiredMessageCount: number;
  mentionCount: number;
  participantCount: number;
  externalParticipantCount: number;
  presenceEventCount: number;
  privacyReplayEvidenceCount: number;
  replayWindowLinkedCount: number;
  recoveryPacketLinkedCount: number;
  missingRecoveryPacketCount: number;
  exportReadyRoomCount: number;
  rows: AdminCursorChatRoomMessageRow[];
  rooms: AdminCursorChatRoomMessageRoom[];
  replayEvidence: AdminCursorChatRoomReplayEvidence[];
  commands: string[];
};

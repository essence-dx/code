import type {
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "@/features/editor/collaboration-presence";
import type { CollaborationSyncReplayReport } from "@/features/editor/collaboration-sync-replay";
import type { MultiplayerFollowSpotlightReport } from "@/features/editor/multiplayer-follow-spotlight";
import type { OfflineSaveQueueReport } from "@/features/editor/offline-mutation-queue";
import type { CanvasView } from "@/features/editor/types";

export type DesktopCollaborationRecoveryStatus =
  | "ready"
  | "review"
  | "blocked";

export type DesktopCollaborationRecoveryCategory =
  | "admin-evidence"
  | "cursor-chat-queue"
  | "offline-event-replay"
  | "operator-bridge"
  | "reconnect-handoff";

export type DesktopCollaborationRecoveryPacketKind =
  | "admin-evidence-export"
  | "cursor-chat-safety"
  | "offline-replay"
  | "operator-bridge"
  | "reconnect-handoff";

export type DesktopCollaborationReconnectHandoff = {
  id: string;
  status: DesktopCollaborationRecoveryStatus;
  label: string;
  detail: string;
  ownerPeerId: string | null;
  ownerName: string | null;
  metric: number;
  recommendation: string;
};

export type DesktopCollaborationOfflineReplayItem = {
  id: string;
  status: DesktopCollaborationRecoveryStatus;
  label: string;
  detail: string;
  queueCount: number;
  failedCount: number;
  staleCount: number;
  recommendation: string;
};

export type DesktopCollaborationCursorChatQueueItem = {
  id: string;
  status: DesktopCollaborationRecoveryStatus;
  peerId: string | null;
  peerName: string;
  cursorAgeSeconds: number | null;
  chatEventCount: number;
  hasCursor: boolean;
  detail: string;
  recommendation: string;
};

export type DesktopCollaborationRecoveryRow = {
  id: string;
  status: DesktopCollaborationRecoveryStatus;
  category: DesktopCollaborationRecoveryCategory;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  packetIds: string[];
  recommendation: string;
};

export type DesktopCollaborationRecoveryPacket = {
  id: string;
  kind: DesktopCollaborationRecoveryPacketKind;
  status: DesktopCollaborationRecoveryStatus;
  label: string;
  detail: string;
  evidenceCount: number;
  steps: string[];
};

export type DesktopCollaborationRecoveryBridgeReport = {
  generatedAt: string;
  fileId: string;
  fileName: string;
  status: DesktopCollaborationRecoveryStatus;
  score: number;
  activePeerCount: number;
  chatEventCount: number;
  presenceEventCount: number;
  reconnectHandoffCount: number;
  reconnectHandoffBlockedCount: number;
  offlineReplayQueueCount: number;
  failedOfflineSaveCount: number;
  staleOfflineSaveCount: number;
  eventDriftCount: number;
  cursorChatQueueCount: number;
  cursorChatBlockedCount: number;
  adminEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  reconnectHandoffs: DesktopCollaborationReconnectHandoff[];
  offlineReplayItems: DesktopCollaborationOfflineReplayItem[];
  cursorChatQueue: DesktopCollaborationCursorChatQueueItem[];
  adminEvidence: string[];
  rows: DesktopCollaborationRecoveryRow[];
  recoveryPackets: DesktopCollaborationRecoveryPacket[];
};

export type DesktopCollaborationRecoveryBridgeInput = {
  activeFileId: string;
  activeFileName: string;
  activePageId: string;
  collaborationPresence: {
    followedPeerId: string | null;
    peers: CollaborationPeer[];
    presenceEvents: CollaborationPresenceEvent[];
    selfId: string;
    spotlight: boolean;
    view: CanvasView;
  };
  collaborationSyncReplay: CollaborationSyncReplayReport;
  generatedAt?: string;
  multiplayerFollowSpotlight: MultiplayerFollowSpotlightReport;
  now?: number;
  offlineQueue: OfflineSaveQueueReport;
};

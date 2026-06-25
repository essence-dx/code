import type { ApprovalStatus } from "@/features/editor/types";

export type CollaborativeProofingStatus = "ready" | "review" | "blocked";

export type ProofingDecisionKind =
  | "review-note"
  | "approval-event"
  | "audit-event";

export type ProofingVisualChangeSnapshot = {
  id: string;
  status: CollaborativeProofingStatus;
  currentThumbnail: string | null;
  previousThumbnail: string | null;
  currentLabel: string;
  previousLabel: string;
  changedFields: string[];
  detail: string;
  createdAt: string;
};

export type ProofingDecisionTrailItem = {
  id: string;
  kind: ProofingDecisionKind;
  status: CollaborativeProofingStatus;
  actor: string;
  summary: string;
  annotation: string;
  createdAt: string;
};

export type ProofingDecisionTrail = {
  id: string;
  status: CollaborativeProofingStatus;
  items: ProofingDecisionTrailItem[];
  summary: string;
};

export type ProofingSignedApprovalSnapshot = {
  id: string;
  status: CollaborativeProofingStatus;
  approvalStatus: ApprovalStatus;
  actorEmail: string | null;
  signedAt: string;
  signature: string;
  detail: string;
};

export type ProofingRollbackPacket = {
  id: string;
  status: CollaborativeProofingStatus;
  versionId: string | null;
  versionName: string | null;
  fileName: string;
  dataUrl: string;
  json: string;
  detail: string;
};

export type CollaborativeProofingCompareRoom = {
  id: string;
  projectId: string;
  projectName: string;
  status: CollaborativeProofingStatus;
  score: number;
  nextAction: string;
  visualSnapshot: ProofingVisualChangeSnapshot;
  decisionTrail: ProofingDecisionTrail;
  signedApprovalSnapshot: ProofingSignedApprovalSnapshot;
  rollbackPacket: ProofingRollbackPacket;
};

export type CollaborativeProofingCompareRoomCenter = {
  generatedAt: string;
  status: CollaborativeProofingStatus;
  score: number;
  rooms: CollaborativeProofingCompareRoom[];
  nextActions: string[];
  totals: {
    rooms: number;
    visualSnapshots: number;
    decisionTrailItems: number;
    signedApprovalSnapshots: number;
    rollbackPackets: number;
    readyRooms: number;
    reviewRooms: number;
    blockedRooms: number;
  };
};

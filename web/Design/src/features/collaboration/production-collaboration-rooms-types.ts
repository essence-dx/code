import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type {
  LiveCollaborationSessionReconciliation,
  LiveCollaborationSessionReconciliationCenter,
  LiveCollaborationSessionStatus,
} from "@/features/collaboration/live-collaboration-session-reconciliation";

export type ProductionCollaborationRoomStatus = LiveCollaborationSessionStatus;

export type ProductionCollaborationRoomRole =
  | "facilitator"
  | "reviewer"
  | "conflict-owner"
  | "reconnect-owner";

export type ProductionCollaborationConflictKind =
  | "operation"
  | "cursor"
  | "review-lock"
  | "reconnect";

export type ProductionCollaborationAsyncUpdateKind = "audit" | "review-task";

export type ProductionCollaborationRoomInput = {
  sessionReconciliation: LiveCollaborationSessionReconciliationCenter;
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type ProductionCollaborationSessionGoal = {
  id: string;
  roomId: string;
  title: string;
  detail: string;
  ownerName: string;
  status: ProductionCollaborationRoomStatus;
};

export type ProductionCollaborationRoleHandoff = {
  id: string;
  roomId: string;
  role: ProductionCollaborationRoomRole;
  ownerName: string;
  fromName: string | null;
  toName: string;
  pageId: string | null;
  target: string;
  status: ProductionCollaborationRoomStatus;
  detail: string;
};

export type ProductionCollaborationConflictOwnership = {
  id: string;
  roomId: string;
  kind: ProductionCollaborationConflictKind;
  ownerName: string;
  projectName: string;
  pageId: string | null;
  target: string;
  status: ProductionCollaborationRoomStatus;
  detail: string;
  nextStep: string;
  evidenceIds: string[];
};

export type ProductionCollaborationAsyncUpdate = {
  id: string;
  roomId: string;
  kind: ProductionCollaborationAsyncUpdateKind;
  ownerName: string;
  summary: string;
  status: ProductionCollaborationRoomStatus;
  createdAt: string;
  evidenceId: string;
};

export type ProductionCollaborationEvidenceBundle = {
  id: string;
  roomId: string;
  fileName: string;
  dataUrl: string;
  json: string;
};

export type ProductionCollaborationRoom = {
  id: string;
  projectId: string;
  projectName: string;
  status: ProductionCollaborationRoomStatus;
  score: number;
  sourceSession: LiveCollaborationSessionReconciliation;
  sessionGoal: ProductionCollaborationSessionGoal;
  roleHandoffs: ProductionCollaborationRoleHandoff[];
  conflictOwnership: ProductionCollaborationConflictOwnership[];
  asyncUpdates: ProductionCollaborationAsyncUpdate[];
  evidenceBundle: ProductionCollaborationEvidenceBundle;
  nextActions: string[];
};

export type ProductionCollaborationRoomCenter = {
  generatedAt: string;
  status: ProductionCollaborationRoomStatus;
  score: number;
  rooms: ProductionCollaborationRoom[];
  nextActions: string[];
  totals: {
    rooms: number;
    readyRooms: number;
    reviewRooms: number;
    blockedRooms: number;
    sessionGoals: number;
    roleHandoffs: number;
    conflictOwners: number;
    asyncUpdates: number;
    evidenceBundles: number;
    openReviewTasks: number;
    auditEvents: number;
  };
};

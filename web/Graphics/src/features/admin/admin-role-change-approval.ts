import type { AdminAuditMetadata } from "@/db/schema";
import type { AdminAuditRow } from "@/features/admin/admin-data";
import {
  collaboratorRoleLabels,
  type CollaboratorRole,
} from "@/features/files/permissions";

export const ROLE_CHANGE_REQUEST_ACTION = "collaborator.role_change.request";
export const ROLE_CHANGE_APPROVE_ACTION = "collaborator.role_change.approve";
export const ROLE_CHANGE_REJECT_ACTION = "collaborator.role_change.reject";

export const roleChangeApprovalActions = [
  ROLE_CHANGE_REQUEST_ACTION,
  ROLE_CHANGE_APPROVE_ACTION,
  ROLE_CHANGE_REJECT_ACTION,
] as const;

export type RoleChangeAccessRole = CollaboratorRole | "none";
export type RoleChangeApprovalStatus = "pending" | "approved" | "rejected";

export type RoleChangeApprovalRequest = {
  requestId: string;
  requesterId: string;
  requesterEmail: string;
  fileId: string;
  fileName: string;
  targetUserId: string;
  targetEmail: string;
  currentRole: RoleChangeAccessRole;
  requestedRole: CollaboratorRole;
  requesterNote: string | null;
  reviewerEmail: string | null;
  reviewerNote: string | null;
  status: RoleChangeApprovalStatus;
  createdAt: string;
  decidedAt: string | null;
};

export type RoleChangeApprovalQueue = {
  generatedAt: string;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  requests: RoleChangeApprovalRequest[];
};

const roleRank: Record<RoleChangeAccessRole, number> = {
  none: 0,
  viewer: 1,
  commenter: 2,
  editor: 3,
};

export function isSensitiveRoleChange({
  currentRole,
  requestedRole,
}: {
  currentRole: RoleChangeAccessRole;
  requestedRole: CollaboratorRole;
}) {
  return roleRank[requestedRole] > roleRank[currentRole] && requestedRole !== "viewer";
}

export function createRoleChangeRequestMetadata({
  currentRole,
  fileId,
  fileName,
  requestedRole,
  requesterEmail,
  requesterId,
  requesterNote,
  requestId,
  targetEmail,
  targetUserId,
}: Omit<
  RoleChangeApprovalRequest,
  "createdAt" | "decidedAt" | "reviewerEmail" | "reviewerNote" | "status"
>): AdminAuditMetadata {
  return {
    requestId,
    requesterId,
    requesterEmail,
    fileId,
    fileName,
    targetUserId,
    targetEmail,
    currentRole,
    requestedRole,
    requesterNote,
  };
}

export function createRoleChangeDecisionMetadata({
  decision,
  request,
  reviewerEmail,
  reviewerNote,
}: {
  decision: Exclude<RoleChangeApprovalStatus, "pending">;
  request: RoleChangeApprovalRequest;
  reviewerEmail: string;
  reviewerNote: string | null;
}): AdminAuditMetadata {
  return {
    requestId: request.requestId,
    decision,
    reviewerEmail,
    reviewerNote,
    fileId: request.fileId,
    fileName: request.fileName,
    targetUserId: request.targetUserId,
    targetEmail: request.targetEmail,
    currentRole: request.currentRole,
    requestedRole: request.requestedRole,
  };
}

export function getRoleChangeApprovalQueue(
  events: Array<
    Omit<
      Pick<AdminAuditRow, "action" | "actorEmail" | "createdAt" | "metadata">,
      "createdAt"
    > & { createdAt: string | Date }
  >,
  generatedAt = new Date().toISOString(),
): RoleChangeApprovalQueue {
  const requests = new Map<string, RoleChangeApprovalRequest>();
  const decisions = new Map<
    string,
    {
      action: typeof ROLE_CHANGE_APPROVE_ACTION | typeof ROLE_CHANGE_REJECT_ACTION;
      actorEmail: string;
      createdAt: string;
      metadata: AdminAuditMetadata;
    }
  >();

  for (const event of events) {
    if (event.action === ROLE_CHANGE_REQUEST_ACTION) {
      const request = parseRoleChangeRequestEvent(event);

      if (request) {
        requests.set(request.requestId, request);
      }
    }

    if (
      event.action === ROLE_CHANGE_APPROVE_ACTION ||
      event.action === ROLE_CHANGE_REJECT_ACTION
    ) {
      const requestId = readString(event.metadata.requestId, "");
      const previous = decisions.get(requestId);

      if (
        requestId &&
        (!previous ||
          new Date(event.createdAt).getTime() >
            new Date(previous.createdAt).getTime())
      ) {
        decisions.set(requestId, {
          action: event.action,
          actorEmail: event.actorEmail,
          createdAt: toIsoString(event.createdAt),
          metadata: event.metadata,
        });
      }
    }
  }

  const resolved = [...requests.values()].map((request) => {
    const decision = decisions.get(request.requestId);

    if (!decision) {
      return request;
    }

    return {
      ...request,
      status:
        decision.action === ROLE_CHANGE_APPROVE_ACTION ? "approved" : "rejected",
      reviewerEmail: readString(decision.metadata.reviewerEmail, decision.actorEmail),
      reviewerNote: readNullableString(decision.metadata.reviewerNote),
      decidedAt: decision.createdAt,
    } satisfies RoleChangeApprovalRequest;
  });

  return {
    generatedAt,
    pendingCount: resolved.filter((request) => request.status === "pending").length,
    approvedCount: resolved.filter((request) => request.status === "approved").length,
    rejectedCount: resolved.filter((request) => request.status === "rejected").length,
    requests: resolved.sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
  };
}

export function getRoleChangeLabel(request: RoleChangeApprovalRequest) {
  return `${request.targetEmail}: ${formatRole(request.currentRole)} to ${formatRole(
    request.requestedRole,
  )}`;
}

export function formatRole(role: RoleChangeAccessRole) {
  return role === "none" ? "No access" : collaboratorRoleLabels[role];
}

function parseRoleChangeRequestEvent(
  event: Pick<AdminAuditRow, "actorEmail" | "metadata"> & {
    createdAt: string | Date;
  },
): RoleChangeApprovalRequest | null {
  const currentRole = readAccessRole(event.metadata.currentRole);
  const requestedRole = readCollaboratorRole(event.metadata.requestedRole);
  const requestId = readString(event.metadata.requestId, "");
  const fileId = readString(event.metadata.fileId, "");
  const targetUserId = readString(event.metadata.targetUserId, "");

  if (!requestId || !fileId || !targetUserId || !requestedRole) {
    return null;
  }

  return {
    requestId,
    requesterId: readString(event.metadata.requesterId, ""),
    requesterEmail: readString(event.metadata.requesterEmail, event.actorEmail),
    fileId,
    fileName: readString(event.metadata.fileName, "Unknown file"),
    targetUserId,
    targetEmail: readString(event.metadata.targetEmail, "Unknown user"),
    currentRole,
    requestedRole,
    requesterNote: readNullableString(event.metadata.requesterNote),
    reviewerEmail: null,
    reviewerNote: null,
    status: "pending",
    createdAt: toIsoString(event.createdAt),
    decidedAt: null,
  };
}

function statusWeight(status: RoleChangeApprovalStatus) {
  if (status === "pending") {
    return 0;
  }

  return status === "approved" ? 1 : 2;
}

function readAccessRole(value: unknown): RoleChangeAccessRole {
  if (
    value === "none" ||
    value === "viewer" ||
    value === "commenter" ||
    value === "editor"
  ) {
    return value;
  }

  return "none";
}

function readCollaboratorRole(value: unknown): CollaboratorRole | null {
  if (value === "viewer" || value === "commenter" || value === "editor") {
    return value;
  }

  return null;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

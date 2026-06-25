import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveIntelligencePacketRecommendation,
  BoardReleaseArchiveIntelligencePacketReport,
} from "@/features/projects/board-release-archive-intelligence-packet";
import type { BoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { WorkspaceMemberRow, WorkspaceRole } from "@/features/workspaces/types";

export type BoardReleaseArchiveIntelligenceApprovalAcknowledgement = "acknowledged" | "changes-requested" | "pending";
export type BoardReleaseArchiveIntelligenceApprovalStatus = "approved" | "exception-needed" | "hash-mismatch" | "pending" | "rejected";

export interface BoardReleaseArchiveIntelligenceApprovalRecord {
  acknowledgedAt: string | null;
  acknowledgement: BoardReleaseArchiveIntelligenceApprovalAcknowledgement;
  exceptionNote: string | null;
  recommendationId: string;
  reviewerUserId: string;
  signedOffAt: string | null;
  signedPacketHash: string | null;
}

export interface BoardReleaseArchiveIntelligenceApprovalRow {
  acknowledgedAt: string | null;
  acknowledgement: BoardReleaseArchiveIntelligenceApprovalAcknowledgement;
  approvalHash: string;
  exceptionNote: string | null;
  id: string;
  nextAction: string;
  packetHash: string;
  recommendationId: string;
  recommendationKind: BoardReleaseArchiveIntelligencePacketRecommendation["recommendationKind"];
  recommendationPriority: BoardReleaseArchiveIntelligencePacketRecommendation["priority"];
  recommendationStatus: BoardReleaseArchiveIntelligencePacketRecommendation["status"];
  reviewerEmail: string;
  reviewerName: string;
  reviewerRole: WorkspaceRole;
  reviewerUserId: string;
  signedOffAt: string | null;
  signedPacketHash: string | null;
  status: BoardReleaseArchiveIntelligenceApprovalStatus;
  title: string;
}

export interface BoardReleaseArchiveIntelligenceApprovalWorkflowReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardReleaseArchiveIntelligenceApprovalRow[];
  summary: {
    approvedCount: number;
    exceptionNeededCount: number;
    hashMismatchCount: number;
    nextAction: string;
    packetHash: string;
    pendingCount: number;
    rejectedCount: number;
    status: BoardReleaseArchiveIntelligenceApprovalStatus;
    totalCount: number;
    workflowScore: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveIntelligenceApprovalWorkflowInput {
  approvalRecords?: BoardReleaseArchiveIntelligenceApprovalRecord[];
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  notificationRouting?: BoardReleaseArchiveIntelligenceNotificationRoutingReport | null;
  packet: BoardReleaseArchiveIntelligencePacketReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveIntelligenceApprovalStatus, number> = {
  "hash-mismatch": 0,
  rejected: 1,
  "exception-needed": 2,
  pending: 3,
  approved: 4,
};

const statusScore: Record<BoardReleaseArchiveIntelligenceApprovalStatus, number> = {
  approved: 100,
  "exception-needed": 45,
  "hash-mismatch": 0,
  pending: 55,
  rejected: 0,
};

const reviewerRoleRank: Record<WorkspaceRole, number> = {
  owner: 0,
  admin: 1,
  editor: 2,
  viewer: 3,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function openRecommendations(packet: BoardReleaseArchiveIntelligencePacketReport) {
  return packet.recommendations.filter((recommendation) => recommendation.status !== "ready");
}

function approvalKey(record: BoardReleaseArchiveIntelligenceApprovalRecord) {
  return `${record.recommendationId}:${record.reviewerUserId}`;
}

function defaultReviewer(input: {
  members: WorkspaceMemberRow[];
  notificationRouting: BoardReleaseArchiveIntelligenceNotificationRoutingReport | null | undefined;
  recommendationId: string;
}) {
  const notification = input.notificationRouting?.notifications.find((entry) => entry.recommendationId === input.recommendationId);
  const eligibleUserIds = new Set(
    input.notificationRouting?.routes
      .filter((route) => route.candidateId === notification?.id && route.status === "eligible")
      .map((route) => route.userId) ?? [],
  );
  const eligibleMembers = input.members.filter((member) => eligibleUserIds.has(member.userId));
  const source = eligibleMembers.length > 0 ? eligibleMembers : input.members;

  return [...source].sort((first, second) => reviewerRoleRank[first.role] - reviewerRoleRank[second.role] || first.name.localeCompare(second.name))[0] ?? null;
}

function statusFor(input: {
  packetHash: string;
  recommendation: BoardReleaseArchiveIntelligencePacketRecommendation;
  record: BoardReleaseArchiveIntelligenceApprovalRecord | null;
}) {
  if (!input.record) {
    return "pending" as const;
  }

  if (input.record.acknowledgement === "changes-requested") {
    return "rejected" as const;
  }

  if (input.record.signedPacketHash && input.record.signedPacketHash !== input.packetHash) {
    return "hash-mismatch" as const;
  }

  if (input.record.acknowledgement !== "acknowledged" || !input.record.acknowledgedAt || !input.record.signedOffAt || !input.record.signedPacketHash) {
    return "pending" as const;
  }

  if (input.recommendation.status === "blocked" && !input.record.exceptionNote?.trim()) {
    return "exception-needed" as const;
  }

  return "approved" as const;
}

function nextActionFor(status: BoardReleaseArchiveIntelligenceApprovalStatus) {
  if (status === "approved") {
    return "Keep reviewer acknowledgement, exception notes, and packet hash sign-off with the archive automation record.";
  }

  if (status === "hash-mismatch") {
    return "Refresh the reviewer sign-off against the current archive intelligence packet hash.";
  }

  if (status === "rejected") {
    return "Resolve reviewer change requests before closing archive intelligence automation.";
  }

  if (status === "exception-needed") {
    return "Attach exception notes for blocked archive intelligence recommendations before sign-off can close.";
  }

  return "Collect reviewer acknowledgement and packet hash sign-off.";
}

function rowFor(input: {
  generatedAt: string;
  packetHash: string;
  recommendation: BoardReleaseArchiveIntelligencePacketRecommendation;
  record: BoardReleaseArchiveIntelligenceApprovalRecord | null;
  reviewer: WorkspaceMemberRow;
}) {
  const status = statusFor({
    packetHash: input.packetHash,
    recommendation: input.recommendation,
    record: input.record,
  });
  const approvalHash = sha256({
    acknowledgement: input.record?.acknowledgement ?? "pending",
    exceptionNote: input.record?.exceptionNote ?? null,
    generatedAt: input.generatedAt,
    packetHash: input.packetHash,
    recommendationHash: input.recommendation.recommendationHash,
    reviewerUserId: input.reviewer.userId,
    signedPacketHash: input.record?.signedPacketHash ?? null,
    status,
  });

  return {
    acknowledgedAt: input.record?.acknowledgedAt ?? null,
    acknowledgement: input.record?.acknowledgement ?? "pending",
    approvalHash,
    exceptionNote: input.record?.exceptionNote ?? null,
    id: `archive-intelligence-approval:${input.recommendation.recommendationId}:${input.reviewer.userId}`,
    nextAction: nextActionFor(status),
    packetHash: input.packetHash,
    recommendationId: input.recommendation.recommendationId,
    recommendationKind: input.recommendation.recommendationKind,
    recommendationPriority: input.recommendation.priority,
    recommendationStatus: input.recommendation.status,
    reviewerEmail: input.reviewer.email,
    reviewerName: input.reviewer.name,
    reviewerRole: input.reviewer.role,
    reviewerUserId: input.reviewer.userId,
    signedOffAt: input.record?.signedOffAt ?? null,
    signedPacketHash: input.record?.signedPacketHash ?? null,
    status,
    title: input.recommendation.title,
  };
}

function createCsv(rows: BoardReleaseArchiveIntelligenceApprovalRow[]) {
  const header = [
    "recommendation_id",
    "reviewer_email",
    "status",
    "acknowledgement",
    "exception_note",
    "packet_hash",
    "signed_packet_hash",
    "approval_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.recommendationId,
      row.reviewerEmail,
      row.status,
      row.acknowledgement,
      row.exceptionNote,
      row.packetHash,
      row.signedPacketHash,
      row.approvalHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveIntelligenceApprovalRow[], packetHash: string): BoardReleaseArchiveIntelligenceApprovalWorkflowReport["summary"] {
  const status = rows.reduce<BoardReleaseArchiveIntelligenceApprovalStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "approved",
  );

  return {
    approvedCount: rows.filter((row) => row.status === "approved").length,
    exceptionNeededCount: rows.filter((row) => row.status === "exception-needed").length,
    hashMismatchCount: rows.filter((row) => row.status === "hash-mismatch").length,
    nextAction: rows.length > 0 ? nextActionFor(status) : "No archive intelligence approvals are required for this packet.",
    packetHash,
    pendingCount: rows.filter((row) => row.status === "pending").length,
    rejectedCount: rows.filter((row) => row.status === "rejected").length,
    status,
    totalCount: rows.length,
    workflowScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / rows.length) : 100,
  };
}

function sortRows(rows: BoardReleaseArchiveIntelligenceApprovalRow[]) {
  return [...rows].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      reviewerRoleRank[first.reviewerRole] - reviewerRoleRank[second.reviewerRole] ||
      first.title.localeCompare(second.title),
  );
}

export function createBoardReleaseArchiveIntelligenceApprovalWorkflowReport(
  input: CreateBoardReleaseArchiveIntelligenceApprovalWorkflowInput,
): BoardReleaseArchiveIntelligenceApprovalWorkflowReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.packet.workspaceId;
  const recordsByKey = new Map((input.approvalRecords ?? []).map((record) => [approvalKey(record), record]));
  const rows = sortRows(
    openRecommendations(input.packet).flatMap((recommendation) => {
      const reviewer = defaultReviewer({
        members: input.members,
        notificationRouting: input.notificationRouting,
        recommendationId: recommendation.recommendationId,
      });

      if (!reviewer) {
        return [];
      }

      return rowFor({
        generatedAt,
        packetHash: input.packet.summary.packetHash,
        recommendation,
        record: recordsByKey.get(`${recommendation.recommendationId}:${reviewer.userId}`) ?? null,
        reviewer,
      });
    }),
  );
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-release-archive-intelligence-approval-workflow-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary: summarize(rows, input.packet.summary.packetHash),
    workspaceId,
  };
}

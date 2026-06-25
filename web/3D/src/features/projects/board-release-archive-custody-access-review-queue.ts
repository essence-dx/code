import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCustodyRetentionLockWorkflowReport } from "@/features/projects/board-release-archive-custody-retention-lock-workflow";

export type BoardReleaseArchiveCustodyAccessRecipientType = "auditor" | "board" | "internal" | "partner";
export type BoardReleaseArchiveCustodyAccessReviewStatus = "approved" | "expired" | "pending" | "revoked";

export interface BoardReleaseArchiveCustodyAccessReviewRecipient {
  accessExpiresAt: string;
  accessGrantHash: string;
  recipient: string;
  recipientType: BoardReleaseArchiveCustodyAccessRecipientType;
  reviewEvidenceHash: string | null;
  revocationEvidenceHash: string | null;
}

export interface BoardReleaseArchiveCustodyAccessReviewQueueRow {
  accessExpiresAt: string;
  accessGrantHash: string;
  accessReviewHash: string;
  id: string;
  nextAction: string;
  recipient: string;
  recipientType: BoardReleaseArchiveCustodyAccessRecipientType;
  reviewEvidenceHash: string | null;
  revocationEvidenceHash: string | null;
  status: BoardReleaseArchiveCustodyAccessReviewStatus;
}

export interface BoardReleaseArchiveCustodyAccessReviewQueueReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCustodyAccessReviewQueueRow[];
  summary: {
    accessReviewHash: string;
    approvedCount: number;
    expiredCount: number;
    nextAction: string;
    pendingCount: number;
    reviewScore: number;
    revokedCount: number;
    rowCount: number;
    status: "approved" | "blocked" | "watch";
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCustodyAccessReviewQueueInput {
  generatedAt?: string;
  recipients?: BoardReleaseArchiveCustodyAccessReviewRecipient[];
  retentionLockWorkflow: BoardReleaseArchiveCustodyRetentionLockWorkflowReport;
  workspaceId?: string;
}

const recipientRank: Record<BoardReleaseArchiveCustodyAccessRecipientType, number> = {
  board: 0,
  auditor: 1,
  partner: 2,
  internal: 3,
};

const statusRank: Record<BoardReleaseArchiveCustodyAccessReviewStatus, number> = {
  expired: 0,
  revoked: 1,
  pending: 2,
  approved: 3,
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
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function addDays(value: string, days: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

function isExpired(value: string, generatedAt: string) {
  const expiresAt = new Date(value).getTime();
  const now = new Date(generatedAt).getTime();

  return !Number.isNaN(expiresAt) && !Number.isNaN(now) && expiresAt < now;
}

function defaultRecipients(input: CreateBoardReleaseArchiveCustodyAccessReviewQueueInput & { generatedAt: string; workspaceId: string }) {
  const retentionHash = input.retentionLockWorkflow.summary.retentionLockHash;

  return [
    {
      accessExpiresAt: addDays(input.generatedAt, 14),
      accessGrantHash: sha256({
        retentionHash,
        role: "board",
        workspaceId: input.workspaceId,
      }),
      recipient: "Board archive chair",
      recipientType: "board",
      reviewEvidenceHash: sha256({
        recipient: "Board archive chair",
        retentionHash,
      }),
      revocationEvidenceHash: null,
    },
    {
      accessExpiresAt: addDays(input.generatedAt, 10),
      accessGrantHash: sha256({
        retentionHash,
        role: "auditor",
        workspaceId: input.workspaceId,
      }),
      recipient: "External audit lead",
      recipientType: "auditor",
      reviewEvidenceHash: sha256({
        recipient: "External audit lead",
        retentionHash,
      }),
      revocationEvidenceHash: null,
    },
    {
      accessExpiresAt: addDays(input.generatedAt, 7),
      accessGrantHash: sha256({
        retentionHash,
        role: "partner",
        workspaceId: input.workspaceId,
      }),
      recipient: "Partner release observer",
      recipientType: "partner",
      reviewEvidenceHash: sha256({
        recipient: "Partner release observer",
        retentionHash,
      }),
      revocationEvidenceHash: null,
    },
    {
      accessExpiresAt: addDays(input.generatedAt, 5),
      accessGrantHash: sha256({
        retentionHash,
        role: "internal",
        workspaceId: input.workspaceId,
      }),
      recipient: "Internal incident reviewer",
      recipientType: "internal",
      reviewEvidenceHash: sha256({
        recipient: "Internal incident reviewer",
        retentionHash,
      }),
      revocationEvidenceHash: null,
    },
  ] satisfies BoardReleaseArchiveCustodyAccessReviewRecipient[];
}

function statusFor(input: {
  generatedAt: string;
  recipient: BoardReleaseArchiveCustodyAccessReviewRecipient;
  retentionStatus: BoardReleaseArchiveCustodyRetentionLockWorkflowReport["summary"]["status"];
}) {
  if (input.recipient.revocationEvidenceHash) {
    return "revoked" satisfies BoardReleaseArchiveCustodyAccessReviewStatus;
  }

  if (isExpired(input.recipient.accessExpiresAt, input.generatedAt)) {
    return "expired" satisfies BoardReleaseArchiveCustodyAccessReviewStatus;
  }

  if (input.retentionStatus !== "locked" || !input.recipient.reviewEvidenceHash) {
    return "pending" satisfies BoardReleaseArchiveCustodyAccessReviewStatus;
  }

  return "approved" satisfies BoardReleaseArchiveCustodyAccessReviewStatus;
}

function nextActionFor(input: {
  recipient: string;
  status: BoardReleaseArchiveCustodyAccessReviewStatus;
}) {
  if (input.status === "expired") {
    return `Renew access review evidence for ${input.recipient} before archive custody closeout.`;
  }

  if (input.status === "revoked") {
    return `Confirm ${input.recipient} has no active archive custody access.`;
  }

  if (input.status === "pending") {
    return `Collect access review evidence for ${input.recipient}.`;
  }

  return `Keep ${input.recipient} access approved with expiry and review evidence.`;
}

function createRows(input: CreateBoardReleaseArchiveCustodyAccessReviewQueueInput & { generatedAt: string; workspaceId: string }) {
  const recipients = input.recipients && input.recipients.length > 0 ? input.recipients : defaultRecipients(input);

  return recipients
    .map((recipient) => {
      const status = statusFor({
        generatedAt: input.generatedAt,
        recipient,
        retentionStatus: input.retentionLockWorkflow.summary.status,
      });
      const accessReviewHash = sha256({
        accessExpiresAt: recipient.accessExpiresAt,
        accessGrantHash: recipient.accessGrantHash,
        recipient: recipient.recipient,
        recipientType: recipient.recipientType,
        reviewEvidenceHash: recipient.reviewEvidenceHash,
        revocationEvidenceHash: recipient.revocationEvidenceHash,
        status,
      });

      return {
        accessExpiresAt: recipient.accessExpiresAt,
        accessGrantHash: recipient.accessGrantHash,
        accessReviewHash,
        id: `archive-custody-access-review:${slug(input.workspaceId)}:${slug(recipient.recipient)}`,
        nextAction: nextActionFor({
          recipient: recipient.recipient,
          status,
        }),
        recipient: recipient.recipient,
        recipientType: recipient.recipientType,
        reviewEvidenceHash: recipient.reviewEvidenceHash,
        revocationEvidenceHash: recipient.revocationEvidenceHash,
        status,
      } satisfies BoardReleaseArchiveCustodyAccessReviewQueueRow;
    })
    .sort((first, second) => recipientRank[first.recipientType] - recipientRank[second.recipientType] || statusRank[first.status] - statusRank[second.status]);
}

function createCsv(rows: BoardReleaseArchiveCustodyAccessReviewQueueRow[]) {
  const header = [
    "access_review_id",
    "recipient",
    "recipient_type",
    "status",
    "access_expires_at",
    "access_grant_hash",
    "review_evidence_hash",
    "revocation_evidence_hash",
    "access_review_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.recipient,
      entry.recipientType,
      entry.status,
      entry.accessExpiresAt,
      entry.accessGrantHash,
      entry.reviewEvidenceHash,
      entry.revocationEvidenceHash,
      entry.accessReviewHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCustodyAccessReviewQueueRow[]): BoardReleaseArchiveCustodyAccessReviewQueueReport["summary"] {
  const approvedCount = rows.filter((entry) => entry.status === "approved").length;
  const expiredCount = rows.filter((entry) => entry.status === "expired").length;
  const revokedCount = rows.filter((entry) => entry.status === "revoked").length;
  const pendingCount = rows.filter((entry) => entry.status === "pending").length;
  const status: BoardReleaseArchiveCustodyAccessReviewQueueReport["summary"]["status"] =
    expiredCount > 0 || revokedCount > 0 ? "blocked" : pendingCount > 0 ? "watch" : "approved";
  const nextRow = rows.find((entry) => entry.status === "expired") ?? rows.find((entry) => entry.status === "revoked") ?? rows.find((entry) => entry.status === "pending") ?? rows[0] ?? null;

  return {
    accessReviewHash: sha256(rows.map((entry) => entry.accessReviewHash)),
    approvedCount,
    expiredCount,
    nextAction: status === "approved" ? "Archive custody access review queue is approved." : (nextRow?.nextAction ?? "Review archive custody access queue."),
    pendingCount,
    reviewScore: rows.length > 0 ? Math.max(0, Math.round((approvedCount / rows.length) * 100 - pendingCount * 12 - expiredCount * 25 - revokedCount * 20)) : 100,
    revokedCount,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCustodyAccessReviewQueueRow[];
  summary: BoardReleaseArchiveCustodyAccessReviewQueueReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCustodyAccessReviewQueue(
  input: CreateBoardReleaseArchiveCustodyAccessReviewQueueInput,
): BoardReleaseArchiveCustodyAccessReviewQueueReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.retentionLockWorkflow.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-custody-access-review-queue-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}

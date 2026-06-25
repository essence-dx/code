import { createHash } from "node:crypto";
import type { BoardReleaseArchiveVerificationExceptionRegisterReport } from "@/features/projects/board-release-archive-verification-exception-register";
import type { BoardReleaseArchiveVerificationSignatureChainValidatorReport } from "@/features/projects/board-release-archive-verification-signature-chain-validator";

export type BoardReleaseArchiveVerificationDistributionProofStatus = "acknowledged" | "expired" | "pending";

export interface BoardReleaseArchiveVerificationDistributionRecipient {
  acknowledgedAt: string | null;
  accessExpiresAt: string;
  accessTokenHash: string;
  channel: string;
  recipient: string;
  role: string;
  signedAccessHash: string;
}

export interface BoardReleaseArchiveVerificationDistributionProofRow {
  acknowledgementHash: string | null;
  acknowledgedAt: string | null;
  accessExpiresAt: string;
  channel: string;
  expiredLinkEvidenceHash: string | null;
  id: string;
  nextAction: string;
  proofHash: string;
  recipient: string;
  role: string;
  signedAccessHash: string;
  status: BoardReleaseArchiveVerificationDistributionProofStatus;
}

export interface BoardReleaseArchiveVerificationDistributionProofBundleReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveVerificationDistributionProofRow[];
  summary: {
    acknowledgedCount: number;
    bundleHash: string;
    expiredCount: number;
    nextAction: string;
    pendingCount: number;
    proofScore: number;
    rowCount: number;
    status: "blocked" | "ready" | "watch";
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveVerificationDistributionProofBundleInput {
  exceptionRegister: BoardReleaseArchiveVerificationExceptionRegisterReport;
  generatedAt?: string;
  recipients?: BoardReleaseArchiveVerificationDistributionRecipient[];
  signatureChainValidator: BoardReleaseArchiveVerificationSignatureChainValidatorReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveVerificationDistributionProofStatus, number> = {
  expired: 0,
  pending: 1,
  acknowledged: 2,
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
  const expiry = new Date(value).getTime();
  const now = new Date(generatedAt).getTime();

  return !Number.isNaN(expiry) && !Number.isNaN(now) && expiry < now;
}

function statusFor(recipient: BoardReleaseArchiveVerificationDistributionRecipient, generatedAt: string): BoardReleaseArchiveVerificationDistributionProofStatus {
  if (isExpired(recipient.accessExpiresAt, generatedAt)) {
    return "expired";
  }

  return recipient.acknowledgedAt ? "acknowledged" : "pending";
}

function nextActionFor(input: {
  recipient: string;
  status: BoardReleaseArchiveVerificationDistributionProofStatus;
}) {
  if (input.status === "expired") {
    return `Issue a fresh signed access link for ${input.recipient} and preserve the expired-link proof.`;
  }

  if (input.status === "pending") {
    return `Collect acknowledgement from ${input.recipient} before archive verification acceptance.`;
  }

  return `Keep signed access and acknowledgement proof for ${input.recipient} in the distribution bundle.`;
}

function row(input: {
  generatedAt: string;
  recipient: BoardReleaseArchiveVerificationDistributionRecipient;
  workspaceId: string;
}) {
  const status = statusFor(input.recipient, input.generatedAt);
  const acknowledgementHash = input.recipient.acknowledgedAt
    ? sha256({
        acknowledgedAt: input.recipient.acknowledgedAt,
        recipient: input.recipient.recipient,
        signedAccessHash: input.recipient.signedAccessHash,
      })
    : null;
  const expiredLinkEvidenceHash =
    status === "expired"
      ? sha256({
          accessExpiresAt: input.recipient.accessExpiresAt,
          accessTokenHash: input.recipient.accessTokenHash,
          recipient: input.recipient.recipient,
          signedAccessHash: input.recipient.signedAccessHash,
        })
      : null;
  const proofHash = sha256({
    acknowledgementHash,
    expiredLinkEvidenceHash,
    recipient: input.recipient.recipient,
    role: input.recipient.role,
    signedAccessHash: input.recipient.signedAccessHash,
    status,
  });

  return {
    acknowledgementHash,
    acknowledgedAt: input.recipient.acknowledgedAt,
    accessExpiresAt: input.recipient.accessExpiresAt,
    channel: input.recipient.channel,
    expiredLinkEvidenceHash,
    id: `archive-verification-distribution-proof:${slug(input.workspaceId)}:${slug(input.recipient.recipient)}:${dateStamp(input.generatedAt)}`,
    nextAction: nextActionFor({
      recipient: input.recipient.recipient,
      status,
    }),
    proofHash,
    recipient: input.recipient.recipient,
    role: input.recipient.role,
    signedAccessHash: input.recipient.signedAccessHash,
    status,
  } satisfies BoardReleaseArchiveVerificationDistributionProofRow;
}

function defaultRecipients(input: CreateBoardReleaseArchiveVerificationDistributionProofBundleInput & { generatedAt: string }) {
  if (input.exceptionRegister.summary.status === "cleared" && input.signatureChainValidator.summary.status === "valid") {
    return [
      {
        acknowledgedAt: input.generatedAt,
        accessExpiresAt: addDays(input.generatedAt, 7),
        accessTokenHash: sha256({
          scope: "archive-verification-clean",
          workspaceId: input.workspaceId ?? input.exceptionRegister.workspaceId,
        }),
        channel: "board-portal",
        recipient: "Board archive chair",
        role: "approver",
        signedAccessHash: input.signatureChainValidator.summary.chainHash,
      },
    ] satisfies BoardReleaseArchiveVerificationDistributionRecipient[];
  }

  return input.exceptionRegister.rows
    .filter((entry) => entry.status === "open")
    .map((entry) => ({
      acknowledgedAt: entry.approvalStatus === "approved" ? input.generatedAt : null,
      accessExpiresAt: entry.expiresAt,
      accessTokenHash: sha256({
        exceptionHash: entry.exceptionHash,
        recipient: entry.owner,
      }),
      channel: entry.approvalStatus === "approved" ? "board-portal" : "secure-email",
      recipient: entry.owner,
      role: entry.kind,
      signedAccessHash: entry.approvalEvidenceHash ?? entry.exceptionHash,
    }));
}

function createRows(input: CreateBoardReleaseArchiveVerificationDistributionProofBundleInput & { generatedAt: string; workspaceId: string }) {
  const recipients = input.recipients && input.recipients.length > 0 ? input.recipients : defaultRecipients(input);

  return recipients
    .map((recipient) =>
      row({
        generatedAt: input.generatedAt,
        recipient,
        workspaceId: input.workspaceId,
      }),
    )
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.recipient.localeCompare(second.recipient));
}

function createCsv(rows: BoardReleaseArchiveVerificationDistributionProofRow[]) {
  const header = [
    "proof_id",
    "recipient",
    "role",
    "channel",
    "status",
    "signed_access_hash",
    "acknowledgement_hash",
    "expired_link_evidence_hash",
    "access_expires_at",
    "proof_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.recipient,
      entry.role,
      entry.channel,
      entry.status,
      entry.signedAccessHash,
      entry.acknowledgementHash,
      entry.expiredLinkEvidenceHash,
      entry.accessExpiresAt,
      entry.proofHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveVerificationDistributionProofRow[]): BoardReleaseArchiveVerificationDistributionProofBundleReport["summary"] {
  const acknowledgedCount = rows.filter((entry) => entry.status === "acknowledged").length;
  const pendingCount = rows.filter((entry) => entry.status === "pending").length;
  const expiredCount = rows.filter((entry) => entry.status === "expired").length;
  const status: BoardReleaseArchiveVerificationDistributionProofBundleReport["summary"]["status"] = expiredCount > 0 ? "blocked" : pendingCount > 0 ? "watch" : "ready";
  const nextRow = rows.find((entry) => entry.status !== "acknowledged") ?? rows[0] ?? null;

  return {
    acknowledgedCount,
    bundleHash: sha256(rows.map((entry) => entry.proofHash)),
    expiredCount,
    nextAction: status === "ready" ? "Archive verification distribution proof bundle is ready." : (nextRow?.nextAction ?? "Review archive verification distribution proof bundle."),
    pendingCount,
    proofScore: rows.length > 0 ? Math.max(0, Math.round((acknowledgedCount / rows.length) * 100 - pendingCount * 15 - expiredCount * 25)) : 100,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveVerificationDistributionProofRow[];
  summary: BoardReleaseArchiveVerificationDistributionProofBundleReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveVerificationDistributionProofBundle(
  input: CreateBoardReleaseArchiveVerificationDistributionProofBundleInput,
): BoardReleaseArchiveVerificationDistributionProofBundleReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.exceptionRegister.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-verification-distribution-proof-bundle-${dateStamp(generatedAt)}`;

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

import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import type {
  SignedAuditEvidencePacketKind,
  SignedAuditEvidencePacketStatus,
  SignedAuditEvidenceVerificationState,
} from "@/features/projects/signed-audit-evidence-packets";

export type SignedCompliancePacketShareAction = "created" | "downloaded" | "revoked" | "viewed";
export type SignedCompliancePacketShareStatus = "active" | "expired" | "revoked";

export interface SignedCompliancePacketShareActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface SignedCompliancePacketShareSource {
  contentHash: string;
  keyId: string | null;
  packetBody: string | null;
  packetId: string;
  packetKind: SignedAuditEvidencePacketKind;
  signedAt: string | null;
  signer: string | null;
  sourceLabel: string;
  status: SignedAuditEvidencePacketStatus;
  verificationState: SignedAuditEvidenceVerificationState;
}

export interface SignedCompliancePacketShareAuditEvent {
  action: SignedCompliancePacketShareAction;
  actorEmail?: string | null;
  actorName?: string | null;
  actorUserId?: string | null;
  detail: string;
  occurredAt: string;
  recipientEmail: string;
}

export interface SignedCompliancePacketShareRecord {
  accessCount: number;
  accessPurpose: string;
  auditTrail: SignedCompliancePacketShareAuditEvent[];
  contentHash: string;
  createdAt: string;
  createdBy: SignedCompliancePacketShareActor;
  downloadCount: number;
  expiresAt: string;
  id: string;
  keyId: string | null;
  lastAccessedAt: string | null;
  packetBody: string | null;
  packetId: string;
  packetKind: SignedAuditEvidencePacketKind;
  packetStatus: SignedAuditEvidencePacketStatus;
  recipientEmail: string;
  recipientName: string | null;
  revokedAt: string | null;
  revokedBy: SignedCompliancePacketShareActor | null;
  revokeReason: string | null;
  shareUrl: string;
  signedAt: string | null;
  signer: string | null;
  sourceLabel: string;
  status: SignedCompliancePacketShareStatus;
  tokenDigest: string;
  updatedAt: string;
  verificationState: SignedAuditEvidenceVerificationState;
  workspaceId: string;
}

export interface CreateSignedCompliancePacketShareRecordInput {
  accessPurpose: string;
  actor: SignedCompliancePacketShareActor;
  createdAt?: string;
  expiresAt: string;
  id?: string;
  origin: string;
  packet: SignedCompliancePacketShareSource;
  recipientEmail: string;
  recipientName?: string | null;
  token?: string;
  workspaceId: string;
}

export interface RecordSignedCompliancePacketShareAccessInput {
  action: Extract<SignedCompliancePacketShareAction, "downloaded" | "viewed">;
  occurredAt?: string;
  recipientEmail: string;
}

export interface RevokeSignedCompliancePacketShareRecordInput {
  actor: SignedCompliancePacketShareActor;
  occurredAt?: string;
  reason?: string | null;
}

export interface SignedCompliancePacketShareReportRow extends SignedCompliancePacketShareRecord {
  daysUntilExpiry: number;
}

export interface SignedCompliancePacketShareReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: SignedCompliancePacketShareReportRow[];
  summary: {
    activeCount: number;
    auditEventCount: number;
    downloadCount: number;
    expiredCount: number;
    latestAccessedAt: string | null;
    recipientCount: number;
    revokedCount: number;
    status: SignedAuditEvidencePacketStatus;
    totalCount: number;
  };
}

export interface CreateSignedCompliancePacketShareReportInput {
  generatedAt?: string;
  shares: SignedCompliancePacketShareRecord[];
  workspaceId?: string;
}

const packetKinds = new Set<SignedAuditEvidencePacketKind>(["audit-csv", "release-evidence-bundle", "reviewer-handoff", "risk-digest"]);
const packetStatuses = new Set<SignedAuditEvidencePacketStatus>(["blocked", "ready", "watch"]);
const verificationStates = new Set<SignedAuditEvidenceVerificationState>([
  "expired-key",
  "hash-mismatch",
  "invalid-signature",
  "key-not-yet-valid",
  "missing-signature",
  "revoked-key",
  "rotation-due",
  "rotation-grace",
  "unknown-key",
  "unsupported-algorithm",
  "verified",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function statusAt(record: Pick<SignedCompliancePacketShareRecord, "expiresAt" | "revokedAt">, generatedAt: string): SignedCompliancePacketShareStatus {
  if (record.revokedAt) {
    return "revoked";
  }

  return new Date(record.expiresAt).getTime() <= new Date(generatedAt).getTime() ? "expired" : "active";
}

function daysUntil(expiresAt: string, generatedAt: string) {
  const diff = new Date(expiresAt).getTime() - new Date(generatedAt).getTime();

  return Math.ceil(diff / 86_400_000);
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeDataUri(content: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
}

function createAuditEvent(input: {
  action: SignedCompliancePacketShareAction;
  actor?: SignedCompliancePacketShareActor | null;
  detail: string;
  occurredAt: string;
  recipientEmail: string;
}): SignedCompliancePacketShareAuditEvent {
  return {
    action: input.action,
    actorEmail: input.actor?.email ?? null,
    actorName: input.actor?.name ?? null,
    actorUserId: input.actor?.userId ?? null,
    detail: input.detail,
    occurredAt: input.occurredAt,
    recipientEmail: normalizeEmail(input.recipientEmail),
  };
}

export function isSignedCompliancePacketShareSource(value: unknown): value is SignedCompliancePacketShareSource {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.contentHash === "string" &&
    (typeof value.keyId === "string" || value.keyId === null) &&
    (typeof value.packetBody === "string" || value.packetBody === null) &&
    typeof value.packetId === "string" &&
    packetKinds.has(value.packetKind as SignedAuditEvidencePacketKind) &&
    (typeof value.signedAt === "string" || value.signedAt === null) &&
    (typeof value.signer === "string" || value.signer === null) &&
    typeof value.sourceLabel === "string" &&
    packetStatuses.has(value.status as SignedAuditEvidencePacketStatus) &&
    verificationStates.has(value.verificationState as SignedAuditEvidenceVerificationState)
  );
}

export function signedCompliancePacketShareTokenDigest(token: string) {
  return `sha256:${createHash("sha256").update(token).digest("hex")}`;
}

export function getSignedCompliancePacketShareStatus(
  record: Pick<SignedCompliancePacketShareRecord, "expiresAt" | "revokedAt">,
  generatedAt = new Date().toISOString(),
) {
  return statusAt(record, generatedAt);
}

export function createSignedCompliancePacketShareToken() {
  return `ecp_${randomBytes(24).toString("base64url")}`;
}

export function createSignedCompliancePacketShareRecord(input: CreateSignedCompliancePacketShareRecordInput): { record: SignedCompliancePacketShareRecord; token: string } {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const token = input.token ?? createSignedCompliancePacketShareToken();
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const recordWithoutStatus: Omit<SignedCompliancePacketShareRecord, "status"> = {
    accessCount: 0,
    accessPurpose: input.accessPurpose.trim() || "Compliance review",
    auditTrail: [
      createAuditEvent({
        action: "created",
        actor: input.actor,
        detail: `Share link created for ${input.packet.sourceLabel}.`,
        occurredAt: createdAt,
        recipientEmail,
      }),
    ],
    contentHash: input.packet.contentHash,
    createdAt,
    createdBy: input.actor,
    downloadCount: 0,
    expiresAt: input.expiresAt,
    id: input.id ?? nanoid(),
    keyId: input.packet.keyId,
    lastAccessedAt: null,
    packetBody: input.packet.packetBody,
    packetId: input.packet.packetId,
    packetKind: input.packet.packetKind,
    packetStatus: input.packet.status,
    recipientEmail,
    recipientName: input.recipientName?.trim() || null,
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    shareUrl: `${normalizeOrigin(input.origin)}/compliance-packet-shares/${token}`,
    signedAt: input.packet.signedAt,
    signer: input.packet.signer,
    sourceLabel: input.packet.sourceLabel,
    tokenDigest: signedCompliancePacketShareTokenDigest(token),
    updatedAt: createdAt,
    verificationState: input.packet.verificationState,
    workspaceId: input.workspaceId,
  };

  return {
    record: {
      ...recordWithoutStatus,
      status: statusAt(recordWithoutStatus, createdAt),
    },
    token,
  };
}

export function recordSignedCompliancePacketShareAccess(
  record: SignedCompliancePacketShareRecord,
  input: RecordSignedCompliancePacketShareAccessInput,
): SignedCompliancePacketShareRecord {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const status = statusAt(record, occurredAt);

  if (status !== "active") {
    return {
      ...record,
      status,
    };
  }

  const isDownload = input.action === "downloaded";

  return {
    ...record,
    accessCount: record.accessCount + (isDownload ? 0 : 1),
    auditTrail: [
      ...record.auditTrail,
      createAuditEvent({
        action: input.action,
        detail: isDownload ? "Recipient downloaded the compliance packet." : "Recipient viewed the compliance packet share.",
        occurredAt,
        recipientEmail,
      }),
    ],
    downloadCount: record.downloadCount + (isDownload ? 1 : 0),
    lastAccessedAt: occurredAt,
    status,
    updatedAt: occurredAt,
  };
}

export function revokeSignedCompliancePacketShareRecord(
  record: SignedCompliancePacketShareRecord,
  input: RevokeSignedCompliancePacketShareRecordInput,
): SignedCompliancePacketShareRecord {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const reason = input.reason?.trim() || "Revoked by workspace owner.";

  return {
    ...record,
    auditTrail: [
      ...record.auditTrail,
      createAuditEvent({
        action: "revoked",
        actor: input.actor,
        detail: reason,
        occurredAt,
        recipientEmail: record.recipientEmail,
      }),
    ],
    revokedAt: occurredAt,
    revokedBy: input.actor,
    revokeReason: reason,
    status: "revoked",
    updatedAt: occurredAt,
  };
}

function createCsv(rows: SignedCompliancePacketShareReportRow[]) {
  const header = [
    "share_id",
    "status",
    "packet_id",
    "packet_kind",
    "recipient_email",
    "expires_at",
    "revoked_at",
    "access_count",
    "download_count",
    "audit_events",
  ];
  const body = rows.map((row) =>
    [
      row.id,
      row.status,
      row.packetId,
      row.packetKind,
      row.recipientEmail,
      row.expiresAt,
      row.revokedAt,
      row.accessCount,
      row.downloadCount,
      row.auditTrail.length,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function reportStatus(rows: SignedCompliancePacketShareReportRow[]): SignedAuditEvidencePacketStatus {
  if (rows.some((row) => row.status === "active" && row.packetStatus === "blocked")) {
    return "blocked";
  }

  return rows.some((row) => row.status === "expired" || row.status === "revoked" || row.packetStatus === "watch") ? "watch" : "ready";
}

export function createSignedCompliancePacketShareReport(input: CreateSignedCompliancePacketShareReportInput): SignedCompliancePacketShareReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = input.shares
    .map<SignedCompliancePacketShareReportRow>((record) => ({
      ...record,
      daysUntilExpiry: daysUntil(record.expiresAt, generatedAt),
      status: statusAt(record, generatedAt),
    }))
    .sort((first, second) => {
      const rank: Record<SignedCompliancePacketShareStatus, number> = { active: 0, expired: 1, revoked: 2 };

      return rank[first.status] - rank[second.status] || second.createdAt.localeCompare(first.createdAt);
    });
  const latestAccessedAt =
    rows
      .map((row) => row.lastAccessedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeDataUri(csvContent),
    csvFileName: `${input.workspaceId ?? "workspace"}-compliance-packet-shares.csv`,
    generatedAt,
    rows,
    summary: {
      activeCount: rows.filter((row) => row.status === "active").length,
      auditEventCount: rows.reduce((sum, row) => sum + row.auditTrail.length, 0),
      downloadCount: rows.reduce((sum, row) => sum + row.downloadCount, 0),
      expiredCount: rows.filter((row) => row.status === "expired").length,
      latestAccessedAt,
      recipientCount: new Set(rows.map((row) => row.recipientEmail)).size,
      revokedCount: rows.filter((row) => row.status === "revoked").length,
      status: reportStatus(rows),
      totalCount: rows.length,
    },
  };
}

import { createHash, createPublicKey, verify as verifyCryptoSignature } from "node:crypto";

export type SignedAuditEvidenceAlgorithm = "ed25519";
export type SignedAuditEvidencePacketKind = "audit-csv" | "release-evidence-bundle" | "reviewer-handoff" | "risk-digest";
export type SignedAuditEvidencePacketStatus = "blocked" | "ready" | "watch";
export type AuditEvidencePublicKeyStatus = "active" | "expired" | "grace" | "revoked";
export type AuditEvidenceKeyRotationState = "current" | "expired" | "grace-period" | "not-yet-valid" | "revoked" | "rotation-due";
export type SignedAuditEvidenceVerificationState =
  | "expired-key"
  | "hash-mismatch"
  | "invalid-signature"
  | "key-not-yet-valid"
  | "missing-signature"
  | "revoked-key"
  | "rotation-due"
  | "rotation-grace"
  | "unknown-key"
  | "unsupported-algorithm"
  | "verified";

export interface AuditEvidencePublicKey {
  algorithm: SignedAuditEvidenceAlgorithm;
  keyId: string;
  owner: string;
  publicKeyPem: string;
  rotatedFromKeyId?: string | null;
  rotatedToKeyId?: string | null;
  rotationDueAt?: string | null;
  status: AuditEvidencePublicKeyStatus;
  validFrom: string;
  validUntil?: string | null;
}

export interface SignedAuditEvidencePacketSignature {
  algorithm: SignedAuditEvidenceAlgorithm;
  keyId: string;
  signatureBase64: string;
  signedAt: string;
  signer: string;
}

export interface SignedAuditEvidencePacket {
  body: string;
  createdAt: string;
  declaredContentHash?: string | null;
  packetId: string;
  packetKind: SignedAuditEvidencePacketKind;
  signature?: SignedAuditEvidencePacketSignature | null;
  sourceLabel: string;
}

export interface SignedAuditEvidencePacketVerificationRow {
  contentHash: string;
  expectedContentHash: string;
  keyId: string | null;
  nextAction: string;
  packetId: string;
  packetKind: SignedAuditEvidencePacketKind;
  signedAt: string | null;
  signer: string | null;
  sourceLabel: string;
  status: SignedAuditEvidencePacketStatus;
  verificationState: SignedAuditEvidenceVerificationState;
}

export interface AuditEvidenceKeyRotationRow {
  keyId: string;
  nextAction: string;
  owner: string;
  rotatedFromKeyId: string | null;
  rotatedToKeyId: string | null;
  rotationDueAt: string | null;
  rotationState: AuditEvidenceKeyRotationState;
  status: AuditEvidencePublicKeyStatus;
  validFrom: string;
  validUntil: string | null;
}

export interface SignedAuditEvidencePacketVerificationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  keyRotationRows: AuditEvidenceKeyRotationRow[];
  rows: SignedAuditEvidencePacketVerificationRow[];
  summary: {
    blockedPacketCount: number;
    packetCount: number;
    publicKeyRotation: {
      activeKeyCount: number;
      expiredKeyCount: number;
      graceKeyCount: number;
      nextRotationDueAt: string | null;
      revokedKeyCount: number;
      rotationDueCount: number;
    };
    readyPacketCount: number;
    status: SignedAuditEvidencePacketStatus;
    verificationScore: number;
    verifiedSignatureCount: number;
    watchPacketCount: number;
  };
}

export interface CreateSignedAuditEvidencePacketVerificationReportInput {
  generatedAt?: string;
  packets: SignedAuditEvidencePacket[];
  publicKeys: AuditEvidencePublicKey[];
  workspaceId?: string;
}

export interface SignedAuditEvidencePacketSignatureRecord extends SignedAuditEvidencePacketSignature {
  declaredContentHash?: string | null;
  packetId: string;
}

interface SigningMessageInput {
  algorithm: SignedAuditEvidenceAlgorithm;
  contentHash: string;
  keyId: string;
  packetId: string;
  packetKind: SignedAuditEvidencePacketKind;
  signedAt: string;
}

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

  return JSON.stringify(value);
}

function parseTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : null;
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeDataUri(content: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
}

function stateStatus(state: SignedAuditEvidenceVerificationState): SignedAuditEvidencePacketStatus {
  if (state === "verified") {
    return "ready";
  }

  return state === "rotation-due" || state === "rotation-grace" ? "watch" : "blocked";
}

function rotationState(key: AuditEvidencePublicKey, generatedAt: string): AuditEvidenceKeyRotationState {
  const now = parseTime(generatedAt) ?? Date.now();
  const validFrom = parseTime(key.validFrom);
  const validUntil = parseTime(key.validUntil);
  const rotationDueAt = parseTime(key.rotationDueAt);

  if (key.status === "revoked") {
    return "revoked";
  }

  if ((validFrom !== null && now < validFrom) || key.status === "expired") {
    return validFrom !== null && now < validFrom ? "not-yet-valid" : "expired";
  }

  if (validUntil !== null && now > validUntil && key.status !== "grace") {
    return "expired";
  }

  if (key.status === "grace") {
    return "grace-period";
  }

  return rotationDueAt !== null && now >= rotationDueAt ? "rotation-due" : "current";
}

function rotationNextAction(state: AuditEvidenceKeyRotationState, key: AuditEvidencePublicKey) {
  switch (state) {
    case "current":
      return "Keep this public key active for packet verification.";
    case "expired":
      return "Remove this expired public key from active signing workflows after packet retention review.";
    case "grace-period":
      return `Finish migration to ${key.rotatedToKeyId ?? "the replacement key"} before the grace window closes.`;
    case "not-yet-valid":
      return "Do not accept packet signatures from this key until its validity window starts.";
    case "revoked":
      return "Reject packet signatures from this revoked key and investigate any matching packets.";
    case "rotation-due":
      return "Rotate this signing key and publish the replacement public key metadata.";
  }
}

function createKeyRotationRows(keys: AuditEvidencePublicKey[], generatedAt: string): AuditEvidenceKeyRotationRow[] {
  return keys
    .map((key) => {
      const state = rotationState(key, generatedAt);

      return {
        keyId: key.keyId,
        nextAction: rotationNextAction(state, key),
        owner: key.owner,
        rotatedFromKeyId: key.rotatedFromKeyId ?? null,
        rotatedToKeyId: key.rotatedToKeyId ?? null,
        rotationDueAt: key.rotationDueAt ?? null,
        rotationState: state,
        status: key.status,
        validFrom: key.validFrom,
        validUntil: key.validUntil ?? null,
      };
    })
    .sort((first, second) => first.keyId.localeCompare(second.keyId));
}

function verifySignature(input: {
  key: AuditEvidencePublicKey;
  message: string;
  signatureBase64: string;
}) {
  try {
    return verifyCryptoSignature(null, Buffer.from(input.message), createPublicKey(input.key.publicKeyPem), Buffer.from(input.signatureBase64, "base64"));
  } catch {
    return false;
  }
}

function verificationNextAction(state: SignedAuditEvidenceVerificationState, keyId: string | null) {
  switch (state) {
    case "verified":
      return "Keep this signature with the exported evidence packet.";
    case "rotation-due":
      return `Signature is valid, but ${keyId ?? "the signing key"} is due for rotation.`;
    case "rotation-grace":
      return `Signature is valid through a grace key; migrate future packets to the replacement key.`;
    case "hash-mismatch":
      return "Regenerate the packet or reject this evidence because its body no longer matches the signed hash.";
    case "invalid-signature":
      return "Reject this packet until it is re-signed with a trusted private key.";
    case "key-not-yet-valid":
      return "Reject this signature because the public key was not valid when the packet was signed.";
    case "missing-signature":
      return "Attach a detached Ed25519 signature and signer metadata before external handoff.";
    case "revoked-key":
      return "Reject this packet and investigate why a revoked key was used.";
    case "expired-key":
      return "Reject this packet or add verified archival approval for the expired key window.";
    case "unknown-key":
      return "Publish the matching public key metadata before trusting this packet.";
    case "unsupported-algorithm":
      return "Re-sign this packet with an approved Ed25519 signing key.";
  }
}

function classifyPacket(input: {
  generatedAt: string;
  keyById: Map<string, AuditEvidencePublicKey>;
  packet: SignedAuditEvidencePacket;
}): SignedAuditEvidencePacketVerificationRow {
  const expectedContentHash = createAuditEvidencePacketContentHash(input.packet.body);
  const contentHash = input.packet.declaredContentHash ?? expectedContentHash;
  const signature = input.packet.signature ?? null;
  let verificationState: SignedAuditEvidenceVerificationState = "verified";

  if (contentHash !== expectedContentHash) {
    verificationState = "hash-mismatch";
  } else if (!signature) {
    verificationState = "missing-signature";
  } else if (signature.algorithm !== "ed25519") {
    verificationState = "unsupported-algorithm";
  } else {
    const key = input.keyById.get(signature.keyId);

    if (!key) {
      verificationState = "unknown-key";
    } else if (key.algorithm !== signature.algorithm) {
      verificationState = "unsupported-algorithm";
    } else if (key.status === "revoked") {
      verificationState = "revoked-key";
    } else {
      const signedAt = parseTime(signature.signedAt);
      const validFrom = parseTime(key.validFrom);
      const validUntil = parseTime(key.validUntil);
      const generatedAt = parseTime(input.generatedAt) ?? Date.now();

      if (signedAt !== null && validFrom !== null && signedAt < validFrom) {
        verificationState = "key-not-yet-valid";
      } else if (key.status === "expired" || (validUntil !== null && signedAt !== null && signedAt > validUntil)) {
        verificationState = "expired-key";
      } else {
        const message = createAuditEvidencePacketSigningMessage({
          algorithm: signature.algorithm,
          contentHash: expectedContentHash,
          keyId: signature.keyId,
          packetId: input.packet.packetId,
          packetKind: input.packet.packetKind,
          signedAt: signature.signedAt,
        });

        if (!verifySignature({ key, message, signatureBase64: signature.signatureBase64 })) {
          verificationState = "invalid-signature";
        } else if (key.status === "grace") {
          verificationState = "rotation-grace";
        } else if (key.rotationDueAt && parseTime(key.rotationDueAt)! <= generatedAt) {
          verificationState = "rotation-due";
        }
      }
    }
  }

  return {
    contentHash,
    expectedContentHash,
    keyId: signature?.keyId ?? null,
    nextAction: verificationNextAction(verificationState, signature?.keyId ?? null),
    packetId: input.packet.packetId,
    packetKind: input.packet.packetKind,
    signedAt: signature?.signedAt ?? null,
    signer: signature?.signer ?? null,
    sourceLabel: input.packet.sourceLabel,
    status: stateStatus(verificationState),
    verificationState,
  };
}

function createCsv(report: Pick<SignedAuditEvidencePacketVerificationReport, "keyRotationRows" | "rows">) {
  const packetHeader = ["packet_id", "key_id", "verification_state", "status", "packet_kind", "source", "content_hash", "signed_at", "signer", "next_action"];
  const packetRows = report.rows.map((row) =>
    [
      row.packetId,
      row.keyId,
      row.verificationState,
      row.status,
      row.packetKind,
      row.sourceLabel,
      row.contentHash,
      row.signedAt,
      row.signer,
      row.nextAction,
    ]
      .map(escapeCsvValue)
      .join(","),
  );
  const keyHeader = ["key_id", "rotation_state", "status", "owner", "valid_from", "valid_until", "rotation_due_at", "rotated_from", "rotated_to", "next_action"];
  const keyRows = report.keyRotationRows.map((row) =>
    [
      row.keyId,
      row.rotationState,
      row.status,
      row.owner,
      row.validFrom,
      row.validUntil,
      row.rotationDueAt,
      row.rotatedFromKeyId,
      row.rotatedToKeyId,
      row.nextAction,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return `${[packetHeader.join(","), ...packetRows, "", keyHeader.join(","), ...keyRows].join("\n")}\n`;
}

function score(rows: SignedAuditEvidencePacketVerificationRow[], keyRows: AuditEvidenceKeyRotationRow[]) {
  const blockedPenalty = rows.filter((row) => row.status === "blocked").length * 30;
  const watchPenalty = rows.filter((row) => row.status === "watch").length * 10;
  const keyPenalty = keyRows.filter((row) => row.rotationState === "revoked" || row.rotationState === "expired").length * 20 + keyRows.filter((row) => row.rotationState === "rotation-due").length * 8;

  return Math.max(0, Math.min(100, 100 - blockedPenalty - watchPenalty - keyPenalty));
}

function reportStatus(rows: SignedAuditEvidencePacketVerificationRow[], keyRows: AuditEvidenceKeyRotationRow[]): SignedAuditEvidencePacketStatus {
  if (rows.some((row) => row.status === "blocked") || keyRows.some((row) => row.rotationState === "revoked")) {
    return "blocked";
  }

  return rows.some((row) => row.status === "watch") || keyRows.some((row) => row.rotationState === "rotation-due" || row.rotationState === "grace-period") ? "watch" : "ready";
}

export function createAuditEvidencePacketContentHash(body: string) {
  return `sha256:${createHash("sha256").update(body).digest("hex")}`;
}

export function createAuditEvidencePacketSigningMessage(input: SigningMessageInput) {
  return stableJson({
    algorithm: input.algorithm,
    contentHash: input.contentHash,
    keyId: input.keyId,
    packetId: input.packetId,
    packetKind: input.packetKind,
    signedAt: input.signedAt,
  });
}

export function createUnsignedAuditEvidencePacket(input: Omit<SignedAuditEvidencePacket, "declaredContentHash" | "signature">): SignedAuditEvidencePacket {
  return {
    ...input,
    declaredContentHash: createAuditEvidencePacketContentHash(input.body),
    signature: null,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asAuditEvidencePublicKey(value: unknown): AuditEvidencePublicKey | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    value.algorithm !== "ed25519" ||
    !isString(value.keyId) ||
    !isString(value.owner) ||
    !isString(value.publicKeyPem) ||
    !["active", "expired", "grace", "revoked"].includes(String(value.status)) ||
    !isString(value.validFrom)
  ) {
    return null;
  }

  return {
    algorithm: "ed25519",
    keyId: value.keyId,
    owner: value.owner,
    publicKeyPem: value.publicKeyPem,
    rotatedFromKeyId: isString(value.rotatedFromKeyId) ? value.rotatedFromKeyId : null,
    rotatedToKeyId: isString(value.rotatedToKeyId) ? value.rotatedToKeyId : null,
    rotationDueAt: isString(value.rotationDueAt) ? value.rotationDueAt : null,
    status: value.status as AuditEvidencePublicKeyStatus,
    validFrom: value.validFrom,
    validUntil: isString(value.validUntil) ? value.validUntil : null,
  };
}

function asSignedAuditEvidencePacketSignatureRecord(value: unknown): SignedAuditEvidencePacketSignatureRecord | null {
  if (!isObject(value)) {
    return null;
  }

  if (value.algorithm !== "ed25519" || !isString(value.keyId) || !isString(value.packetId) || !isString(value.signatureBase64) || !isString(value.signedAt) || !isString(value.signer)) {
    return null;
  }

  return {
    algorithm: "ed25519",
    declaredContentHash: isString(value.declaredContentHash) ? value.declaredContentHash : null,
    keyId: value.keyId,
    packetId: value.packetId,
    signatureBase64: value.signatureBase64,
    signedAt: value.signedAt,
    signer: value.signer,
  };
}

export function parseAuditEvidencePublicKeyRingJson(value: string | null | undefined): AuditEvidencePublicKey[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    const rows = Array.isArray(parsed) ? parsed : isObject(parsed) && Array.isArray(parsed.keys) ? parsed.keys : [];

    return rows.map(asAuditEvidencePublicKey).filter((row): row is AuditEvidencePublicKey => Boolean(row));
  } catch {
    return [];
  }
}

export function parseSignedAuditEvidencePacketSignaturesJson(value: string | null | undefined): SignedAuditEvidencePacketSignatureRecord[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    const rows = Array.isArray(parsed) ? parsed : isObject(parsed) && Array.isArray(parsed.signatures) ? parsed.signatures : [];

    return rows.map(asSignedAuditEvidencePacketSignatureRecord).filter((row): row is SignedAuditEvidencePacketSignatureRecord => Boolean(row));
  } catch {
    return [];
  }
}

export function attachSignedAuditEvidencePacketSignatures(
  packets: SignedAuditEvidencePacket[],
  signatures: SignedAuditEvidencePacketSignatureRecord[],
): SignedAuditEvidencePacket[] {
  const signatureByPacketId = new Map(signatures.map((signature) => [signature.packetId, signature]));

  return packets.map((packet) => {
    const signature = signatureByPacketId.get(packet.packetId);

    if (!signature) {
      return packet;
    }

    return {
      ...packet,
      declaredContentHash: signature.declaredContentHash ?? packet.declaredContentHash ?? createAuditEvidencePacketContentHash(packet.body),
      signature: {
        algorithm: signature.algorithm,
        keyId: signature.keyId,
        signatureBase64: signature.signatureBase64,
        signedAt: signature.signedAt,
        signer: signature.signer,
      },
    };
  });
}

export function createSignedAuditEvidencePacketVerificationReport(
  input: CreateSignedAuditEvidencePacketVerificationReportInput,
): SignedAuditEvidencePacketVerificationReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const keyById = new Map(input.publicKeys.map((key) => [key.keyId, key]));
  const rows = input.packets
    .map((packet) => classifyPacket({ generatedAt, keyById, packet }))
    .sort((first, second) => {
      const rank: Record<SignedAuditEvidencePacketStatus, number> = { blocked: 0, watch: 1, ready: 2 };

      return rank[first.status] - rank[second.status] || first.packetKind.localeCompare(second.packetKind) || first.packetId.localeCompare(second.packetId);
    });
  const keyRotationRows = createKeyRotationRows(input.publicKeys, generatedAt);
  const publicKeyRotation = {
    activeKeyCount: input.publicKeys.filter((key) => key.status === "active").length,
    expiredKeyCount: input.publicKeys.filter((key) => key.status === "expired" || rotationState(key, generatedAt) === "expired").length,
    graceKeyCount: input.publicKeys.filter((key) => key.status === "grace").length,
    nextRotationDueAt:
      input.publicKeys
        .map((key) => key.rotationDueAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null,
    revokedKeyCount: input.publicKeys.filter((key) => key.status === "revoked").length,
    rotationDueCount: keyRotationRows.filter((row) => row.rotationState === "rotation-due").length,
  };
  const reportWithoutCsv = {
    csvContent: "",
    csvDataUri: "",
    csvFileName: `${input.workspaceId ?? "workspace"}-signed-audit-evidence-verification.csv`,
    generatedAt,
    keyRotationRows,
    rows,
    summary: {
      blockedPacketCount: rows.filter((row) => row.status === "blocked").length,
      packetCount: rows.length,
      publicKeyRotation,
      readyPacketCount: rows.filter((row) => row.status === "ready").length,
      status: reportStatus(rows, keyRotationRows),
      verificationScore: score(rows, keyRotationRows),
      verifiedSignatureCount: rows.filter((row) => row.verificationState === "verified" || row.verificationState === "rotation-due" || row.verificationState === "rotation-grace").length,
      watchPacketCount: rows.filter((row) => row.status === "watch").length,
    },
  } satisfies SignedAuditEvidencePacketVerificationReport;
  const csvContent = createCsv(reportWithoutCsv);

  return {
    ...reportWithoutCsv,
    csvContent,
    csvDataUri: encodeDataUri(csvContent),
  };
}

import { strict as assert } from "node:assert";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  createAuditEvidencePacketContentHash,
  createAuditEvidencePacketSigningMessage,
  createSignedAuditEvidencePacketVerificationReport,
} from "@/features/projects/signed-audit-evidence-packets";

const generatedAt = "2026-05-16T12:00:00.000Z";
const signedAt = "2026-05-16T11:45:00.000Z";
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
const packetBody = JSON.stringify(
  {
    audit: {
      eventCount: 3,
      newestAt: "2026-05-16T11:30:00.000Z",
    },
    packetId: "risk-digest-workspace-1-20260516",
    workspaceId: "workspace-1",
  },
  null,
  2,
);
const contentHash = createAuditEvidencePacketContentHash(packetBody);
const signingMessage = createAuditEvidencePacketSigningMessage({
  algorithm: "ed25519",
  contentHash,
  keyId: "audit-key-2026-q2",
  packetId: "risk-digest-workspace-1-20260516",
  packetKind: "risk-digest",
  signedAt,
});
const signatureBase64 = sign(null, Buffer.from(signingMessage), privateKey).toString("base64");
const activeKey = {
  algorithm: "ed25519" as const,
  keyId: "audit-key-2026-q2",
  owner: "Security owner",
  publicKeyPem,
  rotationDueAt: "2026-08-01T00:00:00.000Z",
  status: "active" as const,
  validFrom: "2026-05-01T00:00:00.000Z",
  validUntil: null,
};
const signedPacket = {
  body: packetBody,
  createdAt: generatedAt,
  declaredContentHash: contentHash,
  packetId: "risk-digest-workspace-1-20260516",
  packetKind: "risk-digest" as const,
  signature: {
    algorithm: "ed25519" as const,
    keyId: activeKey.keyId,
    signatureBase64,
    signedAt,
    signer: "Security owner",
  },
  sourceLabel: "Workspace risk digest",
};

const readyReport = createSignedAuditEvidencePacketVerificationReport({
  generatedAt,
  packets: [signedPacket],
  publicKeys: [activeKey],
});

assert.equal(readyReport.summary.status, "ready");
assert.equal(readyReport.summary.verifiedSignatureCount, 1);
assert.equal(readyReport.summary.blockedPacketCount, 0);
assert.equal(readyReport.summary.publicKeyRotation.activeKeyCount, 1);
assert.equal(readyReport.rows[0]?.verificationState, "verified");
assert.equal(readyReport.rows[0]?.status, "ready");
assert.match(readyReport.csvContent, /packet_id,key_id,verification_state/);

const graceReport = createSignedAuditEvidencePacketVerificationReport({
  generatedAt,
  packets: [signedPacket],
  publicKeys: [
    {
      ...activeKey,
      keyId: "audit-key-2026-q2",
      rotatedToKeyId: "audit-key-2026-q3",
      status: "grace",
      validUntil: "2026-06-15T00:00:00.000Z",
    },
  ],
});

assert.equal(graceReport.summary.status, "watch");
assert.equal(graceReport.rows[0]?.verificationState, "rotation-grace");
assert.equal(graceReport.summary.publicKeyRotation.graceKeyCount, 1);

const tamperedReport = createSignedAuditEvidencePacketVerificationReport({
  generatedAt,
  packets: [
    {
      ...signedPacket,
      body: `${packetBody}\n `,
    },
  ],
  publicKeys: [activeKey],
});

assert.equal(tamperedReport.summary.status, "blocked");
assert.equal(tamperedReport.rows[0]?.verificationState, "hash-mismatch");

const revokedReport = createSignedAuditEvidencePacketVerificationReport({
  generatedAt,
  packets: [signedPacket],
  publicKeys: [
    {
      ...activeKey,
      status: "revoked",
      validUntil: "2026-06-15T00:00:00.000Z",
    },
  ],
});

assert.equal(revokedReport.summary.status, "blocked");
assert.equal(revokedReport.rows[0]?.verificationState, "revoked-key");

console.log("signed audit evidence packets smoke passed");

import { strict as assert } from "node:assert";
import { createExternalArtifactEvidenceFreshnessMonitor } from "@/features/projects/external-artifact-evidence-freshness-monitor";

const monitor = createExternalArtifactEvidenceFreshnessMonitor({
  generatedAt: "2026-05-20T08:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  evidence: [
    {
      evidenceHash: "sha256:windows-signing-fresh",
      evidenceKind: "signing",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/windows/signing.json",
      expiresAt: "2026-06-20T08:00:00.000Z",
      lastVerifiedAt: "2026-05-20T07:30:00.000Z",
      owner: "Release Engineering",
      platform: "windows",
      revocationStatus: "clear",
    },
    {
      evidenceHash: "sha256:windows-revocation-fresh",
      evidenceKind: "revocation",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/windows/revocation.json",
      expiresAt: "2026-05-27T08:00:00.000Z",
      lastVerifiedAt: "2026-05-20T07:32:00.000Z",
      owner: "Release Engineering",
      platform: "windows",
      revocationStatus: "clear",
    },
    {
      evidenceHash: "sha256:macos-notarization-fresh",
      evidenceKind: "notarization",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/macos/notarization.json",
      expiresAt: "2026-06-03T08:00:00.000Z",
      lastVerifiedAt: "2026-05-20T07:35:00.000Z",
      owner: "Desktop Platform",
      platform: "macos",
      revocationStatus: "clear",
    },
    {
      evidenceHash: "sha256:linux-download-fresh",
      evidenceKind: "download",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/linux/download-proof.json",
      expiresAt: "2026-05-25T08:00:00.000Z",
      lastVerifiedAt: "2026-05-20T07:40:00.000Z",
      owner: "Customer Experience",
      platform: "linux",
      revocationStatus: "clear",
    },
    {
      evidenceHash: "sha256:cad-transcript-fresh",
      evidenceKind: "cad-transcript",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/cad/process-evidence.json",
      expiresAt: "2026-05-24T08:00:00.000Z",
      lastVerifiedAt: "2026-05-20T07:45:00.000Z",
      owner: "CAD Runtime",
      platform: "cross-platform",
      revocationStatus: "clear",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(monitor.summary.status, "ready");
assert.equal(monitor.summary.freshnessScore, 100);
assert.equal(monitor.summary.freshCount, 5);
assert.equal(monitor.summary.blockedCount, 0);
assert.equal(monitor.summary.watchCount, 0);
assert.equal(monitor.summary.releaseApprovalBlocked, false);
assert.ok(monitor.summary.freshnessHash.startsWith("sha256:"));
assert.deepEqual(
  monitor.rows.map((row) => row.evidenceKind),
  ["signing", "revocation", "notarization", "download", "cad-transcript"],
);
assert.ok(monitor.rows.every((row) => row.evidenceLinked));
assert.ok(monitor.rows.every((row) => row.ownerReady));
assert.ok(monitor.rows.every((row) => row.status === "fresh"));
assert.match(
  monitor.csvContent,
  /^evidence_kind,platform,status,days_until_expiry,evidence_linked,owner_ready,freshness_hash,next_action/,
);
assert.ok(monitor.jsonContent.includes("cad-transcript-fresh"));
assert.equal(monitor.csvFileName, "essence-runtime-external-artifact-evidence-freshness-monitor-native-1-4-0-stable-20260520.csv");
assert.equal(monitor.jsonFileName, "essence-runtime-external-artifact-evidence-freshness-monitor-native-1-4-0-stable-20260520.json");
assert.equal(monitor.files.length, 2);

const blocked = createExternalArtifactEvidenceFreshnessMonitor({
  evidence: [
    {
      evidenceHash: "sha256:expired-signing",
      evidenceKind: "signing",
      evidenceUrl: "https://release.essence-spline.com/native/1.4.0/windows/signing.json",
      expiresAt: "2026-05-19T08:00:00.000Z",
      lastVerifiedAt: "2026-05-10T08:00:00.000Z",
      owner: "",
      platform: "windows",
      revocationStatus: "revoked",
    },
  ],
  generatedAt: "2026-05-20T08:00:00.000Z",
  releaseCandidateId: "native-1.4.0-stable",
  workspaceId: "Essence Runtime",
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.freshnessScore < 50);
assert.equal(blocked.summary.releaseApprovalBlocked, true);
assert.equal(blocked.summary.blockedCount, 5);
assert.equal(blocked.rows.find((row) => row.evidenceKind === "signing")?.ownerReady, false);
assert.equal(blocked.rows.find((row) => row.evidenceKind === "signing")?.revocationReady, false);
assert.equal(blocked.rows.find((row) => row.evidenceKind === "cad-transcript")?.evidenceLinked, false);
assert.match(blocked.summary.nextAction, /Resolve blocked external artifact evidence freshness monitor/);

console.log("external artifact evidence freshness monitor smoke passed");

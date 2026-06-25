import { strict as assert } from "node:assert";

import { createFulfillmentEvidenceAttachmentLedger } from "@/features/projects/fulfillment-evidence-attachment-ledger";
import type { CustomerFacingNativeFulfillmentStatusPacket } from "@/features/projects/customer-facing-native-fulfillment-status-packet";
import type { NativeCadRuntimeProcessRehearsalReport } from "@/features/projects/native-cad-runtime-process-rehearsal-runner";
import type { NativeExportFulfillmentRehearsalReport } from "@/features/projects/native-export-fulfillment-rehearsal";
import type { SignedPackageFilesystemVerificationRunPacket } from "@/features/projects/signed-package-filesystem-verification-run-packet";

const generatedAt = "2026-06-03T10:00:00.000Z";
const releaseCandidateId = "native-2.5.0-runtime-integration";
const workspaceId = "Essence Runtime";

const filesystemVerification = packet({
  csvFileName:
    "essence-runtime-signed-package-filesystem-verification-run-packet-native-2-5-0-runtime-integration-20260601.csv",
  hash: "sha256:filesystem-verification-run-packet",
  jsonFileName:
    "essence-runtime-signed-package-filesystem-verification-run-packet-native-2-5-0-runtime-integration-20260601.json",
  scoreKey: "verificationScore",
  scoreValue: 100,
  statusKey: "verificationHash",
}) as unknown as SignedPackageFilesystemVerificationRunPacket;

const cadProcessRehearsal = packet({
  csvFileName:
    "essence-runtime-native-cad-runtime-process-rehearsal-runner-native-2-5-0-runtime-integration-20260602.csv",
  hash: "sha256:cad-process-rehearsal-runner",
  jsonFileName:
    "essence-runtime-native-cad-runtime-process-rehearsal-runner-native-2-5-0-runtime-integration-20260602.json",
  scoreKey: "rehearsalScore",
  scoreValue: 100,
  statusKey: "rehearsalHash",
}) as unknown as NativeCadRuntimeProcessRehearsalReport;

const launchRehearsal = packet({
  csvFileName:
    "essence-runtime-native-export-fulfillment-rehearsal-native-2-5-0-runtime-integration-20260603.csv",
  hash: "sha256:launch-rehearsal-packet",
  jsonFileName:
    "essence-runtime-native-export-fulfillment-rehearsal-native-2-5-0-runtime-integration-20260603.json",
  scoreKey: "rehearsalScore",
  scoreValue: 100,
  statusKey: "rehearsalHash",
}) as unknown as NativeExportFulfillmentRehearsalReport;

const customerStatus = packet({
  csvFileName:
    "essence-runtime-customer-facing-native-fulfillment-status-packet-native-2-5-0-runtime-integration-20260603.csv",
  hash: "sha256:customer-status-packet",
  jsonFileName:
    "essence-runtime-customer-facing-native-fulfillment-status-packet-native-2-5-0-runtime-integration-20260603.json",
  scoreKey: "statusScore",
  scoreValue: 100,
  statusKey: "statusHash",
}) as unknown as CustomerFacingNativeFulfillmentStatusPacket;

const ledger = createFulfillmentEvidenceAttachmentLedger({
  attachments: [
    attachment(
      "filesystem-package-verification",
      "sha256:filesystem-verification-run-packet",
      "evidence/native/runtime-integration/filesystem-verification.json",
      "Native Release",
    ),
    attachment(
      "cad-process-transcripts",
      "sha256:cad-process-rehearsal-runner",
      "evidence/native/runtime-integration/cad-process-transcripts.json",
      "CAD Runtime",
    ),
    attachment(
      "launch-rehearsal",
      "sha256:launch-rehearsal-packet",
      "evidence/native/runtime-integration/launch-rehearsal.json",
      "Release Engineering",
    ),
    attachment(
      "customer-status",
      "sha256:customer-status-packet",
      "evidence/native/runtime-integration/customer-status.json",
      "Customer Experience",
    ),
  ],
  cadProcessRehearsal,
  customerStatus,
  filesystemVerification,
  generatedAt,
  launchRehearsal,
  releaseCandidateId,
  workspaceId,
});

assert.equal(ledger.summary.status, "ready");
assert.equal(ledger.summary.releaseBlocked, false);
assert.equal(ledger.summary.ledgerScore, 100);
assert.equal(ledger.summary.readyCount, 4);
assert.equal(ledger.summary.blockedCount, 0);
assert.equal(ledger.summary.reviewCount, 0);
assert.equal(ledger.summary.attachmentReadyCount, 4);
assert.equal(ledger.summary.fileReadyCount, 4);
assert.equal(ledger.summary.hashMatchCount, 4);
assert.equal(ledger.summary.releaseCandidateMatchCount, 4);
assert.ok(ledger.summary.ledgerHash.startsWith("sha256:"));
assert.deepEqual(
  ledger.rows.map((row) => row.source),
  [
    "filesystem-package-verification",
    "cad-process-transcripts",
    "launch-rehearsal",
    "customer-status",
  ],
);
assert.ok(ledger.rows.every((row) => row.releaseCandidateMatches));
assert.ok(ledger.rows.every((row) => row.filesReady));
assert.ok(ledger.rows.every((row) => row.attachmentReady));
assert.ok(ledger.rows.every((row) => row.hashMatches));
assert.ok(ledger.rows.every((row) => row.ledgerHash.startsWith("sha256:")));
assert.equal(
  ledger.rows.find((row) => row.source === "cad-process-transcripts")?.attachmentOwner,
  "CAD Runtime",
);
assert.match(
  ledger.csvContent,
  /^source,status,source_status,release_candidate_matches,files_ready,attachment_ready,hash_matches,ledger_hash,next_action/,
);
assert.ok(ledger.jsonContent.includes("cad-process-transcripts.json"));
assert.equal(
  ledger.csvFileName,
  "essence-runtime-fulfillment-evidence-attachment-ledger-native-2-5-0-runtime-integration-20260603.csv",
);
assert.equal(
  ledger.jsonFileName,
  "essence-runtime-fulfillment-evidence-attachment-ledger-native-2-5-0-runtime-integration-20260603.json",
);
assert.equal(ledger.files.length, 2);

const blocked = createFulfillmentEvidenceAttachmentLedger({
  attachments: [
    attachment(
      "filesystem-package-verification",
      "sha256:wrong-packet-hash",
      "",
      "",
    ),
  ],
  filesystemVerification,
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.releaseBlocked, true);
assert.ok(blocked.summary.ledgerScore < 50);
assert.equal(blocked.summary.readyCount, 0);
assert.equal(blocked.summary.blockedCount, 4);
assert.equal(blocked.summary.attachmentReadyCount, 0);
assert.equal(blocked.summary.hashMatchCount, 0);
assert.equal(
  blocked.rows.find((row) => row.source === "cad-process-transcripts")?.sourceAttached,
  false,
);
assert.equal(
  blocked.rows.find((row) => row.source === "filesystem-package-verification")
    ?.hashMatches,
  false,
);
assert.match(
  blocked.summary.nextAction,
  /Resolve blocked fulfillment evidence attachment ledger/,
);

console.log("fulfillment evidence attachment ledger smoke passed");

function packet(input: {
  csvFileName: string;
  hash: string;
  jsonFileName: string;
  scoreKey: string;
  scoreValue: number;
  statusKey: string;
}) {
  return {
    csvContent: "source,status",
    csvDataUri: "data:text/csv;charset=utf-8,source%2Cstatus",
    csvFileName: input.csvFileName,
    files: [
      {
        download: input.csvFileName,
        format: "csv",
        href: "data:text/csv;charset=utf-8,source%2Cstatus",
        label: "CSV evidence",
      },
      {
        download: input.jsonFileName,
        format: "json",
        href: "data:application/json;charset=utf-8,%7B%7D",
        label: "JSON evidence",
      },
    ],
    generatedAt,
    jsonContent: "{}",
    jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
    jsonFileName: input.jsonFileName,
    releaseCandidateId,
    rows: [],
    summary: {
      blockedCount: 0,
      nextAction: "Ready",
      readyCount: 1,
      releaseBlocked: false,
      reviewCount: 0,
      rowCount: 1,
      status: "ready",
      [input.scoreKey]: input.scoreValue,
      [input.statusKey]: input.hash,
    },
    workspaceId,
  };
}

function attachment(
  source:
    | "cad-process-transcripts"
    | "customer-status"
    | "filesystem-package-verification"
    | "launch-rehearsal",
  packetHash: string,
  storagePath: string,
  attachmentOwner: string,
) {
  return {
    attachedAt: "2026-06-03T10:20:00.000Z",
    attachmentOwner,
    packetHash,
    source,
    storagePath,
  };
}

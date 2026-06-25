import { strict as assert } from "node:assert";

import { createOperatorEscalationStatusBridge } from "@/features/projects/operator-escalation-status-bridge";
import type { CustomerFacingNativeFulfillmentStatusPacket } from "@/features/projects/customer-facing-native-fulfillment-status-packet";
import type { NativeCadRuntimeProcessRehearsalReport } from "@/features/projects/native-cad-runtime-process-rehearsal-runner";
import type { SignedPackageFilesystemVerificationRunPacket } from "@/features/projects/signed-package-filesystem-verification-run-packet";

const generatedAt = "2026-06-04T10:00:00.000Z";
const releaseCandidateId = "native-2.5.0-runtime-integration";
const workspaceId = "Essence Runtime";

const readyBridge = createOperatorEscalationStatusBridge({
  cadProcessRehearsal: cadReport([
    cadRow({
      adapterId: "freecad",
      failureReason: "",
      processExecuted: true,
      status: "ready",
      transcriptReady: true,
    }),
    cadRow({
      adapterId: "occt",
      failureReason: "",
      processExecuted: true,
      status: "ready",
      transcriptReady: true,
    }),
  ]),
  customerStatus: customerPacket([
    customerRow("fallback:browser-export", "2026-06-04T12:00:00.000Z", "ready"),
  ]),
  escalationRoutes: readyRoutes(),
  filesystemVerification: filesystemPacket([
    filesystemRow("windows", true, "ready"),
    filesystemRow("macos", true, "ready"),
    filesystemRow("linux", true, "ready"),
  ]),
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(readyBridge.summary.status, "ready");
assert.equal(readyBridge.summary.releaseBlocked, false);
assert.equal(readyBridge.summary.bridgeScore, 100);
assert.equal(readyBridge.summary.readyCount, 4);
assert.equal(readyBridge.summary.blockedCount, 0);
assert.equal(readyBridge.summary.reviewCount, 0);
assert.equal(readyBridge.summary.openEscalationCount, 0);
assert.equal(readyBridge.summary.findingCount, 0);
assert.equal(readyBridge.summary.routeReadyCount, 4);
assert.equal(readyBridge.summary.acknowledgedCount, 4);
assert.ok(readyBridge.summary.bridgeHash.startsWith("sha256:"));
assert.deepEqual(
  readyBridge.rows.map((row) => row.area),
  [
    "missing-package-signatures",
    "missing-cad-executables",
    "failed-fixture-conversions",
    "stale-customer-fallback-etas",
  ],
);
assert.ok(readyBridge.rows.every((row) => row.routeReady));
assert.ok(readyBridge.rows.every((row) => row.acknowledged));
assert.ok(readyBridge.rows.every((row) => row.bridgeHash.startsWith("sha256:")));
assert.match(
  readyBridge.csvContent,
  /^area,status,finding_count,open_escalation,route_ready,acknowledged,severity,bridge_hash,next_action/,
);
assert.ok(readyBridge.jsonContent.includes("missing-cad-executables"));
assert.equal(
  readyBridge.csvFileName,
  "essence-runtime-operator-escalation-status-bridge-native-2-5-0-runtime-integration-20260604.csv",
);
assert.equal(
  readyBridge.jsonFileName,
  "essence-runtime-operator-escalation-status-bridge-native-2-5-0-runtime-integration-20260604.json",
);
assert.equal(readyBridge.files.length, 2);

const blockedBridge = createOperatorEscalationStatusBridge({
  cadProcessRehearsal: cadReport([
    cadRow({
      adapterId: "freecad",
      failureReason: "Missing packaged executable for freecad.",
      processExecuted: false,
      status: "blocked",
      transcriptReady: false,
    }),
    cadRow({
      adapterId: "occt",
      failureReason: "Fixture conversion failed with exit code 1.",
      processExecuted: false,
      status: "blocked",
      transcriptReady: false,
    }),
  ]),
  customerStatus: customerPacket([
    customerRow("fallback:browser-export", "2026-06-04T08:00:00.000Z", "blocked"),
  ]),
  escalationRoutes: [
    route("missing-package-signatures", "Native Release", "https://ops.example.com/native/signatures"),
    route("missing-cad-executables", "", ""),
    route("failed-fixture-conversions", "CAD Runtime", "https://ops.example.com/native/cad/fixtures"),
    route("stale-customer-fallback-etas", "Customer Experience", "https://ops.example.com/native/customer-fallbacks"),
  ],
  filesystemVerification: filesystemPacket([
    filesystemRow("windows", false, "blocked"),
  ]),
  generatedAt,
  releaseCandidateId,
  workspaceId,
});

assert.equal(blockedBridge.summary.status, "blocked");
assert.equal(blockedBridge.summary.releaseBlocked, true);
assert.ok(blockedBridge.summary.bridgeScore < 70);
assert.equal(blockedBridge.summary.openEscalationCount, 4);
assert.equal(blockedBridge.summary.findingCount, 4);
assert.equal(blockedBridge.summary.blockedCount, 1);
assert.equal(blockedBridge.rows.find((row) => row.area === "missing-package-signatures")?.findingCount, 1);
assert.equal(blockedBridge.rows.find((row) => row.area === "missing-cad-executables")?.routeReady, false);
assert.equal(blockedBridge.rows.find((row) => row.area === "failed-fixture-conversions")?.findingTargets[0], "occt");
assert.equal(blockedBridge.rows.find((row) => row.area === "stale-customer-fallback-etas")?.findingTargets[0], "fallback:browser-export");
assert.match(
  blockedBridge.summary.nextAction,
  /Resolve blocked operator escalation status bridge/,
);

console.log("operator escalation status bridge smoke passed");

function readyRoutes() {
  return [
    route("missing-package-signatures", "Native Release", "https://ops.example.com/native/signatures"),
    route("missing-cad-executables", "CAD Runtime", "https://ops.example.com/native/cad/executables"),
    route("failed-fixture-conversions", "CAD Runtime", "https://ops.example.com/native/cad/fixtures"),
    route("stale-customer-fallback-etas", "Customer Experience", "https://ops.example.com/native/customer-fallbacks"),
  ];
}

function route(
  area:
    | "failed-fixture-conversions"
    | "missing-cad-executables"
    | "missing-package-signatures"
    | "stale-customer-fallback-etas",
  owner: string,
  routeUrl: string,
) {
  return {
    acknowledgedAt: "2026-06-04T10:15:00.000Z",
    acknowledgementHash: `sha256:${area}-acknowledgement`,
    area,
    owner,
    routeUrl,
    severity: area === "stale-customer-fallback-etas" ? "high" : "critical",
    slaDueAt: "2026-06-04T14:00:00.000Z",
  } as const;
}

function filesystemPacket(rows: ReturnType<typeof filesystemRow>[]) {
  return {
    files: [],
    generatedAt,
    releaseCandidateId,
    rows,
    summary: {
      blockedCount: rows.filter((row) => row.status === "blocked").length,
      nextAction: "Filesystem verification route ready.",
      readyCount: rows.filter((row) => row.status === "ready").length,
      releaseBlocked: rows.some((row) => row.status === "blocked"),
      reviewCount: 0,
      rowCount: rows.length,
      signatureTranscriptReadyCount: rows.filter((row) => row.signatureTranscriptReady).length,
      status: rows.some((row) => row.status === "blocked") ? "blocked" : "ready",
      verificationHash: "sha256:filesystem-verification",
      verificationScore: 100,
    },
    workspaceId,
  } as unknown as SignedPackageFilesystemVerificationRunPacket;
}

function filesystemRow(platform: string, signatureTranscriptReady: boolean, status: "blocked" | "ready") {
  return {
    artifactName: `EssenceSpline-2.5.0-${platform}`,
    blockerReason: signatureTranscriptReady ? "" : `${platform} signature command transcript is incomplete`,
    platform,
    signatureCommandReady: signatureTranscriptReady,
    signatureTranscriptHash: signatureTranscriptReady ? `sha256:${platform}-signature-transcript` : "missing",
    signatureTranscriptReady,
    status,
    verificationHash: `sha256:${platform}-filesystem-row`,
  };
}

function cadReport(rows: ReturnType<typeof cadRow>[]) {
  return {
    files: [],
    generatedAt,
    releaseCandidateId,
    rows,
    summary: {
      blockedCount: rows.filter((row) => row.status === "blocked").length,
      nextAction: "CAD process route ready.",
      processExecutedCount: rows.filter((row) => row.processExecuted).length,
      readyCount: rows.filter((row) => row.status === "ready").length,
      releaseBlocked: rows.some((row) => row.status === "blocked"),
      reviewCount: 0,
      rowCount: rows.length,
      status: rows.some((row) => row.status === "blocked") ? "blocked" : "ready",
      transcriptReadyCount: rows.filter((row) => row.transcriptReady).length,
      rehearsalHash: "sha256:cad-process-rehearsal",
      rehearsalScore: 100,
    },
    workspaceId,
  } as unknown as NativeCadRuntimeProcessRehearsalReport;
}

function cadRow(input: {
  adapterId: "freecad" | "occt";
  failureReason: string;
  processExecuted: boolean;
  status: "blocked" | "ready";
  transcriptReady: boolean;
}) {
  return {
    adapterId: input.adapterId,
    blockerReason: input.failureReason,
    failureReason: input.failureReason,
    processExecuted: input.processExecuted,
    status: input.status,
    transcriptReady: input.transcriptReady,
    rehearsalHash: `sha256:${input.adapterId}-cad-process-row`,
  };
}

function customerPacket(rows: ReturnType<typeof customerRow>[]) {
  return {
    files: [],
    generatedAt,
    releaseCandidateId,
    rows,
    summary: {
      blockedCount: rows.filter((row) => row.status === "blocked").length,
      nextAction: "Customer status route ready.",
      readyCount: rows.filter((row) => row.status === "ready").length,
      releaseBlocked: rows.some((row) => row.status === "blocked"),
      reviewCount: 0,
      rowCount: rows.length,
      status: rows.some((row) => row.status === "blocked") ? "blocked" : "ready",
      statusHash: "sha256:customer-status",
      statusScore: 100,
    },
    workspaceId,
  } as unknown as CustomerFacingNativeFulfillmentStatusPacket;
}

function customerRow(
  targetId: string,
  etaAt: string,
  status: "blocked" | "ready",
) {
  return {
    etaAt,
    etaAtReady: true,
    etaOwner: "Customer Experience",
    fallbackMessageReady: true,
    fallbackRouteReady: true,
    releaseBlocked: status === "blocked",
    status,
    statusHash: `sha256:${targetId}`,
    targetId,
  };
}

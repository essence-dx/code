import { strict as assert } from "node:assert";
import { createCadConversionExecutionQueue } from "@/features/projects/cad-conversion-execution-queue";
import { createCadRuntimeAcceptancePacket } from "@/features/projects/cad-runtime-acceptance-packet";
import {
  completeProjectCadConversionJob,
  createProjectCadConversionJob,
  startProjectCadConversionJob,
} from "@/features/projects/cad-conversion-worker";
import { createDesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import type { ProductionParityHistorySnapshotReport } from "@/features/projects/live-production-parity-evidence-dashboard";
import { createNativeCadKernelCapabilityMatrix } from "@/features/projects/native-cad-kernel-capability-matrix";
import { createNativeReleasePromotionApproval } from "@/features/projects/native-release-promotion-approval";
import { createRollbackRehearsalEvidenceReport } from "@/features/projects/rollback-rehearsal-evidence";
import { createSignedNativeArtifactProvenanceLedger } from "@/features/projects/signed-native-artifact-provenance-ledger";
import { createSignedNativePackageReadinessPacket } from "@/features/projects/signed-native-package-readiness-packet";

const generatedAt = "2026-06-01T10:00:00.000Z";
const workspaceId = "Workspace Commercial Proof";

function unwrapJob(result: ReturnType<typeof createProjectCadConversionJob>) {
  assert.ok("job" in result);

  return result.job;
}

const cadJob = completeProjectCadConversionJob({
  finishedAt: "2026-06-01T10:08:00.000Z",
  job: startProjectCadConversionJob(
    unwrapJob(
      createProjectCadConversionJob({
        adapterId: "occt",
        generatedAt,
        projectId: "rollback-fixture",
        projectName: "Rollback Fixture",
        sourceBytes: 1024 * 1024,
        sourceFileName: "rollback_fixture.step",
        target: "glb",
        workspaceId,
      }),
    ),
    "2026-06-01T10:04:00.000Z",
  ),
  resultPath: "outputs/rollback-fixture.glb",
});

const signedPackageReadiness = createSignedNativePackageReadinessPacket({
  artifactProvenance: createSignedNativeArtifactProvenanceLedger({
    generatedAt,
    workspaceId,
  }),
  generatedAt,
  signingPlan: createDesktopSigningPlan({
    APPLE_APP_SPECIFIC_PASSWORD: "configured",
    APPLE_CERTIFICATE_BASE64: "configured",
    APPLE_CERTIFICATE_PASSWORD: "configured",
    APPLE_ID: "configured",
    APPLE_SIGNING_IDENTITY: "configured",
    APPLE_TEAM_ID: "configured",
    TAURI_SIGNING_PRIVATE_KEY: "configured",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "configured",
    WINDOWS_CERTIFICATE_BASE64: "configured",
    WINDOWS_CERTIFICATE_PASSWORD: "configured",
    WINDOWS_TIMESTAMP_URL: "http://timestamp.digicert.com",
  }),
  workspaceId,
});

const cadRuntimeAcceptance = createCadRuntimeAcceptancePacket({
  capabilityMatrix: createNativeCadKernelCapabilityMatrix({
    generatedAt,
    igesStatus: "ready",
    satStatus: "ready",
    stepStatus: "ready",
    stlStatus: "ready",
    workspaceId,
  }),
  executionQueue: createCadConversionExecutionQueue({
    generatedAt,
    jobs: [cadJob],
    workspaceId,
  }),
  generatedAt,
  workspaceId,
});

const releaseApproval = createNativeReleasePromotionApproval({
  cadRuntimeAcceptance,
  generatedAt,
  operatorApprovalStatus: "ready",
  operatorName: "Release Captain",
  rollbackEvidenceStatus: "ready",
  rollbackPlanHash: "sha256:rollback-plan-ready",
  signedPackageReadiness,
  workspaceId,
});

const parityHistory: ProductionParityHistorySnapshotReport = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "workspace-commercial-proof-production-parity-history-20260601.csv",
  generatedAt,
  jsonContent: "",
  jsonDataUri: "",
  jsonFileName: "workspace-commercial-proof-production-parity-history-20260601.json",
  records: [
    {
      blockedCount: 0,
      blockedDelta: 0,
      driftSummary: "Initial ready production parity snapshot.",
      generatedAt,
      id: "production-parity-history:workspace-commercial-proof:20260601",
      parityHash: "sha256:known-good-parity",
      parityScore: 100,
      readyCount: 7,
      reviewCount: 0,
      scoreDelta: 0,
      snapshotHash: "sha256:history-snapshot",
      status: "ready",
      statusChanged: false,
      trend: "stable",
    },
  ],
  summary: {
    blockedDelta: 0,
    historyHash: "sha256:history",
    latestScore: 100,
    latestStatus: "ready",
    nextAction: "Production parity history is stable.",
    scoreDelta: 0,
    snapshotCount: 1,
    trend: "stable",
  },
  workspaceId,
};

const readyReport = createRollbackRehearsalEvidenceReport({
  aliasMoveStatus: "ready",
  currentDeploymentId: "dpl_current_123",
  generatedAt,
  knownGoodDeploymentId: "dpl_known_good_456",
  postRollbackSmokeStatus: "ready",
  productionAlias: "essence-spline-beta.vercel.app",
  releaseApproval,
  rollbackCommandHash: "sha256:vercel-alias-rollback-command",
  rollbackPlanHash: "sha256:rollback-plan-ready",
  parityHistory,
  workspaceId,
});

assert.equal(readyReport.summary.status, "ready");
assert.equal(readyReport.summary.rowCount, 5);
assert.equal(readyReport.summary.readyCount, 5);
assert.equal(readyReport.summary.rollbackScore, 100);
assert.equal(readyReport.csvFileName, "workspace-commercial-proof-rollback-rehearsal-evidence-20260601.csv");
assert.equal(readyReport.jsonFileName, "workspace-commercial-proof-rollback-rehearsal-evidence-20260601.json");
assert.match(readyReport.csvContent, /^rehearsal_id,kind,title,status,evidence_hash,next_action/);
assert.ok(readyReport.rows.some((row) => row.kind === "release-approval-link" && row.evidence.includes(releaseApproval.summary.approvalHash)));
assert.match(readyReport.summary.nextAction, /Rollback rehearsal evidence is ready/);

const blockedReport = createRollbackRehearsalEvidenceReport({
  aliasMoveStatus: "blocked",
  generatedAt,
  releaseApproval: createNativeReleasePromotionApproval({
    cadRuntimeAcceptance,
    generatedAt,
    operatorApprovalStatus: "blocked",
    rollbackEvidenceStatus: "blocked",
    signedPackageReadiness,
    workspaceId,
  }),
  parityHistory,
  workspaceId,
});

assert.equal(blockedReport.summary.status, "blocked");
assert.ok(blockedReport.summary.blockedCount > 0);
assert.match(blockedReport.summary.nextAction, /Resolve rollback rehearsal blockers/);

console.log("rollback rehearsal evidence smoke passed");

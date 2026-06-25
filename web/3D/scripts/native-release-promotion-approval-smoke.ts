import { strict as assert } from "node:assert";
import { createCadConversionExecutionQueue } from "@/features/projects/cad-conversion-execution-queue";
import { createCadRuntimeAcceptancePacket } from "@/features/projects/cad-runtime-acceptance-packet";
import {
  completeProjectCadConversionJob,
  createProjectCadConversionJob,
  startProjectCadConversionJob,
} from "@/features/projects/cad-conversion-worker";
import { createDesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import { createNativeCadKernelCapabilityMatrix } from "@/features/projects/native-cad-kernel-capability-matrix";
import { createNativeReleasePromotionApproval } from "@/features/projects/native-release-promotion-approval";
import { createSignedNativeArtifactProvenanceLedger } from "@/features/projects/signed-native-artifact-provenance-ledger";
import { createSignedNativePackageReadinessPacket } from "@/features/projects/signed-native-package-readiness-packet";

const generatedAt = "2026-05-31T12:00:00.000Z";
const workspaceId = "Workspace Native Runtime";

const configuredEnv = {
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
};

function unwrapJob(result: ReturnType<typeof createProjectCadConversionJob>) {
  assert.ok("job" in result);

  return result.job;
}

const readyCadJob = completeProjectCadConversionJob({
  finishedAt: "2026-05-31T12:05:00.000Z",
  job: startProjectCadConversionJob(
    unwrapJob(
      createProjectCadConversionJob({
        adapterId: "occt",
        generatedAt,
        projectId: "native-runtime-release",
        projectName: "Native Runtime Release",
        sourceBytes: 6 * 1024 * 1024,
        sourceFileName: "release_fixture_mm.step",
        target: "glb",
        workspaceId,
      }),
    ),
    "2026-05-31T12:03:00.000Z",
  ),
  resultPath: "outputs/release_fixture_mm.glb",
});

const readySignedPackage = createSignedNativePackageReadinessPacket({
  artifactProvenance: createSignedNativeArtifactProvenanceLedger({
    generatedAt,
    workspaceId,
  }),
  generatedAt,
  signingPlan: createDesktopSigningPlan(configuredEnv),
  workspaceId,
});

const readyCadRuntime = createCadRuntimeAcceptancePacket({
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
    jobs: [readyCadJob],
    workspaceId,
  }),
  generatedAt,
  workspaceId,
});

const readyApproval = createNativeReleasePromotionApproval({
  cadRuntimeAcceptance: readyCadRuntime,
  generatedAt,
  operatorApprovalStatus: "ready",
  operatorName: "Release Captain",
  rollbackEvidenceStatus: "ready",
  rollbackPlanHash: "sha256:rollback-plan-ready",
  signedPackageReadiness: readySignedPackage,
  workspaceId,
});

assert.equal(readyApproval.summary.status, "ready");
assert.equal(readyApproval.summary.rowCount, 4);
assert.equal(readyApproval.summary.readyCount, 4);
assert.equal(readyApproval.summary.blockedCount, 0);
assert.equal(readyApproval.summary.approvalScore, 100);
assert.deepEqual(
  readyApproval.rows.map((row) => row.kind),
  ["signed-package-readiness", "cad-runtime-acceptance", "operator-approval", "rollback-evidence"],
);
assert.match(readyApproval.summary.nextAction, /Native release promotion approval is ready/);
assert.equal(readyApproval.csvFileName, "workspace-native-runtime-native-release-promotion-approval-20260531.csv");
assert.equal(readyApproval.jsonFileName, "workspace-native-runtime-native-release-promotion-approval-20260531.json");
assert.match(readyApproval.csvContent, /^approval_id,kind,title,status,evidence_hash,next_action/);

const blockedApproval = createNativeReleasePromotionApproval({
  cadRuntimeAcceptance: readyCadRuntime,
  generatedAt,
  operatorApprovalStatus: "blocked",
  signedPackageReadiness: createSignedNativePackageReadinessPacket({
    artifactProvenance: createSignedNativeArtifactProvenanceLedger({
      generatedAt,
      releaseChannelStatus: "blocked",
      signingPlanStatus: "blocked",
      workspaceId,
    }),
    generatedAt,
    signingPlan: createDesktopSigningPlan({}),
    workspaceId,
  }),
  rollbackEvidenceStatus: "blocked",
  workspaceId,
});

assert.equal(blockedApproval.summary.status, "blocked");
assert.ok(blockedApproval.summary.blockedCount > 0);
assert.match(blockedApproval.summary.nextAction, /Resolve native release promotion blockers/);

const reviewApproval = createNativeReleasePromotionApproval({
  cadRuntimeAcceptance: readyCadRuntime,
  generatedAt,
  operatorApprovalStatus: "review",
  rollbackEvidenceStatus: "review",
  signedPackageReadiness: readySignedPackage,
  workspaceId,
});

assert.equal(reviewApproval.summary.status, "review");
assert.ok(reviewApproval.summary.reviewCount > 0);
assert.match(reviewApproval.summary.nextAction, /Review native release promotion approval evidence/);

console.log("native release promotion approval smoke passed");

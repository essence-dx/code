import { strict as assert } from "node:assert";
import type { ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { CadRuntimeAcceptancePacketReport } from "@/features/projects/cad-runtime-acceptance-packet";
import { createLiveProductionParityEvidenceDashboard } from "@/features/projects/live-production-parity-evidence-dashboard";
import type { NativeReleasePromotionApprovalReport } from "@/features/projects/native-release-promotion-approval";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { SceneQaSnapshotReport } from "@/features/projects/scene-qa-snapshots";
import type { SignedNativePackageReadinessPacketReport } from "@/features/projects/signed-native-package-readiness-packet";

const generatedAt = "2026-05-31T14:00:00.000Z";
const workspaceId = "Workspace Native Runtime";

function sceneQaReport(overrides: Partial<SceneQaSnapshotReport["summary"]> = {}): SceneQaSnapshotReport {
  return {
    comparisons: [],
    generatedAt,
    summary: {
      apiPayloadCount: 1,
      embedCount: 1,
      failedCount: 0,
      passedCount: 4,
      projectCount: 1,
      publicViewerCount: 1,
      templateCount: 1,
      templateLaunchCount: 1,
      totalCount: 4,
      warningCount: 0,
      ...overrides,
    },
  };
}

function publicSurfaceReport(overrides: Partial<ProjectPublicSurfaceHealthReport["summary"]> = {}): ProjectPublicSurfaceHealthReport {
  return {
    generatedAt,
    history: {
      batchCount: 1,
      recentBatches: [],
      snapshotCount: 4,
    },
    snapshots: [],
    summary: {
      apiPayloadCount: 1,
      appPackageCount: 1,
      embedCount: 1,
      failCount: 0,
      passCount: 4,
      publicViewerCount: 1,
      screenshotCapturedCount: 2,
      screenshotDiffCount: 0,
      screenshotPendingCount: 0,
      totalCount: 4,
      warnCount: 0,
      ...overrides,
    },
  };
}

function artifactRegistryReport(overrides: Partial<ProjectArtifactRegistryReport["summary"]> = {}): ProjectArtifactRegistryReport {
  return {
    entries: [],
    generatedAt,
    summary: {
      availableCount: 8,
      blockedCount: 0,
      complianceExportCount: 1,
      draftCount: 0,
      lineageSnapshotCount: 1,
      privateCount: 3,
      publicAssetCount: 4,
      publicCount: 5,
      signedBundleCount: 2,
      totalCount: 8,
      ...overrides,
    },
  };
}

function signedPackageReadiness(status: SignedNativePackageReadinessPacketReport["summary"]["status"]): SignedNativePackageReadinessPacketReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      blockedCount: status === "blocked" ? 1 : 0,
      nextAction: "signed package action",
      packetHash: "sha256:signed-package",
      readinessScore: status === "ready" ? 100 : status === "review" ? 74 : 35,
      readyCount: status === "ready" ? 4 : 2,
      reviewCount: status === "review" ? 1 : 0,
      rowCount: 4,
      status,
    },
    workspaceId,
  };
}

function cadRuntime(status: CadRuntimeAcceptancePacketReport["summary"]["status"]): CadRuntimeAcceptancePacketReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      acceptanceHash: "sha256:cad-runtime",
      acceptanceScore: status === "ready" ? 100 : status === "review" ? 74 : 35,
      blockedCount: status === "blocked" ? 1 : 0,
      nextAction: "cad runtime action",
      readyCount: status === "ready" ? 4 : 2,
      reviewCount: status === "review" ? 1 : 0,
      rowCount: 4,
      status,
    },
    workspaceId,
  };
}

function releaseApproval(status: NativeReleasePromotionApprovalReport["summary"]["status"]): NativeReleasePromotionApprovalReport {
  return {
    csvContent: "",
    csvDataUri: "",
    csvFileName: "",
    generatedAt,
    jsonContent: "",
    jsonDataUri: "",
    jsonFileName: "",
    rows: [],
    summary: {
      approvalHash: "sha256:release-approval",
      approvalScore: status === "ready" ? 100 : status === "review" ? 74 : 35,
      blockedCount: status === "blocked" ? 1 : 0,
      nextAction: "release approval action",
      readyCount: status === "ready" ? 4 : 2,
      reviewCount: status === "review" ? 1 : 0,
      rowCount: 4,
      status,
    },
    workspaceId,
  };
}

function releaseDeploymentChecklist(status: ReleaseDeploymentChecklist["status"]): ReleaseDeploymentChecklist {
  return {
    blockerCount: status === "fail" ? 1 : 0,
    checks: [],
    generatedAt,
    status,
    summary: "deployment summary",
    target: "production",
    warningCount: status === "warning" ? 1 : 0,
  };
}

function postDeploySummary(status: PostDeploySyntheticDashboardSummary["status"]): PostDeploySyntheticDashboardSummary {
  return {
    actionCommand: "bun run release:post-deploy:smoke -- --write-report",
    baseUrl: "https://essence-spline-beta.vercel.app",
    checkRows: [],
    completionPercent: status === "pass" ? 100 : 50,
    currentPassStreak: status === "pass" ? 2 : 0,
    failedRunCount: status === "fail" ? 1 : 0,
    generatedAt,
    historyCount: 2,
    issueRows: [],
    latestFailedAt: status === "fail" ? generatedAt : null,
    latestPassedAt: status === "pass" ? generatedAt : null,
    passedRunCount: status === "pass" ? 2 : 1,
    projectId: "project",
    shareId: "share",
    status,
    statusLabel: status,
    totalRunCount: 2,
  };
}

const readyDashboard = createLiveProductionParityEvidenceDashboard({
  artifactRegistryReport: artifactRegistryReport(),
  cadRuntimeAcceptance: cadRuntime("ready"),
  generatedAt,
  nativeReleasePromotionApproval: releaseApproval("ready"),
  postDeploySummary: postDeploySummary("pass"),
  publicSurfaceHealthReport: publicSurfaceReport(),
  releaseDeploymentChecklist: releaseDeploymentChecklist("pass"),
  sceneQaSnapshotReport: sceneQaReport(),
  signedPackageReadiness: signedPackageReadiness("ready"),
  workspaceId,
});

assert.equal(readyDashboard.summary.status, "ready");
assert.equal(readyDashboard.summary.rowCount, 7);
assert.equal(readyDashboard.summary.readyCount, 7);
assert.equal(readyDashboard.summary.blockedCount, 0);
assert.equal(readyDashboard.summary.parityScore, 100);
assert.deepEqual(
  readyDashboard.rows.map((row) => row.kind),
  ["editor", "sharing", "exports", "desktop-signing", "cad-runtime", "deployment", "release-approval"],
);
assert.match(readyDashboard.summary.nextAction, /Live production parity evidence dashboard is ready/);
assert.equal(readyDashboard.csvFileName, "workspace-native-runtime-live-production-parity-evidence-dashboard-20260531.csv");
assert.equal(readyDashboard.jsonFileName, "workspace-native-runtime-live-production-parity-evidence-dashboard-20260531.json");
assert.match(readyDashboard.csvContent, /^evidence_id,kind,title,status,evidence_hash,next_action/);

const reviewDashboard = createLiveProductionParityEvidenceDashboard({
  artifactRegistryReport: artifactRegistryReport({ draftCount: 1 }),
  cadRuntimeAcceptance: cadRuntime("ready"),
  generatedAt,
  nativeReleasePromotionApproval: releaseApproval("review"),
  postDeploySummary: postDeploySummary("missing"),
  publicSurfaceHealthReport: publicSurfaceReport({ screenshotPendingCount: 1, warnCount: 1 }),
  releaseDeploymentChecklist: releaseDeploymentChecklist("warning"),
  sceneQaSnapshotReport: sceneQaReport({ warningCount: 1 }),
  signedPackageReadiness: signedPackageReadiness("ready"),
  workspaceId,
});

assert.equal(reviewDashboard.summary.status, "review");
assert.ok(reviewDashboard.summary.reviewCount > 0);
assert.match(reviewDashboard.summary.nextAction, /Review live production parity evidence/);

const blockedDashboard = createLiveProductionParityEvidenceDashboard({
  artifactRegistryReport: artifactRegistryReport({ blockedCount: 1 }),
  cadRuntimeAcceptance: cadRuntime("blocked"),
  generatedAt,
  nativeReleasePromotionApproval: releaseApproval("blocked"),
  postDeploySummary: postDeploySummary("fail"),
  publicSurfaceHealthReport: publicSurfaceReport({ failCount: 1 }),
  releaseDeploymentChecklist: releaseDeploymentChecklist("fail"),
  sceneQaSnapshotReport: sceneQaReport({ failedCount: 1 }),
  signedPackageReadiness: signedPackageReadiness("blocked"),
  workspaceId,
});

assert.equal(blockedDashboard.summary.status, "blocked");
assert.ok(blockedDashboard.summary.blockedCount > 0);
assert.match(blockedDashboard.summary.nextAction, /Resolve live production parity blockers/);

console.log("live production parity evidence dashboard smoke passed");

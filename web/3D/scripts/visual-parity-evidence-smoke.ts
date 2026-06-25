import { strict as assert } from "node:assert";
import type { ProjectPublicSurfaceHealthReport, ProjectPublicSurfaceHealthSnapshot } from "@/features/projects/public-surface-health";
import type { SceneQaSnapshotReport } from "@/features/projects/scene-qa-snapshots";
import { createVisualParityEvidenceReport, type VisualParityEvidenceArtifact } from "@/features/projects/visual-parity-evidence";

const generatedAt = "2026-06-02T16:00:00.000Z";
const workspaceId = "Workspace Visual Parity";

function publicSnapshot(
  input: Omit<Partial<ProjectPublicSurfaceHealthSnapshot>, "sourceKey" | "surface"> & Pick<ProjectPublicSurfaceHealthSnapshot, "sourceKey" | "surface">,
): ProjectPublicSurfaceHealthSnapshot {
  const snapshot: ProjectPublicSurfaceHealthSnapshot = {
    batchId: "visual-batch",
    checkedAt: generatedAt,
    issues: [],
    label: `${input.surface} target`,
    latencyMs: 120,
    path: `/target/${input.surface}`,
    projectId: "project-visual",
    projectName: "Visual Project",
    screenshotArtifactId: null,
    screenshotByteSize: null,
    screenshotCapturedAt: null,
    screenshotDiffScore: null,
    screenshotDiffSummary: null,
    screenshotHash: null,
    screenshotHeight: null,
    screenshotPath: null,
    screenshotState: "pending",
    screenshotWidth: null,
    sourceKey: input.sourceKey,
    sourceVersionId: "version-visual",
    status: "pass",
    statusCode: 200,
    surface: input.surface,
    url: `https://essence.example/${input.surface}`,
  };

  return ({
    ...snapshot,
    ...input,
    statusCode: snapshot.statusCode ?? 200,
  } satisfies ProjectPublicSurfaceHealthSnapshot);
}

const publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recentBatches: [],
    snapshotCount: 3,
  },
  snapshots: [
    publicSnapshot({
      screenshotArtifactId: "viewer-artifact",
      screenshotByteSize: 41000,
      screenshotCapturedAt: generatedAt,
      screenshotDiffScore: 0,
      screenshotDiffSummary: "Screenshot matches the latest stored baseline hash and dimensions.",
      screenshotHash: "sha256:viewer",
      screenshotHeight: 900,
      screenshotPath: ".surface-health/viewer.png",
      screenshotState: "captured",
      screenshotWidth: 1440,
      sourceKey: "project-visual:public-viewer",
      surface: "public-viewer",
    }),
    publicSnapshot({
      screenshotArtifactId: "embed-artifact",
      screenshotByteSize: 52000,
      screenshotCapturedAt: generatedAt,
      screenshotDiffScore: 19,
      screenshotDiffSummary: "Screenshot changed from baseline: 80px dimension delta and 6000 byte size delta.",
      screenshotHash: "sha256:embed",
      screenshotHeight: 900,
      screenshotPath: ".surface-health/embed.png",
      screenshotState: "captured",
      screenshotWidth: 1440,
      sourceKey: "project-visual:embed",
      surface: "embed",
    }),
    publicSnapshot({
      sourceKey: "project-visual:app-package",
      surface: "app-package",
    }),
  ],
  summary: {
    apiPayloadCount: 0,
    appPackageCount: 1,
    embedCount: 1,
    failCount: 0,
    passCount: 3,
    publicViewerCount: 1,
    screenshotCapturedCount: 2,
    screenshotDiffCount: 2,
    screenshotPendingCount: 1,
    totalCount: 3,
    warnCount: 0,
  },
};

const sceneQaSnapshotReport: SceneQaSnapshotReport = {
  comparisons: [],
  generatedAt,
  summary: {
    apiPayloadCount: 0,
    embedCount: 1,
    failedCount: 0,
    passedCount: 4,
    projectCount: 1,
    publicViewerCount: 1,
    templateCount: 1,
    templateLaunchCount: 1,
    totalCount: 4,
    warningCount: 0,
  },
};

const supplementalArtifacts: VisualParityEvidenceArtifact[] = [
  {
    byteSize: 63000,
    capturedAt: generatedAt,
    diffScore: 0,
    diffSummary: "Editor screenshot matches the Spline-class reference baseline.",
    height: 1100,
    path: ".visual-parity/editor.png",
    screenshotHash: "sha256:editor",
    surface: "editor",
    targetId: "editor-workspace",
    targetName: "Editor workspace",
    width: 1440,
  },
  {
    byteSize: 22000,
    capturedAt: generatedAt,
    diffScore: 0,
    diffSummary: "Package download surface matches the stored release baseline.",
    height: 860,
    path: ".visual-parity/app-package.png",
    screenshotHash: "sha256:app-package",
    surface: "app-package",
    targetId: "app-package-download",
    targetName: "Package download",
    width: 1280,
  },
];

const report = createVisualParityEvidenceReport({
  generatedAt,
  publicSurfaceHealthReport,
  sceneQaSnapshotReport,
  supplementalArtifacts,
  workspaceId,
});

assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.capturedCount, 4);
assert.equal(report.summary.diffCount, 4);
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.reviewCount, 1);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.status, "review");
assert.equal(report.summary.visualParityScore, 90);
assert.equal(report.rows.find((row) => row.surface === "embed")?.status, "review");
assert.equal(report.rows.find((row) => row.surface === "public-viewer")?.status, "ready");
assert.match(report.rows.find((row) => row.surface === "app-package")?.screenshotHash ?? "", /sha256:app-package/);
assert.match(report.csvContent, /^surface,target,status,screenshot_hash,diff_score,screenshot_path,next_action/);
assert.match(report.jsonContent, /"visualParityHash"/);
assert.equal(report.csvFileName, "workspace-visual-parity-visual-parity-evidence-20260602.csv");
assert.equal(report.jsonFileName, "workspace-visual-parity-visual-parity-evidence-20260602.json");

const blocked = createVisualParityEvidenceReport({
  generatedAt,
  publicSurfaceHealthReport,
  sceneQaSnapshotReport: {
    ...sceneQaSnapshotReport,
    summary: {
      ...sceneQaSnapshotReport.summary,
      failedCount: 1,
    },
  },
  workspaceId,
});

assert.equal(blocked.summary.status, "blocked");
assert.ok(blocked.summary.visualParityScore < report.summary.visualParityScore);
assert.match(blocked.summary.nextAction, /Resolve screenshot-backed visual parity blockers/);

console.log("visual parity evidence smoke passed");

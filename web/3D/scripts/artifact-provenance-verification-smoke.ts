import { strict as assert } from "node:assert";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { createProjectArtifactProvenanceReport } from "@/features/projects/artifact-provenance-verification";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { ReleaseOperationsDashboard } from "@/features/projects/release-operations-dashboard";

const generatedAt = "2026-05-16T13:00:00.000Z";

const artifactRegistryReport: ProjectArtifactRegistryReport = {
  entries: [
    {
      artifactId: "viewer",
      kind: "public-asset",
      label: "Public viewer",
      metadata: null,
      path: "/share/launch",
      projectId: "project-1",
      projectName: "Launch Scene",
      registeredAt: generatedAt,
      requiresAuth: false,
      signatureState: "not-required",
      sourceKey: "project-1:public-asset:viewer",
      sourceVersionId: "version-1",
      status: "available",
      updatedAt: generatedAt,
      url: "https://example.test/share/launch",
      visibility: "public",
    },
    {
      artifactId: "blocked-api",
      kind: "public-asset",
      label: "Public API payload",
      metadata: null,
      path: "/api/public/launch",
      projectId: "project-1",
      projectName: "Launch Scene",
      registeredAt: generatedAt,
      requiresAuth: false,
      signatureState: "not-required",
      sourceKey: "project-1:public-asset:blocked-api",
      sourceVersionId: "version-1",
      status: "blocked",
      updatedAt: generatedAt,
      url: "https://example.test/api/public/launch",
      visibility: "public",
    },
  ],
  generatedAt,
  summary: {
    availableCount: 1,
    blockedCount: 1,
    complianceExportCount: 0,
    draftCount: 0,
    lineageSnapshotCount: 0,
    privateCount: 0,
    publicAssetCount: 2,
    publicCount: 2,
    signedBundleCount: 0,
    totalCount: 2,
  },
};

const certificateReport: ProjectAppPackageCertificateReport = {
  generatedAt,
  rows: [
    {
      artifactId: "signed-tauri",
      certificate: {
        bundleIdentifier: "com.essence.spline",
        expiresAt: "2027-05-16T00:00:00.000Z",
        fingerprintSha256: "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
        issuer: "Essence Test CA",
        metadata: null,
        platform: "windows",
        presetId: "signed-tauri",
        projectId: "project-1",
        revokedAt: null,
        serialNumber: "123",
        sourceArtifactId: "signed-tauri",
        subject: "Essence Spline",
        teamId: null,
        uploadedAt: generatedAt,
        validFrom: "2026-01-01T00:00:00.000Z",
        verifiedAt: generatedAt,
      },
      expiresAt: "2027-05-16T00:00:00.000Z",
      issue: null,
      label: "Signed Tauri",
      platform: "windows",
      presetId: "signed-tauri",
      presetLabel: "Signed Tauri",
      projectId: "project-1",
      projectName: "Launch Scene",
      sourceKey: "project-1:signed-app-bundle:signed-tauri",
      sourceVersionId: "version-1",
      status: "valid",
    },
    {
      artifactId: "signed-tauri",
      certificate: null,
      expiresAt: null,
      issue: "No signing certificate has been ingested for this package/platform.",
      label: "Signed Tauri",
      platform: "macos",
      presetId: "signed-tauri",
      presetLabel: "Signed Tauri",
      projectId: "project-1",
      projectName: "Launch Scene",
      sourceKey: "project-1:signed-app-bundle:signed-tauri",
      sourceVersionId: "version-1",
      status: "missing",
    },
  ],
  summary: {
    blockedCount: 1,
    expiredCount: 0,
    expiringCount: 0,
    missingCount: 1,
    mismatchCount: 0,
    nativeBundleCount: 1,
    readyCount: 1,
    revokedCount: 0,
    totalRequiredCount: 2,
    validCount: 1,
  },
};

const cadConversionQueueReport: ProjectCadConversionQueueReport = {
  generatedAt,
  jobs: [
    {
      adapterId: "freecad",
      attempts: 1,
      command: "freecadcmd export.py launch.step launch.stl",
      diagnostics: {
        issues: [],
        meshDiagnostics: {
          complexity: "low",
          estimatedTriangleCount: 12000,
          estimatedVertexCount: 6600,
          externalAssetRisk: false,
          sourceBytes: 1024,
        },
        summary: "low complexity, 12,000 estimated triangles, meter units.",
        tessellationBudget: {
          angularDeflection: 0.35,
          estimatedTriangleCount: 12000,
          linearDeflection: 0.1,
          maxRecommendedTriangles: 160000,
          target: "stl",
        },
        unitMetadata: {
          confidence: "detected",
          scaleToMeters: 1,
          sourceUnit: "meter",
        },
      },
      errorMessage: null,
      finishedAt: generatedAt,
      logs: [{ at: generatedAt, level: "info", message: "Conversion succeeded: artifacts/launch.stl" }],
      maxAttempts: 3,
      metadata: null,
      nextAttemptAt: null,
      outputFileName: "launch.stl",
      projectId: "project-1",
      projectName: "Launch Scene",
      queuedAt: generatedAt,
      resultPath: "artifacts/launch.stl",
      sourceBytes: 1024,
      sourceFileName: "launch.step",
      sourceKind: "native-cad",
      startedAt: generatedAt,
      status: "succeeded",
      target: "stl",
      updatedAt: generatedAt,
      workspaceId: "workspace-1",
    },
    {
      adapterId: "occt",
      attempts: 2,
      command: "essence-occt-convert --input broken.step",
      diagnostics: {
        issues: [
          {
            detail: "Source could not be tessellated.",
            id: "tessellation-failed",
            label: "Tessellation failed",
            severity: "error",
          },
        ],
        meshDiagnostics: {
          complexity: "extreme",
          estimatedTriangleCount: 900000,
          estimatedVertexCount: 495000,
          externalAssetRisk: false,
          sourceBytes: 2048,
        },
        summary: "extreme complexity, 900,000 estimated triangles, meter units.",
        tessellationBudget: {
          angularDeflection: 0.35,
          estimatedTriangleCount: 900000,
          linearDeflection: 0.1,
          maxRecommendedTriangles: 220000,
          target: "glb",
        },
        unitMetadata: {
          confidence: "detected",
          scaleToMeters: 1,
          sourceUnit: "meter",
        },
      },
      errorMessage: "Tessellation failed.",
      finishedAt: null,
      logs: [{ at: generatedAt, level: "warning", message: "Tessellation failed." }],
      maxAttempts: 3,
      metadata: null,
      nextAttemptAt: generatedAt,
      outputFileName: "broken.glb",
      projectId: "project-1",
      projectName: "Launch Scene",
      queuedAt: "2026-05-16T12:00:00.000Z",
      resultPath: null,
      sourceBytes: 2048,
      sourceFileName: "broken.step",
      sourceKind: "native-cad",
      startedAt: generatedAt,
      status: "retryable-failed",
      target: "glb",
      updatedAt: generatedAt,
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    failedCount: 0,
    queuedCount: 0,
    retryableCount: 1,
    runningCount: 0,
    succeededCount: 1,
    totalCount: 2,
  },
};

const publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recentBatches: [],
    snapshotCount: 2,
  },
  snapshots: [
    {
      batchId: "public-health",
      checkedAt: generatedAt,
      issues: [],
      label: "Public viewer",
      latencyMs: 100,
      path: "/share/launch",
      projectId: "project-1",
      projectName: "Launch Scene",
      screenshotArtifactId: null,
      screenshotByteSize: null,
      screenshotCapturedAt: null,
      screenshotDiffScore: null,
      screenshotDiffSummary: null,
      screenshotHash: null,
      screenshotHeight: null,
      screenshotPath: null,
      screenshotState: "captured",
      screenshotWidth: null,
      sourceKey: "project-1:public-viewer:viewer",
      sourceVersionId: "version-1",
      status: "pass",
      statusCode: 200,
      surface: "public-viewer",
      url: "https://example.test/share/launch",
    },
    {
      batchId: "public-health",
      checkedAt: generatedAt,
      issues: ["API returned 500."],
      label: "Public API payload",
      latencyMs: null,
      path: "/api/public/launch",
      projectId: "project-1",
      projectName: "Launch Scene",
      screenshotArtifactId: null,
      screenshotByteSize: null,
      screenshotCapturedAt: null,
      screenshotDiffScore: null,
      screenshotDiffSummary: null,
      screenshotHash: null,
      screenshotHeight: null,
      screenshotPath: null,
      screenshotState: "not-applicable",
      screenshotWidth: null,
      sourceKey: "project-1:api-payload:blocked-api",
      sourceVersionId: "version-1",
      status: "fail",
      statusCode: 500,
      surface: "api-payload",
      url: "https://example.test/api/public/launch",
    },
  ],
  summary: {
    apiPayloadCount: 1,
    appPackageCount: 0,
    embedCount: 0,
    failCount: 1,
    passCount: 1,
    publicViewerCount: 1,
    screenshotCapturedCount: 1,
    screenshotDiffCount: 0,
    screenshotPendingCount: 0,
    totalCount: 2,
    warnCount: 0,
  },
};

const releaseOperationsDashboard: ReleaseOperationsDashboard = {
  artifactRows: [
    {
      arch: "x86_64",
      path: "nsis/Essence_0.6.0_x64-setup.exe",
      priority: 50,
      signed: true,
      target: "windows",
      url: "https://cdn.example.com/nsis/Essence.exe",
    },
    {
      arch: "x86_64",
      path: "appimage/Essence_0.6.0_x86_64.AppImage",
      priority: 50,
      signed: false,
      target: "linux",
      url: "https://cdn.example.com/appimage/Essence.AppImage",
    },
  ],
  blockedChannelCount: 1,
  bundleDir: "dist",
  channelRows: [],
  envRows: [],
  generatedAt,
  metadata: {
    notes: "Fixture",
    pubDate: generatedAt,
    version: "0.6.0",
  },
  readyChannelCount: 2,
  selectedArtifactCount: 1,
  targetRows: [
    {
      arches: ["x86_64"],
      artifactCount: 1,
      missing: false,
      target: "windows",
    },
    {
      arches: [],
      artifactCount: 0,
      missing: true,
      target: "darwin",
    },
  ],
  unsignedArtifactCount: 1,
};

const report = createProjectArtifactProvenanceReport({
  artifactRegistryReport,
  cadConversionQueueReport,
  certificateReport,
  generatedAt,
  publicSurfaceHealthReport,
  releaseOperationsDashboard,
});

assert.equal(report.summary.totalCount, 9);
assert.equal(report.summary.verifiedCount, 4);
assert.equal(report.summary.blockedCount, 3);
assert.equal(report.summary.missingCount, 2);
assert.equal(report.summary.warningCount, 0);
assert.equal(report.summary.worstStatus, "blocked");
assert.equal(report.summary.score, 44);
assert.equal(report.summary.certificateCount, 2);
assert.equal(report.summary.desktopBundleCount, 3);
assert.equal(report.summary.cadOutputCount, 2);
assert.equal(report.summary.publicAssetCount, 2);
assert.ok(report.rows.some((row) => row.id.includes("certificate") && row.status === "missing"));
assert.ok(report.rows.some((row) => row.kind === "desktop-bundle" && row.status === "blocked"));
assert.ok(report.rows.some((row) => row.kind === "cad-output" && row.status === "verified"));
assert.ok(report.rows.some((row) => row.kind === "public-asset" && row.status === "blocked"));

const noEvidenceReport = createProjectArtifactProvenanceReport({
  artifactRegistryReport: {
    entries: [],
    generatedAt,
    summary: {
      availableCount: 0,
      blockedCount: 0,
      complianceExportCount: 0,
      draftCount: 0,
      lineageSnapshotCount: 0,
      privateCount: 0,
      publicAssetCount: 0,
      publicCount: 0,
      signedBundleCount: 0,
      totalCount: 0,
    },
  },
  cadConversionQueueReport: {
    generatedAt,
    jobs: [],
    summary: {
      failedCount: 0,
      queuedCount: 0,
      retryableCount: 0,
      runningCount: 0,
      succeededCount: 0,
      totalCount: 0,
    },
  },
  certificateReport: {
    generatedAt,
    rows: [],
    summary: {
      blockedCount: 0,
      expiredCount: 0,
      expiringCount: 0,
      missingCount: 0,
      mismatchCount: 0,
      nativeBundleCount: 0,
      readyCount: 0,
      revokedCount: 0,
      totalRequiredCount: 0,
      validCount: 0,
    },
  },
  generatedAt,
  publicSurfaceHealthReport: {
    ...publicSurfaceHealthReport,
    snapshots: [],
    summary: {
      apiPayloadCount: 0,
      appPackageCount: 0,
      embedCount: 0,
      failCount: 0,
      passCount: 0,
      publicViewerCount: 0,
      screenshotCapturedCount: 0,
      screenshotDiffCount: 0,
      screenshotPendingCount: 0,
      totalCount: 0,
      warnCount: 0,
    },
  },
  releaseOperationsDashboard: null,
});

assert.equal(noEvidenceReport.summary.totalCount, 3);
assert.equal(noEvidenceReport.summary.missingCount, 3);
assert.equal(noEvidenceReport.summary.score, 0);

console.log("artifact provenance verification smoke passed");

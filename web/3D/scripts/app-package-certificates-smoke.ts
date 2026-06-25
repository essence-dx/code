import { strict as assert } from "node:assert";
import type { SceneDocument } from "@/features/editor/types";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import { createProjectAppPackageCertificateReport, normalizeCertificateFingerprint } from "@/features/projects/app-package-certificates";
import { createProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = "2026-05-16T20:00:00.000Z";
const defaultDocument = createDefaultDocument("Certificate scene");
const sceneData: SceneDocument = {
  ...defaultDocument,
  activeSceneId: "scene-certificates",
  createdAt: now,
  id: "document-certificates",
  objects: [],
  scenes: [
    {
      createdAt: now,
      id: "scene-certificates",
      name: "Main",
      objects: [],
      updatedAt: now,
    },
  ],
  updatedAt: now,
};
const shareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "appPackage", "approved", {
    updatedAt: "2026-05-16T20:01:00.000Z",
  }),
};
const lineage = createProjectExportLineageReport({
  generatedAt: "2026-05-16T20:02:00.000Z",
  origin: "https://essence.example",
  project: {
    id: "project-certificates",
    name: "Certificates Project",
    publishedAt: "2026-05-16T20:03:00.000Z",
    shareId: "share-certificates",
    shareSettings,
    updatedAt: "2026-05-16T20:04:00.000Z",
  },
  sceneData,
  versions: [
    {
      createdAt: "2026-05-16T20:05:00.000Z",
      id: "version-certificates",
      name: "Release candidate",
      objectCount: 0,
    },
  ],
});
const registry = createProjectArtifactRegistryReport({
  generatedAt: "2026-05-16T20:06:00.000Z",
  lineageReports: [lineage],
});
const signedTauriArtifact = registry.entries.find((entry) => entry.kind === "signed-app-bundle" && entry.metadata?.presetId === "signed-tauri");
const visionArtifact = registry.entries.find((entry) => entry.kind === "signed-app-bundle" && entry.metadata?.presetId === "visionos-preview");

assert.ok(signedTauriArtifact);
assert.ok(visionArtifact);

const report = createProjectAppPackageCertificateReport({
  artifactRegistryReport: registry,
  certificates: [
    {
      bundleIdentifier: "com.essence.spline.desktop",
      expiresAt: "2027-05-16T20:00:00.000Z",
      fingerprintSha256: normalizeCertificateFingerprint("AA".repeat(32)),
      issuer: "Essence Test CA",
      metadata: { provider: "fixture" },
      platform: "windows",
      presetId: "signed-tauri",
      projectId: "project-certificates",
      revokedAt: null,
      serialNumber: "WIN-001",
      sourceArtifactId: signedTauriArtifact.artifactId,
      subject: "CN=Essence Spline Windows",
      teamId: null,
      uploadedAt: "2026-05-16T20:07:00.000Z",
      validFrom: "2026-01-01T00:00:00.000Z",
      verifiedAt: "2026-05-16T20:08:00.000Z",
    },
    {
      bundleIdentifier: "com.essence.spline.android",
      expiresAt: "2026-05-30T20:00:00.000Z",
      fingerprintSha256: normalizeCertificateFingerprint("BB".repeat(32)),
      issuer: "Essence Android CA",
      metadata: null,
      platform: "android",
      presetId: null,
      projectId: "project-certificates",
      revokedAt: null,
      serialNumber: "AND-001",
      sourceArtifactId: null,
      subject: "CN=Essence Spline Android",
      teamId: null,
      uploadedAt: "2026-05-16T20:09:00.000Z",
      validFrom: "2026-01-01T00:00:00.000Z",
      verifiedAt: "2026-05-16T20:10:00.000Z",
    },
    {
      bundleIdentifier: "com.essence.spline.vision",
      expiresAt: "2026-05-01T20:00:00.000Z",
      fingerprintSha256: normalizeCertificateFingerprint("CC".repeat(32)),
      issuer: "Essence Vision CA",
      metadata: null,
      platform: "visionos",
      presetId: "visionos-preview",
      projectId: "project-certificates",
      revokedAt: null,
      serialNumber: "VIS-001",
      sourceArtifactId: visionArtifact.artifactId,
      subject: "CN=Essence Spline visionOS",
      teamId: "TEAMVISION",
      uploadedAt: "2026-05-16T20:11:00.000Z",
      validFrom: "2026-01-01T00:00:00.000Z",
      verifiedAt: "2026-05-16T20:12:00.000Z",
    },
  ],
  generatedAt: now,
  now: new Date(now),
});

assert.equal(report.summary.totalRequiredCount, 6);
assert.equal(report.summary.nativeBundleCount, 4);
assert.equal(report.summary.validCount, 1);
assert.equal(report.summary.expiringCount, 2);
assert.equal(report.summary.expiredCount, 1);
assert.equal(report.summary.missingCount, 2);
assert.equal(report.rows.some((row) => row.presetId === "signed-tauri" && row.platform === "windows" && row.status === "valid"), true);
assert.equal(report.rows.some((row) => row.presetId === "android-aab" && row.platform === "android" && row.status === "expiring"), true);
assert.equal(report.rows.some((row) => row.presetId === "visionos-preview" && row.status === "expired"), true);

console.log("app package certificates smoke passed");

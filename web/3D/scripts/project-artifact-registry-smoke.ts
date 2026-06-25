import { strict as assert } from "node:assert";
import type { SceneDocument } from "@/features/editor/types";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import { createProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = "2026-05-16T22:00:00.000Z";
const defaultDocument = createDefaultDocument("Registry scene");
const sceneData: SceneDocument = {
  ...defaultDocument,
  activeSceneId: "scene-main",
  createdAt: now,
  id: "document-registry",
  objects: [],
  scenes: [
    {
      createdAt: now,
      id: "scene-main",
      name: "Main",
      objects: [],
      updatedAt: now,
    },
  ],
  updatedAt: now,
};
const shareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: updateProjectReviewWorkflow(
    updateProjectReviewWorkflow(
      updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
        updatedAt: "2026-05-16T22:01:00.000Z",
      }),
      "embed",
      "approved",
      {
        updatedAt: "2026-05-16T22:02:00.000Z",
      },
    ),
    "appPackage",
    "approved",
    {
      updatedAt: "2026-05-16T22:03:00.000Z",
    },
  ),
};
const lineage = createProjectExportLineageReport({
  generatedAt: "2026-05-16T22:04:00.000Z",
  origin: "https://essence.example",
  project: {
    id: "project-registry",
    name: "Registry Project",
    publishedAt: "2026-05-16T22:05:00.000Z",
    shareId: "share-registry",
    shareSettings,
    updatedAt: "2026-05-16T22:06:00.000Z",
  },
  sceneData,
  versions: [
    {
      createdAt: "2026-05-16T22:07:00.000Z",
      id: "version-registry",
      name: "Release candidate",
      objectCount: 0,
    },
  ],
});
const registry = createProjectArtifactRegistryReport({
  generatedAt: "2026-05-16T22:08:00.000Z",
  lineageReports: [lineage],
});

assert.equal(registry.summary.totalCount, lineage.summary.totalCount + 1);
assert.equal(registry.summary.complianceExportCount, 1);
assert.equal(registry.summary.lineageSnapshotCount, 1);
assert.equal(registry.summary.publicAssetCount, 3);
assert.equal(registry.summary.signedBundleCount, lineage.summary.appPackageCount);
assert.equal(registry.entries.some((entry) => entry.kind === "signed-app-bundle" && entry.signatureState === "certificate-required"), true);
assert.equal(registry.entries.some((entry) => entry.kind === "lineage-snapshot" && entry.visibility === "private"), true);
assert.equal(registry.entries.some((entry) => entry.kind === "compliance-export" && entry.requiresAuth), true);

const draftRegistry = createProjectArtifactRegistryReport({
  lineageReports: [
    createProjectExportLineageReport({
      project: {
        id: "project-draft",
        name: "Draft Project",
        publishedAt: null,
        shareId: null,
        shareSettings,
        updatedAt: now,
      },
      sceneData,
    }),
  ],
});

assert.ok(draftRegistry.summary.draftCount > 0);
assert.equal(draftRegistry.summary.lineageSnapshotCount, 1);

console.log("project artifact registry smoke passed");

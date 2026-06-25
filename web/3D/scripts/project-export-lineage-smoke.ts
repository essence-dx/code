import { strict as assert } from "node:assert";
import type { SceneDocument } from "@/features/editor/types";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import { createProjectAuditLog } from "@/features/projects/project-audit-log";
import { createAppPackageLineageManifest, createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { createProjectComplianceReport } from "@/features/projects/project-compliance-report";
import { getAppPackageFiles } from "@/features/projects/app-package-export";
import { appPackageManifestPath, validateAppPackageFiles } from "@/features/projects/app-package-validation";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";
import { getAbsoluteUrl, getEmbedPath, getPublicSceneApiPath, getSharePath } from "@/features/projects/share-links";

const now = "2026-05-16T19:00:00.000Z";
const defaultDocument = createDefaultDocument("Lineage scene");
const sceneData: SceneDocument = {
  ...defaultDocument,
  activeSceneId: "scene-main",
  createdAt: now,
  id: "document-lineage",
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
        updatedAt: "2026-05-16T19:01:00.000Z",
      }),
      "embed",
      "approved",
      {
        updatedAt: "2026-05-16T19:02:00.000Z",
      },
    ),
    "appPackage",
    "approved",
    {
      updatedAt: "2026-05-16T19:03:00.000Z",
    },
  ),
};
const project = {
  archivedAt: null,
  createdAt: now,
  description: "Lineage fixture",
  id: "project-lineage",
  name: "Lineage Project",
  publishedAt: "2026-05-16T19:04:00.000Z",
  shareId: "share-lineage",
  shareSettings,
  updatedAt: "2026-05-16T19:05:00.000Z",
  userId: "owner",
};
const versions = [
  {
    createdAt: "2026-05-16T19:06:00.000Z",
    id: "version-latest",
    name: "Release candidate",
    objectCount: 0,
  },
];
const origin = "https://essence.example";

const lineage = createProjectExportLineageReport({
  origin,
  project,
  sceneData,
  versions,
});

assert.equal(lineage.sourceVersion.id, "version-latest");
assert.equal(lineage.summary.totalCount, 11);
assert.equal(lineage.summary.availableCount, 11);
assert.ok(lineage.artifacts.some((artifact) => artifact.kind === "public-link" && artifact.url === getAbsoluteUrl(origin, getSharePath(project.shareId, "scene-main"))));
assert.ok(lineage.artifacts.some((artifact) => artifact.kind === "api-payload" && artifact.path === getPublicSceneApiPath(project.shareId, "scene-main")));

const packageLineage = createAppPackageLineageManifest(lineage, "web");
const packageOptions = {
  activeSceneId: "scene-main",
  embedUrl: getAbsoluteUrl(origin, getEmbedPath(project.shareId, "scene-main")),
  lineage: packageLineage,
  sceneApiUrl: getAbsoluteUrl(origin, getPublicSceneApiPath(project.shareId, "scene-main")),
  sceneName: sceneData.name,
  scenes: [{ id: "scene-main", name: "Main", objectCount: 0, updatedAt: now }],
  shareSettings,
  shareUrl: getAbsoluteUrl(origin, getSharePath(project.shareId, "scene-main")),
};
const packageFiles = getAppPackageFiles("web", packageOptions);
const manifest = packageFiles.find((file) => file.path === appPackageManifestPath);
const validation = validateAppPackageFiles("web", packageOptions, packageFiles);

assert.equal(validation.valid, true);
assert.ok(manifest?.content.includes('"artifactId": "app-package:web:version-latest"'));
assert.ok(manifest?.content.includes('"upstreamArtifactIds"'));

const complianceReport = createProjectComplianceReport({
  accessGrants: [],
  auditLog: createProjectAuditLog({
    accessGrants: [],
    comments: [],
    project,
    sceneData,
    versions: [],
  }),
  generatedAt: "2026-05-16T19:07:00.000Z",
  origin,
  project,
  sceneData,
  versions,
});

assert.equal(complianceReport.lineage.sourceVersion.id, "version-latest");
assert.ok(complianceReport.lineage.artifacts.some((artifact) => artifact.kind === "compliance-report" && artifact.requiresAuth));

const draftLineage = createProjectExportLineageReport({
  origin,
  project: {
    ...project,
    publishedAt: null,
    shareId: null,
  },
  sceneData,
});

assert.ok(draftLineage.artifacts.some((artifact) => artifact.kind === "public-link" && artifact.status === "draft"));

console.log("project export lineage smoke passed");

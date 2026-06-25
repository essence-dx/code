import { strict as assert } from "node:assert";
import {
  applyScenePermissionPolicyTemplate,
  createScenePermissionPolicyTemplateReport,
  getScenePermissionPolicyTemplate,
  scenePermissionPolicyTemplates,
} from "@/features/projects/scene-permission-policy-templates";
import { defaultShareSettings, updateProjectReviewWorkflow, type ShareSettings } from "@/features/projects/share-settings";

const generatedAt = "2026-05-16T22:30:00.000Z";
const approvedBaseSettings: ShareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: {
    appPackage: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
    desktopRelease: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
    embed: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
    publicLink: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
  },
};
const viewerTemplate = getScenePermissionPolicyTemplate("viewer-review");
const apiTemplate = getScenePermissionPolicyTemplate("api-partner");
const appTemplate = getScenePermissionPolicyTemplate("app-package-release");

assert.equal(scenePermissionPolicyTemplates.length, 4);
assert.ok(viewerTemplate);
assert.ok(apiTemplate);
assert.ok(appTemplate);
assert.deepEqual(viewerTemplate.permissions, {
  allowCodeExport: false,
  allowEmbed: false,
  allowPublicApi: false,
  allowView: true,
  allowViewerDownload: false,
});
assert.deepEqual(apiTemplate.requiredReviewSurfaces, ["embed"]);
assert.deepEqual(appTemplate.requiredReviewSurfaces, ["appPackage", "desktopRelease"]);

const viewerSettings = applyScenePermissionPolicyTemplate(defaultShareSettings, "viewer-review", {
  now: generatedAt,
  reviewerName: "Publishing owner",
});

assert.equal(viewerSettings.allowView, true);
assert.equal(viewerSettings.allowEmbed, false);
assert.equal(viewerSettings.allowPublicApi, false);
assert.equal(viewerSettings.allowViewerDownload, false);
assert.equal(viewerSettings.reviewWorkflow.publicLink.status, "requested");
assert.equal(viewerSettings.reviewWorkflow.embed.status, "draft");
assert.match(viewerSettings.reviewWorkflow.publicLink.note ?? "", /Viewer-only/);

const packageSettings = applyScenePermissionPolicyTemplate(defaultShareSettings, "app-package-release", {
  now: generatedAt,
  reviewerName: "Release owner",
});

assert.equal(packageSettings.allowViewerDownload, true);
assert.equal(packageSettings.allowCodeExport, true);
assert.equal(packageSettings.allowPublicApi, false);
assert.equal(packageSettings.reviewWorkflow.appPackage.status, "requested");
assert.equal(packageSettings.reviewWorkflow.desktopRelease.status, "requested");

const report = createScenePermissionPolicyTemplateReport({
  generatedAt,
  projects: [
    {
      archivedAt: null,
      id: "project-viewer",
      name: "Viewer handoff",
      publishedAt: "2026-05-16T00:00:00.000Z",
      shareSettings: viewerSettings,
    },
    {
      archivedAt: null,
      id: "project-api",
      name: "Partner API",
      publishedAt: null,
      shareSettings: applyScenePermissionPolicyTemplate(defaultShareSettings, "api-partner", { now: generatedAt }),
    },
    {
      archivedAt: null,
      id: "project-risk",
      name: "Unclassified public scene",
      publishedAt: "2026-05-15T00:00:00.000Z",
      shareSettings: {
        ...defaultShareSettings,
        reviewWorkflow: updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "approved", {
          reviewerName: "Owner",
          updatedAt: generatedAt,
        }),
      },
    },
    {
      archivedAt: "2026-04-01T00:00:00.000Z",
      id: "project-archived",
      name: "Archived package",
      publishedAt: null,
      shareSettings: approvedBaseSettings,
    },
  ],
});

assert.equal(report.summary.templateCount, 4);
assert.equal(report.summary.activeProjectCount, 3);
assert.equal(report.summary.classifiedProjectCount, 2);
assert.equal(report.summary.unclassifiedProjectCount, 1);
assert.equal(report.summary.blockedProjectCount, 1);
assert.equal(report.summary.coverageScore, 67);
assert.equal(report.summary.status, "blocked");
assert.equal(report.rows.find((row) => row.templateId === "viewer-review")?.matchingProjectCount, 1);
assert.equal(report.projectRows.find((row) => row.projectId === "project-api")?.recommendedTemplateId, "api-partner");
assert.equal(report.projectRows.find((row) => row.projectId === "project-risk")?.status, "blocked");
assert.match(report.csvContent, /template_id,label,surface_count,permission_summary,matching_projects/);
assert.match(report.csvContent, /viewer-review,Viewer review/);

console.log("scene permission policy templates smoke passed");

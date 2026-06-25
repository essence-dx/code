import { strict as assert } from "node:assert";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import { createProjectIncidentHistory } from "@/features/projects/project-incident-history";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";
import type { PostDeploySyntheticSmokeReport } from "@/features/deployment/post-deploy-synthetic-smoke";

const now = new Date("2026-05-16T12:00:00.000Z");
const blockedShareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "changesRequested", {
    note: "Hero copy needs legal review.",
    reviewerName: "Lead",
    updatedAt: "2026-05-16T10:30:00.000Z",
  }),
};
const failedPostDeployReport: PostDeploySyntheticSmokeReport = {
  baseUrl: "https://essence-spline.example.com",
  checks: [
    {
      contentType: "text/html",
      durationMs: 20,
      httpStatus: 200,
      issues: [],
      key: "public-viewer",
      label: "Public viewer",
      status: "pass",
      url: "https://essence-spline.example.com/share/share-1",
    },
    {
      contentType: "application/json",
      durationMs: 90,
      httpStatus: 500,
      issues: ["API helper returned 500."],
      key: "api-helper",
      label: "API helper",
      status: "fail",
      url: "https://essence-spline.example.com/api/public/scenes/share-1/code",
    },
  ],
  durationMs: 110,
  failedCount: 1,
  generatedAt: "2026-05-16T11:30:00.000Z",
  passedCount: 1,
  projectId: "project-1",
  sceneId: null,
  shareId: "share-1",
  status: "fail",
};

const history = createProjectIncidentHistory({
  now,
  postDeployReports: [failedPostDeployReport],
  projects: [
    {
      archivedAt: null,
      id: "project-1",
      name: "Launch scene",
      publishedAt: "2026-05-16T09:00:00.000Z",
      sceneData: { broken: true },
      shareId: "share-1",
      shareSettings: blockedShareSettings,
      updatedAt: "2026-05-16T11:45:00.000Z",
    },
    {
      archivedAt: null,
      id: "project-2",
      name: "Healthy scene",
      publishedAt: null,
      sceneData: {
        ...createDefaultDocument("Healthy scene"),
        objects: [],
      },
      shareId: null,
      shareSettings: {
        ...defaultShareSettings,
        reviewWorkflow: {
          appPackage: { status: "approved" },
          desktopRelease: { status: "approved" },
          embed: { status: "approved" },
          publicLink: { status: "approved" },
        },
      },
      updatedAt: "2026-05-16T10:00:00.000Z",
    },
  ],
});

assert.equal(history.summary.totalCount, 3);
assert.equal(history.summary.failedExportCount, 1);
assert.equal(history.summary.blockedReviewCount, 1);
assert.equal(history.summary.postDeployFailureCount, 1);
assert.equal(history.summary.criticalCount, 3);
assert.ok(history.incidents.some((incident) => incident.kind === "failed-export" && incident.title === "Export failed"));
assert.ok(history.incidents.some((incident) => incident.kind === "post-deploy-failure" && incident.details.join(" ").includes("API helper returned 500")));

console.log("project incident history smoke passed");

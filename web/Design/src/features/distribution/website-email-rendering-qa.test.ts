import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WebsitePublishSummary } from "@/db/website-publishing";
import { createWebsiteEmailRenderingQaCenter } from "@/features/distribution/website-email-rendering-qa";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";

describe("website and email rendering QA", () => {
  test("creates viewport, client, link, form, accessibility, and release report evidence", () => {
    const websiteProject = createProject({
      id: "project-landing",
      name: "Pocket Garden landing page",
      publicShareId: "public-landing",
      width: 1440,
      height: 1200,
    });
    const emailProject = createProject({
      id: "project-email",
      name: "Pocket Garden launch email",
      width: 1200,
      height: 800,
    });
    const center = createWebsiteEmailRenderingQaCenter({
      appUrl: "https://studio.example.com",
      projects: [websiteProject, emailProject],
      projectAudits: [
        createProjectAudit({
          project: websiteProject,
          websiteScore: 92,
          emailScore: 78,
          accessibilityScore: 88,
        }),
        createProjectAudit({
          project: emailProject,
          websiteScore: 70,
          emailScore: 94,
          accessibilityScore: 96,
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "publish-landing",
          projectId: websiteProject.id,
          projectName: websiteProject.name,
          slug: "pocket-garden-launch",
          title: "Pocket Garden Launch",
          seoTitle: "Pocket Garden subscription launch",
          seoDescription:
            "Reserve the Pocket Garden subscription for balcony growers with launch pricing and guided setup support.",
          status: "published",
          customDomains: [
            {
              id: "domain-1",
              publishId: "publish-landing",
              projectId: websiteProject.id,
              domain: "pocket.example.com",
              status: "verified",
              verificationName: "_verify",
              verificationValue: "token",
              verifiedAt: "2026-05-18T08:00:00.000Z",
              platformStatus: "attached",
              platformError: null,
              platformAttachedAt: "2026-05-18T08:05:00.000Z",
              createdAt: "2026-05-18T07:00:00.000Z",
              updatedAt: "2026-05-18T08:05:00.000Z",
            },
          ],
        }),
      ],
      websiteFormSubmissions: [
        {
          id: "submission-1",
          publishId: "publish-landing",
          projectId: websiteProject.id,
          websiteTitle: "Pocket Garden Launch",
          sectionId: "hero-form",
          payload: { email: "buyer@example.com" },
          createdAt: "2026-05-18T08:20:00.000Z",
        },
      ],
      serverExportJobs: [
        createExportJob({
          id: "email-export",
          projectId: emailProject.id,
          projectName: emailProject.name,
          format: "html",
          status: "completed",
          artifactMimeType: "text/html",
          artifactSizeBytes: 64_000,
        }),
      ],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.ok(center.score >= 90);
    assert.equal(center.totals.websiteViewportChecks, 3);
    assert.equal(center.totals.emailClientChecks, 3);
    assert.equal(center.totals.formDiagnostics, 1);
    assert.ok(
      center.websiteViewportMatrix.every(
        (check) => check.publishId === "publish-landing" && check.status === "ready",
      ),
    );
    assert.deepEqual(
      center.websiteViewportMatrix.map((check) => check.viewport),
      ["mobile", "tablet", "desktop"],
    );
    assert.ok(
      center.emailClientMatrix.every(
        (check) =>
          check.projectId === "project-email" &&
          check.status === "ready" &&
          check.exportJobId === "email-export",
      ),
    );
    assert.ok(
      center.linkValidation.some(
        (check) =>
          check.kind === "custom-domain" &&
          check.url === "https://pocket.example.com" &&
          check.status === "ready",
      ),
    );
    assert.ok(
      center.formRoutingDiagnostics.some(
        (diagnostic) =>
          diagnostic.publishId === "publish-landing" &&
          diagnostic.status === "ready" &&
          diagnostic.submissionCount === 1,
      ),
    );
    assert.ok(
      center.accessibilityEvidence.some(
        (evidence) =>
          evidence.projectId === "project-email" &&
          evidence.status === "ready" &&
          evidence.score === 96,
      ),
    );
    assert.match(center.releaseReport.dataUrl, /^data:application\/json/);
    assert.ok(
      center.nextActions.includes(
        "Website and email release QA matrices are ready for packet handoff.",
      ),
    );
  });
});

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Project",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-18T08:30:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createProjectAudit(input: {
  project: ProjectSummary;
  websiteScore: number;
  emailScore: number;
  accessibilityScore: number;
}): ProjectAuditSummary {
  return {
    projectId: input.project.id,
    projectName: input.project.name,
    updatedAt: input.project.updatedAt,
    overallScore: Math.round(
      (input.websiteScore + input.emailScore + input.accessibilityScore) / 3,
    ),
    status: "ready",
    dimensions: [
      {
        id: "website",
        label: "Website",
        status: input.websiteScore >= 85 ? "ready" : "review",
        score: input.websiteScore,
        detail: "Website metadata and public link evidence.",
      },
      {
        id: "email",
        label: "Email QA",
        status: input.emailScore >= 85 ? "ready" : "review",
        score: input.emailScore,
        detail: "Email rendering evidence.",
      },
      {
        id: "accessibility",
        label: "Accessibility",
        status: input.accessibilityScore >= 85 ? "ready" : "review",
        score: input.accessibilityScore,
        detail: "Image alt text evidence.",
      },
    ],
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish-1",
    projectId: "project-1",
    projectName: "Project",
    slug: "project",
    title: "Project",
    seoTitle: "Project SEO Title",
    seoDescription:
      "A clear SEO description for this published project with enough details for search snippets.",
    status: "published",
    publishedAt: "2026-05-18T08:00:00.000Z",
    createdAt: "2026-05-18T07:30:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
    viewCount: 120,
    clickCount: 18,
    lastAnalyticsAt: "2026-05-18T08:40:00.000Z",
    customDomains: [],
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Project",
    format: "html",
    formatLabel: "HTML",
    fileName: "project.html",
    status: "completed",
    progress: 100,
    artifactName: "project.html",
    artifactMimeType: "text/html",
    artifactSizeBytes: 64_000,
    artifactDataUrl: "data:text/html;base64,PGh0bWw+",
    failureMessage: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:05:00.000Z",
    completedAt: "2026-05-18T08:05:00.000Z",
    ...overrides,
  };
}

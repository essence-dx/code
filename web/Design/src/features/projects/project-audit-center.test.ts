import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createStarterDocument } from "@/features/editor/document-factory";
import type { ProjectDetail } from "@/features/editor/types";
import { createProjectAuditSummary } from "@/features/projects/project-audit-center";

describe("project audit center", () => {
  test("summarizes a project across six audit dimensions", () => {
    const project = createProject({
      document: createStarterDocument({
        width: 1200,
        height: 630,
        presetId: "instagram-post",
      }),
    });
    const audit = createProjectAuditSummary({
      project,
      brandColors: [],
      brandFonts: [],
      brandLogos: [],
    });

    assert.equal(audit.dimensions.length, 6);
    assert.equal(audit.projectId, project.id);
    assert.ok(audit.overallScore >= 0);
    assert.ok(audit.overallScore <= 100);
  });

  test("scores complete website metadata higher than missing metadata", () => {
    const readyProject = createProject({
      publicShareId: "public-share-id",
      document: {
        ...createStarterDocument({
          width: 1200,
          height: 630,
          presetId: "website",
        }),
        pages: [
          {
            ...createStarterDocument({
              width: 1200,
              height: 630,
              presetId: "website",
            }).pages[0]!,
            websiteSeoTitle: "Campaign launch landing page",
            websiteSeoDescription:
              "A focused campaign landing page for launch announcements, conversion content, and share previews.",
            websiteNavLabel: "Launch",
          },
        ],
      },
    });
    const missingProject = createProject({
      document: createStarterDocument({
        width: 1200,
        height: 630,
        presetId: "website",
      }),
    });
    const readyAudit = createProjectAuditSummary({
      project: readyProject,
      brandColors: [],
      brandFonts: [],
      brandLogos: [],
    });
    const missingAudit = createProjectAuditSummary({
      project: missingProject,
      brandColors: [],
      brandFonts: [],
      brandLogos: [],
    });
    const readyWebsite = readyAudit.dimensions.find(
      (dimension) => dimension.id === "website",
    );
    const missingWebsite = missingAudit.dimensions.find(
      (dimension) => dimension.id === "website",
    );

    assert.ok((readyWebsite?.score ?? 0) > (missingWebsite?.score ?? 0));
  });
});

function createProject(
  input: Pick<ProjectDetail, "document"> & Partial<ProjectDetail>,
): ProjectDetail {
  return {
    id: input.id ?? "project-1",
    name: input.name ?? "Launch Campaign",
    width: input.width ?? input.document.width,
    height: input.height ?? input.document.height,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: input.publicShareId ?? null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    ...input,
  };
}

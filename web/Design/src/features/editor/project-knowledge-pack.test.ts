import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createPage } from "@/features/editor/document-factory";
import {
  applyProjectKnowledgePackTemplate,
  createProjectKnowledgePack,
  createProjectKnowledgePackChecks,
  createProjectKnowledgePackSummary,
  updateProjectKnowledgePack,
} from "@/features/editor/project-knowledge-pack";
import { createProjectKnowledgePackMarkdown } from "@/features/editor/project-knowledge-pack-markdown";
import type { DesignDocument } from "@/features/editor/types";

describe("project knowledge packs", () => {
  test("creates reusable starter packs with all knowledge sections", () => {
    const pack = createProjectKnowledgePack({
      templateId: "campaign-launch",
      projectName: "Spring launch",
      now: "2026-05-16T10:00:00.000Z",
    });

    assert.equal(pack.brief.title, "Spring launch knowledge pack");
    assert.ok(pack.audienceProfiles.length >= 2);
    assert.ok(pack.constraints.length >= 3);
    assert.ok(pack.references.length >= 1);
    assert.ok(pack.decisionLogs.length >= 1);
    assert.equal(pack.updatedAt, "2026-05-16T10:00:00.000Z");
  });

  test("attaches a selected pack template to document metadata", () => {
    const document = createDocument();
    const updated = applyProjectKnowledgePackTemplate(
      document,
      "stakeholder-report",
      {
        projectName: "Q2 board report",
        now: "2026-05-16T11:00:00.000Z",
      },
    );

    assert.equal(
      updated.metadata?.projectKnowledgePack?.brief.title,
      "Q2 board report knowledge pack",
    );
    assert.equal(
      updated.metadata?.projectKnowledgePack?.updatedAt,
      "2026-05-16T11:00:00.000Z",
    );
  });

  test("scores readiness from brief, audience, constraints, references, and decisions", () => {
    const pack = createProjectKnowledgePack({
      templateId: "event-promo",
      now: "2026-05-16T12:00:00.000Z",
    });
    const checks = createProjectKnowledgePackChecks(pack);
    const summary = createProjectKnowledgePackSummary(pack);

    assert.equal(checks.length, 5);
    assert.equal(checks.every((item) => item.status === "ready"), true);
    assert.equal(summary.status, "ready");
    assert.equal(summary.score, 100);
  });

  test("flags incomplete packs before stakeholder handoff", () => {
    const document = createDocument();
    const updated = updateProjectKnowledgePack(
      document,
      {
        brief: {
          title: "Incomplete pack",
          goal: "",
          audiencePromise: "",
          successMetric: "",
          owner: "",
          dueDate: "",
        },
        audienceProfiles: [],
        constraints: [],
        references: [],
        decisionLogs: [],
      },
      "2026-05-16T13:00:00.000Z",
    );
    const pack = updated.metadata?.projectKnowledgePack;

    assert.ok(pack);
    assert.equal(pack.updatedAt, "2026-05-16T13:00:00.000Z");
    assert.equal(createProjectKnowledgePackSummary(pack).status, "blocked");
  });

  test("exports a readable markdown packet for handoff", () => {
    const pack = createProjectKnowledgePack({
      templateId: "campaign-launch",
      projectName: "Launch kit",
      now: "2026-05-16T14:00:00.000Z",
    });
    const markdown = createProjectKnowledgePackMarkdown(pack, "Launch kit");

    assert.match(markdown, /# Launch kit knowledge pack/);
    assert.match(markdown, /## Audience Profiles/);
    assert.match(markdown, /## Constraints/);
    assert.match(markdown, /## References/);
    assert.match(markdown, /## Decision Log/);
  });
});

function createDocument() {
  const page = createPage({
    name: "Page 1",
    width: 1200,
    height: 800,
    elements: [],
  });

  return {
    version: 1,
    width: 1200,
    height: 800,
    pages: [page],
    activePageId: page.id,
  } satisfies DesignDocument;
}
